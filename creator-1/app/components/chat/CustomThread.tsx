import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import {
  Chat,
  MessageInput,
  MessageList,
  OverlayProvider,
  useThreadContext
} from 'stream-chat-react-native';
import CustomMessageSimple from './CustomMessageSimple';

interface CustomThreadProps {
  channel: any;
  client: any;
  threadMessagesCache?: React.MutableRefObject<Map<string, any[]>>;
  user: any;
  userCurrency: string;
  showPollCreation: boolean;
  setShowPollCreation: (show: boolean) => void;
  uploadManager: any;
  onCloseThread: () => void;
}

export const CustomThread: React.FC<CustomThreadProps> = ({
  channel,
  client,
  threadMessagesCache,
  user,
  userCurrency,
  showPollCreation,
  setShowPollCreation,
  uploadManager,
  onCloseThread
}) => {
  const threadContext = useThreadContext();
  const thread = threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  const flatListRef = useRef<FlatList>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  
  // Get thread-specific theme with no negative margins (hardcoded for now)
  const threadTheme = {
    messageSimple: {
      container: {
        marginLeft: 0,  // Remove negative margin for threads
        marginRight: 0,
      },
    },
    messageList: {
      container: {
        backgroundColor: 'transparent',  // Make background transparent
        paddingHorizontal: 0,  // Remove padding that might affect positioning
      },
      listContainer: {
        backgroundColor: '#DCDEDF',  // Set the correct background color
      },
    },
    colors: {
      white: '#DCDEDF',  // Override white to use our background color
    },
  };

  // Helper function to format the original message preview
  const getOriginalMessagePreview = (message: any) => {
    if (!message) return 'Original message';
    
    // Handle different message types
    if (message.text) {
      // Text message - truncate if too long
      return message.text.length > 60 
        ? message.text.substring(0, 60) + '...'
        : message.text;
    }
    
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      
      // Handle different attachment types
      switch (attachment.type) {
        case 'custom_photo':
        case 'image':
          return '📷 Photo';
        case 'custom_audio':
          return '🎵 Voice message';
        case 'custom_video':
        case 'video':
          return '🎥 Video';
        case 'blurry_file':
        case 'file':
          return '📄 File';
        case 'paid_content':
          return '💎 Paid content';
        case 'paid_video':
          return '💎 Paid video';
        default:
          return '📎 Attachment';
      }
    }
    
    return 'Message';
  };

  // Helper function to get the user's display name
  const getUserDisplayName = (message: any) => {
    if (!message?.user) return 'Unknown';
    return message.user.name || message.user.id || 'User';
  };

  // Preload thread messages when thread is first opened
  useEffect(() => {
    const loadThreadMessages = async () => {
      if (thread && threadMessages.length === 0) {
        // Check if we have cached messages first
        const cachedMessages = threadMessagesCache?.current?.get(thread.id);
        if (cachedMessages && cachedMessages.length > 0) {
          console.log('⚡ [CustomThread] Using cached thread messages:', cachedMessages.length);
          setIsLoadingThread(false);
          
          // Scroll to bottom after a small delay
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }, 100);
          return;
        }
        
        console.log('🧵 [CustomThread] Loading thread messages for:', thread.id);
        setIsLoadingThread(true);
        
        try {
          // Query thread replies from the channel
          const threadReplies = await channel.getReplies(thread.id, {
            limit: 50, // Load up to 50 recent messages
          });
          
          console.log('✅ [CustomThread] Loaded', threadReplies.messages.length, 'thread messages');
          
          // Cache the messages for future use
          if (threadMessagesCache?.current) {
            threadMessagesCache.current.set(thread.id, threadReplies.messages);
          }
          
          // The messages should automatically update through the context
          // Force a small delay to ensure they're rendered
          setTimeout(() => {
            if (flatListRef.current && threadReplies.messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }, 200);
          
        } catch (error) {
          console.error('❌ [CustomThread] Error loading thread messages:', error);
        } finally {
          setIsLoadingThread(false);
        }
      }
    };

    loadThreadMessages();
  }, [thread?.id, channel, threadMessagesCache]);

  // Scroll to bottom when thread messages load or update
  useEffect(() => {
    if (threadMessages.length > 0 && flatListRef.current && !isLoadingThread) {
      // Small delay to ensure messages are rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [threadMessages.length, isLoadingThread]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (threadMessages.length > 0 && flatListRef.current && !isLoadingThread) {
      const latestMessage = threadMessages[threadMessages.length - 1];
      if (latestMessage && latestMessage.user?.id === user?.$id) {
        // If it's my message, scroll to bottom immediately
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    }
  }, [threadMessages, isLoadingThread, user?.$id]);

  if (!thread) {
    return null;
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#DCDEDF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={{ flex: 1 }}>
        {/* Thread Header with Back Button and Original Message */}
    <View style={{
          backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
          borderBottomColor: '#E5E5EA',
          paddingHorizontal: 16,
          paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
          minHeight: 60,
      }}>
        {/* Back Button */}
        <TouchableOpacity
            onPress={onCloseThread}
          style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F8F9FA',
              alignItems: 'center',
              justifyContent: 'center',
            marginRight: 12,
          }}
        >
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
        </TouchableOpacity>

          {/* Original Message Info */}
        <View style={{ flex: 1 }}>
          <Text style={{
              fontSize: 14,
              fontFamily: 'questrial',
              color: '#666666',
            marginBottom: 2,
          }}>
              Thread • {getUserDisplayName(thread)}
          </Text>
          <Text style={{
              fontSize: 16,
              fontFamily: 'questrial',
              color: '#1A1A1A',
              fontWeight: '500',
            }}>
              {getOriginalMessagePreview(thread)}
            </Text>
          </View>

          {/* Thread Reply Count */}
          {thread?.reply_count && thread.reply_count > 0 && (
            <View style={{
              backgroundColor: '#999999',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 14,
              alignItems: 'center',
              flexDirection: 'row',
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 12,
                fontFamily: 'questrial',
                fontWeight: '600',
              }}>
                {thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}
          </Text>
            </View>
          )}
      </View>

        {/* Thread Messages */}
      <View style={{
          flex: 1,
          paddingHorizontal: 0, // Reduced padding to allow messages to get closer to edges
          backgroundColor: '#DCDEDF', // Ensure background color is set
        }}>
          <OverlayProvider value={{ style: threadTheme }}>
            <Chat client={client} style={threadTheme} MessageSimple={(props) => <CustomMessageSimple {...props} isInThread={true} />}>
              <MessageList
            DateHeader={() => null}
            additionalFlatListProps={{
              style: {
                backgroundColor: '#DCDEDF', // Set background color for the FlatList
              },
              contentContainerStyle: {
                paddingHorizontal: 0, // Remove padding to allow messages to reach edges
                backgroundColor: '#DCDEDF', // Ensure content has the right background
              },
              initialScrollIndex: threadMessages.length > 0 ? threadMessages.length - 1 : 0,
              getItemLayout: (data: any, index: number) => ({
                length: 100, // Estimated item height
                offset: 100 * index,
                index,
              }),
              onScrollToIndexFailed: (info: any) => {
                // Handle scroll failure gracefully
                console.log('Scroll to index failed:', info);
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, 100);
              }
            }}
            EmptyStateIndicator={() => (
        <View style={{
              flex: 1, 
              backgroundColor: '#DCDEDF', 
              justifyContent: 'center', 
          alignItems: 'center',
              padding: 32 
        }}>
              {isLoadingThread ? (
                <>
          <Text style={{
                    color: '#1A1A1A', 
                    fontSize: 16, 
                    fontFamily: 'questrial',
                    textAlign: 'center',
                    opacity: 0.7,
                    marginBottom: 16
                  }}>
                    Loading thread messages...
          </Text>
                </>
              ) : (
          <Text style={{
                  color: '#1A1A1A', 
                  fontSize: 16, 
                  fontFamily: 'questrial',
                  textAlign: 'center',
                  opacity: 0.7 
                }}>
                  Start a conversation in this thread
          </Text>
              )}
            </View>
          )}
        />
            </Chat>
          </OverlayProvider>
        </View>
        
        {/* Thread Message Input - Using default Stream Chat input */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingVertical: 8,
        }}>
          <MessageInput 
            InputButtons={() => null}  // Hide custom input buttons in threads
            additionalTextInputProps={{
              placeholder: "Reply in thread...",
              placeholderTextColor: "#8E8E93",
              style: {
                flex: 1,
                minHeight: 32,
                textAlignVertical: 'center',
                paddingTop: 6,
                paddingBottom: 6,
                fontSize: 16,
              }
            }}
          />
      </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CustomThread; 