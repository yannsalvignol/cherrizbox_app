import {
    type Channel,
    formatLastMessageTime,
    formatPrice,
    getChannelAvatar,
    getChannelDisplayName
} from '@/lib/index-utils';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Batch database operations manager
class BatchTipUpdater {
  private static instance: BatchTipUpdater;
  private updateQueue: Map<string, { documentId: string; uncashedAmount: number; userProfileCache: any; userId: string }> = new Map();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 2000; // 2 seconds
  private readonly MAX_BATCH_SIZE = 10;

  static getInstance(): BatchTipUpdater {
    if (!BatchTipUpdater.instance) {
      BatchTipUpdater.instance = new BatchTipUpdater();
    }
    return BatchTipUpdater.instance;
  }

  queueTipUpdate(userId: string, documentId: string, uncashedAmount: number, userProfileCache: any) {
    this.updateQueue.set(userId, { documentId, uncashedAmount, userProfileCache, userId });
    
    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // Process immediately if queue is full, otherwise wait for batch delay
    if (this.updateQueue.size >= this.MAX_BATCH_SIZE) {
      this.processBatch();
    } else {
      this.batchTimer = setTimeout(() => this.processBatch(), this.BATCH_DELAY);
    }
  }

  private async processBatch() {
    if (this.updateQueue.size === 0) return;
    
    const updates = Array.from(this.updateQueue.values());
    this.updateQueue.clear();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    console.log(`🔄 [BatchTipUpdater] Processing ${updates.length} tip updates in batch`);

    try {
      const { databases, config } = await import('@/lib/appwrite');
      
      // Process updates in parallel batches of 5 to avoid overwhelming the API
      const PARALLEL_BATCH_SIZE = 5;
      for (let i = 0; i < updates.length; i += PARALLEL_BATCH_SIZE) {
        const batch = updates.slice(i, i + PARALLEL_BATCH_SIZE);
        
        await Promise.allSettled(
          batch.map(async ({ documentId, uncashedAmount, userProfileCache, userId }) => {
            try {
              await databases.updateDocument(
                config.databaseId,
                process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
                documentId,
                {
                  cashed_tip_amount: uncashedAmount,
                  uncashed_tip_amount: 0
                }
              );
              
              // Update cache
              const cachedProfile = userProfileCache.current.get(userId);
              if (cachedProfile) {
                userProfileCache.current.set(userId, {
                  ...cachedProfile,
                  uncashedTipAmount: 0
                });
              }
              
              console.log(`✅ [BatchTipUpdater] Updated tip for user ${userId}: ${uncashedAmount}`);
            } catch (error) {
              console.error(`❌ [BatchTipUpdater] Failed to update tip for user ${userId}:`, error);
            }
          })
        );
      }
      
      console.log(`✅ [BatchTipUpdater] Completed batch processing of ${updates.length} updates`);
    } catch (error) {
      console.error('❌ [BatchTipUpdater] Batch processing failed:', error);
    }
  }

  // Force process any pending updates (useful for app background/cleanup)
  async flushPendingUpdates() {
    if (this.updateQueue.size > 0) {
      await this.processBatch();
    }
  }

  // Get current queue size for monitoring
  getQueueSize(): number {
    return this.updateQueue.size;
  }
}

// Export for use in other components
export { BatchTipUpdater };

interface ChannelItemProps {
  channel: Channel;
  currentUserId?: string;
  profileImage?: string | null;
  userName?: string;
  userCurrency: string;
  userProfileCache: React.MutableRefObject<Map<string, { 
    name: string; 
    avatar: string; 
    uncashedTipAmount: number; 
    documentId: string; 
    timestamp: number 
  }>>;
  onChannelPress?: (channelId: string) => void;
}

