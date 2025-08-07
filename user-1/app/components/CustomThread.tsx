import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import {
    MessageList,
    useThreadContext
} from 'stream-chat-react-native';
import { CustomMessageInput } from './CustomMessageInput';
import { CustomMessageSimple } from './CustomMessageSimple';

interface CustomThreadProps {
  currentChatType: string;
  setSelectedAttachment: (attachment: any) => void;
  selectedAttachment: any;
  tipAmount: number;
  setTipAmount: (amount: number) => void;
  currentChannel: any;
  creatorCurrency: string;
  creatorName: string;
  userId: string;
  creatorId: string;
  client: any;
  threadMessagesCache?: React.MutableRefObject<Map<string, any[]>>;
}

export const CustomThread: React.FC<CustomThreadProps> = ({
  currentChatType,
  setSelectedAttachment,
  selectedAttachment,
  tipAmount,
  setTipAmount,
  currentChannel,
  creatorCurrency,
  creatorName,
  userId,
  creatorId,
  client,
  threadMessagesCache
}) => {
  const threadContext = useThreadContext();
  const thread = threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  const flatListRef = useRef<FlatList>(null);
  const [isLoadingThread, setIsLoadingThread] = React.useState(false);

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
          const threadReplies = await currentChannel.getReplies(thread.id, {
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
  }, [thread?.id, currentChannel, threadMessagesCache]);

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
      if (latestMessage && latestMessage.user?.id === userId) {
        // If it's my message, scroll to bottom immediately
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    }
  }, [threadMessages, isLoadingThread]);

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
        {/* Thread Messages */}
        <MessageList
          ref={flatListRef}
          DateHeader={() => null}
          MessageSimple={(props: any) => <CustomMessageSimple {...props} client={client} />}
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
          initialScrollIndex={threadMessages.length > 0 ? threadMessages.length - 1 : 0}
          getItemLayout={(data, index) => ({
            length: 100, // Estimated item height
            offset: 100 * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            // Handle scroll failure gracefully
            console.log('Scroll to index failed:', info);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }}
        />
        
        {/* Thread Message Input */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingTop: 8,
        }}>
          <CustomMessageInput 
            currentChatType="thread"
            setSelectedAttachment={setSelectedAttachment}
            selectedAttachment={selectedAttachment}
            tipAmount={tipAmount}
            setTipAmount={setTipAmount}
            currentChannel={currentChannel}
            creatorCurrency={creatorCurrency}
            creatorName={creatorName}
            userId={userId}
            creatorId={creatorId}
            isThreadInput={true}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};