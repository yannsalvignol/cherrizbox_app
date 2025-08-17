import React, { useState } from 'react';
import { Image, ImageProps, Text, View } from 'react-native';

interface SafeImageProps extends ImageProps {
  fallbackText?: string;
  showFallback?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  source, 
  style, 
  fallbackText = "Image not available",
  showFallback = true,
  onError,
  onLoad,
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = (error: any) => {
    console.log('❌ [SafeImage] Image failed to load:', error.nativeEvent?.error);
    setHasError(true);
    setIsLoading(false);
    onError?.(error);
  };

  const handleLoad = (event: any) => {
    console.log('✅ [SafeImage] Image loaded successfully');
    setHasError(false);
    setIsLoading(false);
    onLoad?.(event);
  };

  const handleLoadStart = () => {
    console.log('🔄 [SafeImage] Image loading started');
    setIsLoading(true);
    setHasError(false);
  };

  if (hasError && showFallback) {
    return (
      <View style={[
        style,
        { 
          backgroundColor: '#222', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }
      ]}>
        <Image 
          source={require('../../assets/icon/loading-icon.png')} 
          style={{ width: 48, height: 48, marginBottom: 8, opacity: 0.7 }} 
        />
        <Text style={{ color: '#aaa', fontWeight: '500', fontSize: 12, textAlign: 'center' }}>
          {fallbackText}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      onLoadStart={handleLoadStart}
      {...props}
    />
  );
};