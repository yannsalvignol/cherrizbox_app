import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';

interface CustomPhotoAttachmentProps {
  attachment: any;
}

/**
 * Custom Photo Attachment Component with Caching
 * 
 * Handles displaying photo attachments with advanced caching logic,
 * loading states, error handling, and upload progress indicators.
 */
const CustomPhotoAttachment: React.FC<CustomPhotoAttachmentProps> = ({ attachment }) => {
  if (attachment?.type !== 'custom_photo') return null;

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  const isUploading = attachment?.uploading === true;

  // Load cached image on mount
  useEffect(() => {
    let isMounted = true;

    const loadCachedImage = async () => {
      if (!attachment?.image_url) {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        console.log(`🖼️ [CustomPhotoAttachment] Loading image: ${attachment.image_url.substring(0, 60)}...`);
        
        // Get cached image path
        const { chatImageCache } = await import('../../../../lib/image-cache');
        const cachedPath = await chatImageCache.getCachedImagePath(attachment.image_url);
        
        if (isMounted) {
          setCachedImageUri(cachedPath);
          console.log(` [CustomPhotoAttachment] Image ready: ${cachedPath === attachment.image_url ? 'original' : 'cached'}`);
        }
      } catch (error) {
        console.error('   [CustomPhotoAttachment] Failed to load cached image:', error);
        if (isMounted) {
          setCachedImageUri(attachment.image_url); // Fallback to original
        }
      }
    };

    loadCachedImage();

    return () => {
      isMounted = false;
    };
  }, [attachment?.image_url]);

  return (
    <View style={{
      backgroundColor: 'transparent',
      margin: -8, // Negative margin to override parent container
      padding: 0,
      borderRadius: 0,
      overflow: 'visible',
      position: 'relative',
    }}>
      <View style={{
        width: 250,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#2A2A2A', // Background while loading
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}>
        {/* Loading indicator while image loads */}
        {(isLoading || !cachedImageUri) && !hasError && (
          <View style={{
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(42, 42, 42, 0.8)',
            borderRadius: 12,
            zIndex: 1,
          }}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontFamily: 'questrial',
              marginTop: 8,
              opacity: 0.7,
            }}>
              {cachedImageUri ? 'Loading...' : 'Caching...'}
            </Text>
          </View>
        )}
        
        {/* Error indicator if image fails to load */}
        {hasError && (
          <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
          }}>
            <Ionicons name="image-outline" size={32} color="#666" />
            <Text style={{
              color: '#999',
              fontSize: 14,
              fontFamily: 'questrial',
              textAlign: 'center',
              marginTop: 8,
            }}>
              Failed to load image
            </Text>
          </View>
        )}

        {/* Render image only when cached URI is available */}
        {cachedImageUri && (
          <Image
            source={{ uri: cachedImageUri }}
            style={{
              width: 250,
              height: 200,
              borderRadius: 12,
              backgroundColor: 'transparent',
              opacity: isUploading ? 0.7 : 1, // Slight transparency when uploading
            }}
            resizeMode="cover"
            onLoad={() => {
              setIsLoading(false);
              console.log(` [CustomPhotoAttachment] Image rendered successfully`);
            }}
            onError={(error) => {
              console.error(`   [CustomPhotoAttachment] Image render failed:`, error.nativeEvent);
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
      </View>
      

      
      {/* Discrete upload indicator - WhatsApp/Telegram style */}
      {isUploading && (
        <View style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={{
            color: '#FFFFFF',
            fontSize: 11,
            fontFamily: 'questrial',
            fontWeight: '500',
          }}>
            Uploading...
          </Text>
        </View>
      )}
      
      {attachment.caption && (
        <Text style={{
          color: '#FFFFFF',
          fontSize: 14,
          fontFamily: 'questrial',
          marginTop: 8,
          backgroundColor: 'transparent',
        }}>
          {attachment.caption}
        </Text>
      )}
    </View>
  );
};

export default CustomPhotoAttachment;