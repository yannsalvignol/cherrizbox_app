import { checkPaidContentPurchase } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
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
      marginHorizontal: 12,
      position: 'relative',
      borderWidth: 1,
      borderColor: '#1976D2',
      overflow: 'hidden',
      shadowColor: '#1976D2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }}>
      {/* Blue gradient background */}
      <LinearGradient
        colors={['#1976D2', '#2196F3', '#1565C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      
      {/* Subtle overlay for better text readability */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }} />
      
      {/* Content */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}>
        {/* File icon with lock */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 40,
          width: 70,
          height: 70,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 1)',
          position: 'relative',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}>
          <Ionicons name="document-text" size={32} color="#1976D2" />
          <View style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            backgroundColor: '#1565C0',
            borderRadius: 12,
            width: 26,
            height: 26,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}>
            <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
          </View>
        </View>
        
        {/* File title */}
        <Text style={{
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 4,
          fontFamily: 'Urbanist-Bold',
          textShadowColor: 'rgba(0, 0, 0, 0.4)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}>
          {title}
        </Text>
        
        <Text style={{
          color: '#FFFFFF',
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 16,
          fontFamily: 'Urbanist-Medium',
          opacity: 0.9,
          textShadowColor: 'rgba(0, 0, 0, 0.4)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}>
          Premium File Content
        </Text>
        
        <TouchableOpacity
          onPress={onUnlock}
          style={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 25,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 2,
            borderColor: '#1976D2',
          }}
        >          
          <Text style={{
            color: '#1565C0',
            fontSize: 16,
            fontWeight: '700',
            fontFamily: 'Urbanist-Bold',
          }}>
            Unlock for {formatPrice ? formatPrice(price, userCurrency) : `$${price.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Format toggle button */}
      <TouchableOpacity
        onPress={toggleFileFormat}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Ionicons 
          name={isPortraitMode ? "phone-portrait" : "phone-landscape"} 
          size={20} 
          color="#1976D2" 
        />
      </TouchableOpacity>
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
        backgroundColor: '#1A1A1A',
        marginVertical: 8,
        marginHorizontal: 12,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#4CAF50',
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}>
        {/* File content preview */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#2A2A2A',
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
              backgroundColor: '#FFFFFF',
              position: 'relative',
            }}>
              {/* PDF Viewer using WebView */}
              <WebView
                source={{ uri: fileUri }}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#FFFFFF',
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                  }}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={{
                      color: '#666666',
                      fontSize: 12,
                      marginTop: 8,
                      fontFamily: 'Urbanist-Regular',
                    }}>
                      Loading PDF...
                    </Text>
                  </View>
                )}
              />
            </View>
          ) : isText ? (
            <ScrollView 
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FFFFFF',
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
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={{
                    color: '#666666',
                    fontSize: 12,
                    marginTop: 8,
                    fontFamily: 'Urbanist-Regular',
                  }}>
                    Loading text...
                  </Text>
                </View>
              ) : (
                <Text style={{
                  color: '#000000',
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
              backgroundColor: '#2A2A2A',
            }}>
              <Ionicons name="musical-notes" size={48} color="#4CAF50" />
              <Text style={{
                color: '#4CAF50',
                fontSize: 12,
                fontWeight: 'bold',
                marginTop: 8,
                textAlign: 'center',
                fontFamily: 'Urbanist-SemiBold',
              }}>
                Audio File
              </Text>
              <Text style={{
                color: '#CCCCCC',
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
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={{
                  color: '#FFFFFF',
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
                color="#4CAF50" 
              />
              <Text style={{
                color: '#4CAF50',
                fontSize: 12,
                fontWeight: 'bold',
                marginTop: 8,
                textAlign: 'center',
                fontFamily: 'Urbanist-SemiBold',
              }}>
                {fileExtension.toUpperCase()} File
              </Text>
              <Text style={{
                color: '#CCCCCC',
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
          backgroundColor: '#4CAF50',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={{
            color: '#FFFFFF',
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
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 20,
            width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#1A1A1A" />
          ) : (
            <Ionicons name="download" size={18} color="#1A1A1A" />
          )}
        </TouchableOpacity>
        
        {/* File info overlay */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 14,
            fontWeight: '600',
            fontFamily: 'Urbanist-SemiBold',
          }}>
            {title}
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
                      dialogTitle: 'Open file with...',
                    });
                  }
                }
              } catch (error) {
                console.error('Error opening file:', error);
                Alert.alert('Error', 'Could not open file');
              }
            }}
            style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              marginTop: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
              fontFamily: 'Urbanist-SemiBold',
            }}>
              Open File
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Format toggle button */}
        <TouchableOpacity
          onPress={toggleFileFormat}
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 20,
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons 
            name={isPortraitMode ? "phone-portrait" : "phone-landscape"} 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
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
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
});

export default BlurryFileAttachment;