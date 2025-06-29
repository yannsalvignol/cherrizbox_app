import { useGlobalContext } from '@/lib/global-provider';
import { client } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Client, Databases, Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel, Chat, DeepPartial, MessageInput, MessageList, MessageSimple, OverlayProvider, Theme, Thread, useMessageContext } from 'stream-chat-react-native';
import loadingIcon from '../../assets/icon/loading-icon.png';
import { config } from '../../lib/appwrite';

// Custom Message Input for Group Chat Restrictions
const CustomMessageInput = ({ currentChatType }: { currentChatType: string }) => {
  // For group chats, show a message that encourages thread replies
  if (currentChatType === 'group') {
    return (
      <View style={{
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
      }}>
        <View style={{
          backgroundColor: '#2A2A2A',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 16,
          alignItems: 'center',
          flexDirection: 'row',
        }}>
          <Ionicons 
            name="chatbubble-outline" 
            size={20} 
            color="#FB2355" 
            style={{ marginRight: 12 }}
          />
          <Text style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontFamily: 'questrial',
            flex: 1,
            textAlign: 'center',
          }}>
            Tap on any message to reply in a thread
          </Text>
          <Ionicons 
            name="arrow-up-circle-outline" 
            size={20} 
            color="#FB2355" 
            style={{ marginLeft: 12 }}
          />
        </View>
        <Text style={{
          color: '#666666',
          fontSize: 12,
          fontFamily: 'questrial',
          textAlign: 'center',
          marginTop: 8,
          fontStyle: 'italic',
        }}>
          Group chats are thread-only to keep conversations organized
        </Text>
      </View>
    );
  }
  
  // For direct messages, use normal message input
  return <MessageInput />;
};

// Custom theme for the chat - focused on timestamp visibility
const getTheme = (): DeepPartial<Theme> => ({
  colors: {
    black: '#1A1A1A',
    white: '#FFFFFF',
    primary: '#FB2355',
    grey: '#2A2A2A',
    grey_whisper: '#404040',
    grey_gainsboro: '#666666',
    grey_light: '#999999',
    grey_medium: '#CCCCCC',
    grey_dark: '#FFFFFF',
    accent_blue: '#FB2355',
    accent_green: '#FB2355',
    accent_red: '#FB2355',
  },
  messageInput: {
    container: {
      backgroundColor: '#1A1A1A',
    },
    inputBoxContainer: {
      backgroundColor: '#2A2A2A',
    },
    inputBox: {
      color: '#FFFFFF',
    },
  },
  messageList: {
    container: {
      backgroundColor: '#2A2A2A',
    },
  },
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: '#FB2355',
        borderWidth: 0,
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: '#FB2355',
      },
    },
  },
});

