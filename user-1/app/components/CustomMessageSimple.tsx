import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { MessageSimple, useMessageContext, useThreadContext } from 'stream-chat-react-native';

import { BlurryFileAttachment } from './attachments/BlurryFileAttachment';
import { CustomAudioAttachment } from './attachments/CustomAudioAttachment';
import { CustomTipAttachment } from './attachments/CustomTipAttachment';
import { PaidContentAttachment } from './attachments/PaidContentAttachment';
import { PaidVideoAttachment } from './attachments/PaidVideoAttachment';
import { CustomPollComponent } from './CustomPollComponent';

// Import components from main chat file and attachments
import { CustomMessageAvatar } from '../(root)/chat';
import { CustomPhotoAttachment } from './attachments/CustomPhotoAttachment';

// Import the client from the parent context - we'll need to pass it as prop
interface CustomMessageSimpleProps {
  client: any;
  [key: string]: any; // Allow other props to be passed through
}

export const CustomMessageSimple: React.FC<CustomMessageSimpleProps> = ({ client, ...props }) => {
  // Get message from useMessageContext hook
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const channel = messageContext?.channel;
  const { user } = useGlobalContext();
  
  // Check if this message contains a poll (check for poll_id)
  const hasPoll = message?.poll_id || message?.poll;
  
  // If message has a poll, render our custom poll component
  if (hasPoll && message?.poll) {
    return (
      <View>
        {/* Show the message text if any */}
        {message.text && message.text !== `📊 ${message.poll.name}` && (
          <View style={{ marginBottom: 8 }}>
            <MessageSimple {...props} />
          </View>
        )}
        {/* Render our custom poll */}
        <CustomPollComponent message={message} poll={message.poll} client={client} />
      </View>
    );
  }
  
  // If poll_id exists but no poll data, use default MessageSimple
  if (hasPoll) {
    return <MessageSimple {...props} />;
  }
  
  // Check if we're in a thread
  const threadContext = useThreadContext();
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  
  // Check if we're in a DM channel (channel ID starts with 'dm-')
  const isDMChannel = channel?.id?.startsWith('dm-');
  
  // Check if this is my message
  const isMyMessage = message?.user?.id === user?.$id;
  
  // Function to check if this is the last message in the channel
  const isLastMessage = () => {
    if (!message?.created_at || !channel) return false;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel.state.messages || {});
    
    // Sort all messages by creation time
    const sortedMessages = messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Check if this message is the last one
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    return lastMessage?.id === message.id;
  };

  // Function to check if we should show timestamp based on 5-minute logic
  const shouldShowTimestamp = () => {
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

  // Check if message has custom tip attachments
  const hasCustomTipAttachment = message?.attachments?.some((attachment: any) => attachment?.type === 'custom_attachment');

  // Check if message has paid content attachments
  const hasPaidContent = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_content');
  
  // Check if message has paid video attachments
  const hasPaidVideo = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_video');

  // Check if message has blurry file attachments
  const hasBlurryFile = message?.attachments?.some((attachment: any) => attachment?.type === 'blurry_file');

  // Check if message has custom audio or photo attachments
  const hasCustomAudio = message?.attachments?.some((attachment: any) => attachment?.type === 'custom_audio');
  const hasCustomPhoto = message?.attachments?.some((attachment: any) => attachment?.type === 'custom_photo');

  if (hasCustomAudio || hasCustomPhoto) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => {
            if (attachment?.type === 'custom_audio') {
              return (
                <CustomAudioAttachment 
                  key={`custom-audio-${index}`}
                  attachment={attachment}
                />
              );
            } else if (attachment?.type === 'custom_photo') {
              return (
                <CustomPhotoAttachment 
                  key={`custom-photo-${index}`}
                  attachment={attachment}
                />
              );
            }
            return null;
          })}
          
          {/* Add timestamp for custom audio and photo messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
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
      </View>
    );
  }

  if (hasCustomTipAttachment) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-end',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'custom_attachment' ? (
              <CustomTipAttachment 
                key={`custom-tip-${index}`}
                attachment={attachment}
              />
            ) : null
          ))}
          
          {/* Add timestamp for custom tip messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
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
      </View>
    );
  }

  if (hasPaidVideo) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'paid_video' ? (
              <PaidVideoAttachment 
                key={`paid-video-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for paid video messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
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
      </View>
    );
  }

  if (hasBlurryFile) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'blurry_file' ? (
              <BlurryFileAttachment 
                key={`blurry-file-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for blurry file messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
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
      </View>
    );
  }
  
  if (hasPaidContent) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {/* Render paid content attachments only (no text message) */}
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'paid_content' ? (
              <PaidContentAttachment 
                key={`paid-content-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for paid content messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
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
      </View>
    );
  }
  
  return (
    <View>
      {/* Render the default MessageSimple */}
      <MessageSimple {...props} />
      
      {/* Add our custom timestamp below */}
      {shouldShowTimestamp() && (
        <View style={{ 
          paddingTop: isInThread 
            ? (isLastMessage() ? 2 : 1) // Threads - tightest spacing
            : isDMChannel 
              ? (isLastMessage() ? 6 : 3) // DM channels - medium spacing
              : (isLastMessage() ? 8 : 4), // Group channels - most spacing
          paddingBottom: isInThread 
            ? (isLastMessage() ? 6 : 3) // Threads
            : isDMChannel 
              ? (isLastMessage() ? 10 : 5) // DM channels
              : (isLastMessage() ? 12 : 6), // Group channels
          paddingHorizontal: 12, // Consistent horizontal padding
          marginTop: isInThread 
            ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
            : isDMChannel 
              ? (isLastMessage() ? -30 : -1) // DM channels - moderate spacing
              : (isLastMessage() ? -16 : -2), // Group channels - original spacing
          marginBottom: isInThread 
            ? (isLastMessage() ? 1 : 0) // Threads
            : isDMChannel 
              ? (isLastMessage() ? 3 : 1) // DM channels
              : (isLastMessage() ? 4 : 2), // Group channels
          alignItems: isMyMessage ? 'flex-end' : 'flex-start', // Align right for our messages, left for others
          backgroundColor: 'transparent',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6, // Slightly more space between checkmark and time
            paddingHorizontal: 8, // Internal padding for the timestamp container
            paddingVertical: 3, // Vertical padding for better touch target
            borderRadius: 8, // Rounded background for timestamp
            backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle background
          }}>
            <Ionicons 
              name="checkmark" 
              size={13} // Slightly larger checkmark
              color="#00C851" // Green color
              style={{ opacity: 0.9 }}
            />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12, // Slightly larger timestamp text
              fontWeight: '600', // Medium weight for better readability
              fontFamily: 'questrial',
              opacity: 0.8, // Slightly more visible
              letterSpacing: 0.3, // Better letter spacing
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

