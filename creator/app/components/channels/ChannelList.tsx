import { type Channel } from '@/lib/index-utils';
import { client } from '@/lib/stream-chat';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ChannelItem } from './ChannelItem';
import type { Cluster } from './ClusterCard';
import { ClusterSection } from './ClusterSection';

// Channel ordering utilities
const isGroupChat = (channelId: string) => channelId.startsWith('creator-');
const isDMChat = (channelId: string) => channelId.startsWith('dm-');

type DMSortType = 'latest' | 'unread';

const getChannelTimestamp = (channel: Channel): number => {
  if (!channel.lastMessageAt) return 0;
  return new Date(channel.lastMessageAt).getTime();
};

const sortChannelsByTime = (channels: Channel[]): Channel[] => {
  return [...channels].sort((a, b) => {
    return getChannelTimestamp(b) - getChannelTimestamp(a); // Most recent first
  });
};

const sortChannelsByUnread = (channels: Channel[]): Channel[] => {
  return [...channels].sort((a, b) => {
    // First, sort by unread count (descending - channels with more unread messages first)
    const aUnread = a.unreadCount || 0;
    const bUnread = b.unreadCount || 0;
    
    if (aUnread !== bUnread) {
      return bUnread - aUnread;
    }
    
    // If unread counts are equal, sort by timestamp (most recent first)
    return getChannelTimestamp(b) - getChannelTimestamp(a);
  });
};

