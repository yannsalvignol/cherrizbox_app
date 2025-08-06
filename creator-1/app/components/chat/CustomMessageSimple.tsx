import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import {
    MessageSimple,
    useMessageContext,
    useThreadContext
} from 'stream-chat-react-native';
import { formatPrice } from '../../../lib/currency-utils';
import BlurryFileAttachment from './attachments/BlurryFileAttachment';
import CustomAttachment from './attachments/CustomAttachment';
import PaidContentAttachment from './attachments/PaidContentAttachment';
import PaidVideoAttachment from './attachments/PaidVideoAttachment';
import PollDisplayComponent from './CustomPollComponent';

interface CustomMessageSimpleProps {
  [key: string]: any; // Stream Chat props
}

interface MessageContextData {
  message?: any;
  channel?: any;
}

interface ThreadContextData {
  thread?: any;
  threadMessages?: any[];
}

/**
 * Custom MessageSimple component that handles different message types and timestamps
 * 
 * Features:
 * - Custom poll rendering
 * - Paid content attachments (photos, videos, files)
 * - Custom attachment handling (tips with images/documents)
 * - Smart timestamp display with 5-minute logic
 * - Thread and DM channel awareness
 * - Responsive spacing for different channel types
 */
const CustomMessageSimple: React.FC<CustomMessageSimpleProps> = (props) => {
  // Get message context and global state
  const messageContext = useMessageContext() as MessageContextData;
  const message = messageContext?.message;
  const channel = messageContext?.channel;
  const { user, userCurrency } = useGlobalContext();

  // Thread context
  const threadContext = useThreadContext() as ThreadContextData;
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];

  // Channel and message type checks
  const isDMChannel = channel?.id?.startsWith('dm-');
  const isMyMessage = message?.user?.id === user?.$id;

  // Poll detection
  const hasPoll = message?.poll_id || message?.poll;
  
  console.log('Message data:', {
    id: message?.id,
    text: message?.text,
    hasPoll: !!hasPoll,
    poll_id: message?.poll_id,
    poll: message?.poll,
    type: message?.type,
    attachments: message?.attachments
  });

  // Attachment type checks
  const hasPaidContent = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_content');
  const hasBlurryFile = message?.attachments?.some((attachment: any) => attachment?.type === 'blurry_file');
  const hasPaidVideo = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_video');
  const hasCustomAttachment = message?.attachments?.some((attachment: any) => attachment?.type === 'custom_attachment');

  /**
   * Check if this is the last message in the channel/thread
   */
  const isLastMessage = (): boolean => {
    if (!message?.created_at || !channel) return false;
    
    const messages = isInThread ? threadMessages : Object.values(channel.state.messages || {});
    const sortedMessages = messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    return lastMessage?.id === message.id;
  };

  /**
   * Check if we should show timestamp based on 5-minute logic
   */
  const shouldShowTimestamp = (): boolean => {
    if (!message?.created_at || !message?.user?.id) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    const messages = isInThread ? threadMessages : Object.values(channel?.state.messages || {});
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

  /**
   * Render timestamp component
   */
  const renderTimestamp = (alignItems: 'flex-start' | 'flex-end' = 'flex-end') => {
    if (!shouldShowTimestamp()) return null;

    return (
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
        paddingHorizontal: alignItems === 'flex-end' ? 5 : 0, // Consistent horizontal padding
        marginTop: isInThread 
          ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
          : isDMChannel 
            ? (isLastMessage() ? -25 : -1) // DM channels - moderate spacing
            : (isLastMessage() ? -10 : -6), // Group channels - original spacing
        marginBottom: isInThread 
          ? (isLastMessage() ? 1 : 0) // Threads
          : isDMChannel 
            ? (isLastMessage() ? 3 : 1) // DM channels
            : (isLastMessage() ? 4 : 2), // Group channels
        alignItems: alignItems,
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
    );
  };

  // Handle poll messages
  if (hasPoll && message?.poll) {
    console.log('Rendering custom poll component');
    return (
      <View>
        {/* Show the message text if any */}
        {message.text && message.text !== `📊 ${message.poll.name}` && (
          <View style={{ marginBottom: 8 }}>
            <MessageSimple {...props} />
          </View>
        )}
        {/* Render our custom poll */}
        <PollDisplayComponent message={message} poll={message.poll} />
      </View>
    );
  }
  
  // If poll_id exists but no poll data, use default MessageSimple
  if (hasPoll) {
    console.log('Rendering poll message with default MessageSimple');
    return <MessageSimple {...props} />;
  }

  // Handle paid content attachments
  if (hasPaidContent) {
    console.log('Rendering message with paid content attachment');
    return (
      <View style={{ alignItems: 'flex-end' }}>
        {/* Render paid content attachments only (no text message) */}
        {message.attachments?.map((attachment: any, index: number) => (
          attachment?.type === 'paid_content' ? (
            <PaidContentAttachment 
              key={`paid-content-${index}`}
              attachment={attachment} 
              userCurrency={userCurrency}
              formatPrice={formatPrice}
            />
          ) : null
        ))}
        {renderTimestamp('flex-end')}
      </View>
    );
  }

  // Handle paid video attachments
  if (hasPaidVideo) {
    console.log('Rendering message with paid video attachment');
    return (
      <View style={{ alignItems: 'flex-end' }}>
        {/* Render paid video attachments only (no text message) */}
        {message.attachments?.map((attachment: any, index: number) => (
          attachment?.type === 'paid_video' ? (
            <PaidVideoAttachment 
              key={`paid-video-${index}`}
              attachment={attachment} 
            />
          ) : null
        ))}
        {renderTimestamp('flex-end')}
      </View>
    );
  }

  // Handle blurry file attachments
  if (hasBlurryFile) {
    console.log('Rendering message with blurry file attachment');
    return (
      <View style={{ alignItems: 'flex-end' }}>
        {/* Render blurry file attachments only (no text message) */}
        {message.attachments?.map((attachment: any, index: number) => (
          attachment?.type === 'blurry_file' ? (
            <BlurryFileAttachment 
              key={`blurry-file-${index}`}
              attachment={attachment} 
            />
          ) : null
        ))}
        {renderTimestamp('flex-end')}
      </View>
    );
  }

  // Handle custom attachments (tips with images/documents)
  if (hasCustomAttachment) {
    console.log('Rendering message with custom attachment (tip with image/document)');
    return (
      <View style={{ 
        alignItems: 'flex-start',
        marginVertical: 8,
        marginHorizontal: 4,
      }}>
        {/* Render custom attachments only (no text message) */}
        {message.attachments?.map((attachment: any, index: number) => (
          attachment?.type === 'custom_attachment' ? (
            <CustomAttachment 
              key={`custom-attachment-${index}`}
              attachment={attachment} 
            />
          ) : null
        ))}
        {renderTimestamp('flex-start')}
      </View>
    );
  }

  // Default message rendering with custom timestamp
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
          paddingHorizontal: 0, // Consistent horizontal padding
          marginTop: isInThread 
            ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
            : isDMChannel 
              ? (isLastMessage() ? -30 : -1) // DM channels - moderate spacing
              : (isLastMessage() ? -30 : 2), // Group channels - original spacing
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

export default CustomMessageSimple;