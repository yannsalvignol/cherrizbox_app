import { getTheme } from '@/lib/chat-theme';
import { dataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { imageCache } from '@/lib/image-cache';
import { client } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Client, Databases, Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel, Chat, MessageAvatar, MessageList, OverlayProvider, ReactionData, useMessageContext, useThreadContext } from 'stream-chat-react-native';
import loadingIcon from '../../assets/icon/loading-icon.png';
import { config } from '../../lib/appwrite';


import { CustomMessageModal } from '@/app/components/modals/CustomMessageModal';
import { FullScreenProfileModal } from '@/app/components/modals/FullScreenProfileModal';

import { CustomMessageInput } from '@/app/components/CustomMessageInput';
import { CustomMessageSimple } from '@/app/components/CustomMessageSimple';
import { CustomThread } from '@/app/components/CustomThread';

// Declare global interface for chat screen handlers
declare global {
  var chatScreenHandlers: {
    handleLongPressMessage: (payload: any) => void;
    setSelectedMessage: (message: any) => void;
    setShowCustomModal: (show: boolean) => void;
  } | null;
}

// Cache for profile images to avoid repeated database calls
const profileImageCache = new Map<string, string>();

// Custom Avatar component that fetches profile images
export const CustomMessageAvatar = (props: any) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Get message from MessageContext instead of props
  const messageContext = useMessageContext();
  const message = messageContext?.message || props.message;
  const channel = messageContext?.channel;
  
  // Check if we're in a thread
  const threadContext = useThreadContext();
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  
  // Function to check if we should show avatar based on 5-minute logic (same as timestamp)
  const shouldShowAvatar = () => {
    if (!message?.created_at || !message?.user?.id) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel?.state.messages || {});
    
    // Find all messages from the same user
    const userMessages = messages
      .filter((msg: any) => msg.user?.id === currentUserId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentMessageIndex = userMessages.findIndex((msg: any) => msg.id === message.id);
    
    // If this is the last message from this user overall, show avatar
    if (currentMessageIndex === userMessages.length - 1) {
      return true;
    }
    
    // Get the next message from the same user
    const nextMessage = userMessages[currentMessageIndex + 1];
    if (!nextMessage?.created_at) {
      return true; // Show avatar if we can't find next message
    }
    
    const nextMessageTime = new Date(nextMessage.created_at);
    const timeDifference = nextMessageTime.getTime() - currentMessageTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show avatar if more than 5 minutes will pass before the next message
    return timeDifference >= fiveMinutesInMs;
  };
  
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!message || !message.user || !message.user.id) {
        return;
      }
      
      const userId = message.user.id;
      
      console.log(`👤 [CustomMessageAvatar] Loading avatar for user: ${userId.substring(0, 8)}...`);
      
      // Check dataCache first
      const cachedProfileData = dataCache.get(`profile_${userId}`) as {profileImageUri: string} | null;
      if (cachedProfileData && cachedProfileData.profileImageUri) {
        console.log(`✅ [CustomMessageAvatar] Profile data cache HIT`);
        const cachedImageUri = await imageCache.getCachedImageUri(cachedProfileData.profileImageUri);
        setProfileImage(cachedImageUri);
        console.log(`✅ [CustomMessageAvatar] Avatar loaded from cache`);
          return;
      }
      
      console.log(`❌ [CustomMessageAvatar] Profile data cache MISS - querying database...`);
      
      try {
        if (!config.endpoint || !config.projectId || !config.databaseId || !config.profileCollectionId) {
          return;
        }

        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query profiles collection for the user's profile image
        const profiles = await databases.listDocuments(
          config.databaseId,
          config.profileCollectionId,
          [Query.equal('userId', userId)]
        );
        
        if (profiles.documents.length > 0) {
          const profileImageUri = profiles.documents[0].compressed_thumbnail;
          if (profileImageUri) {
            console.log(`📊 [CustomMessageAvatar] Database result: Found profile image`);
            
            // Cache the profile data
            dataCache.set(`profile_${userId}`, { profileImageUri }, 10 * 60 * 1000); // 10 minutes
            console.log(`💾 [CustomMessageAvatar] Cached profile data for 10 minutes`);
            
            // Get cached image URI and set it
            const cachedImageUri = await imageCache.getCachedImageUri(profileImageUri);
            setProfileImage(cachedImageUri);
            console.log(`✅ [CustomMessageAvatar] Avatar loaded from database and cached`);
          } else {
            console.log(`⚠️ [CustomMessageAvatar] No profile image found for user`);
          }
        } else {
          console.log(`⚠️ [CustomMessageAvatar] No profile document found for user`);
        }
      } catch (error) {
        console.error('Error fetching user profile image:', error);
      }
    };
    
    fetchProfileImage();
  }, [message?.user?.id]);

  const showAvatar = shouldShowAvatar();

  // If we have a custom profile image, render it
  if (profileImage) {
    return (
      <View style={{
        width: props.size || 32,
        height: props.size || 32,
        borderRadius: (props.size || 32) / 2,
        marginRight: 8,
        overflow: 'hidden',
        backgroundColor: '#2A2A2A',
        opacity: showAvatar ? 1 : 0, // Make invisible but keep space
      }}>
        <Image
          source={{ uri: profileImage }}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fall back to default MessageAvatar if no custom image, also apply opacity
  return (
    <View style={{ opacity: showAvatar ? 1 : 0 }}>
      <MessageAvatar {...props} />
    </View>
  );
};

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
  const { user, isStreamConnected, posts } = useGlobalContext();
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

  // Fetch creator's currency from posts data
  useEffect(() => {
    if (creatorName && posts && posts.length > 0) {
      console.log('🔍 [ChatScreen] Looking for creator currency for:', creatorName);
      console.log('📊 [ChatScreen] Available posts:', posts.length);
      
      // Find the creator's post to get their currency (same logic as in [id].tsx)
      const creatorPost = posts.find((post: any) => 
        post.title?.toLowerCase() === creatorName.toString().toLowerCase() ||
        post.creatorsname?.toLowerCase() === creatorName.toString().toLowerCase()
      );
      
      if (creatorPost) {
        console.log('✅ [ChatScreen] Found creator post:', creatorPost.title);
        
        // Extract currency from post data (same logic as in [id].tsx)
        const currency = creatorPost.currency || 
                        (creatorPost.payment ? JSON.parse(creatorPost.payment).currency : null) || 
                        'usd';
        
        // Extract creator account ID from post data
        const accountId = creatorPost.creatoraccountid || creatorPost.accountId || '';
        
        console.log('💰 [ChatScreen] Creator currency:', currency);
        console.log('👤 [ChatScreen] Creator ID:', accountId);
        setCreatorCurrency(currency.toLowerCase());
        setCreatorId(accountId);
      } else {
        console.log('⚠️ [ChatScreen] Creator post not found, using defaults');
        setCreatorCurrency('usd');
        setCreatorId('');
      }
    }
  }, [creatorName, posts]);

  // Cleanup function for memory management
  useEffect(() => {
    return () => {
      console.log(`🧹 [ChatScreen] Cleaning up on unmount...`);
      
      // Clean up data cache periodically when leaving chat
      dataCache.cleanup();
      
      // Preload images for better performance on return
      if (creatorThumbnail) {
        console.log(`🚀 [ChatScreen] Preloading creator thumbnail for next visit`);
        imageCache.getCachedImageUri(creatorThumbnail).catch(() => {
          // Silently fail, not critical
        });
      }
      
      console.log(`✅ [ChatScreen] Cleanup completed`);
    };
  }, [creatorThumbnail]);
  const [theme, setTheme] = useState(getTheme());
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
    
    console.log('🚀 [ChatScreen] Starting thread preload for channel');
    const messages = Object.values(channel.state.messages);
    
    // Find messages that have thread replies (reply_count > 0)
    const messagesWithThreads = messages.filter((msg: any) => 
      msg.reply_count && msg.reply_count > 0
    );
    
    console.log(`📊 [ChatScreen] Found ${messagesWithThreads.length} messages with threads`);
    
    // Preload thread messages for each message with threads
    const preloadPromises = messagesWithThreads.map(async (message: any) => {
      try {
        const threadReplies = await channel.getReplies(message.id, {
          limit: 50,
        });
        
        // Cache the thread messages
        threadMessagesCache.current.set(message.id, threadReplies.messages);
        console.log(`✅ [ChatScreen] Cached ${threadReplies.messages.length} messages for thread ${message.id.substring(0, 8)}...`);
        
        return threadReplies;
      } catch (error) {
        console.error(`❌ [ChatScreen] Error preloading thread ${message.id}:`, error);
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
      console.log('✅ [ChatScreen] Loaded thread messages on demand:', threadReplies?.messages?.length || 0);
      
      // Cache for future use
      if (threadReplies?.messages) {
        threadMessagesCache.current.set(message.id, threadReplies.messages);
      }
    } catch (error) {
      console.error('❌ [ChatScreen] Error loading thread messages:', error);
    }
  };

  useEffect(() => {
    setTheme(getTheme());
  }, [colorScheme]);

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
          [Query.equal('IdCreator', creatorId)]
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

        // Wait for Stream Chat connection if not connected yet
        if (!isStreamConnected) {
          console.log('Waiting for Stream Chat connection...');
          setLoading(true);
          return;
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
            console.log('📡 Watching group channel (not pre-setup)...');
          await groupChannel.watch();
          } else {
            console.log('✅ Group channel already watched (pre-setup)');
          }
          setGroupChannel(groupChannel);
          console.log('✅ Group channel loaded successfully:', {
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
            console.log('📡 Watching DM channel (not pre-setup)...');
          await dmChannel.watch();
          } else {
            console.log('✅ DM channel already watched (pre-setup)');
          }
          setDmChannel(dmChannel);
          console.log('✅ DM channel loaded successfully:', {
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
    console.log('🔄 Switched to:', newChatType, 'chat');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.Image
            source={loadingIcon}
            style={{ width: 60, height: 60, marginBottom: 16, transform: [{ translateY: bounceAnim }] }}
            resizeMode="contain"
          />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'questrial' }}>
            Loading chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentChannel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: 'questrial', textAlign: 'center', marginBottom: 16 }}>
            {error || 'Channel not found'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: '#FB2355',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'questrial' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
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
              MessageSimple={(props: any) => <CustomMessageSimple {...props} client={client} />}
            MessageAvatar={CustomMessageAvatar}
            MessageStatus={CustomMessageStatus}
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
              backgroundColor: '#1A1A1A',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 20,
                }}
              >
                  <Ionicons name="chevron-back-outline" size={24} color="white" />
              </TouchableOpacity>
              )}
              
              {/* Cherrizbox Icon - Positioned absolutely on the left */}
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
                    source={require('../../assets/images/cherry-icon.png')}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      backgroundColor: 'white',
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
                  fontWeight: 'bold',
                  color: 'white', 
                  fontFamily: thread ? 'questrial' : 'MuseoModerno-Regular'
                }}>
                  {thread ? 'Thread' : 'cherrizbox'}
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
                  backgroundColor: '#2A2A2A',
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
                color: 'white', 
                fontFamily: 'questrial'
              }}>
                      {(creatorName as string)?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
                  )}
            </TouchableOpacity>
              )}
            </View>
            
            {/* Chat Type Toggle - Only show when not in thread */}
            {!thread && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                paddingVertical: 16,
                backgroundColor: '#1A1A1A',
                borderBottomWidth: 1,
                borderBottomColor: '#2A2A2A'
              }}>
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: '#1A1A1A',
                  borderRadius: 25,
                  borderWidth: 1,
                  borderColor: '#fff',
                  width: '100%',
                  height: 40,
                  overflow: 'hidden',
                }}>
                  {/* Group Chat Button */}
                  <TouchableOpacity
                    onPress={() => currentChatType !== 'group' && switchChatType()}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      backgroundColor: currentChatType === 'group' ? '#fff' : 'transparent',
                      borderRadius: 25,
                      height: '100%',
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons 
                      name="people" 
                      size={16} 
                      color={currentChatType === 'group' ? '#18181b' : '#888'} 
                    />
                    <Text style={{
                      color: currentChatType === 'group' ? '#18181b' : '#888',
                      fontSize: 13,
                      fontFamily: 'questrial',
                      fontWeight: currentChatType === 'group' ? 'bold' : '500'
                    }}>
                      {creatorName}'s Box
                    </Text>
                  </TouchableOpacity>
                  {/* Direct Message Button */}
                  <TouchableOpacity
                    onPress={() => currentChatType !== 'direct' && switchChatType()}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      backgroundColor: currentChatType === 'direct' ? '#fff' : 'transparent',
                      borderRadius: 25,
                      height: '100%',
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons 
                      name="chatbubble-ellipses" 
                      size={16} 
                      color={currentChatType === 'direct' ? '#18181b' : '#888'} 
                    />
                    <Text style={{
                      color: currentChatType === 'direct' ? '#18181b' : '#888',
                      fontSize: 13,
                      fontFamily: 'questrial',
                      fontWeight: currentChatType === 'direct' ? 'bold' : '500'
                    }}>
                      One on One
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
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
                <MessageList 
                  DateHeader={() => null}
                  EmptyStateIndicator={() => (
                    <View style={{ flex: 1, backgroundColor: '#DCDEDF', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                      <Image
                        source={loadingIcon}
                        style={{ width: 60, height: 60, marginBottom: 18, opacity: 0.8 }}
                        resizeMode="contain"
                      />
                      <Text style={{ color: '#1A1A1A', fontSize: 18, fontFamily: 'questrial', textAlign: 'center', opacity: 0.7 }}>
                        No messages yet. Start the conversation!
                      </Text>
                    </View>
                  )}
                  onThreadSelect={setThread}
                />
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
            
    </SafeAreaView>
  );
} 