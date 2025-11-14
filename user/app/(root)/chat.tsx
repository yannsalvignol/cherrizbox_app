import { CustomMessageAvatar } from '@/app/components/CustomMessageAvatar';
import { getTheme } from '@/lib/chat-theme';
import { dataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { imageCache } from '@/lib/image-cache';
import { client, connectUser } from '@/lib/stream-chat';
import { useTheme } from '@/lib/themes/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Client, Databases, Query } from 'react-native-appwrite';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Channel, Chat, MessageList, OverlayProvider, ReactionData } from 'stream-chat-react-native';
import loadingIcon from '../../assets/icon/loading-icon.png';
import { config } from '../../lib/appwrite';


import { CustomMessageModal } from '@/app/components/modals/CustomMessageModal';
import { FullScreenProfileModal } from '@/app/components/modals/FullScreenProfileModal';

import { CustomMessageInput } from '@/app/components/CustomMessageInput';
import { CustomMessageSimple } from '@/app/components/CustomMessageSimple';
import CustomReactionList from '@/app/components/CustomReactionList';
import { CustomThread } from '@/app/components/CustomThread';

// Declare global interface for chat screen handlers
declare global {
  var chatScreenHandlers: {
    handleLongPressMessage: (payload: any) => void;
    setSelectedMessage: (message: any) => void;
    setShowCustomModal: (show: boolean) => void;
  } | null;
}

// Custom MessageStatus component that hides the default timestamp completely
const CustomMessageStatus = () => {
  return null; // Hide the default timestamp completely
};

// Custom reactions for our chat
const customReactions: ReactionData[] = [
  { type: "love", Icon: () => <Text style={{ fontSize: 18 }}>❤️</Text> },
  { type: "like", Icon: () => <Text style={{ fontSize: 18 }}>👍</Text> },
  { type: "haha", Icon: () => <Text style={{ fontSize: 18 }}>😂</Text> },
  { type: "wow", Icon: () => <Text style={{ fontSize: 18 }}>😮</Text> },
  { type: "sad", Icon: () => <Text style={{ fontSize: 18 }}>😢</Text> },
  { type: "angry", Icon: () => <Text style={{ fontSize: 18 }}>😡</Text> },
  { type: "fire", Icon: () => <Text style={{ fontSize: 18 }}>🔥</Text> },
  { type: "100", Icon: () => <Text style={{ fontSize: 18 }}>💯</Text> },
  { type: "party", Icon: () => <Text style={{ fontSize: 18 }}>🎉</Text> },
  { type: "skull", Icon: () => <Text style={{ fontSize: 18 }}>💀</Text> },
];

export default function ChatScreen() {
  const { channelId, creatorName, chatType } = useLocalSearchParams();
  const { user, isStreamConnected, setIsStreamConnected, posts } = useGlobalContext();
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [groupChannel, setGroupChannel] = useState<any>(null);
  const [dmChannel, setDmChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChatType, setCurrentChatType] = useState(chatType || 'group');
  const [creatorThumbnail, setCreatorThumbnail] = useState<string | null>(null);
  const [creatorFullThumbnail, setCreatorFullThumbnail] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  // Creator data state
  const [creatorCurrency, setCreatorCurrency] = useState<string>('usd');
  const [creatorId, setCreatorId] = useState<string>('');
  
  // Full-screen profile picture state
  const [showFullScreenProfile, setShowFullScreenProfile] = useState(false);
  
  // Attachment preview modal state
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const [tipAmount, setTipAmount] = useState(5);
  
  // Full-screen image modal state
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImageUri, setFullScreenImageUri] = useState<string | null>(null);

  const colorScheme = useColorScheme();

  // Swipe gesture state
  const swipeTranslateX = useRef(new Animated.Value(0)).current;
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  // Fetch creator's currency from posts data
  useEffect(() => {
    if (creatorName && posts && posts.length > 0) {
      console.log('  [ChatScreen] Looking for creator currency for:', creatorName);
      console.log('  [ChatScreen] Available posts:', posts.length);
      
      // Find the creator's post to get their currency (same logic as in [id].tsx)
      const creatorPost = posts.find((post: any) => 
        post.title?.toLowerCase() === creatorName.toString().toLowerCase() ||
        post.creatorsname?.toLowerCase() === creatorName.toString().toLowerCase()
      );
      
      if (creatorPost) {
        console.log(' [ChatScreen] Found creator post:', creatorPost.title);
        
        // Extract currency from post data (same logic as in [id].tsx)
        const currency = creatorPost.currency || 
                        (creatorPost.payment ? JSON.parse(creatorPost.payment).currency : null) || 
                        'usd';
        
        // Extract creator account ID from post data
        const accountId = creatorPost.creatorId || creatorPost.accountId || '';
        
        console.log('  [ChatScreen] Creator currency:', currency);
        console.log('👤 [ChatScreen] Creator ID:', accountId);
        setCreatorCurrency(currency.toLowerCase());
        setCreatorId(accountId);
      } else {
        console.log('  [ChatScreen] Creator post not found, using defaults');
        setCreatorCurrency('usd');
        setCreatorId('');
      }
    }
  }, [creatorName, posts]);

  // Cleanup function for memory management
  useEffect(() => {
    return () => {
      console.log(`   [ChatScreen] Cleaning up on unmount...`);
      
      // Clean up data cache periodically when leaving chat
      dataCache.cleanup();
      
      // Preload images for better performance on return
      if (creatorThumbnail) {
        console.log(`  [ChatScreen] Preloading creator thumbnail for next visit`);
        imageCache.getCachedImageUri(creatorThumbnail).catch(() => {
          // Silently fail, not critical
        });
      }
      
      console.log(` [ChatScreen] Cleanup completed`);
    };
  }, [creatorThumbnail]);
  const [theme, setTheme] = useState(getTheme(appTheme));
  const router = useRouter();
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Get the current active channel based on chat type
  const currentChannel = currentChatType === 'group' ? groupChannel : dmChannel;
  


  // Handle long press on message
  const handleLongPressMessage = (payload: any) => {
    if (payload.message) {
      setSelectedMessage(payload.message);
      setShowCustomModal(true);
    }
  };

  // Expose handlers globally for custom attachments
  useEffect(() => {
    global.chatScreenHandlers = {
      handleLongPressMessage,
      setSelectedMessage,
      setShowCustomModal
    };
    
    return () => {
      global.chatScreenHandlers = null;
    };
  }, []);

  // Handle thread reply
  const handleThreadReply = (message: any) => {
    handleThreadOpen(message);
  };

  // Cache for preloaded thread messages
  const threadMessagesCache = useRef<Map<string, any[]>>(new Map());

  // Preload all thread messages when channel loads
  const preloadAllThreadMessages = async (channel: any) => {
    if (!channel || !channel.state.messages) return;
    
    console.log('  [ChatScreen] Starting thread preload for channel');
    const messages = Object.values(channel.state.messages);
    
    // Find messages that have thread replies (reply_count > 0)
    const messagesWithThreads = messages.filter((msg: any) => 
      msg.reply_count && msg.reply_count > 0
    );
    
    console.log(`  [ChatScreen] Found ${messagesWithThreads.length} messages with threads`);
    
    // Preload thread messages for each message with threads
    const preloadPromises = messagesWithThreads.map(async (message: any) => {
      try {
        const threadReplies = await channel.getReplies(message.id, {
          limit: 50,
        });
        
        // Cache the thread messages
        threadMessagesCache.current.set(message.id, threadReplies.messages);
        console.log(` [ChatScreen] Cached ${threadReplies.messages.length} messages for thread ${message.id.substring(0, 8)}...`);
        
        return threadReplies;
      } catch (error) {
        console.error(`  [ChatScreen] Error preloading thread ${message.id}:`, error);
        return null;
      }
    });
    
    // Wait for all thread preloading to complete
    const results = await Promise.allSettled(preloadPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`🎉 [ChatScreen] Successfully preloaded ${successful}/${messagesWithThreads.length} threads`);
  };

  // Preload thread messages when thread is set
  const handleThreadOpen = async (message: any) => {
    console.log('🧵 [ChatScreen] Opening thread for message:', message.id);
    setThread(message);
    
    // Check if we already have cached thread messages
    const cachedMessages = threadMessagesCache.current.get(message.id);
    if (cachedMessages) {
      console.log('⚡ [ChatScreen] Using cached thread messages:', cachedMessages.length);
      return;
    }
    
    // If not cached, load immediately (fallback)
    try {
      const threadReplies = await currentChannel?.getReplies(message.id, {
        limit: 50,
      });
      console.log(' [ChatScreen] Loaded thread messages on demand:', threadReplies?.messages?.length || 0);
      
      // Cache for future use
      if (threadReplies?.messages) {
        threadMessagesCache.current.set(message.id, threadReplies.messages);
      }
    } catch (error) {
      console.error('  [ChatScreen] Error loading thread messages:', error);
    }
  };

  useEffect(() => {
    setTheme(getTheme(appTheme));
  }, [appTheme]);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      bounceAnim.stopAnimation();
      bounceAnim.setValue(0);
    }
  }, [loading]);

  // Function to fetch creator's thumbnail
  const fetchCreatorThumbnail = async () => {
    try {
      if (!creatorName) return;
      
      // Get creator ID from channel ID
      let creatorId = '';
      if (channelId?.toString().startsWith('creator-')) {
        creatorId = channelId.toString().replace('creator-', '');
      } else if (channelId?.toString().startsWith('dm-')) {
        creatorId = channelId.toString().replace('dm-', '').split('-')[0];
      }
      
      if (creatorId && config.endpoint && config.projectId && config.databaseId && config.photoCollectionId) {
        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query photos collection for the creator's thumbnail
        const photos = await databases.listDocuments(
          config.databaseId,
          config.photoCollectionId,
          [Query.equal('creatorId', creatorId)]
        );
        
        if (photos.documents.length > 0) {
          const compressedThumbnail = photos.documents[0].compressed_thumbnail;
          const fullThumbnail = photos.documents[0].thumbnail;
          
          if (compressedThumbnail) {
            setCreatorThumbnail(compressedThumbnail);
          }
          
          if (fullThumbnail) {
            setCreatorFullThumbnail(fullThumbnail);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching creator thumbnail:', error);
    }
  };

  useEffect(() => {
    fetchCreatorThumbnail();
  }, [creatorName, channelId]);

  // Setup both channels once
  useEffect(() => {
    const setupChannels = async () => {
      try {
        if (!channelId || !user) return;

        // Connect to Stream Chat if not connected yet
        if (!isStreamConnected) {
          console.log('Stream Chat not connected, attempting to connect...');
          setLoading(true);
          try {
            await connectUser(user.$id);
            console.log(' Stream Chat connected successfully for chat screen');
            // Update global state to reflect the connection
            setIsStreamConnected(true);
          } catch (error) {
            console.error('  Failed to connect to Stream Chat:', error);
            setError('Failed to connect to chat. Please try again.');
            setLoading(false);
          return;
          }
        }

        // Get creator ID from channel ID
        let creatorId = '';
        if (channelId?.toString().startsWith('creator-')) {
          creatorId = channelId.toString().replace('creator-', '');
        } else if (channelId?.toString().startsWith('dm-')) {
          creatorId = channelId.toString().replace('dm-', '').split('-')[0];
        }

        if (!creatorId) {
          setError('Invalid channel ID');
          setLoading(false);
          return;
        }

        console.log('💬 Loading pre-setup channels for creator:', creatorId);

        // Use pre-setup group channel
        const groupChannelId = `creator-${creatorId}`;
        const groupChannel = client.channel('messaging', groupChannelId);
        
        try {
          // Check if channel is already watched (pre-setup)
          if (!groupChannel.state.isUpToDate) {
            console.log('  Watching group channel (not pre-setup)...');
          await groupChannel.watch();
          } else {
            console.log(' Group channel already watched (pre-setup)');
          }
          setGroupChannel(groupChannel);
          console.log(' Group channel loaded successfully:', {
            channelId: groupChannel.id,
            memberCount: Object.keys(groupChannel.state.members).length,
            messageCount: groupChannel.state.messages ? Object.keys(groupChannel.state.messages).length : 0
          });
          
          // Preload thread messages for group channel
          setTimeout(() => {
            preloadAllThreadMessages(groupChannel);
          }, 1000); // Small delay to let the channel fully load
          
        } catch (groupError) {
          console.error('Error loading group channel:', groupError);
        }

        // Use pre-setup DM channel
        const dmChannelId = `dm-${creatorId}-${user.$id}`;
        const dmChannel = client.channel('messaging', dmChannelId);
        
        try {
          // Check if channel is already watched (pre-setup)
          if (!dmChannel.state.isUpToDate) {
            console.log('  Watching DM channel (not pre-setup)...');
          await dmChannel.watch();
          } else {
            console.log(' DM channel already watched (pre-setup)');
          }
          setDmChannel(dmChannel);
          console.log(' DM channel loaded successfully:', {
            channelId: dmChannel.id,
            memberCount: Object.keys(dmChannel.state.members).length,
            members: Object.keys(dmChannel.state.members)
          });
          
          // Preload thread messages for DM channel
          setTimeout(() => {
            preloadAllThreadMessages(dmChannel);
          }, 1000); // Small delay to let the channel fully load
          
        } catch (dmError) {
          console.error('Error loading DM channel:', dmError);
        }

        setError(null);
      } catch (error) {
        console.error('Error loading channels:', error);
        setError('Failed to load channels');
      } finally {
        setLoading(false);
      }
    };

    setupChannels();
  }, [channelId, user, isStreamConnected]);

  // Function to open image in full screen
  const openImageInFullScreen = (imageUri: string) => {
    setFullScreenImageUri(imageUri);
    setShowFullScreenImage(true);
  };

  // Function to switch between chat types - no navigation needed
  const switchChatType = () => {
    const newChatType = currentChatType === 'group' ? 'direct' : 'group';
    setCurrentChatType(newChatType);
    console.log('   Switched to:', newChatType, 'chat');
  };

  // Function to switch chat type with haptic feedback (for toggle buttons)
  const switchChatTypeWithHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switchChatType();
  };

  // Handle swipe gesture
  const onSwipeGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: swipeTranslateX } }],
    { useNativeDriver: true }
  );

  const onSwipeHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // Determine if swipe is significant enough to switch
      const shouldSwitch = Math.abs(translationX) > 50 || Math.abs(velocityX) > 500;
      
      if (shouldSwitch) {
        // Determine direction and switch accordingly
        if (translationX > 0 && currentChatType === 'direct') {
          // Swipe right: direct -> group
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          switchChatType();
        } else if (translationX < 0 && currentChatType === 'group') {
          // Swipe left: group -> direct
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          switchChatType();
        }
      }
      
      // Reset animation
      Animated.spring(swipeTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      
      setIsSwipeActive(false);
    } else if (event.nativeEvent.state === State.BEGAN) {
      setIsSwipeActive(true);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: appTheme.backgroundTertiary, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.Image
            source={loadingIcon}
            style={{ width: 60, height: 60, marginBottom: 16, transform: [{ translateY: bounceAnim }] }}
            resizeMode="contain"
          />
          <Text style={{ color: appTheme.text, fontSize: 16, fontFamily: 'questrial' }}>
            Loading chat...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !currentChannel) {
    return (
      <View style={{ flex: 1, backgroundColor: appTheme.backgroundTertiary, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: appTheme.text, fontSize: 18, fontFamily: 'questrial', textAlign: 'center', marginBottom: 16 }}>
            {error || 'Channel not found'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: appTheme.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: appTheme.textInverse, fontSize: 16, fontFamily: 'questrial' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

    return (
      <View style={{ flex: 1, backgroundColor: appTheme.backgroundTertiary, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
        

      <OverlayProvider>
        <Chat client={client} style={theme}>
          <Channel
            channel={currentChannel}
            keyboardVerticalOffset={0}
            thread={thread}
            threadList={!!thread}

                          onLongPressMessage={handleLongPressMessage}
              onPressMessage={({ message }) => {
                // Only open thread for non-poll messages
                // For poll messages, let the poll handle its own interactions
                if (message && !message.poll) {
                  handleThreadOpen(message);
                }
              }}
              MessageSimple={(props: any) => <CustomMessageSimple {...props} client={client} onThreadSelect={handleThreadOpen} />}
            MessageAvatar={CustomMessageAvatar}
            MessageStatus={CustomMessageStatus}
            ReactionListTop={CustomReactionList}
            ReactionListBottom={() => null}
            ShowThreadMessageInChannelButton={() => null}
            supportedReactions={customReactions}
            messageActions={() => []} // Disable default message actions
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: appTheme.backgroundTertiary,
              position: 'relative'
            }}>
              {/* Thread back button */}
              {thread && (
              <TouchableOpacity 
                  onPress={() => setThread(null)}
                style={{
                    position: 'absolute', 
                    left: 16,
                    zIndex: 10,
                    padding: 8,
                    backgroundColor: appTheme.backgroundTertiary,
                    borderRadius: 20,
                }}
              >
                  <Ionicons name="chevron-back-outline" size={24} color={appTheme.text} />
              </TouchableOpacity>
              )}
              
              {/* SynopsisX Icon - Positioned absolutely on the left */}
              {!thread && (
                <TouchableOpacity 
                  onPress={() => router.back()}
                  style={{
                  position: 'absolute',
                  left: 16,
                  flexDirection: 'row',
                  alignItems: 'center'
                  }}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={require('../../assets/images/cherry-icon-low.png')}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      backgroundColor: appTheme.cardBackground,
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
              
              {/* Centered Text */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Text style={{ 
                  fontSize: thread ? 20 : 40,
                  color: appTheme.text, 
                  fontFamily: thread ? 'questrial' : 'MuseoModerno-Regular'
                }} allowFontScaling={false}>
                  {thread ? 'Thread' : 'SynopsisX'}
                </Text>
              </View>
              
              {/* Creator's photo - Positioned absolutely on the right */}
              {!thread && (
                <TouchableOpacity 
                  onPress={() => setShowFullScreenProfile(true)}
                  style={{
                  position: 'absolute',
                  right: 16,
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: appTheme.backgroundSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                  }}
                  activeOpacity={0.7}
                >
                  {creatorThumbnail ? (
                    <Image
                      source={{ uri: creatorThumbnail }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
              <Text style={{ 
                      fontSize: 24,
                      fontWeight: 'bold',
                color: appTheme.textInverse, 
                fontFamily: 'questrial'
              }}>
                      {(creatorName as string)?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
                  )}
            </TouchableOpacity>
              )}
            </View>
            

            
            {/* Conditional rendering based on thread state */}
            {thread ? (
              <CustomThread 
                currentChatType={currentChatType as string}
                setSelectedAttachment={setSelectedAttachment}
                selectedAttachment={selectedAttachment}
                tipAmount={tipAmount}
                setTipAmount={setTipAmount}
                currentChannel={currentChannel}
                creatorCurrency={creatorCurrency}
                creatorName={creatorName as string}
                userId={user?.$id || ''}
                creatorId={creatorId}
                client={client}
                threadMessagesCache={threadMessagesCache}
              />
            ) : (
              <>
                <View style={{ flex: 1, position: 'relative' }}>
                  <PanGestureHandler
                    onGestureEvent={onSwipeGestureEvent}
                    onHandlerStateChange={onSwipeHandlerStateChange}
                    activeOffsetX={[-10, 10]}
                    failOffsetY={[-20, 20]}
                  >
                    <Animated.View 
                      style={{ 
                        flex: 1,
                        transform: [{ 
                          translateX: swipeTranslateX.interpolate({
                            inputRange: [-100, 0, 100],
                            outputRange: [-30, 0, 30],
                            extrapolate: 'clamp'
                          })
                        }]
                      }}
                    >
                      <MessageList 
                        DateHeader={() => null}
                        EmptyStateIndicator={() => (
                          <View style={{ flex: 1, backgroundColor: appTheme.backgroundTertiary, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                            <Image
                              source={loadingIcon}
                              style={{ width: 60, height: 60, marginBottom: 18, opacity: 0.8 }}
                              resizeMode="contain"
                            />
                            <Text style={{ color: appTheme.text, fontSize: 18, fontFamily: 'questrial', textAlign: 'center', opacity: 0.7 }}>
                              No messages yet. Start the conversation!
                            </Text>
                          </View>
                        )}
                        onThreadSelect={setThread}
                      />
                    </Animated.View>
                  </PanGestureHandler>
                  
                  {/* Creator Name Banner with Toggle - Floating on top */}
                  <Animated.View style={{
                    position: 'absolute',
                    top: 4,
                    left: '5%',
                    width: '90%',
                    backgroundColor: appTheme.cardBackground,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    borderRadius: 20,
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 6,
                    alignItems: 'center',
                    zIndex: 15,
                    transform: [{ 
                      translateX: swipeTranslateX.interpolate({
                        inputRange: [-100, 0, 100],
                        outputRange: [-10, 0, 10],
                        extrapolate: 'clamp'
                      })
                    }]
                  }}>
                    {/* Top row - Creator info */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                      marginBottom: 12,
                    }}>
                      {/* Creator Thumbnail */}
                      <TouchableOpacity 
                        onPress={() => setShowFullScreenProfile(true)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                backgroundColor: appTheme.backgroundSecondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          marginRight: 12,
                        }}
                        activeOpacity={0.7}
                      >
                        {creatorThumbnail ? (
                          <Image
                            source={{ uri: creatorThumbnail }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={{
                            color: appTheme.textInverse,
                            fontSize: 14,
                            fontWeight: 'bold',
                          }}>
                            {(creatorName as string)?.charAt(0)?.toUpperCase() || 'C'}
                          </Text>
                        )}
                      </TouchableOpacity>
                      
                      {/* Creator Name */}
                      <Text style={{
                        color: appTheme.text,
                        fontSize: 24,
                        fontFamily: 'MuseoModerno-Regular',
                      }}>
                        {creatorName || 'Creator'}
                      </Text>
                    </View>

                    {/* Bottom row - Chat Type Toggle */}
                <View style={{
                      width: '80%',
                      backgroundColor: appTheme.toogleBackgroundSwitchColor,
                  borderRadius: 25,
                  height: 40,
                  overflow: 'hidden',
                      flexDirection: 'row',
                      padding: 4,
                }}>
                  {/* Group Chat Button */}
                  <TouchableOpacity
                    onPress={() => currentChatType !== 'group' && switchChatTypeWithHaptic()}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                          backgroundColor: currentChatType === 'group' ? appTheme.toogleSwitchColor : 'transparent',
                          borderRadius: 20,
                      height: '100%',
                          borderWidth: currentChatType === 'group' ? 1 : 0,
                          borderColor: currentChatType === 'group' ? 'transparent' : 'transparent',
                          shadowColor: currentChatType === 'group' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: currentChatType === 'group' ? 0.1 : 0,
                          shadowRadius: 2,
                          elevation: currentChatType === 'group' ? 2 : 0,
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons 
                      name="people" 
                      size={16} 
                      color={currentChatType === 'group' ? appTheme.text : appTheme.textSecondary} 
                    />
                    <Text style={{
                          color: appTheme.text,
                      fontSize: 13,
                          fontFamily: 'MuseoModerno-Regular',

                    }}>
                          Group
                    </Text>
                  </TouchableOpacity>
                  {/* Direct Message Button */}
                  <TouchableOpacity
                    onPress={() => currentChatType !== 'direct' && switchChatTypeWithHaptic()}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                          backgroundColor: currentChatType === 'direct' ? appTheme.toogleSwitchColor : 'transparent',
                          borderRadius: 20,
                      height: '100%',
                          borderWidth: currentChatType === 'direct' ? 1 : 0,
                          borderColor: currentChatType === 'direct' ? appTheme.border : 'transparent',
                          shadowColor: currentChatType === 'direct' ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: currentChatType === 'direct' ? 0.1 : 0,
                          shadowRadius: 2,
                          elevation: currentChatType === 'direct' ? 2 : 0,
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons 
                      name="chatbubble-ellipses" 
                      size={16} 
                      color={currentChatType === 'direct' ? appTheme.text : appTheme.textSecondary} 
                    />
                    <Text style={{
                          color: appTheme.text,
                      fontSize: 13,
                          fontFamily: 'MuseoModerno-Regular',

                    }}>
                      AI-Twin
                    </Text>
                  </TouchableOpacity>
                </View>

                    {/* Swipe Direction Indicators */}
                    {isSwipeActive && (
                      <>
                        {/* Left Arrow (Swipe to Direct) */}
                        <Animated.View style={{
                          position: 'absolute',
                          left: -40,
                          top: '50%',
                          opacity: swipeTranslateX.interpolate({
                            inputRange: [-50, -20, 0],
                            outputRange: [1, 0.5, 0],
                            extrapolate: 'clamp'
                          }),
                          transform: [
                            { translateY: -12 }
                          ]
                        }}>
                          <Ionicons name="chevron-back" size={24} color={appTheme.primary} />
                        </Animated.View>

                        {/* Right Arrow (Swipe to Group) */}
                        <Animated.View style={{
                          position: 'absolute',
                          right: -40,
                          top: '50%',
                          opacity: swipeTranslateX.interpolate({
                            inputRange: [0, 20, 50],
                            outputRange: [0, 0.5, 1],
                            extrapolate: 'clamp'
                          }),
                          transform: [
                            { translateY: -12 }
                          ]
                        }}>
                          <Ionicons name="chevron-forward" size={24} color={appTheme.primary} />
                        </Animated.View>
                      </>
                    )}
              </Animated.View>
                  
                  {/* Bottom blur zone with rounded top corners - only show in group chat (box) */}
                  {currentChatType === 'group' && (
                    <View style={{
                      position: 'absolute',
                      bottom: -100,
                      left: 0,
                      right: 0,
                      height: 130,
                      borderTopLeftRadius: 40,
                      borderTopRightRadius: 40,
                      overflow: 'hidden',
                      pointerEvents: 'none',
                    }}>
                      <BlurView
                        intensity={Platform.OS === 'ios' ? 25 : 5}
                        {...(Platform.OS === 'android' && {
                          tint: 'dark',
                          experimentalBlurMethod: 'dimezisBlurView'
                        })}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                      />
                    </View>
                  )}
                    </View>
                
                <CustomMessageInput 
                  currentChatType={currentChatType as string}
                  setSelectedAttachment={setSelectedAttachment}
                  selectedAttachment={selectedAttachment}
                  tipAmount={tipAmount}
                  setTipAmount={setTipAmount}
                  currentChannel={currentChannel}
                  creatorCurrency={creatorCurrency}
                  creatorName={creatorName as string}
                  userId={user?.$id || ''}
                  creatorId={creatorId}
                />
              </>
            )}

            {/* Custom Message Modal */}
            <CustomMessageModal
              visible={showCustomModal}
              onClose={() => setShowCustomModal(false)}
              message={selectedMessage}
              onThreadReply={handleThreadReply}
            />

          </Channel>
        </Chat>
      </OverlayProvider>
      
      {/* Full Screen Profile Picture Modal - At highest level */}
      <FullScreenProfileModal
        visible={showFullScreenProfile}
        onClose={() => setShowFullScreenProfile(false)}
        imageUrl={creatorFullThumbnail || creatorThumbnail}
        creatorName={creatorName as string}
      />
            
    </View>
  );
} 