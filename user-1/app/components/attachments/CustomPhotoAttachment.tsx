import { imageCache } from '@/lib/image-cache';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { useMessageContext } from 'stream-chat-react-native';

interface CustomPhotoAttachmentProps {
  attachment: {
    type: string;
    image_url: string;
    caption?: string;
    uploading?: boolean;
  };
}

export const CustomPhotoAttachment: React.FC<CustomPhotoAttachmentProps> = (props) => {
  const { attachment } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string>(attachment.image_url);
  
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
          console.log(`✅ [CustomPhotoAttachment] Image loaded successfully`);
        }
      } catch (error) {
        console.error('❌ [CustomPhotoAttachment] Failed to load cached image:', error);
      }
    };

    loadCachedImage();
  }, [attachment.image_url]);

  const handlePress = (event: any) => {
    // Prevent event bubbling to avoid opening thread
    event.stopPropagation();
    // TODO: Add full-screen image view functionality
    console.log('Photo pressed:', attachment.image_url);
  };

  const handleLongPress = (event: any) => {
    console.log('📷 [CustomPhotoAttachment] Long press detected on photo');
    event.stopPropagation();
    
    if (message) {
      console.log('✅ [CustomPhotoAttachment] Setting selected message for modal');
      
      // Use the global handlers approach
      try {
        if (global.chatScreenHandlers && global.chatScreenHandlers.handleLongPressMessage) {
          global.chatScreenHandlers.handleLongPressMessage({ message });
          console.log('✅ [CustomPhotoAttachment] Called global handler');
      } else {
          console.log('⚠️ [CustomPhotoAttachment] Global handlers not available');
        }
    } catch (error) {
        console.log('⚠️ [CustomPhotoAttachment] Error calling global handler:', error);
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
      }}
            >
                <View style={{
        width: 250,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#1A1A1A',
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
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            borderRadius: 12,
            zIndex: 2,
          }}>
            <ActivityIndicator size="large" color="#FB2355" />
                </View>
              )}

        {/* Error indicator if image fails to load */}
        {hasError && (
      <View style={{
            justifyContent: 'center',
        alignItems: 'center',
            width: '100%',
                    height: '100%',
            backgroundColor: '#1A1A1A',
          }}>
            <Ionicons name="image-outline" size={40} color="#666" />
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
            color: '#FFFFFF',
              fontSize: 14,
            fontFamily: 'questrial',
              lineHeight: 18,
          }}>
              {attachment.caption}
          </Text>
        </View>
      )}
    </View>
    </TouchableOpacity>
  );
};