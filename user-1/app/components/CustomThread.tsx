import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import {
  MessageList,
  useThreadContext
} from 'stream-chat-react-native';
import { CustomMessageInput } from './CustomMessageInput';
import { CustomMessageSimple } from './CustomMessageSimple';

// Workaround to allow ref on MessageList (types don't expose ref prop)
const MessageListAny: any = MessageList;

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

  const createdAtLabel = useMemo(() => {
    const raw = (thread as any)?.created_at;
    if (!raw) return '';
    try {
      const d = new Date(raw as any);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [thread]);

  const parentAttachments: any[] = useMemo(() => {
    const atts = (thread as any)?.attachments;
    return Array.isArray(atts) ? atts : [];
  }, [thread]);

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
        {/* Parent message header */}
        {thread && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
              backgroundColor: '#DCDEDF',
            }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E5EA',
                borderRadius: 16,
                padding: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
                flexDirection: 'row',
              }}
            >
              {/* Accent bar */}
              <View style={{ width: 3, backgroundColor: '#FD6F3E', borderRadius: 2, marginRight: 12 }} />

              {/* Content */}
              <View style={{ flex: 1 }}>
                {/* Header row with avatar, name, time */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#F0F0F0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: '#1A1A1A', fontSize: 12, fontFamily: 'questrial' }}>
                      {(thread.user?.name || thread.user?.id || 'U').toString().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ color: '#1A1A1A', fontSize: 13, fontFamily: 'questrial', fontWeight: '600' }}>
                    {thread.user?.name || 'User'}
                  </Text>
                  {!!createdAtLabel && (
                    <Text style={{ color: '#999999', fontSize: 12, fontFamily: 'questrial', marginLeft: 8 }}>
                      {createdAtLabel}
                    </Text>
                  )}
                </View>

                {/* Message text */}
                <Text
                  style={{
                    color: '#1A1A1A',
                    fontSize: 15,
                    fontFamily: 'questrial',
                    lineHeight: 20,
                  }}
                  numberOfLines={3}
                >
                  {thread.text || 'Original message'}
                </Text>

                {/* Attachment pills (if any) */}
                {parentAttachments.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                    {parentAttachments.slice(0, 3).map((att, idx) => {
                      const type = (att.type || att.mime_type || '').toString();
                      let icon: any = 'document-text-outline';
                      if (type.includes('image')) icon = 'image-outline';
                      else if (type.includes('video')) icon = 'videocam-outline';
                      else if (type.includes('audio') || type.includes('voice')) icon = 'musical-notes-outline';
                      return (
                        <View
                          key={idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F8F9FA',
                            borderWidth: 1,
                            borderColor: '#E5E5EA',
                            borderRadius: 14,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            marginRight: 6,
                          }}
                        >
                          <Ionicons name={icon} size={14} color="#666666" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#666666', fontSize: 12, fontFamily: 'questrial' }}>
                            {att.title || att.file_name || type.split('/')[0] || 'Attachment'}
                          </Text>
                        </View>
                      );
                    })}
                    {parentAttachments.length > 3 && (
                      <View
                        style={{
                          backgroundColor: '#F8F9FA',
                          borderWidth: 1,
                          borderColor: '#E5E5EA',
                          borderRadius: 14,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ color: '#666666', fontSize: 12, fontFamily: 'questrial' }}>
                          +{parentAttachments.length - 3} more
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        {/* Thread Messages */}
        <MessageListAny
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
          getItemLayout={(data: any[], index: number) => ({
            length: 100, // Estimated item height
            offset: 100 * index,
            index,
          })}
          onScrollToIndexFailed={(info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
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