export const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  currentUserId,
  profileImage,
  userName,
  userCurrency,
  userProfileCache,
  onChannelPress
}) => {
  const router = useRouter();
  const displayName = getChannelDisplayName(channel, currentUserId);
  const avatar = getChannelAvatar(channel, currentUserId, profileImage, userName);
  const isDM = channel.id.startsWith('dm-');
  const isGroupChat = channel.id.startsWith('creator-');
  const hasUnread = channel.unreadCount > 0;
  
  // Check if DM channel has tip amount
  const hasTip = isDM && channel.memberTipAmounts && (() => {
    const otherMemberId = channel.members.find(memberId => memberId !== currentUserId);
    const tipAmountCents = otherMemberId ? channel.memberTipAmounts[otherMemberId] : 0;
    return tipAmountCents > 0;
  })();

  const handlePress = async () => {
    // Reset uncashed tip amount when opening a DM channel with tips
    if (isDM && hasTip) {
      const otherMemberId = channel.members.find(memberId => memberId !== currentUserId);
      if (otherMemberId && channel.memberTipAmounts) {
        const uncashedTipAmount = channel.memberTipAmounts[otherMemberId];
        if (uncashedTipAmount > 0) {
          // Get the cached profile to find the document ID
          const cachedProfile = userProfileCache.current.get(otherMemberId);
          if (cachedProfile && cachedProfile.documentId) {
            // Queue the tip update for batch processing instead of immediate execution
            const batchUpdater = BatchTipUpdater.getInstance();
            batchUpdater.queueTipUpdate(
              otherMemberId,
              cachedProfile.documentId,
              uncashedTipAmount,
              userProfileCache
            );
            
            // Immediately update the UI cache for responsive UX
            userProfileCache.current.set(otherMemberId, {
              ...cachedProfile,
              uncashedTipAmount: 0
            });
            
            console.log(`📝 [ChannelItem] Queued tip update for user ${otherMemberId}: ${uncashedTipAmount}`);
          }
        }
      }
    }
    
    const targetRoute = `/chat/${channel.id}`;
    
    if (onChannelPress) {
      onChannelPress(channel.id);
    } else {
      router.push(targetRoute as any);
    }
  };

  return (
    <TouchableOpacity 
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: isGroupChat ? 16 : 12,
        backgroundColor: isGroupChat ? 'white' : (hasTip ? 'rgba(40, 158, 65, 0.36)' : '#FFFFFF'), // Pale green for tipped DMs
        marginHorizontal: 16,
        marginVertical: isGroupChat ? 4 : 2,
        borderRadius: isGroupChat ? 16 : 8,
        borderWidth: isGroupChat ? 2 : 1,
        borderColor: isGroupChat ? '#676767' : (hasTip ? 'rgba(67, 255, 107, 0.16)' : '#333333'), // Darker green border for tipped DMs
        shadowColor: isGroupChat ? 'black' : 'transparent',
        shadowOffset: isGroupChat ? { width: 0, height: 2 } : { width: 0, height: 0 },
        shadowOpacity: isGroupChat ? 0.3 : 0,
        shadowRadius: isGroupChat ? 8 : 0,
        elevation: isGroupChat ? 8 : 0,
      }}
      onPress={handlePress}
    >
      {/* Avatar */}
      <View style={{
        width: isGroupChat ? 48 : 40,
        height: isGroupChat ? 48 : 40,
        borderRadius: isGroupChat ? 24 : 20,
        backgroundColor: isGroupChat ? '#FD6F3E' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: isGroupChat ? 14 : 10,
        borderWidth: isGroupChat ? 2 : 0,
        borderColor: isGroupChat ? 'transparent' : 'transparent',
      }}>
        {channel.image || (avatar && avatar.startsWith('http')) ? (
          <Image
            source={{ uri: channel.image || avatar }}
            style={{ 
              width: isGroupChat ? 48 : 40, 
              height: isGroupChat ? 48 : 40, 
              borderRadius: isGroupChat ? 24 : 20 
            }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ 
            color: 'black', 
            fontSize: isGroupChat ? 18 : 16, 
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold'
          }}>
            {avatar}
          </Text>
        )}
      </View>

      {/* Channel Info */}
      <View style={{ flex: 1 }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: isGroupChat ? 4 : 2 
        }}>
          <Text style={{ 
            color: 'black', 
            fontSize: isGroupChat ? 18 : 16, 
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold',
            marginRight: isGroupChat ? 8 : 0,
          }}>
            {displayName}
          </Text>
        </View>
        
        <Text style={{ 
          color: hasUnread ? 'black' : (isGroupChat ? 'black' : '#888888'), 
          fontSize: isGroupChat ? 14 : 13,
          fontFamily: hasUnread ? 'Urbanist-Bold' : 'Urbanist-Regular',
        }}>
          {channel.lastMessage || (hasUnread ? `${channel.unreadCount} new message${channel.unreadCount > 1 ? 's' : ''}` : (isGroupChat ? 'Share updates with your fans' : 'No messages yet'))}
        </Text>
        
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginTop: isGroupChat ? 4 : 2 
        }}>
          {!isDM && (
            <Text style={{ 
              color: isGroupChat ? 'black' : '#666666', 
              fontSize: isGroupChat ? 12 : 11,
              fontFamily: 'Urbanist-Regular',
              fontWeight: isGroupChat ? 'bold' : 'normal',
            }}>
              {channel.memberCount} member{channel.memberCount !== 1 ? 's' : ''}
            </Text>
          )}
          
          {/* Show tip amount for DM channels */}
          {isDM && channel.memberTipAmounts && (() => {
            const otherMemberId = channel.members.find(memberId => memberId !== currentUserId);
            const tipAmountCents = otherMemberId ? channel.memberTipAmounts[otherMemberId] : 0;
            if (tipAmountCents > 0) {
              const tipAmount = tipAmountCents * 100; // Convert to actual currency
              return (
                <Text style={{ 
                  color: '#FFD700', 
                  fontSize: 11,
                  fontFamily: 'Urbanist-Bold',
                  marginRight: 8,
                }}>
                  💰 {formatPrice(tipAmount, userCurrency)}
                </Text>
              );
            }
            return null;
          })()}
          
          {channel.lastMessageAt && (
            <Text style={{ 
              color: isGroupChat ? 'black' : 'black', 
              fontSize: isGroupChat ? 12 : 11,
              fontFamily: 'Urbanist-Regular',
              marginLeft: isDM ? 0 : 8,
              fontWeight: isGroupChat ? 'bold' : 'normal',
            }}>
              {formatLastMessageTime(channel.lastMessageAt)}
            </Text>
          )}
          
          {isGroupChat && (
            <View style={{
              width: 8,
              height: 8,
              backgroundColor: 'black',
              borderRadius: 4,
              marginLeft: 8,
            }} />
          )}
        </View>
      </View>

      {/* Arrow or Unread Count Badge */}
      {channel.unreadCount > 0 ? (
        <View style={{
          backgroundColor: 'rgba(20, 20, 20, 0.62)',
          borderRadius: 12,
          minWidth: 24,
          height: 24,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 8,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold',
          }}>
            {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
          </Text>
        </View>
      ) : (
        <View style={{
          width: isGroupChat ? 24 : 20,
          height: isGroupChat ? 24 : 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ 
            color: isGroupChat ? 'black' : '#666666', 
            fontSize: isGroupChat ? 16 : 14 
          }}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};