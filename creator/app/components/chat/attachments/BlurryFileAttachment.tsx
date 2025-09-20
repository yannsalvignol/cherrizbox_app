import { checkPaidContentPurchase } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMessageContext } from 'stream-chat-react-native';

interface BlurryFileAttachmentProps {
  attachment?: any;
  userCurrency?: string;
  formatPrice?: (price: number, currency?: string) => string;
  [key: string]: any; // For additional props
}

const BlurryFileAttachment = (props: BlurryFileAttachmentProps) => {
  const { attachment, userCurrency, formatPrice } = props;
  const { user } = useGlobalContext();
  const { theme } = useTheme();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileDimensions, setFileDimensions] = useState({ width: 300, height: 200 });
  const [isPortraitMode, setIsPortraitMode] = useState(false);

  // Get message context to access message sender info
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const messageSender = message?.user;

  // Return null if no attachment
  if (!attachment) {
    return null;
  }

  // Check if user has purchased this content
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user?.$id || !attachment?.paid_content_id) return;
      
      try {
        const hasPurchased = await checkPaidContentPurchase(user.$id, attachment.paid_content_id);
        setIsUnlocked(hasPurchased);
      } catch (error) {
        console.error('Error checking file purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, user?.$id]);

  // Try to guess file format from URL or attachment data
  useEffect(() => {
    if (attachment?.title && attachment.title.toLowerCase().includes('vertical')) {
      setFileDimensions({ width: 225, height: 400 }); // Portrait format
      setIsPortraitMode(true);
    } else if (attachment?.title && attachment.title.toLowerCase().includes('portrait')) {
      setFileDimensions({ width: 225, height: 400 }); // Portrait format
      setIsPortraitMode(true);
    }
  }, [attachment]);

  const toggleFileFormat = () => {
    if (isPortraitMode) {
      setFileDimensions({ width: 300, height: 200 }); // Landscape
      setIsPortraitMode(false);
    } else {
      setFileDimensions({ width: 225, height: 400 }); // Portrait
      setIsPortraitMode(true);
    }
  };

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    console.log('Unlocking file directly');
    setIsUnlocked(true);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      
      const fileUri = attachment?.local_file_uri || attachment?.image_url;
      if (!fileUri) {
        Alert.alert('Error', 'File not available for download');
        return;
      }
      
      // Use sharing to save/share the file
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: 'Save or share file',
          UTI: attachment?.mime_type || 'public.item',
        });
        
        // Success feedback
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Download not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Could not download file');
    } finally {
      setIsDownloading(false);
    }
  };

  const BlurredFileContent = ({ onUnlock, price, title }: { 
    onUnlock: () => void; 
    price: number; 
    title: string; 
  }) => (
    <View style={{
      width: fileDimensions.width,
      height: fileDimensions.height,
      borderRadius: 12,
      marginVertical: 8,
      position: 'relative',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      backgroundColor: theme.cardBackground,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    }}>
      
      {/* Content */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}>
        {/* File icon with lock */}
        <View style={{
          backgroundColor: 'transparent',
          borderRadius: 40,
          width: 80,
          height: 80,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
          position: 'relative',
        }}>
          <Image
            source={require('@/assets/icon/pdf.png')}
            style={{
              width: 64,
              height: 64,
              resizeMode: 'contain',
            }}
          />
          <View style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            backgroundColor: theme.textSecondary,
            borderRadius: 12,
            width: 26,
            height: 26,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: theme.cardBackground,
          }}>
            <Ionicons name="lock-closed" size={12} color={theme.textInverse} />
          </View>
        </View>
        
        {/* File title */}
        <Text style={{
          color: theme.text,
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 4,
          fontFamily: 'Urbanist-Bold',
        }}>
          {title}
        </Text>
        
        <Text style={{
          color: theme.textSecondary,
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 16,
          fontFamily: 'Urbanist-Medium',
        }}>
          Premium File Content
        </Text>
        
        <TouchableOpacity
          onPress={onUnlock}
          style={{
            backgroundColor: theme.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 25,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
            marginTop: -8,  // Move button up slightly towards the middle
          }}
        >          
          <Text style={{
            color: theme.textInverse,
            fontSize: 16,
            fontWeight: '700',
            fontFamily: 'Urbanist-Bold',
          }}>
            Unlock for {formatPrice ? formatPrice(price, userCurrency) : `$${price.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Format toggle button removed */}

      {/* Timestamp in bottom right corner */}
      {message?.created_at && (
        <Text style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          color: theme.textSecondary,
          fontSize: 12,
          fontWeight: '600',
          fontFamily: 'questrial',
          opacity: 0.8,
        }}>
          {new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </Text>
      )}
    </View>
  );

  const UnlockedFileContent = ({ title, fileUri }: { title: string; fileUri: string }) => {
    const fileExtension = fileUri.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension);
    const isPDF = fileExtension === 'pdf';
    const isText = ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'xml', 'csv'].includes(fileExtension);
    const isAudio = ['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(fileExtension);
    
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Load file content for text files
    useEffect(() => {
      if (isText && fileUri) {
        setIsLoading(true);
        fetch(fileUri)
          .then(response => response.text())
          .then(text => {
            setFileContent(text);
            setIsLoading(false);
          })
          .catch(error => {
            console.error('Error loading text file:', error);
            setIsLoading(false);
          });
      }
    }, [fileUri, isText]);
    
    return (
      <View style={{
        width: fileDimensions.width,
        height: fileDimensions.height,
        borderRadius: 12,
        backgroundColor: theme.cardBackground,
        marginVertical: 8,
        position: 'relative',
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      }}>
        {/* File content preview */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.cardBackground,
          padding: 16,
        }}>
          {isImage ? (
            <Image 
              source={{ uri: fileUri }}
              style={{
                width: '100%',
                height: '100%',
                resizeMode: 'cover',
              }}
            />
          ) : isPDF ? (
            <View style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme.cardBackground,
              position: 'relative',
            }}>
              {/* PDF Icon and Open Button */}
              <Image
                source={require('@/assets/icon/pdf.png')}
                style={{
                  width: 64,
                  height: 64,
                  resizeMode: 'contain',
                  marginBottom: 12,
                }}
              />
              
              <Text style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 6,
                fontFamily: 'Urbanist-Bold',
              }}>
                {title || 'PDF Document'}
              </Text>
              
              <Text style={{
                color: theme.textSecondary,
                fontSize: 13,
                textAlign: 'center',
                marginBottom: 16,
                fontFamily: 'Urbanist-Medium',
              }}>
                PDF File Ready
              </Text>
              
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const supported = await Linking.canOpenURL(fileUri);
                    if (supported) {
                      await Linking.openURL(fileUri);
                    } else {
                      if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(fileUri, {
                          dialogTitle: 'Open PDF with...',
                          UTI: 'com.adobe.pdf',
                        });
                      }
                    }
                  } catch (error) {
                    console.error('Error opening PDF:', error);
                    Alert.alert('Error', 'Could not open PDF file');
                  }
                }}
                style={{
                  backgroundColor: theme.primary,
                  paddingHorizontal: 28,
                  paddingVertical: 12,
                  borderRadius: 22,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Ionicons name="open-outline" size={16} color={theme.textInverse} style={{ marginRight: 6 }} />
                <Text style={{
                  color: theme.textInverse,
                  fontSize: 15,
                  fontWeight: '700',
                  fontFamily: 'Urbanist-Bold',
                }}>
                  Open File
                </Text>
              </TouchableOpacity>
            </View>
          ) : isText ? (
            <ScrollView 
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: theme.cardBackground,
              }}
              contentContainerStyle={{
                padding: 12,
              }}
            >
              {isLoading ? (
                <View style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 100,
                }}>
                  <ActivityIndicator size="large" color={theme.success} />
                  <Text style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginTop: 8,
                    fontFamily: 'Urbanist-Regular',
                  }}>
                    Loading text...
                  </Text>
                </View>
              ) : (
                <Text style={{
                  color: theme.text,
                  fontSize: 12,
                  fontFamily: 'Urbanist-Regular',
                  lineHeight: 16,
                }}>
                  {fileContent || 'Unable to load file content'}
                </Text>
              )}
            </ScrollView>
          ) : isAudio ? (
            <View style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme.backgroundSecondary,
            }}>
              <Ionicons name="musical-notes" size={48} color={theme.success} />
              <Text style={{
                color: theme.success,
                fontSize: 12,
                fontWeight: 'bold',
                marginTop: 8,
                textAlign: 'center',
                fontFamily: 'Urbanist-SemiBold',
              }}>
                Audio File
              </Text>
              <Text style={{
                color: theme.textSecondary,
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'Urbanist-Regular',
              }}>
                {fileExtension.toUpperCase()}
              </Text>
              {/* Audio player could be added here */}
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const supported = await Linking.canOpenURL(fileUri);
                    if (supported) {
                      await Linking.openURL(fileUri);
                    }
                  } catch (error) {
                    console.error('Error playing audio:', error);
                  }
                }}
                style={{
                  backgroundColor: theme.success,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="play" size={16} color={theme.textInverse} />
                <Text style={{
                  color: theme.textInverse,
                  fontSize: 12,
                  fontWeight: 'bold',
                  marginLeft: 4,
                  fontFamily: 'Urbanist-SemiBold',
                }}>
                  Play Audio
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Ionicons 
                name="document" 
                size={48} 
                color={theme.success} 
              />
              <Text style={{
                color: theme.success,
                fontSize: 12,
                fontWeight: 'bold',
                marginTop: 8,
                textAlign: 'center',
                fontFamily: 'Urbanist-SemiBold',
              }}>
                {fileExtension.toUpperCase()} File
              </Text>
              <Text style={{
                color: theme.textSecondary,
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'Urbanist-Regular',
              }}>
                Tap "Open File" to view
              </Text>
            </>
          )}
        </View>
        
        {/* Unlocked indicator */}
        <View style={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: theme.success,
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Ionicons name="checkmark-circle" size={16} color={theme.textInverse} />
          <Text style={{
            color: theme.textInverse,
            fontSize: 12,
            fontWeight: 'bold',
            marginLeft: 4,
            fontFamily: 'Urbanist-SemiBold',
          }}>
            Unlocked
          </Text>
        </View>
        
        {/* Download button */}
        <TouchableOpacity
          onPress={handleDownload}
          disabled={isDownloading}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: theme.backgroundSecondary,
            borderRadius: 20,
            width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Ionicons name="download" size={18} color={theme.text} />
          )}
        </TouchableOpacity>
        
        {/* Format toggle button removed */}

        {/* Timestamp in bottom right corner */}
        {message?.created_at && (
          <Text style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            color: theme.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            fontFamily: 'questrial',
            opacity: 0.8,
          }}>
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={{
      alignItems: 'flex-end',  // Align to the right
      width: '100%',
      marginRight: -5,  // Use margin for negative values
    }}>
      <View style={styles.container}>
        {attachment.is_blurred && !isUnlocked ? (
          <BlurredFileContent 
            onUnlock={handleUnlock}
            price={parseFloat(attachment.price || '0')}
            title={attachment.title || 'Paid File'}
          />
        ) : (
          <UnlockedFileContent 
            title={attachment.title || 'Paid File'}
            fileUri={attachment.local_file_uri || attachment.image_url || ''}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

export default BlurryFileAttachment;