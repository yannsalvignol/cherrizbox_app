import { type Channel } from '@/lib/index-utils';
import { client } from '@/lib/stream-chat';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    Text,
    View
} from 'react-native';
import { ChannelItem } from './ChannelItem';

interface ChannelListProps {
  channels: Channel[];
  filteredChannels: Channel[];
  searchQuery: string;
  isLoading: boolean;
  refreshing: boolean;
  isLoadingMore: boolean;
  hasMoreChannels: boolean;
  channelsPerPage: number;
  currentUserId?: string;
  profileImage?: string | null;
  userName?: string;
  userCurrency: string;
  userProfileCache: React.MutableRefObject<Map<string, { 
    name: string; 
    avatar: string; 
    documentId: string; 
    timestamp: number 
  }>>;
  uncollectedTips: Set<string>;
  onRefresh: () => void;
  onLoadMore: () => void;
  onChannelPress?: (channelId: string) => void;
  onChannelUpdate?: (channelId: string, updates: Partial<Channel>) => void;
  onTipCollected?: (channelId: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  filteredChannels,
  searchQuery,
  isLoading,
  refreshing,
  isLoadingMore,
  hasMoreChannels,
  channelsPerPage,
  currentUserId,
  profileImage,
  userName,
  userCurrency,
  userProfileCache,
  uncollectedTips,
  onRefresh,
  onLoadMore,
  onChannelPress,
  onChannelUpdate,
  onTipCollected
}) => {
  const { theme } = useTheme();
  // Local state for real-time unread counts
  const [liveUnreadCounts, setLiveUnreadCounts] = useState<Map<string, number>>(new Map());

  // Clear app badge when channel list is viewed
  const clearAppBadgeOnView = () => {
    import('@notifee/react-native').then(({ default: notifee }) => {
      notifee.setBadgeCount(0).then(() => {
        console.log('📱 [Badge] Badge count cleared on channel list view');
      }).catch(error => {
        console.log('📱 [Badge] Failed to clear badge:', error);
      });
    }).catch(error => {
      console.log('📱 [Badge] Notifee not available:', error);
    });
  };

  // Create stable reference to channel IDs to prevent unnecessary re-renders
  const channelIds = useMemo(() => channels.map(c => c.id).sort().join(','), [channels]);

  // Set up Stream Chat listeners for real-time updates (hybrid approach)
  useEffect(() => {
    if (!currentUserId || channels.length === 0) return;

    // Check if Stream Chat client is connected before setting up listeners
    if (!client.user) {
      console.log('⚠️ [ChannelList] Stream Chat not connected, skipping listener setup');
      return;
    }

    console.log('🔄 [ChannelList] Setting up Stream Chat listeners for', channels.length, 'channels');
    
    const unsubscribeFunctions: (() => void)[] = [];
    const watchedChannels = new Map<string, any>(); // Store channel instances

    // Process channels in smaller batches to avoid rate limits
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 500; // 500ms between batches
    
    const processBatch = async (batch: any[], batchIndex: number) => {
      console.log(`🔄 [ChannelList] Processing batch ${batchIndex + 1} with ${batch.length} channels`);
      
      const batchPromises = batch.map(async (channel, index) => {
        // Add small delay within batch
        await new Promise(resolve => setTimeout(resolve, index * 50));
        
        try {
          const streamChannel = client.channel('messaging', channel.id);
          
          // Set up individual channel listeners
          const handleNewMessage = (event: any) => {
            if (event.user?.id !== currentUserId) {
              console.log(`📨 [ChannelList] New message in ${channel.id}, updating unread count`);
              
              // Check if this message contains a tip
              const messageText = event.message?.text || '';
              const isTipMessage = messageText.includes('Tip:');
              
              // Update unread count using functional state update to avoid stale closure
              setLiveUnreadCounts(prev => {
                const currentCount = prev.get(channel.id) || 0;
                const newCount = currentCount + 1;
                const newMap = new Map(prev);
                newMap.set(channel.id, newCount);
                
                // Notify parent component with the correct count
                if (onChannelUpdate) {
                  onChannelUpdate(channel.id, {
                    unreadCount: newCount,
                    lastMessage: messageText,
                    lastMessageAt: event.message?.created_at || new Date().toISOString(),
                    ...(isTipMessage && { hasTip: true })
                  });
                }
                
                return newMap;
              });
              
              if (isTipMessage) {
                console.log(`💰 [ChannelList] Tip message detected in ${channel.id}: ${messageText}`);
              }
            }
          };

          const handleMessageRead = (event: any) => {
            if (event.user?.id === currentUserId) {
              console.log(`👀 [ChannelList] Messages read in ${channel.id}, resetting unread count`);
              setLiveUnreadCounts(prev => {
                const newMap = new Map(prev);
                newMap.set(channel.id, 0);
                return newMap;
              });
              
              // Notify parent component
              if (onChannelUpdate) {
                onChannelUpdate(channel.id, { unreadCount: 0 });
              }
            }
          };

          // Subscribe to channel-specific events
          streamChannel.on('message.new', handleNewMessage);
          streamChannel.on('message.read', handleMessageRead);

          // Store unsubscribe functions
          unsubscribeFunctions.push(() => {
            streamChannel.off('message.new', handleNewMessage);
            streamChannel.off('message.read', handleMessageRead);
          });

          // Watch the channel if not already watched
          if (!streamChannel.initialized && !watchedChannels.has(channel.id)) {
            await streamChannel.watch();
            watchedChannels.set(channel.id, streamChannel);
            console.log(`✅ [ChannelList] Successfully watching channel ${channel.id}`);
          }
          
        } catch (error: any) {
          console.warn(`⚠️ [ChannelList] Failed to set up channel ${channel.id}:`, error.message);
          // Continue with other channels
        }
      });

      // Wait for all channels in this batch to complete
      await Promise.allSettled(batchPromises);
    };

    // Process channels in batches
    const processChannelsInBatches = async () => {
      // Prioritize group chats and channels with unread messages
      const prioritizedChannels = [...channels].sort((a, b) => {
        // Group chats first
        if (a.id.startsWith('creator-') && !b.id.startsWith('creator-')) return -1;
        if (!a.id.startsWith('creator-') && b.id.startsWith('creator-')) return 1;
        
        // Then channels with unread messages
        const aUnread = a.unreadCount || 0;
        const bUnread = b.unreadCount || 0;
        if (aUnread > 0 && bUnread === 0) return -1;
        if (aUnread === 0 && bUnread > 0) return 1;
        
        return 0;
      });

      for (let i = 0; i < prioritizedChannels.length; i += BATCH_SIZE) {
        const batch = prioritizedChannels.slice(i, i + BATCH_SIZE);
        const batchIndex = Math.floor(i / BATCH_SIZE);
        
        try {
          await processBatch(batch, batchIndex);
          
          // Wait between batches to avoid rate limits
          if (i + BATCH_SIZE < prioritizedChannels.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
          }
        } catch (error) {
          console.error(`❌ [ChannelList] Error processing batch ${batchIndex}:`, error);
        }
      }
      
      console.log(`✅ [ChannelList] Completed setup for ${watchedChannels.size} channels`);
    };

    // Start processing channels
    processChannelsInBatches();

    // Cleanup function
    return () => {
      console.log('🧹 [ChannelList] Cleaning up Stream Chat listeners');
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('❌ [ChannelList] Error during listener cleanup:', error);
        }
      });
    };
  }, [channelIds, currentUserId]); // Only depend on stable channel IDs and user ID

  // Initialize live unread counts from channels data
  useEffect(() => {
    const initialCounts = new Map();
    channels.forEach(channel => {
      initialCounts.set(channel.id, channel.unreadCount || 0);
    });
    setLiveUnreadCounts(initialCounts);
  }, [channels]);

  // Clear app badge when component mounts (user opens channel list)
  useEffect(() => {
    clearAppBadgeOnView();
  }, []); // Only run once when component mounts
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: theme.backgroundTertiary
      }}>
        <Image 
          source={require('../../../assets/icon/loading-icon.png')} 
          style={{ width: 80, height: 80, marginBottom: 16 }} 
        />
        <Text style={{ 
          color: theme.text, 
          fontSize: 18, 
          marginTop: 12,
          fontFamily: 'Urbanist-Bold'
        }}>
          Loading channels...
        </Text>
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <FlatList
        data={[]}
        renderItem={() => null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.backgroundTertiary}
          />
        }
        contentContainerStyle={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.backgroundTertiary,
          paddingHorizontal: 32
        }}
        style={{ backgroundColor: theme.backgroundTertiary }}
        ListEmptyComponent={
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="chatbubbles-outline" size={80} color={theme.textTertiary} style={{ marginBottom: 24 }} />
            <Text style={{ 
              color: theme.textTertiary, 
              fontSize: 20, 
              fontFamily: 'Urbanist-Bold',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              No chats yet
            </Text>
            <Text style={{ 
              color: theme.textSecondary, 
              fontSize: 16, 
              fontFamily: 'Urbanist-Regular',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 16
            }}>
              Start chatting with your fans and subscribers to build your community
            </Text>
            <Text style={{ 
              color: theme.primary, 
              fontSize: 14, 
              fontFamily: 'Urbanist-Medium',
              textAlign: 'center',
              lineHeight: 20
            }}>
              Pull down to reload and see your channels
            </Text>
          </View>
        }
      />
    );
  }

  const data = searchQuery ? filteredChannels : channels;

  return (
    <FlatList
      data={data}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
          progressBackgroundColor={theme.backgroundTertiary}
        />
      }
      renderItem={({ item, index }) => {
        const isGroupChat = item.id.startsWith('creator-');
        const isFirstDM = !isGroupChat && index > 0 && data[index - 1].id.startsWith('creator-');
        
        return (
          <View>
            {/* Section header for first DM */}
            {isFirstDM && !searchQuery && (
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 20,
                backgroundColor: theme.backgroundTertiary,
                marginTop: 16,
              }}>
                <Text style={{
                  color: theme.textTertiary,
                  fontSize: 14,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  One-on-One Chats
                </Text>
              </View>
            )}
            
            {/* Group chat section header */}
            {isGroupChat && index === 0 && !searchQuery && (
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                backgroundColor: theme.backgroundTertiary,
                marginBottom: 8,
              }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 14,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  My Box
                </Text>
              </View>
            )}
            
            <ChannelItem
              channel={{
                ...item,
                unreadCount: liveUnreadCounts.get(item.id) ?? item.unreadCount
              }}
              currentUserId={currentUserId}
              profileImage={profileImage}
              userName={userName}
              userCurrency={userCurrency}
              userProfileCache={userProfileCache}
              uncollectedTips={uncollectedTips}
              onTipCollected={onTipCollected}
              onChannelPress={(channelId) => {
                // Clear app badge when opening any chat
                clearAppBadgeOnView();
                
                // Optimistically update unread count immediately for better UX
                setLiveUnreadCounts(prev => {
                  const newMap = new Map(prev);
                  newMap.set(channelId, 0);
                  return newMap;
                });
                
                // Notify parent component immediately
                if (onChannelUpdate) {
                  onChannelUpdate(channelId, { unreadCount: 0 });
                }
                
                // Mark as read in background (let ChatScreen handle the actual markRead call)
                // This avoids duplicate API calls and rate limiting
                console.log(`📱 [ChannelList] Optimistically marked ${channelId} as read`);
                
                if (onChannelPress) {
                  onChannelPress(channelId);
                }
              }}
            />
          </View>
        );
      }}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ 
        paddingVertical: 6,
        backgroundColor: theme.backgroundTertiary
      }}
      style={{ backgroundColor: theme.backgroundTertiary }}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={10}
      initialNumToRender={15}
      getItemLayout={(data, index) => ({
        length: 80, // Approximate height of each item
        offset: 80 * index,
        index
      })}
      // Load more functionality
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={() => {
        if (isLoadingMore) {
          return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.text} />
              <Text style={{ color: theme.textTertiary, fontFamily: 'Urbanist-Regular', fontSize: 14, marginTop: 8 }}>
                Loading more chats...
              </Text>
            </View>
          );
        }
        if (!hasMoreChannels && channels.length >= channelsPerPage && !searchQuery) {
          return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.textTertiary, fontFamily: 'Urbanist-Regular', fontSize: 14 }}>
                All chats loaded
              </Text>
            </View>
          );
        }
        return null;
      }}
      ListEmptyComponent={() => {
        if (searchQuery) {
          return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
              <Ionicons name="search" size={60} color={theme.textTertiary} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.textTertiary, fontSize: 18, fontFamily: 'Urbanist-Bold', marginBottom: 8 }}>
                No results found
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Urbanist-Regular' }}>
                Try searching with a different term
              </Text>
            </View>
          );
        }
        return null;
      }}
    />
  );
};