// Single source of truth for channel ordering
const orderChannels = (channels: Channel[], dmSortType: DMSortType = 'latest'): Channel[] => {
  const groupChats = channels.filter(c => isGroupChat(c.id));
  const dmChats = channels.filter(c => isDMChat(c.id));
  
  const sortedDMs = dmSortType === 'unread' 
    ? sortChannelsByUnread(dmChats)
    : sortChannelsByTime(dmChats);
  
  return [...groupChats, ...sortedDMs];
};


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
  onChannelReorder?: (channelId: string, newTimestamp: string) => void;
  onNewChannelAdded?: (channel: Channel) => void;
  clusters?: Cluster[];
  isLoadingClusters?: boolean;
  onAnswerForAll?: (cluster: Cluster) => void;
  onAnswerOneByOne?: (cluster: Cluster) => void;
  onViewAllClusters?: () => void;
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
  onTipCollected,
  onChannelReorder,
  onNewChannelAdded,
  clusters = [],
  isLoadingClusters = false,
  onAnswerForAll,
  onAnswerOneByOne,
  onViewAllClusters
}) => {
  const { theme } = useTheme();
  // Local state for real-time unread counts
  const [liveUnreadCounts, setLiveUnreadCounts] = useState<Map<string, number>>(new Map());
  // Ref to access current unread counts without stale closures
  const liveUnreadCountsRef = useRef<Map<string, number>>(new Map());
  
  // Track real-time updates separately from base channels
  const [realtimeUpdates, setRealtimeUpdates] = useState<Map<string, Partial<Channel>>>(new Map());
  
  // State for DM sorting preference
  const [dmSortType, setDmSortType] = useState<DMSortType>('latest');
  
  // Single source of truth: combine base channels with real-time updates and order them
  const orderedChannels = useMemo(() => {
    // Apply real-time updates to base channels
    const updatedChannels = channels.map(channel => {
      const updates = realtimeUpdates.get(channel.id);
      return updates ? { ...channel, ...updates } : channel;
    });
    
    // Apply consistent ordering with current DM sort preference
    const ordered = orderChannels(updatedChannels, dmSortType);
    
    // Only log in development or when there's a significant change
    if (process.env.NODE_ENV === 'development' && ordered.length !== channels.length) {
      console.log('🔧 [ChannelList] Channel count changed:', ordered.length, 'channels');
    }
    
    return ordered;
  }, [channels, realtimeUpdates, dmSortType]);
  
  // Queue for pending channel loads to avoid setState during render
  const pendingChannelLoads = useRef<Set<string>>(new Set());

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

  // Simplified function to update channel with new message timestamp
  const updateChannelTimestamp = useCallback((channelId: string, newTimestamp: string) => {
    console.log(`   [ChannelList] Updating timestamp for ${channelId}`);
    
    // Update real-time state
    setRealtimeUpdates(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(channelId) || {};
      newMap.set(channelId, {
        ...existing,
        lastMessageAt: newTimestamp
      });
      return newMap;
    });

    // Notify parent component about the update
    if (onChannelReorder) {
      onChannelReorder(channelId, newTimestamp);
    }
  }, [onChannelReorder]);

  // Create stable reference to channel IDs to prevent unnecessary re-renders
  const channelIdsRef = useRef<string>('');
  const channelIds = useMemo(() => {
    const newIds = channels.map(c => c.id).sort().join(',');
    // Only update if actually changed
    if (channelIdsRef.current !== newIds) {
      channelIdsRef.current = newIds;
    }
    return channelIdsRef.current;
  }, [channels]);

  // Function to load and add an unloaded channel when a message arrives
  const loadAndAddUnloadedChannel = useCallback(async (channelId: string, messageText: string, messageTimestamp: string) => {
    // Prevent duplicate loads
    if (pendingChannelLoads.current.has(channelId)) {
      console.log(`  [ChannelList] Channel ${channelId} is already being loaded, skipping`);
      return null;
    }
    
    pendingChannelLoads.current.add(channelId);
    try {
      console.log(`   [ChannelList] Loading unloaded channel: ${channelId}`);
      
      const streamChannel = client.channel('messaging', channelId);
      await streamChannel.watch();
      
      // Transform the Stream channel to our Channel format
      const channelData = streamChannel.data as any;
      const members = Object.values(streamChannel.state.members || {});
      
      const memberNames: { [userId: string]: string } = {};
      const memberAvatars: { [userId: string]: string } = {};
      const memberIds: string[] = [];
      
      members.forEach((member: any) => {
        const userId = member.user?.id || '';
        if (userId) {
          memberIds.push(userId);
          memberNames[userId] = member.user?.name || '';
          memberAvatars[userId] = member.user?.image || '';
        }
      });
      
      const newChannel: Channel = {
        id: channelId,
        type: 'messaging',
        name: channelData?.name || '',
        image: channelData?.image || null,
        memberCount: members.length,
        unreadCount: 1, // New message means at least 1 unread
        lastMessage: messageText,
        lastMessageAt: messageTimestamp,
        members: memberIds,
        memberNames,
        memberAvatars
      };
      
      console.log(` [ChannelList] Successfully loaded unloaded channel: ${channelId}`);
      
      // Update unread count for the new channel
      setLiveUnreadCounts(prev => {
        const newMap = new Map(prev);
        newMap.set(channelId, 1);
        // Also update the ref
        liveUnreadCountsRef.current = newMap;
        return newMap;
      });
      
      // Notify parent component about the new channel
      if (onNewChannelAdded) {
        onNewChannelAdded(newChannel);
      }
      
      return newChannel;
      
    } catch (error) {
      console.error(`   [ChannelList] Failed to load unloaded channel ${channelId}:`, error);
      return null;
    } finally {
      // Remove from pending loads
      pendingChannelLoads.current.delete(channelId);
    }
  }, [onNewChannelAdded]);

  // Global message handler for unloaded channels
  const handleGlobalNewMessage = useCallback((event: any) => {
    if (event.user?.id !== currentUserId && event.channel?.id) {
      const channelId = event.channel.id;
      const messageText = event.message?.text || '';
      const messageTimestamp = event.message?.created_at || new Date().toISOString();
      
      console.log(`  [ChannelList] Global message received from channel: ${channelId}`);
      
      // Check if this channel is already in our channels list
      const isChannelLoaded = channels.some(ch => ch.id === channelId);
          
          if (!isChannelLoaded) {
            console.log(`🆕 [ChannelList] Message from unloaded channel ${channelId}, loading it`);
            // Load the unloaded channel asynchronously
            loadAndAddUnloadedChannel(channelId, messageText, messageTimestamp);
          } else {
            // Channel is already loaded, individual listeners will handle this
            console.log(`📬 [ChannelList] Message from loaded channel ${channelId}, letting individual listener handle it`);
          }
    }
  }, [currentUserId, channels, loadAndAddUnloadedChannel]);

  // Track if listeners are already set up to prevent duplicates
  const listenersSetupRef = useRef(false);

  // Set up Stream Chat listeners for real-time updates (hybrid approach)
  useEffect(() => {
    if (!currentUserId) return;

    // Check if Stream Chat client is connected before setting up listeners
    if (!client.user) {
      console.log('  [ChannelList] Stream Chat not connected, skipping listener setup');
      return;
    }

    // Prevent duplicate setup
    if (listenersSetupRef.current) {
      console.log('ℹ️ [ChannelList] Listeners already set up, skipping');
      return;
    }

    console.log('   [ChannelList] Setting up Stream Chat listeners');
    listenersSetupRef.current = true;
    
    const unsubscribeFunctions: (() => void)[] = [];

    // Subscribe to global message events
    client.on('message.new', handleGlobalNewMessage);
    unsubscribeFunctions.push(() => client.off('message.new', handleGlobalNewMessage));

    // Only set up individual channel listeners if we have channels loaded
    if (channels.length === 0) {
      console.log('📋 [ChannelList] No channels loaded yet, only global listener active');
      return () => {
        console.log('🧹 [ChannelList] Cleaning up global Stream Chat listeners');
        unsubscribeFunctions.forEach(unsubscribe => {
          try {
            unsubscribe();
          } catch (error) {
            console.error('   [ChannelList] Error during global listener cleanup:', error);
          }
        });
      };
    }

    console.log('   [ChannelList] Setting up individual channel listeners for', channels.length, 'channels');
    
    const watchedChannels = new Map<string, any>(); // Store channel instances

    // Process channels in smaller batches to avoid rate limits
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 500; // 500ms between batches
    
    const processBatch = async (batch: any[], batchIndex: number) => {
      console.log(`   [ChannelList] Processing batch ${batchIndex + 1} with ${batch.length} channels`);
      
      const batchPromises = batch.map(async (channel, index) => {
        // Add small delay within batch
        await new Promise(resolve => setTimeout(resolve, index * 50));
        
        try {
          const streamChannel = client.channel('messaging', channel.id);
          
                                // Set up individual channel listeners
           const handleNewMessage = (event: any) => {
             if (event.user?.id !== currentUserId) {
               console.log(`  [ChannelList] Individual listener - New message in ${channel.id}`);
               
               // Check if this message contains a tip
               const messageText = event.message?.text || '';
               const isTipMessage = messageText.includes('Tip:');
               const messageTimestamp = event.message?.created_at || new Date().toISOString();
               
               console.log(`🕐 [ChannelList] Message timestamp for ${channel.id}: ${messageTimestamp}`);
               
               // Update unread count
               setLiveUnreadCounts(prev => {
                 const currentCount = prev.get(channel.id) || 0;
                 const newCount = currentCount + 1;
                 const newMap = new Map(prev);
                 newMap.set(channel.id, newCount);
                 // Also update the ref for immediate access
                 liveUnreadCountsRef.current = newMap;
                 
                 console.log(`🔢 [ChannelList] Unread count for ${channel.id}: ${currentCount} -> ${newCount}`);
                 
                 // Notify parent component with the correct count
                 if (onChannelUpdate) {
                   onChannelUpdate(channel.id, {
                     unreadCount: newCount,
                     lastMessage: messageText,
                     lastMessageAt: messageTimestamp,
                     ...(isTipMessage && { hasTip: true })
                   });
                 }
                 
                 return newMap;
               });
               
               // Update real-time channel data
               setRealtimeUpdates(prev => {
                 const newMap = new Map(prev);
                 const existing = newMap.get(channel.id) || {};
                 newMap.set(channel.id, {
                   ...existing,
                   lastMessage: messageText,
                   lastMessageAt: messageTimestamp,
                   ...(isTipMessage && { hasTip: true })
                 });
                 return newMap;
               })
               
               if (isTipMessage) {
                 console.log(`💰 [ChannelList] Tip message detected in ${channel.id}: ${messageText}`);
               }
             }
           };

          const handleMessageRead = (event: any) => {
            if (event.user?.id === currentUserId) {
              setLiveUnreadCounts(prev => {
                const oldCount = prev.get(channel.id) || 0;
                console.log(`👀 [ChannelList] Messages read in ${channel.id}, resetting unread count: ${oldCount} -> 0`);
                const newMap = new Map(prev);
                newMap.set(channel.id, 0);
                // Also update the ref
                liveUnreadCountsRef.current = newMap;
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
            console.log(` [ChannelList] Successfully watching channel ${channel.id}`);
          }
          
        } catch (error: any) {
          console.warn(`  [ChannelList] Failed to set up channel ${channel.id}:`, error.message);
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
          console.error(`   [ChannelList] Error processing batch ${batchIndex}:`, error);
        }
      }
      
      console.log(` [ChannelList] Completed setup for ${watchedChannels.size} channels`);
    };

    // Start processing channels
    processChannelsInBatches();

    // Cleanup function
    return () => {
      console.log('🧹 [ChannelList] Cleaning up Stream Chat listeners');
      listenersSetupRef.current = false;
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('   [ChannelList] Error during listener cleanup:', error);
        }
      });
    };
  }, [channelIds, currentUserId, handleGlobalNewMessage, updateChannelTimestamp, onChannelUpdate]); // Dependencies for listener setup

  // Initialize live unread counts from channels data
  useEffect(() => {
    const initialCounts = new Map();
    let totalUnread = 0;
    channels.forEach(channel => {
      const count = channel.unreadCount || 0;
      initialCounts.set(channel.id, count);
      totalUnread += count;
    });
    console.log(`🔢 [ChannelList] Initializing unread counts for ${channels.length} channels, total unread: ${totalUnread}`);
    setLiveUnreadCounts(initialCounts);
    // Also update the ref
    liveUnreadCountsRef.current = initialCounts;
  }, [channels]);

  // Clear real-time updates when channels change significantly
  useEffect(() => {
    // Clear real-time updates for channels that no longer exist
    setRealtimeUpdates(prev => {
      const newMap = new Map();
      channels.forEach(channel => {
        if (prev.has(channel.id)) {
          newMap.set(channel.id, prev.get(channel.id)!);
        }
      });
      return newMap;
    });
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

  const data = searchQuery ? filteredChannels : orderedChannels;

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
            {/* Cluster Section - Display between My Box and One-on-One Chats */}
            {isFirstDM && !searchQuery && clusters.length > 0 && onAnswerForAll && onAnswerOneByOne && (
              <ClusterSection
                clusters={clusters}
                isLoading={isLoadingClusters}
                onAnswerForAll={onAnswerForAll}
                onAnswerOneByOne={onAnswerOneByOne}
                onViewAll={onViewAllClusters}
                maxDisplay={3}
              />
            )}
            
            {/* Section header for first DM */}
            {isFirstDM && !searchQuery && (
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 20,
                backgroundColor: theme.backgroundTertiary,
                marginTop: clusters.length > 0 ? 8 : 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
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
                
                {/* Sort Toggle */}
                <TouchableOpacity
                  onPress={() => setDmSortType(prev => prev === 'latest' ? 'unread' : 'latest')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: theme.backgroundSecondary,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={dmSortType === 'unread' ? 'notifications' : 'time'} 
                    size={14} 
                    color={theme.textSecondary} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    fontFamily: 'Urbanist-Medium',
                    textTransform: 'capitalize',
                  }}>
                    {dmSortType === 'unread' ? 'Unread' : 'Latest'}
                  </Text>
                  <Ionicons 
                    name="chevron-down" 
                    size={12} 
                    color={theme.textSecondary} 
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
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
                  // Also update the ref
                  liveUnreadCountsRef.current = newMap;
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