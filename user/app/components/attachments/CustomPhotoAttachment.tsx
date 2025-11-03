import { imageCache } from '@/lib/image-cache';
import { useTheme } from '@/lib/themes/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Share, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessageContext } from 'stream-chat-react-native';

interface CustomPhotoAttachmentProps {
  attachment: {
    type: string;
    image_url: string;
    caption?: string;
    uploading?: boolean;
  };
  onThreadSelect: (message: any) => void;
}

export const CustomPhotoAttachment: React.FC<CustomPhotoAttachmentProps> = (props) => {
  const { theme } = useTheme();
  const { attachment, onThreadSelect } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string>(attachment.image_url);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Get message context to access message actions
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  
  if (attachment?.type !== 'custom_photo') return null;

  const isUploading = attachment?.uploading === true;

  // Load cached image on mount
  useEffect(() => {
    const loadCachedImage = async () => {
      try {
        if (attachment.image_url) {
          console.log(`📷 [CustomPhotoAttachment] Loading image for attachment: ${attachment.image_url.substring(0, 50)}...`);
          const cached = await imageCache.getCachedImageUri(attachment.image_url);
          setCachedImageUri(cached);
          console.log(` [CustomPhotoAttachment] Image loaded successfully`);
        }
      } catch (error) {
        console.error('  [CustomPhotoAttachment] Failed to load cached image:', error);
      }
    };

    loadCachedImage();
  }, [attachment.image_url]);

  const handlePress = (event: any) => {
    // Prevent event bubbling to avoid opening thread
    event.stopPropagation();
    setShowFullScreen(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: cachedImageUri,
        message: attachment.caption || 'Shared from Cherrizbox'
      });
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const handleInfo = () => {
    const createdAt = message?.created_at ? new Date(message.created_at).toLocaleString() : 'Unknown';
    const sender = message?.user?.name || 'Unknown sender';
    
    Alert.alert(
      'Photo Information',
      `Sent by: ${sender}\nDate: ${createdAt}${attachment.caption ? `\nCaption: ${attachment.caption}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const handleLongPress = (event: any) => {
    console.log('📷 [CustomPhotoAttachment] Long press detected on photo');
    event.stopPropagation();
    
    if (message) {
      console.log(' [CustomPhotoAttachment] Setting selected message for modal');
      
      // Use the global handlers approach
      try {
        if (global.chatScreenHandlers && global.chatScreenHandlers.handleLongPressMessage) {
          global.chatScreenHandlers.handleLongPressMessage({ message });
          console.log(' [CustomPhotoAttachment] Called global handler');
      } else {
          console.log('  [CustomPhotoAttachment] Global handlers not available');
        }
    } catch (error) {
        console.log('  [CustomPhotoAttachment] Error calling global handler:', error);
      }
    }
  };

          return (
            <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
              style={{
        backgroundColor: 'transparent',
        marginVertical: 4,
        marginHorizontal: 8,
        marginLeft: 5,  // Move the entire photo attachment to the right
      }}
            >
                <View style={{
        width: 250,
        height: 200,
        borderRadius: 12,
        backgroundColor: theme.backgroundSecondary,
        justifyContent: 'center',
                alignItems: 'center',
        position: 'relative',
                  overflow: 'hidden',
                }}>
        {/* Loading indicator while image loads */}
        {isLoading && !hasError && (
                  <View style={{
            position: 'absolute',
                    justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
                    height: '100%',
            backgroundColor: theme.backgroundSecondary,
            borderRadius: 12,
            zIndex: 2,
          }}>
            <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}

        {/* Error indicator if image fails to load */}
        {hasError && (
      <View style={{
            justifyContent: 'center',
        alignItems: 'center',
            width: '100%',
                    height: '100%',
            backgroundColor: theme.backgroundSecondary,
          }}>
            <Ionicons name="image-outline" size={40} color={theme.textSecondary} />
      </View>
              )}

        {/* The actual image */}
        <Image
          source={{ uri: cachedImageUri }}
          style={{
            width: 250,
            height: 200,
            borderRadius: 12,
            backgroundColor: 'transparent',
            opacity: isUploading ? 0.7 : 1,
          }}
          resizeMode="cover"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />

        {/* Caption if available */}
        {attachment.caption && attachment.caption.trim() !== '' && (
        <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
        }}>
          <Text style={{
            color: theme.textInverse,
              fontSize: 14,
            fontFamily: 'questrial',
              lineHeight: 18,
          }}>
              {attachment.caption}
          </Text>
        </View>
      )}

        {/* Timestamp and thread replies in horizontal black footer */}
        {message?.created_at && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.cardBackground,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            {/* Thread reply count on the left */}
            <View>
                {message?.reply_count && message.reply_count > 0 && (
                    <TouchableOpacity onPress={() => onThreadSelect?.(message)}>
                        <Text style={{
                            color: theme.text,
                            fontSize: 12,
                            fontWeight: '600',
                            fontFamily: 'questrial',
                        }}>
                            {message.reply_count} Thread {message.reply_count > 1 ? 'Replies' : 'Reply'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Timestamp on the right */}
            <Text style={{
              color: theme.text,
              fontSize: 12,
              fontWeight: '600',
              fontFamily: 'questrial',
            }}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
              })}
            </Text>
          </View>
        )}
    </View>

    {/* Full Screen Photo Modal */}
    <Modal
      visible={showFullScreen}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={{
        flex: 1,
        backgroundColor: theme.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Full Screen Image */}
        <Image
          source={{ uri: cachedImageUri }}
          style={{
            width: '100%',
            height: '100%'
          }}
          resizeMode="contain"
        />

        {/* Top Controls Bar - Close Button Only */}
        <View style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 20,
          paddingVertical: 10
        }}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={() => setShowFullScreen(false)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.cardBackground,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Bottom Left - Info Button */}
        <TouchableOpacity
          onPress={handleInfo}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 30,
            left: 20,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: theme.cardBackground,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Ionicons name="information-circle-outline" size={26} color={theme.text} />
        </TouchableOpacity>

        {/* Bottom Right - Share Button */}
        <TouchableOpacity
          onPress={handleShare}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 30,
            right: 20,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: theme.cardBackground,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Ionicons name="share-outline" size={26} color={theme.text} />
        </TouchableOpacity>

        {/* Bottom Caption (if available) */}
        {attachment.caption && attachment.caption.trim() !== '' && (
          <View style={{
            position: 'absolute',
            bottom: insets.bottom + 20,
            left: 20,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12
          }}>
            <Text style={{
              color: theme.textInverse,
              fontSize: 16,
              fontFamily: 'questrial',
              textAlign: 'center',
              lineHeight: 22
            }}>
              {attachment.caption}
            </Text>
          </View>
        )}
      </View>
    </Modal>
    </TouchableOpacity>
  );
};