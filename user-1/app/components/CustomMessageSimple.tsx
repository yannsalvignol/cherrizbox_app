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

        </View>
      </View>
    );
  }
  
  return <MessageSimple {...props} />;
};

CustomMessageSimple.displayName = 'CustomMessageSimple';

