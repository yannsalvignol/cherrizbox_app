import { useGlobalContext } from '@/lib/global-provider';
import React from 'react';
import { View } from 'react-native';
import { MessageSimple, useMessageContext } from 'stream-chat-react-native';

import BlurryFileAttachment from './attachments/BlurryFileAttachment';
import { CustomAudioAttachment } from './attachments/CustomAudioAttachment';
import { CustomTipAttachment } from './attachments/CustomTipAttachment';
import { PaidContentAttachment } from './attachments/PaidContentAttachment';
import { PaidVideoAttachment } from './attachments/PaidVideoAttachment';
import { CustomPollComponent } from './CustomPollComponent';
import CustomReactionList from './CustomReactionList';

// Import components from main chat file and attachments
import { CustomPhotoAttachment } from './attachments/CustomPhotoAttachment';
import { CustomMessageAvatar } from './CustomMessageAvatar';

// Import the client from the parent context - we'll need to pass it as prop
interface CustomMessageSimpleProps {
  client: any;
  onThreadSelect: (message: any) => void;
  [key: string]: any; // Allow other props to be passed through
}

export const CustomMessageSimple: React.FC<CustomMessageSimpleProps> = ({ client, onThreadSelect, ...props }) => {
  // Get message from useMessageContext hook
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const channel = messageContext?.channel;
  const { user } = useGlobalContext();
  
  // Check if message is deleted - completely hide deleted messages
  if (message?.deleted_at || message?.type === 'deleted') {
    return null; // Don't render anything for deleted messages
  }
  
  // Check if this message contains a poll (check for poll_id)
  const hasPoll = message?.poll_id || message?.poll;
  
  // If message has a poll, render our custom poll component
  if (hasPoll && message?.poll) {
    return (
      <View>
        {/* Show the message text if any */}
        {message.text && message.text !== `  ${message.poll?.name || ''}` && (
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
    return React.createElement(MessageSimple, props);
  }
  

  


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
          position: 'relative',
        }}>
          {message.attachments?.map((attachment: any, index: number) => {
            if (attachment?.type === 'custom_audio') {
              return (
                <View key={`custom-audio-container-${index}`} style={{ marginTop: 8, marginBottom: 12, position: 'relative' }}>
                  <CustomAudioAttachment 
                    key={`custom-audio-${index}`}
                    attachment={attachment}
                  />
                  <CustomReactionList isAttachment={true} />
                </View>
              );
            } else if (attachment?.type === 'custom_photo') {
              return (
                <View key={`custom-photo-container-${index}`} style={{ position: 'relative' }}>
                  <CustomPhotoAttachment 
                    key={`custom-photo-${index}`}
                    attachment={attachment}
                    onThreadSelect={onThreadSelect}
                  />
                  <CustomReactionList isAttachment={true} />
                </View>
              );
            }
            return null;
          })}

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
          position: 'relative',
        }}>
          {message.attachments?.map((attachment: any, index: number) => {
            if (attachment?.type === 'custom_attachment') {
              return (
                <View key={`custom-tip-container-${index}`} style={{ position: 'relative' }}>
                  <CustomTipAttachment 
                    key={`custom-tip-${index}`}
                    attachment={attachment}
                  />
                  <CustomReactionList />
                </View>
              );
            }
            return null;
          })}

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
          position: 'relative',
        }}>
          {message.attachments?.map((attachment: any, index: number) => {
            if (attachment?.type === 'paid_video') {
              return (
                <View key={`paid-video-container-${index}`} style={{ position: 'relative' }}>
                  <PaidVideoAttachment 
                    key={`paid-video-${index}`}
                    attachment={attachment} 
                  />
                  <CustomReactionList />
                </View>
              );
            }
            return null;
          })}

        </View>
      </View>
    );
  }

  if (hasBlurryFile) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-end',  // Changed to flex-end to align right
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-end',  // Changed to flex-end to align right
          flex: 1,
          maxWidth: '10%',  // Increased maxWidth for better positioning
          marginRight:80,  // Add right margin for spacing from edge
          position: 'relative',
        }}>
          {message.attachments?.map((attachment: any, index: number) => {
            if (attachment?.type === 'blurry_file') {
              return (
                <View key={`blurry-file-container-${index}`} style={{ position: 'relative' }}>
                  <BlurryFileAttachment 
                    key={`blurry-file-${index}`}
                    attachment={attachment} 
                  />
                  <CustomReactionList />
                </View>
              );
            }
            return null;
          })}

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
          position: 'relative',
        }}>
          {/* Render paid content attachments only (no text message) */}
          {message.attachments?.map((attachment: any, index: number) => {
            if (attachment?.type === 'paid_content') {
              return (
                <View key={`paid-content-container-${index}`} style={{ position: 'relative' }}>
                  <PaidContentAttachment 
                    key={`paid-content-${index}`}
                    attachment={attachment} 
                  />
                  <CustomReactionList />
                </View>
              );
            }
            return null;
          })}

        </View>
      </View>
    );
  }
  
  // For regular text messages, let Channel-level ReactionListTop handle reactions
  return React.createElement(MessageSimple, props);
};

CustomMessageSimple.displayName = 'CustomMessageSimple';

