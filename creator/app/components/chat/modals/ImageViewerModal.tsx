import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setHasError(false);
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  // Get image dimensions
  useEffect(() => {
    if (visible && imageUrl) {
      Image.getSize(
        imageUrl,
        (width, height) => {
          // Calculate aspect ratio and fit to screen
          const aspectRatio = width / height;
          let displayWidth = screenWidth * 0.95;
          let displayHeight = displayWidth / aspectRatio;
          
          if (displayHeight > screenHeight * 0.8) {
            displayHeight = screenHeight * 0.8;
            displayWidth = displayHeight * aspectRatio;
          }
          
          setImageSize({ width: displayWidth, height: displayHeight });
        },
        (error) => {
          console.error('Error getting image size:', error);
          setImageSize({ width: screenWidth * 0.9, height: screenHeight * 0.6 });
        }
      );
    }
  }, [visible, imageUrl]);

  if (!visible) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor="#000000" />
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000000',
          zIndex: 2000,
          opacity: fadeAnim,
        }}
      >
        {/* Header with close button */}
        <View
          style={{
            position: 'absolute',
            top: insets.top,
            left: 0,
            right: 0,
            height: 60,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            zIndex: 2001,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Backdrop - tap to dismiss */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          onPress={onClose}
          activeOpacity={1}
        />

        {/* Image container */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Loading indicator */}
          {isLoading && !hasError && (
            <View
              style={{
                position: 'absolute',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
              }}
            >
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontFamily: 'questrial',
                  marginTop: 12,
                  opacity: 0.8,
                }}
              >
                Loading image...
              </Text>
            </View>
          )}

          {/* Error indicator */}
          {hasError && (
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="image-outline" size={64} color="#666" />
              <Text
                style={{
                  color: '#999',
                  fontSize: 18,
                  fontFamily: 'questrial',
                  textAlign: 'center',
                  marginTop: 16,
                }}
              >
                Failed to load image
              </Text>
            </View>
          )}

          {/* Image */}
          {imageUrl && (
            <TouchableOpacity
              activeOpacity={1}
              style={{
                width: imageSize.width,
                height: imageSize.height,
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: imageSize.width,
                  height: imageSize.height,
                  backgroundColor: 'transparent',
                }}
                resizeMode="contain"
                onLoad={() => {
                  setIsLoading(false);
                  console.log('✅ [ImageViewerModal] Image loaded successfully');
                }}
                onError={(error) => {
                  console.error('❌ [ImageViewerModal] Image load failed:', error.nativeEvent);
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Footer with instructions */}
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 20,
            left: 20,
            right: 20,
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2001,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontFamily: 'questrial',
                opacity: 0.8,
                textAlign: 'center',
              }}
            >
              Tap anywhere to close
            </Text>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

export default ImageViewerModal;