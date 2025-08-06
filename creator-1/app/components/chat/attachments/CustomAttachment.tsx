import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Text, TouchableOpacity, View } from 'react-native';

interface CustomAttachmentProps {
  attachment: any;
}

const CustomAttachment = ({ attachment }: CustomAttachmentProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  
  // Return null if not a custom_attachment
  if (attachment?.type !== 'custom_attachment') {
    return null;
  }

  const isImage = attachment?.attachment_type === 'image';
  const isDocument = attachment?.attachment_type === 'document';

  // Load cached image on mount (only for images)
  useEffect(() => {
    if (!isImage) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadImage = async () => {
      const imageUrl = attachment?.appwrite_url || attachment?.local_uri;
      
      if (!imageUrl) {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        console.log(`🖼️ [CustomAttachment] Loading image: ${imageUrl.substring(0, 60)}...`);
        
        // Use image cache for Appwrite URLs, direct path for local URIs
        if (imageUrl.includes('appwrite') || imageUrl.startsWith('http')) {
                     const { chatImageCache } = await import('@/lib/image-cache');
          const cachedPath = await chatImageCache.getCachedImagePath(imageUrl);
          
          if (isMounted) {
            setCachedImageUri(cachedPath);
            setIsLoading(false);
            console.log(`✅ [CustomAttachment] Image ready: ${cachedPath === imageUrl ? 'original' : 'cached'}`);
          }
        } else {
          // Local file, use directly
          if (isMounted) {
            setCachedImageUri(imageUrl);
            setIsLoading(false);
            console.log(`✅ [CustomAttachment] Local image ready`);
          }
        }
      } catch (error) {
        console.error('❌ [CustomAttachment] Failed to load image:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [attachment?.appwrite_url, attachment?.local_uri, isImage]);

  // Handle document download
  const handleDocumentDownload = async () => {
    const documentUrl = attachment?.appwrite_url || attachment?.local_uri;
    
    if (!documentUrl) {
      Alert.alert('Error', 'Document URL not available');
      return;
    }

    try {
      console.log(`📄 [CustomAttachment] Opening document: ${attachment?.title}`);
      
      // For documents, try to open directly with the system
      const canOpen = await Linking.canOpenURL(documentUrl);
      if (canOpen) {
        await Linking.openURL(documentUrl);
      } else {
        // Fallback to sharing
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(documentUrl, {
            mimeType: attachment?.mime_type || 'application/octet-stream',
            dialogTitle: `Share ${attachment?.title || 'Document'}`,
          });
        } else {
          Alert.alert('Error', 'Cannot open this document type');
        }
      }
    } catch (error) {
      console.error('❌ [CustomAttachment] Failed to open document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  // Helper function to get file extension icon
  const getDocumentIcon = () => {
    const fileName = attachment?.title?.toLowerCase() || '';
    
    if (fileName.includes('.pdf')) return 'document-text';
    if (fileName.includes('.doc') || fileName.includes('.docx')) return 'document-text';
    if (fileName.includes('.xls') || fileName.includes('.xlsx')) return 'grid';
    if (fileName.includes('.ppt') || fileName.includes('.pptx')) return 'easel';
    if (fileName.includes('.txt')) return 'document-text-outline';
    if (fileName.includes('.zip') || fileName.includes('.rar')) return 'archive';
    
    return 'document-outline';
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (hasError && isImage) {
    return (
      <View style={{
        width: 250,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4,
        marginHorizontal: 8,
        zIndex: 1,
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
    );
  }

  // Render document attachment
  if (isDocument) {
    return (
      <View style={{
        backgroundColor: 'transparent',
        marginVertical: 4,
        marginHorizontal: 8,
        padding: 0,
        borderRadius: 0,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <TouchableOpacity
          onPress={handleDocumentDownload}
          style={{
            width: 250,
            height: 80,
            borderRadius: 12,
            backgroundColor: '#2A2A2A',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            position: 'relative',
            zIndex: 1,
          }}
          activeOpacity={0.8}
        >
          {/* Document icon */}
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: '#3A3A3A',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name={getDocumentIcon() as any} size={24} color="#FFFFFF" />
          </View>
          
          {/* Document info */}
          <View style={{ flex: 1 }}>
            <Text 
              numberOfLines={1}
              style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontFamily: 'Urbanist-Medium',
              }}
            >
              {attachment?.title || 'Document'}
            </Text>
            <Text style={{
              color: '#999',
              fontSize: 12,
              fontFamily: 'questrial',
              marginTop: 2,
            }}>
              {attachment?.file_size ? formatFileSize(attachment.file_size) : 'Unknown size'}
            </Text>
          </View>
          
          {/* Download arrow */}
          <Ionicons name="download-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  // Render image attachment
  if (isImage) {
    return (
      <View style={{
        backgroundColor: 'transparent',
        marginVertical: 4,
        marginHorizontal: 8,
        padding: 0,
        borderRadius: 0,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <View style={{
          width: 250,
          height: 200,
          borderRadius: 12,
          backgroundColor: '#2A2A2A',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Loading indicator */}
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
                Loading image...
              </Text>
            </View>
          )}
          
          {/* Render image when ready */}
          {cachedImageUri && (
            <Image
              source={{ uri: cachedImageUri }}
              style={{
                width: 250,
                height: 200,
                borderRadius: 12,
                backgroundColor: 'transparent',
              }}
              resizeMode="cover"
              onLoad={() => {
                setIsLoading(false);
                console.log(`🎯 [CustomAttachment] Image rendered successfully`);
              }}
              onError={(error) => {
                console.error('❌ [CustomAttachment] Image rendering failed:', error);
                setHasError(true);
                setIsLoading(false);
              }}
            />
          )}
        </View>
      </View>
    );
  }

  // Fallback for unsupported attachment types
  return null;
};

export default CustomAttachment;