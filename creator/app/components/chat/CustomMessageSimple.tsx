import { useGlobalContext } from '@/lib/global-provider';
import React from 'react';
import { View } from 'react-native';
import {
    MessageSimple,
    useMessageContext,
    useThreadContext
} from 'stream-chat-react-native';
import { formatPrice } from '../../../lib/currency-utils';
import BlurryFileAttachment from './attachments/BlurryFileAttachment';
import CustomAttachment from './attachments/CustomAttachment';
import CustomAudioAttachment from './attachments/CustomAudioAttachment';
import PaidContentAttachment from './attachments/PaidContentAttachment';
import PaidVideoAttachment from './attachments/PaidVideoAttachment';
import PollDisplayComponent from './CustomPollComponent';
import CustomReactionList from './CustomReactionList';

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
 * Custom MessageSimple component that handles different message types
 * 
 * Features:
 * - Custom poll rendering
 * - Paid content attachments (photos, videos, files)
 * - Custom attachment handling (tips with images/documents)
 * - Thread and DM channel awareness
 * - Responsive spacing for different channel types
 */
const CustomMessageSimple: React.FC<CustomMessageSimpleProps> = (props) => {
  // Filter out custom props that aren't compatible with MessageSimple
  const { ...messageSimpleProps } = props;
  
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
  const receivedDmOffset = isDMChannel && !isMyMessage ? 12 : 0; // Nudge received messages right in DMs

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
  const hasAudioAttachment = message?.attachments?.some((attachment: any) => attachment?.type === 'custom_audio');



  // Handle poll messages
  if (hasPoll && message?.poll) {
    console.log('Rendering custom poll component');
    return (
      <View style={{ marginLeft: receivedDmOffset }}>
        {/* Show the message text if any */}
        {message.text && message.text !== `  ${message.poll.name}` && (
          <View style={{ marginBottom: 8 }}>
            <MessageSimple {...messageSimpleProps} />
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
    return (
      <View style={{ marginLeft: receivedDmOffset }}>
        <MessageSimple {...messageSimpleProps} />
      </View>
    );
  }

  // Handle paid content attachments
  if (hasPaidContent) {
    console.log('Rendering message with paid content attachment');
    return (
      <View style={{ 
        alignItems: 'flex-end',
        marginRight: 5, 
      }}>
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
      </View>
    );
  }

  // Handle audio attachments - render completely custom without MessageSimple
  if (hasAudioAttachment) {
    console.log('Rendering message with audio attachment');
    return (
      <View style={{ 
        alignItems: isMyMessage ? 'flex-end' : 'flex-start',  // Align based on sender
        paddingRight: isInThread && isMyMessage ? 8 : 5, // Closer to right edge for sent
        paddingLeft: isInThread && !isMyMessage ? 8 : 0, // Closer to left edge for received
        marginTop: 8, // Increased space between day timestamp and audio attachment
        marginBottom: 8, // Increased space underneath audio attachment for better separation
        marginRight: isMyMessage ? -2 : 0, // Move sent audio messages to the left
        marginLeft: !isMyMessage ? receivedDmOffset + 12 : 0, // Move received audio to the left
        zIndex: 5, // Ensure the entire audio message container has proper z-index
        elevation: 5, // For Android
      }}>
        {/* Render audio attachments directly without MessageSimple wrapper */}
        <View style={{ position: 'relative', zIndex: 10 }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'custom_audio' ? (
              <View key={`audio-${index}`} style={{ paddingTop: 12, paddingBottom: 20 }}>
                <CustomAudioAttachment 
                  attachment={attachment} 
                />
              </View>
            ) : null
          ))}
          
          {/* Add reactions on top of audio attachment with proper positioning */}
          <View style={{
            position: 'absolute',
            top: 6,
            right: 8,
            zIndex: 20,
            elevation: 20, // For Android
          }}>
            <CustomReactionList />
          </View>
        </View>
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
        marginLeft: receivedDmOffset || 4,
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
      </View>
    );
  }

  // Default message rendering with default timestamps
  return (
    <View style={{
      // Override negative margins in thread context for received messages
      marginLeft: (isInThread && !isMyMessage ? 8 : 0) + receivedDmOffset,  // Nudge received DMs
      marginRight: isInThread && isMyMessage ? 8 : 0,   // Reduced - closer to right edge
    }}>
      {/* Render the default MessageSimple with its default timestamp */}
      <MessageSimple {...messageSimpleProps} />
    </View>
  );
};

export default CustomMessageSimple;