// Custom MessageSimple component that includes visible timestamps with 5-minute logic
const CustomMessageSimple = (props: any) => {
  // Get message from useMessageContext hook
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const channel = messageContext?.channel;
  
  // Function to check if we should show timestamp based on 5-minute logic
  const shouldShowTimestamp = () => {
    if (!message?.created_at || !message?.user?.id || !channel) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    // Get all messages from the channel
    const messages = Object.values(channel.state.messages || {});
    
    // Find all messages from the same user
    const userMessages = messages
      .filter((msg: any) => msg.user?.id === currentUserId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentMessageIndex = userMessages.findIndex((msg: any) => msg.id === message.id);
    
    // If this is the last message from this user overall, show timestamp
    if (currentMessageIndex === userMessages.length - 1) {
      return true;
    }
    
    // Get the next message from the same user
    const nextMessage = userMessages[currentMessageIndex + 1];
    if (!nextMessage?.created_at) {
      return true; // Show timestamp if we can't find next message
    }
    
    const nextMessageTime = new Date(nextMessage.created_at);
    const timeDifference = nextMessageTime.getTime() - currentMessageTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show timestamp if more than 5 minutes will pass before the next message
    return timeDifference >= fiveMinutesInMs;
  };
  
  return (
    <View>
      {/* Render the default MessageSimple */}
      <MessageSimple {...props} />
      
      {/* Add our custom timestamp below */}
      {shouldShowTimestamp() && (
        <View style={{ 
          paddingTop: 4,
          paddingBottom: 6,
          paddingHorizontal:0, 
          alignItems: 'flex-start',
          backgroundColor: 'transparent',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <Ionicons 
              name="checkmark" 
              size={12} 
              color="#00C851" // Green color
              style={{ opacity: 0.8 }}
            />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: '500',
              fontFamily: 'questrial',
              opacity: 0.7,
            }}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default function ChatScreen() {
  const { channelId, creatorName, chatType } = useLocalSearchParams();
  const { user, isStreamConnected } = useGlobalContext();
  const [groupChannel, setGroupChannel] = useState<any>(null);
  const [dmChannel, setDmChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChatType, setCurrentChatType] = useState(chatType || 'group');
  const [creatorThumbnail, setCreatorThumbnail] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(getTheme());
  const router = useRouter();
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Get the current active channel based on chat type
  const currentChannel = currentChatType === 'group' ? groupChannel : dmChannel;

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
          const thumbnail = photos.documents[0].thumbnail;
          if (thumbnail) {
            setCreatorThumbnail(thumbnail);
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

        console.log('💬 Setting up both channels for creator:', creatorId);

        // Setup group channel
        const groupChannelId = `creator-${creatorId}`;
        const groupChannel = client.channel('messaging', groupChannelId);
        
        try {
          await groupChannel.watch();
          if (!groupChannel.state.members[user.$id]) {
            await groupChannel.addMembers([user.$id]);
          }
          setGroupChannel(groupChannel);
          console.log('✅ Group channel setup successful:', {
            channelId: groupChannel.id,
            memberCount: Object.keys(groupChannel.state.members).length,
            members: Object.keys(groupChannel.state.members),
            messageCount: groupChannel.state.messages ? Object.keys(groupChannel.state.messages).length : 0
          });
        } catch (groupError) {
          console.error('Error setting up group channel:', groupError);
        }

        // Setup DM channel
        const dmChannelId = `dm-${creatorId}-${user.$id}`;
        const dmChannel = client.channel('messaging', dmChannelId);
        
        try {
          await dmChannel.watch();
          // Add both creator and user to DM channel
          const membersToAdd = [];
          if (!dmChannel.state.members[creatorId]) {
            membersToAdd.push(creatorId);
          }
          if (!dmChannel.state.members[user.$id]) {
            membersToAdd.push(user.$id);
          }
          
          if (membersToAdd.length > 0) {
            await dmChannel.addMembers(membersToAdd);
          }
          
          setDmChannel(dmChannel);
          console.log('✅ DM channel setup successful:', {
            channelId: dmChannel.id,
            memberCount: Object.keys(dmChannel.state.members).length,
            members: Object.keys(dmChannel.state.members)
          });
        } catch (dmError) {
          console.error('Error setting up DM channel:', dmError);
        }

        setError(null);
      } catch (error) {
        console.error('Error setting up channels:', error);
        setError('Failed to set up channels');
      } finally {
        setLoading(false);
      }
    };

    setupChannels();
  }, [channelId, user, isStreamConnected]);

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
      <OverlayProvider>
        <Chat client={client} style={theme}>
          <Channel
            channel={currentChannel}
            keyboardVerticalOffset={0}
            thread={thread}
            threadList={!!thread}
            onPressMessage={({ message }) => {
              // Open thread when clicking on any message
              setThread(message);
            }}
            MessageSimple={CustomMessageSimple}
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
                    backgroundColor: '#2A2A2A',
                    borderRadius: 20,
                    padding: 8
                  }}
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
              )}
              
              {/* Cherrizbox Icon - Positioned absolutely on the left */}
              {!thread && (
                <View style={{
                  position: 'absolute',
                  left: 16,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
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
                </View>
              )}
              
              {/* Centered Text */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Text style={{ 
                  fontSize: thread ? 18 : 40,
                  fontWeight: 'bold',
                  color: 'white',
                  fontFamily: 'questrial'
                }}>
                  {thread ? 'Thread Reply' : 'Cherrizbox'}
                </Text>
                {!thread && (
                  <Text style={{ 
                    fontSize: 40,
                    fontWeight: 'bold',
                    color: '#FB2355',
                    fontFamily: 'questrial'
                  }}>
                    .
                  </Text>
                )}
              </View>
              
              {/* Creator's photo - Positioned absolutely on the right */}
              {!thread && (
                <View style={{
                  position: 'absolute',
                  right: 16,
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#2A2A2A',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
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
                </View>
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
              <Thread />
            ) : (
              <>
                <MessageList 
                  EmptyStateIndicator={() => (
                    <View style={{ flex: 1, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                      <Image
                        source={loadingIcon}
                        style={{ width: 60, height: 60, marginBottom: 18, opacity: 0.8 }}
                        resizeMode="contain"
                      />
                      <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'questrial', textAlign: 'center', opacity: 0.7 }}>
                        No messages yet. Start the conversation!
                      </Text>
                    </View>
                  )}
                  onThreadSelect={setThread}
                />
                <CustomMessageInput currentChatType={currentChatType as string} />
              </>
            )}
          </Channel>
        </Chat>
      </OverlayProvider>
    </SafeAreaView>
  );
} 