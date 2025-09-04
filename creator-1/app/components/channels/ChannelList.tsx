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
  onChannelReorder?: (channelId: string, newTimestamp: string) => void;
  onNewChannelAdded?: (channel: Channel) => void;
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
  onNewChannelAdded
}) => {
  const { theme } = useTheme();
  // Local state for real-time unread counts
  const [liveUnreadCounts, setLiveUnreadCounts] = useState<Map<string, number>>(new Map());
  // Local state for real-time ordered channels (to handle reordering without parent re-render)
  const [orderedChannels, setOrderedChannels] = useState<Channel[]>(() => {
    // Ensure proper initial ordering: group chats first, then DM channels sorted by lastMessageAt
    const groupChats = channels.filter(c => c.id.startsWith('creator-'));
    const dmChannels = channels.filter(c => c.id.startsWith('dm-'))
      .sort((a, b) => {
        // Sort DM channels by lastMessageAt (most recent first)
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime; // Descending order (newest first)
      });
    
    const initialOrder = [...groupChats, ...dmChannels];
    console.log('🔧 [ChannelList] Initial channel order (sorted by lastMessageAt):', initialOrder.map(c => `${c.id} (${c.id.startsWith('creator-') ? 'GROUP' : 'DM'}) - ${c.lastMessageAt || 'NO_TIME'}`));
    return initialOrder;
  });
  
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

  // Function to reorder channels when new messages arrive (DM channels only)
  const reorderChannelForNewMessage = useCallback((channelId: string, newTimestamp: string) => {
    // Only reorder DM channels (not group chats)
    const isDMChannel = channelId.startsWith('dm-');
    if (!isDMChannel) return;

    console.log(`🔄 [ChannelList] Reordering DM channel ${channelId} to top`);
    
    setOrderedChannels(prevChannels => {
      // Find the channel that needs to be moved
      const channelIndex = prevChannels.findIndex(ch => ch.id === channelId);
      if (channelIndex === -1) return prevChannels; // Channel not found
      
      // Check if channel is already at the top of DM channels (after group chats)
      const firstDMIndex = prevChannels.findIndex(ch => ch.id.startsWith('dm-'));
      if (channelIndex === firstDMIndex) {
        console.log(`✅ [ChannelList] Channel ${channelId} is already at top of DMs, just updating timestamp`);
        // Channel is already at the top, just update the timestamp
        const updatedChannels = [...prevChannels];
        updatedChannels[channelIndex] = {
          ...prevChannels[channelIndex],
          lastMessageAt: newTimestamp
        };
        return updatedChannels;
      }
      
      const updatedChannel = {
        ...prevChannels[channelIndex],
        lastMessageAt: newTimestamp
      };
      
      // Create new array without the channel
      const channelsWithoutTarget = prevChannels.filter((_, index) => index !== channelIndex);
      
      // Separate group chats and DM channels
      const groupChats = channelsWithoutTarget.filter(ch => ch.id.startsWith('creator-'));
      const dmChannels = channelsWithoutTarget.filter(ch => ch.id.startsWith('dm-'));
      
      // Add the updated channel to the beginning of DM channels
      const reorderedDMChannels = [updatedChannel, ...dmChannels];
      
      // Combine group chats first, then reordered DM channels
      const reorderedChannels = [...groupChats, ...reorderedDMChannels];
      
      console.log(`✅ [ChannelList] Successfully moved ${channelId} to position ${groupChats.length}`);
      console.log('🔧 [ChannelList] Reorder result:', reorderedChannels.map(c => `${c.id} (${c.id.startsWith('creator-') ? 'GROUP' : 'DM'}) - ${c.lastMessageAt || 'NO_TIME'}`));
      return reorderedChannels;
    });

    // Notify parent component about the reordering
    if (onChannelReorder) {
      onChannelReorder(channelId, newTimestamp);
    }
  }, [onChannelReorder]);

  // Create stable reference to channel IDs to prevent unnecessary re-renders
  const channelIds = useMemo(() => channels.map(c => c.id).sort().join(','), [channels]);

  // Function to load and add an unloaded channel when a message arrives
  const loadAndAddUnloadedChannel = useCallback(async (channelId: string, messageText: string, messageTimestamp: string) => {
    // Prevent duplicate loads
    if (pendingChannelLoads.current.has(channelId)) {
      console.log(`⚠️ [ChannelList] Channel ${channelId} is already being loaded, skipping`);
      return null;
    }
    
    pendingChannelLoads.current.add(channelId);
    try {
      console.log(`🔄 [ChannelList] Loading unloaded channel: ${channelId}`);
      
      const streamChannel = client.channel('messaging', channelId);
      await streamChannel.watch();
      
      // Transform the Stream channel to our Channel format
      const channelData = streamChannel.data;
      const members = Object.values(streamChannel.state.members || {});
      
      const newChannel: Channel = {
        id: channelId,
        name: channelData?.name || '',
        image: channelData?.image || null,
        memberCount: members.length,
        unreadCount: 1, // New message means at least 1 unread
        lastMessage: messageText,
        lastMessageAt: messageTimestamp,
        members: members.map((member: any) => ({
          userId: member.user?.id || '',
          name: member.user?.name || '',
          image: member.user?.image || null
        }))
      };
      
      console.log(`✅ [ChannelList] Successfully loaded unloaded channel: ${channelId}`);
      
      // Add to ordered channels (preserve group chats at top)
      setOrderedChannels(prevChannels => {
        // Check if channel already exists (race condition protection)
        if (prevChannels.find(ch => ch.id === channelId)) {
          console.log(`⚠️ [ChannelList] Channel ${channelId} already exists, skipping add`);
          return prevChannels;
        }
        
        if (channelId.startsWith('dm-')) {
          // DM channels go to the TOP of DM section (after all group chats)
          const groupChats = prevChannels.filter(ch => ch.id.startsWith('creator-'));
          const dmChannels = prevChannels.filter(ch => ch.id.startsWith('dm-'));
          
          // New DM channel goes at the beginning of DM section
          return [...groupChats, newChannel, ...dmChannels];
        } else {
          // Group chats go at the very top (before all other channels)
          return [newChannel, ...prevChannels];
        }
      });
      
      // Update unread count for the new channel
      setLiveUnreadCounts(prev => {
        const newMap = new Map(prev);
        newMap.set(channelId, 1);
        return newMap;
      });
      
      // Notify parent component about the new channel
      if (onNewChannelAdded) {
        onNewChannelAdded(newChannel);
      }
      
      return newChannel;
      
    } catch (error) {
      console.error(`❌ [ChannelList] Failed to load unloaded channel ${channelId}:`, error);
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
      
      console.log(`📨 [ChannelList] Global message received from channel: ${channelId}`);
      
      // Use a microtask to ensure this runs after the current render cycle
      Promise.resolve().then(() => {
        // Check if this channel is already loaded in our ordered channels
        setOrderedChannels(currentOrderedChannels => {
          const isChannelLoaded = currentOrderedChannels.some(ch => ch.id === channelId);
          
          if (!isChannelLoaded) {
            console.log(`🆕 [ChannelList] Message from unloaded channel ${channelId}, loading it`);
            // Load the unloaded channel asynchronously
            loadAndAddUnloadedChannel(channelId, messageText, messageTimestamp);
          } else {
            // Channel is already loaded, individual listeners will handle this
            console.log(`📬 [ChannelList] Message from loaded channel ${channelId}, letting individual listener handle it`);
          }
          
          return currentOrderedChannels; // Return unchanged state
        });
      });
    }
  }, [currentUserId, loadAndAddUnloadedChannel]);

  // Set up Stream Chat listeners for real-time updates (hybrid approach)
  useEffect(() => {
    if (!currentUserId) return;

    // Check if Stream Chat client is connected before setting up listeners
    if (!client.user) {
      console.log('⚠️ [ChannelList] Stream Chat not connected, skipping listener setup');
      return;
    }

    console.log('🔄 [ChannelList] Setting up Stream Chat listeners');
    
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
            console.error('❌ [ChannelList] Error during global listener cleanup:', error);
          }
        });
      };
    }

    console.log('🔄 [ChannelList] Setting up individual channel listeners for', channels.length, 'channels');
    
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
               console.log(`📨 [ChannelList] Individual listener - New message in ${channel.id}`);
               
               // Check if this message contains a tip
               const messageText = event.message?.text || '';
               const isTipMessage = messageText.includes('Tip:');
               const messageTimestamp = event.message?.created_at || new Date().toISOString();
               
               console.log(`🕐 [ChannelList] Message timestamp for ${channel.id}: ${messageTimestamp}`);
               
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
                     lastMessageAt: messageTimestamp,
                     ...(isTipMessage && { hasTip: true })
                   });
                 }
                 
                 return newMap;
               });
               
               // Reorder channel to top if it's a DM channel
               reorderChannelForNewMessage(channel.id, messageTimestamp);
               
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
  }, [channelIds, currentUserId, handleGlobalNewMessage, reorderChannelForNewMessage]); // Include callback dependencies

  // Initialize live unread counts from channels data
  useEffect(() => {
    const initialCounts = new Map();
    channels.forEach(channel => {
      initialCounts.set(channel.id, channel.unreadCount || 0);
    });
    setLiveUnreadCounts(initialCounts);
  }, [channels]);

  // Sync ordered channels with incoming channels prop (but preserve real-time ordering)
  useEffect(() => {
    // ALWAYS ensure proper ordering regardless of incoming channel order
    console.log('🔧 [ChannelList] Incoming channels from parent:', channels.map(c => `${c.id} (${c.id.startsWith('creator-') ? 'GROUP' : 'DM'}) - ${c.lastMessageAt || 'NO_TIME'}`));
    
    // Only update if we have significant changes (new channels, removed channels)
    const currentIds = new Set(orderedChannels.map(c => c.id));
    const newIds = new Set(channels.map(c => c.id));
    
    // Check if there are new channels or removed channels
    const hasNewChannels = channels.some(c => !currentIds.has(c.id));
    const hasRemovedChannels = orderedChannels.some(c => !newIds.has(c.id));
    
    if (hasNewChannels || hasRemovedChannels) {
      console.log('🔄 [ChannelList] Syncing channels with new data');
      
      // Merge new channels while preserving existing order for DM channels
      const existingDMOrder = orderedChannels
        .filter(c => c.id.startsWith('dm-') && newIds.has(c.id))
        .map(c => c.id);
      
      // Get fresh data for all channels
      const channelMap = new Map(channels.map(c => [c.id, c]));
      
      // Rebuild ordered list - ALWAYS put group chats first
      const groupChats = channels.filter(c => c.id.startsWith('creator-'));
      const newDMChannels = channels.filter(c => c.id.startsWith('dm-'));
      
      console.log('🔧 [ChannelList] Group chats found:', groupChats.map(c => c.id));
      console.log('🔧 [ChannelList] DM channels found:', newDMChannels.map(c => c.id));
      
      let orderedDMChannels: Channel[];
      
      // Check if this is a full reload (no existing DM channels preserved)
      if (existingDMOrder.length === 0 && newDMChannels.length > 0) {
        console.log('🔄 [ChannelList] Full reload detected - sorting all DM channels by lastMessageAt');
        // Full reload: sort all DM channels by lastMessageAt
        orderedDMChannels = newDMChannels.sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
      } else {
        // Partial update: preserve real-time order for existing channels, sort new ones
        const existingDMChannels = existingDMOrder.map(id => channelMap.get(id)!).filter(Boolean);
        const newDMChannelsToAdd = newDMChannels.filter(c => !existingDMOrder.includes(c.id))
          .sort((a, b) => {
            // Sort new DM channels by lastMessageAt (most recent first)
            const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return bTime - aTime;
          });
        
        // Combine: existing DMs (preserve real-time order) + new DMs (sorted by time)
        orderedDMChannels = [...existingDMChannels, ...newDMChannelsToAdd];
      }
      
      const finalOrder = [...groupChats, ...orderedDMChannels];
      console.log('🔧 [ChannelList] Final sync order:', finalOrder.map(c => `${c.id} (${c.id.startsWith('creator-') ? 'GROUP' : 'DM'}) - ${c.lastMessageAt || 'NO_TIME'}`));
      
      setOrderedChannels(finalOrder);
    } else {
      // Update existing channels with fresh data while preserving order
      setOrderedChannels(prev => {
        const updated = prev.map(orderedChannel => {
          const freshChannel = channels.find(c => c.id === orderedChannel.id);
          if (freshChannel) {
            // Preserve the lastMessageAt from our ordered channels if it's more recent, otherwise use fresh data
            const orderedTimestamp = orderedChannel.lastMessageAt;
            const freshTimestamp = freshChannel.lastMessageAt;
            const useOrderedTimestamp = orderedTimestamp && (!freshTimestamp || new Date(orderedTimestamp) > new Date(freshTimestamp));
            
            return { 
              ...freshChannel, 
              lastMessageAt: useOrderedTimestamp ? orderedTimestamp : freshTimestamp 
            };
          }
          return orderedChannel;
        }).filter(c => channels.some(ch => ch.id === c.id)); // Remove any channels that no longer exist
        
        console.log('🔧 [ChannelList] Updated order (no new/removed):', updated.map(c => `${c.id} (${c.id.startsWith('creator-') ? 'GROUP' : 'DM'}) - ${c.lastMessageAt || 'NO_TIME'}`));
        return updated;
      });
    }
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