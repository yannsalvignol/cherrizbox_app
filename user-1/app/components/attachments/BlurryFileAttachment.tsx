import { dataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMessageContext } from 'stream-chat-react-native';
import { checkPaidContentPurchase } from '../../../lib/appwrite';
import { PaidContentPaymentModal } from '../modals/PaidContentPaymentModal';

interface BlurryFileAttachmentProps {
  attachment: any;
}

export const BlurryFileAttachment: React.FC<BlurryFileAttachmentProps> = ({ attachment }) => {
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileDimensions, setFileDimensions] = useState({ width: 300, height: 200 });
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
      // Check multiple possible field names for the content ID
      const contentId = attachment?.paid_content_id || attachment?.file_id || attachment?.content_id;
      if (!user?.$id || !contentId) return;
      
      try {
        const hasPurchased = await checkPaidContentPurchase(user.$id, contentId);
        setIsUnlocked(hasPurchased);
      } catch (error) {
        console.error('Error checking file purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, attachment?.file_id, attachment?.content_id, user?.$id]);

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
    
    // Check multiple possible field names for the content ID
    const contentId = attachment?.paid_content_id || attachment?.file_id || attachment?.content_id;
    
    console.log('Opening payment modal for file with data:', {
      contentId: contentId,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price,
      attachment: attachment // Debug: log full attachment
    });
    
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('💳 [PaidFile] Payment successful for paid file');
    
    // Check multiple possible field names for the content ID
    const contentId = attachment?.paid_content_id || attachment?.file_id || attachment?.content_id;
    console.log('💳 [PaidFile] Invalidating cache for contentId:', contentId);
    
    // Clear the purchase status from cache to force refresh
    if (user?.$id && contentId) {
      dataCache.delete(`purchase_${user.$id}_${contentId}`);
      console.log('✅ [PaidFile] Cache invalidated - next check will query database');
    }
    
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
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
      marginLeft: 0,
      marginRight: 12,
      position: 'relative',
      overflow: 'hidden',
    }}>
      
      {/* Content */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}>
        {/* PDF icon with lock */}
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
          <Image 
            source={require('../../../assets/icon/pdf.png')}
            style={{
              width: 40,
              height: 40,
              resizeMode: 'contain',
            }}
          />
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
          fontFamily: 'questrial',
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
          fontFamily: 'questrial',
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
            fontFamily: 'questrial',
          }}>
            Unlock for ${price.toFixed(2)}
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
        marginLeft: 0,
        marginRight: 12,
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
              backgroundColor: '#F8F9FA',
              position: 'relative',
            }}>
              {/* PDF Preview Container */}
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}>
                {/* PDF Icon and Info */}
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 20,
                }}>
                  <Text style={{
                    color: '#2C3E50',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 20,
                    fontFamily: 'questrial',
                  }}>
                    {title}
                  </Text>
                  
                  {/* PDF Access Information */}
                  <View style={{
                    backgroundColor: 'rgba(251, 35, 85, 0.1)',
                        borderRadius: 8,
                    padding: 12,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(251, 35, 85, 0.2)',
                    maxWidth: '100%',
                    alignSelf: 'stretch',
                  }}>
                    <View style={{
                        flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginBottom: 6,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        marginRight: 6,
                      }}>
                        💡
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: '#2C3E50',
                          fontSize: 13,
                          fontWeight: '600',
                        fontFamily: 'questrial',
                          marginBottom: 4,
                      }}>
                          Hey! Your file is safely stored 📁
                      </Text>
                        
                      <Text style={{
                          color: '#4A5568',
                          fontSize: 12,
                          lineHeight: 16,
                        fontFamily: 'questrial',
                      }}>
                          Check out your{' '}
                          <Text style={{ fontWeight: '600', color: '#FB2355' }}>
                            Profile → Paid Content
                      </Text>
                          {' '}to find this PDF and all your other purchased files! 😊
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  
                </View>
              </View>
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
                    fontFamily: 'questrial',
                  }}>
                    Loading text...
                  </Text>
                </View>
              ) : (
                <Text style={{
                  color: '#000000',
                  fontSize: 12,
                  fontFamily: 'questrial',
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
                fontFamily: 'questrial',
              }}>
                Audio File
              </Text>
              <Text style={{
                color: '#CCCCCC',
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                {fileExtension.toUpperCase()}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    console.log('Attempting to play audio:', fileUri);
                    
                    // First try sharing for audio files
                    const isAvailable = await Sharing.isAvailableAsync();
                    if (isAvailable) {
                      await Sharing.shareAsync(fileUri, {
                        dialogTitle: 'Play audio with...',
                        UTI: attachment?.mime_type || 'public.audio',
                      });
                    } else {
                      const supported = await Linking.canOpenURL(fileUri);
                      if (supported) {
                        await Linking.openURL(fileUri);
                      } else {
                        Alert.alert('Cannot play audio', 'No app available to play this audio file.');
                      }
                    }
                  } catch (error) {
                    console.error('Error playing audio:', error);
                    Alert.alert('Error', 'Could not play audio file.');
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
                  fontFamily: 'questrial',
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
                fontFamily: 'questrial',
              }}>
                {fileExtension.toUpperCase()} File
              </Text>
              <Text style={{
                color: '#CCCCCC',
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'questrial',
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
            fontFamily: 'questrial',
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
        
        {/* File info overlay - only show for non-PDF files */}
        {!isPDF && (
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
              fontFamily: 'questrial',
            }}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  console.log('Attempting to open file:', fileUri);
                  
                  // First try sharing which is more reliable for local files
                  const isAvailable = await Sharing.isAvailableAsync();
                  if (isAvailable) {
                    await Sharing.shareAsync(fileUri, {
                      dialogTitle: 'Open file with...',
                      UTI: attachment?.mime_type || 'public.item',
                    });
                  } else {
                    // Fallback to Linking
                    const supported = await Linking.canOpenURL(fileUri);
                    if (supported) {
                      await Linking.openURL(fileUri);
                    } else {
                      Alert.alert(
                        'Cannot open file', 
                        'No app available to open this file type. Try downloading it instead.',
                        [
                          { text: 'OK', style: 'default' },
                          { 
                            text: 'Download', 
                            style: 'default',
                            onPress: () => handleDownload()
                          }
                        ]
                      );
                    }
                  }
                } catch (error) {
                  console.error('Error opening file:', error);
                  Alert.alert(
                    'Error opening file', 
                    'Could not open this file. Try downloading it instead.',
                    [
                      { text: 'OK', style: 'default' },
                      { 
                        text: 'Download', 
                        style: 'default',
                        onPress: () => handleDownload()
                      }
                    ]
                  );
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
                fontFamily: 'questrial',
              }}>
                Open File
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
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
    <View style={attachmentStyles.container}>
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

      {/* Payment Modal */}
      <PaidContentPaymentModal
        visible={showPaymentModal}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        amount={parseFloat(attachment?.price || '5.99')}
        contentTitle={attachment?.title || 'Premium File'}
        contentId={attachment?.paid_content_id || attachment?.file_id || attachment?.content_id}
        creatorId={messageSender?.id}
        creatorName={messageSender?.name}
        imageUrl={attachment?.image_url}
        contentType="file"
      />
    </View>
  );
};

// Attachment styles for blurry files
const attachmentStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  image: {
    width: 250,
    height: 200,
  },
  blurOverlay: {
    position: 'relative',
  },
  overlayContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FB2355',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockText: {
    fontSize: 24,
    color: 'white',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FB2355',
    marginBottom: 8,
    fontFamily: 'questrial',
  },
  titleText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'questrial',
  },
  unlockButton: {
    backgroundColor: '#FB2355',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  unlockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
});