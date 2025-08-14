import { formatPrice } from '@/lib/currency-utils';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, StatusBar, Text, TouchableOpacity, View } from 'react-native';

interface CustomAttachmentProps {
  attachment: any;
}

const CustomAttachment = ({ attachment }: CustomAttachmentProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  
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
      console.log(`📄 [CustomAttachment] Downloading document: ${attachment?.title}`);
      
      // Always use the native sharing/download functionality
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(documentUrl, {
          mimeType: attachment?.mime_type || 'application/pdf',
          dialogTitle: attachment?.title || 'Document',
          UTI: attachment?.mime_type === 'application/pdf' ? 'com.adobe.pdf' : undefined,
        });
        console.log('✅ [CustomAttachment] Document shared successfully');
      } else {
        // Fallback for older iOS versions or when sharing is not available
        console.log('⚠️ [CustomAttachment] Sharing not available, trying to open with system');
        const canOpen = await Linking.canOpenURL(documentUrl);
        if (canOpen) {
          await Linking.openURL(documentUrl);
        } else {
          Alert.alert('Error', 'Cannot open this document type');
        }
      }
    } catch (error) {
      console.error('❌ [CustomAttachment] Failed to share document:', error);
      Alert.alert('Error', 'Failed to download document. Please try again.');
    }
  };

  // Handle image press to open full screen
  const handleImagePress = () => {
    if (cachedImageUri) {
      setShowFullScreenImage(true);
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

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  // Helper function to get currency symbol
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'usd': '$',
      'eur': '€',
      'chf': 'CHF',
      'gbp': '£',
      'cad': 'C$',
      'aud': 'A$',
    };
    return symbols[currency?.toLowerCase()] || currency?.toUpperCase() || '';
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
    const tipAmount = attachment?.tip_amount;
    const currency = attachment?.currency;
    const timestamp = attachment?.timestamp;
    
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
          
          {/* Tip Amount - Top Right Corner */}
          {tipAmount && currency && (
            <View style={{
              position: 'absolute',
              top: 8,
              right: 8,
              flexDirection: 'row',
              alignItems: 'center',
              zIndex: 3,
            }}>
              <Text style={{
                color: '#FFD700',
                fontSize: 10,
                fontFamily: 'Urbanist-Bold',
                marginRight: 3,
              }}>
                💰
              </Text>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 10,
                fontFamily: 'Urbanist-Bold',
              }}>
                {formatPrice(tipAmount * 100, currency)}
              </Text>
            </View>
          )}
          
          {/* Timestamp - Bottom Right Corner */}
          {timestamp && (
            <View style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              zIndex: 3,
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 9,
                fontFamily: 'questrial',
                opacity: 0.9,
              }}>
                {formatTimestamp(timestamp)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Render image attachment
  if (isImage) {
    const tipAmount = attachment?.tip_amount;
    const currency = attachment?.currency;
    const timestamp = attachment?.timestamp;
    
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
          borderRadius: 12,
          backgroundColor: '#2A2A2A',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}>
          {/* Main image container */}
          <View style={{
            width: 250,
            height: 200,
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
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
              zIndex: 2,
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
            <TouchableOpacity 
              onPress={handleImagePress}
              activeOpacity={0.9}
              style={{
                width: 250,
                height: 200,
                borderRadius: 12,
              }}
            >
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
            </TouchableOpacity>
          )}
          

          </View>
          
          {/* Black Footer Band - Overlapping the photo */}
          <View style={{
            width: 250,
            height: 40,
            backgroundColor: '#000000',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginTop: -12, // Bring it up to overlap the photo
            zIndex: 4, // Ensure it appears above the image
          }}>
            {/* Left side - Tip amount */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              {tipAmount && currency && (
                <>
                  <Text style={{
                    color: '#FFD700',
                    fontSize: 14,
                    fontFamily: 'Urbanist-Bold',
                    marginRight: 6,
                  }}>
                    💰
                  </Text>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    {formatPrice(tipAmount * 100, currency)}
                  </Text>
                </>
              )}
            </View>
            
            {/* Right side - Timestamp */}
            <View>
              {timestamp && (
                <Text style={{
                  color: '#CCCCCC',
                  fontSize: 12,
                  fontFamily: 'questrial',
                }}>
                  {formatTimestamp(timestamp)}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Full Screen Image Modal */}
        <Modal
          visible={showFullScreenImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFullScreenImage(false)}
        >
          <StatusBar hidden={true} />
          <View style={{
            flex: 1,
            backgroundColor: 'black',
          }}>
            {/* Close button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 50,
                right: 20,
                zIndex: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setShowFullScreenImage(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            {/* Full screen image */}
            <TouchableOpacity 
              style={{ 
                flex: 1, 
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: 100, // Space for footer
              }}
              onPress={() => setShowFullScreenImage(false)}
              activeOpacity={1}
            >
              <Image
                source={{ uri: cachedImageUri || '' }}
                style={{
                  width: Dimensions.get('window').width,
                  height: Dimensions.get('window').height - 100,
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            {/* Footer with actions */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
              paddingHorizontal: 20,
              paddingBottom: 20,
            }}>
              {/* Download/Share Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 25,
                  width: 50,
                  height: 50,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={async () => {
                  try {
                    if (cachedImageUri && await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(cachedImageUri, {
                        mimeType: 'image/jpeg',
                        dialogTitle: attachment?.title || 'Image',
                      });
                    }
                  } catch (error) {
                    console.error('Failed to share image:', error);
                    Alert.alert('Error', 'Failed to share image');
                  }
                }}
              >
                <Ionicons name="download-outline" size={24} color="white" />
              </TouchableOpacity>
              
              {/* Tip info */}
              <View style={{
                alignItems: 'center',
                flex: 1,
                marginHorizontal: 20,
              }}>
                {tipAmount && currency && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}>
                    <Text style={{
                      color: '#FFD700',
                      fontSize: 16,
                      fontFamily: 'Urbanist-Bold',
                      marginRight: 6,
                    }}>
                      💰
                    </Text>
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'Urbanist-Bold',
                    }}>
                      {formatPrice(tipAmount * 100, currency)}
                    </Text>
                  </View>
                )}
                {timestamp && (
                  <Text style={{
                    color: '#CCCCCC',
                    fontSize: 12,
                    fontFamily: 'questrial',
                  }}>
                    {formatTimestamp(timestamp)}
                  </Text>
                )}
              </View>
              
              {/* Info Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 25,
                  width: 50,
                  height: 50,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => {
                  const fileSize = attachment?.file_size ? formatFileSize(attachment.file_size) : 'Unknown size';
                  const fileName = attachment?.title || 'Image';
                  Alert.alert(
                    'Image Info',
                    `Name: ${fileName}\nSize: ${fileSize}\nTime: ${timestamp ? formatTimestamp(timestamp) : 'Unknown'}`
                  );
                }}
              >
                <Ionicons name="information-circle-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Fallback for unsupported attachment types
  return null;
};

export default CustomAttachment;