import { useGlobalContext } from '@/lib/global-provider';
import { client, connectUser } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import { ID } from 'appwrite';
import { Audio, ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Client, Databases, Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  Channel,
  Chat,
  DeepPartial,
  MessageAvatar,
  MessageInput,
  MessageList,
  MessageSimple,
  OverlayProvider,
  ReactionData,
  Theme,
  Thread,
  useMessageContext,
  useMessagesContext,
  useThreadContext
} from 'stream-chat-react-native';
import {
  checkPaidContentPurchase,
  config,
  getUserProfile,
  storage
} from '../../lib/appwrite';

// Enhanced profile image caching using our data cache system
import { chatDataCache } from '../../lib/data-cache';

// Custom Paid Content Attachment Component
const PaidContentAttachment = (props: any) => {
  const { attachment, onPressIn } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Get message context to access message sender info
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const messageSender = message?.user;

  // Return null if no attachment
  if (!attachment) {
    return null;
  }

  // Check if user has purchased this content with caching
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user?.$id || !attachment?.paid_content_id) return;
      
      try {
        // Use cached purchase status or fetch if not available
        const hasPurchased = await chatDataCache.getOrFetchPurchaseStatus(
          user.$id,
          attachment.paid_content_id,
          async () => {
            console.log(`🔄 [PurchaseStatus] Checking purchase for content: ${attachment.paid_content_id}`);
            return await checkPaidContentPurchase(user.$id, attachment.paid_content_id);
          }
        );
        
        setIsUnlocked(hasPurchased);
        console.log(`✅ [PurchaseStatus] Content ${attachment.paid_content_id}: ${hasPurchased ? 'UNLOCKED' : 'LOCKED'} (cached)`);
      } catch (error) {
        console.error('❌ [PurchaseStatus] Error checking purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, user?.$id]);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    console.log('Unlocking paid photo directly');
    setIsUnlocked(true);
    
    // Update cache with new unlocked status
    if (user?.$id && attachment?.paid_content_id) {
      chatDataCache.setCachedPurchaseStatus(user.$id, attachment.paid_content_id, true);
      console.log(`✅ [PurchaseStatus] Cache updated: content ${attachment.paid_content_id} now UNLOCKED`);
    }
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentSuccess = async () => {
    console.log('Payment successful for paid content');
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    // Update cache with new unlocked status
    if (user?.$id && attachment?.paid_content_id) {
      chatDataCache.setCachedPurchaseStatus(user.$id, attachment.paid_content_id, true);
      console.log(`✅ [PurchaseStatus] Cache updated: content ${attachment.paid_content_id} now UNLOCKED`);
    }
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  if (attachment?.type === 'paid_content') {
    return (
      <>
        <View style={{
          width: 300,
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
          marginHorizontal: 12,
          position: 'relative',
        }}>
          {/* Background Image */}
          <Image
            source={{ uri: attachment?.image_url }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
            resizeMode="cover"
          />
          
          {/* Blur Overlay (only if not unlocked) */}
          {!isUnlocked && (
            <BlurView
              intensity={50}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          )}
          
          {/* Lock Icon and Price (only if not unlocked) */}
          {!isUnlocked && (
            <TouchableOpacity
              onPress={handleUnlock}
              disabled={isUnlocking}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              }}
              activeOpacity={0.8}
            >
              <View style={{
                backgroundColor: 'rgba(251, 35, 85, 0.9)',
                borderRadius: 50,
                width: 80,
                height: 80,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}>
                {isUnlocking ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 'bold',
                      marginTop: 4,
                      fontFamily: 'Urbanist-Bold',
                    }}>
                      ${attachment?.price || '5.00'}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          {/* Unlocked indicator */}
          {isUnlocked && (
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0, 200, 81, 0.9)',
              borderRadius: 16,
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
                fontFamily: 'Urbanist-Bold',
              }}>
                Unlocked
              </Text>
            </View>
          )}
        </View>

  
 
      </>
    );
  }

  return null;
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
    fontFamily: 'Urbanist-Bold',
  },
  titleText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Urbanist-Regular',
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
    fontFamily: 'Urbanist-Bold',
  },
});

// Blurry File Attachment Component
const BlurryFileAttachment = (props: any) => {
  const { attachment } = props;
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
    </View>
  );
};

// Custom Avatar component that fetches profile images
const PaidVideoAttachment = (props: any) => {
  const { attachment } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 300, height: 200 });
  const [isPortraitMode, setIsPortraitMode] = useState(false);

  // Try to guess video format from URL or attachment data
  useEffect(() => {
    // If we have attachment data that might hint at format
    if (attachment?.title && attachment.title.toLowerCase().includes('vertical')) {
      setVideoDimensions({ width: 225, height: 400 }); // Portrait format
      setIsPortraitMode(true);
    } else if (attachment?.title && attachment.title.toLowerCase().includes('portrait')) {
      setVideoDimensions({ width: 225, height: 400 }); // Portrait format
      setIsPortraitMode(true);
    }
    // You could add more heuristics here based on your data
  }, [attachment]);

  const toggleVideoFormat = () => {
    if (isPortraitMode) {
      setVideoDimensions({ width: 300, height: 200 }); // Landscape
      setIsPortraitMode(false);
    } else {
      setVideoDimensions({ width: 225, height: 400 }); // Portrait
      setIsPortraitMode(true);
    }
  };

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
        console.error('Error checking video purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, user?.$id]);

  // Simple approach: Always use professional placeholder design
  // This ensures consistent, fast loading without thumbnail generation issues
  useEffect(() => {
    console.log('🎬 Using professional video placeholder design');
    setVideoThumbnail(null); // Always use placeholder for reliability
  }, [attachment?.local_video_uri, attachment?.video_url]);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    console.log('Unlocking video directly');
    setIsUnlocked(true);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const calculateVideoDimensions = (videoWidth: number, videoHeight: number) => {
    const maxWidth = 300;
    const maxHeight = 400;
    const minWidth = 200;
    const minHeight = 150;
    
    const aspectRatio = videoWidth / videoHeight;
    
    let containerWidth, containerHeight;
    
    if (aspectRatio > 1) {
      // Landscape video
      containerWidth = maxWidth;
      containerHeight = Math.min(maxWidth / aspectRatio, maxHeight);
    } else {
      // Portrait or square video (phone format)
      containerHeight = maxHeight;
      containerWidth = Math.min(maxHeight * aspectRatio, maxWidth);
      
      // Ensure minimum width for very tall videos
      if (containerWidth < minWidth) {
        containerWidth = minWidth;
        containerHeight = minWidth / aspectRatio;
      }
    }
    
    // Ensure minimum dimensions
    containerWidth = Math.max(containerWidth, minWidth);
    containerHeight = Math.max(containerHeight, minHeight);
    
    return {
      width: Math.round(containerWidth),
      height: Math.round(containerHeight)
    };
  };

  const handleVideoLoad = (status: any) => {
    console.log('Video load event fired:', status);
    
    // Try different properties that might contain dimensions
    let width, height;
    
    if (status.naturalSize) {
      width = status.naturalSize.width;
      height = status.naturalSize.height;
    } else if (status.videoSize) {
      width = status.videoSize.width;
      height = status.videoSize.height;
    } else if (status.duration && status.videoTracks && status.videoTracks.length > 0) {
      const track = status.videoTracks[0];
      width = track.width;
      height = track.height;
    }
    
    console.log('Extracted dimensions:', { width, height });
    
    if (width && height) {
      const newDimensions = calculateVideoDimensions(width, height);
      setVideoDimensions(newDimensions);
      console.log(`Video dimensions: ${width}x${height}, Container: ${newDimensions.width}x${newDimensions.height}`);
    } else {
      console.log('Could not extract video dimensions from status object');
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      
      const videoUri = attachment?.local_video_uri || attachment?.video_url;
      if (!videoUri) {
        Alert.alert('Error', 'Video not available for download');
        return;
      }
      
      // Use sharing to save/share the video
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(videoUri, {
          mimeType: 'video/*',
          dialogTitle: 'Save Video'
        });
        
        // Haptic feedback
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Info', 'Video sharing not available on this device');
      }
      
    } catch (error) {
      console.error('Error sharing video:', error);
      Alert.alert('Error', 'Failed to share video. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (attachment?.type === 'paid_video') {
    return (
      <>
        <View style={{
          width: videoDimensions.width,
          height: videoDimensions.height,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
          marginHorizontal: 12,
          position: 'relative',
        }}>
          {/* Video Player or Background */}
          {isUnlocked ? (
            /* Embedded Video Player when unlocked */
            <Video
              source={{ uri: attachment?.local_video_uri || attachment?.video_url }}
              style={{
                width: '100%',
                height: '100%',
              }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping={false}
              onLoad={handleVideoLoad}
              onReadyForDisplay={handleVideoLoad}
              onLoadStart={() => console.log('Video load started')}
              onError={(error) => console.log('Video error:', error)}
            />
          ) : (
            /* Blurry video preview when locked */
            <View style={{
              width: '100%',
              height: '100%',
              position: 'relative',
            }}>
              {/* Video preview (blurred) */}
              <Video
                source={{ uri: attachment?.local_video_uri || attachment?.video_url }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                shouldPlay={false}
                isLooping={false}
                resizeMode={ResizeMode.COVER}
                onLoad={handleVideoLoad}
              />
              
              {/* Blur overlay */}
              <BlurView
                intensity={25}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              
              {/* Dark overlay for better text visibility */}
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }} />
              
              {/* Content overlay */}
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 16,
              }}>
                {/* Play icon with lock */}
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
                  <Ionicons name="play" size={32} color="#FB2355" />
                  <View style={{
                    position: 'absolute',
                    bottom: -3,
                    right: -3,
                    backgroundColor: '#FB2355',
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
                
                {/* Video title */}
                {attachment?.title && (
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 4,
                  fontFamily: 'Urbanist-Bold',
                    textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}>
                    {attachment.title}
                </Text>
                )}
                
                <TouchableOpacity
                  onPress={handleUnlock}
                  disabled={isUnlocking}
                  style={{
                    backgroundColor: '#FB2355',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 25,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                    marginTop: 8,
                  }}
                  activeOpacity={0.8}
                >
                  {isUnlocking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '700',
                      fontFamily: 'Urbanist-Bold',
                    }}>
                      Unlock for ${attachment?.price || '5.00'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
               
               {/* Format toggle button */}
               <TouchableOpacity
                 onPress={toggleVideoFormat}
                 style={{
                   position: 'absolute',
                   top: 8,
                   right: 8,
                   backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
           )}
          
          {/* Unlocked indicator and Download button */}
          {isUnlocked && (
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              {/* Format toggle button (for testing) */}
              <TouchableOpacity
                onPress={toggleVideoFormat}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={isPortraitMode ? "phone-portrait" : "phone-landscape"} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>

              {/* Download button */}
              <TouchableOpacity
                onPress={handleDownload}
                disabled={isDownloading}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="download" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              
              {/* Unlocked indicator */}
              <View style={{
                backgroundColor: 'rgba(0, 200, 81, 0.9)',
                borderRadius: 16,
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
                  fontFamily: 'Urbanist-Bold',
                }}>
                  Unlocked
                </Text>
              </View>
            </View>
          )}

        </View>

        
      </>
    );
  }

  return null;
};

const CustomMessageAvatar = (props: any) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Get message from MessageContext instead of props
  const messageContext = useMessageContext();
  const message = messageContext?.message || props.message;
  const channel = messageContext?.channel;
  
  // Check if we're in a thread
  const threadContext = useThreadContext();
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  
  // Function to check if we should show avatar based on 5-minute logic (same as timestamp)
  const shouldShowAvatar = () => {
    if (!message?.created_at || !message?.user?.id) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel?.state.messages || {});
    
    // Find all messages from the same user
    const userMessages = messages
      .filter((msg: any) => msg.user?.id === currentUserId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentMessageIndex = userMessages.findIndex((msg: any) => msg.id === message.id);
    
    // If this is the last message from this user overall, show avatar
    if (currentMessageIndex === userMessages.length - 1) {
      return true;
    }
    
    // Get the next message from the same user
    const nextMessage = userMessages[currentMessageIndex + 1];
    if (!nextMessage?.created_at) {
      return true; // Show avatar if we can't find next message
    }
    
    const nextMessageTime = new Date(nextMessage.created_at);
    const timeDifference = nextMessageTime.getTime() - currentMessageTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show avatar if more than 5 minutes will pass before the next message
    return timeDifference >= fiveMinutesInMs;
  };
  
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!message || !message.user || !message.user.id) {
        return;
      }
      
      const userId = message.user.id;
      
      try {
        // Use enhanced data cache for profile images
        const profileImageUrl = await chatDataCache.getOrFetchProfileImage(
          userId,
          async () => {
            console.log(`🔄 [MessageAvatar] Fetching profile for user: ${userId}`);
            
        if (!config.endpoint || !config.projectId || !config.databaseId || !config.profileCollectionId) {
              return '';
        }

        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query profiles collection for the user's profile image
        const profiles = await databases.listDocuments(
          config.databaseId,
          config.profileCollectionId,
          [Query.equal('userId', userId)]
        );
        
        if (profiles.documents.length > 0) {
          const profileImageUri = profiles.documents[0].profileImageUri;
              return profileImageUri || '';
            }
            
            return '';
          }
        );

        if (profileImageUrl) {
          setProfileImage(profileImageUrl);
          console.log(`✅ [MessageAvatar] Profile image loaded (cached) for user: ${userId}`);
        }
      } catch (error) {
        console.error('❌ [MessageAvatar] Error fetching user profile image:', error);
      }
    };
    
    fetchProfileImage();
  }, [message?.user?.id]);

  const showAvatar = shouldShowAvatar();

  // If we have a custom profile image, render it
  if (profileImage) {
    return (
      <View style={{
        width: props.size || 32,
        height: props.size || 32,
        borderRadius: (props.size || 32) / 2,
        marginRight: 8,
        overflow: 'hidden',
        backgroundColor: '#2A2A2A',
        opacity: showAvatar ? 1 : 0, // Make invisible but keep space
      }}>
        <Image
          source={{ uri: profileImage }}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fall back to default MessageAvatar if no custom image, also apply opacity
  return (
    <View style={{ opacity: showAvatar ? 1 : 0 }}>
      <MessageAvatar {...props} />
    </View>
  );
};

// Custom theme matching the provided code
const getTheme = (): DeepPartial<Theme> => ({
  colors: {
    black: '#1A1A1A',
    white: '#FFFFFF',
    primary: '#FB2355',
    grey: '#2A2A2A',
    grey_whisper: '#404040',
    grey_gainsboro: '#666666',
    grey_light: '#999999',
    grey_medium: '#CCCCCC',
    grey_dark: '#FFFFFF',
    accent_blue: '#FB2355',
    accent_green: '#FB2355',
    accent_red: '#FB2355',
  },
  messageInput: {
    container: {
      backgroundColor: '#1A1A1A',
    },
    inputBoxContainer: {
      backgroundColor: '#2A2A2A',
    },
    inputBox: {
      color: '#FFFFFF',
    },
  },
  messageList: {
    container: {
      backgroundColor: '#2A2A2A',
    },
  },
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: '#FB2355',
        borderWidth: 0,
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: '#FB2355',
      },
      markdown: {
        text: {
          color: '#FFFFFF', // White text in message bubbles
        },
        paragraph: {
          color: '#FFFFFF', // White text for paragraphs
        },
        strong: {
          color: '#FFFFFF', // White text for bold text
        },
        em: {
          color: '#FFFFFF', // White text for italic text
        },
      },
    },
  },
  // Poll-specific theming - using proper theme structure
  poll: {
    container: {
      backgroundColor: '#2A2A2A',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#404040',
      marginVertical: 8,
    } as any,
    header: {
      backgroundColor: '#1A1A1A',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    } as any,
    title: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    } as any,
    subtitle: {
      color: '#CCCCCC',
      fontSize: 14,
    } as any,
    option: {
      backgroundColor: '#404040',
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 4,
      paddingHorizontal: 16,
      paddingVertical: 12,
    } as any,
    optionText: {
      color: '#FFFFFF',
      fontSize: 14,
    } as any,
    optionVoted: {
      backgroundColor: '#FB2355',
    } as any,
    optionVotedText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    } as any,
    button: {
      backgroundColor: '#FB2355',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginVertical: 8,
    } as any,
    buttonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
    } as any,
  } as any,
});

// Custom MessageStatus component that hides the default timestamp completely
const CustomMessageStatus = () => {
  return null; // Hide the default timestamp completely
};

// Custom Poll Component with voting functionality
const CustomPollComponent = ({ message, poll }: { message: any; poll: any }) => {
  const { user } = useGlobalContext();
  const [isVoting, setIsVoting] = useState(false);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [localVoteCounts, setLocalVoteCounts] = useState<{[key: string]: number}>({});
  const [localTotalVotes, setLocalTotalVotes] = useState(0);

  useEffect(() => {
    // Get user's current votes from the poll data
    if (poll?.own_votes) {
      const currentVotes = poll.own_votes.map((vote: any) => vote.option_id);
      setUserVotes(currentVotes);
    }
    
    // Initialize local vote counts with server data
    if (poll?.vote_counts_by_option) {
      setLocalVoteCounts(poll.vote_counts_by_option);
    }
    
    // Initialize local total votes
    if (poll?.vote_count !== undefined) {
      setLocalTotalVotes(poll.vote_count);
    }
  }, [poll]);

  const handleVote = async (optionId: string) => {
    if (!client || !message?.id || !poll?.id || isVoting) {
      console.log('Cannot vote: missing client, message ID, poll ID, or already voting');
      return;
    }

    try {
      setIsVoting(true);
      console.log('Casting vote for option:', optionId);

      // Check if user already voted for this option
      const hasVotedForOption = userVotes.includes(optionId);

      // Update UI immediately (optimistic updates)
      if (hasVotedForOption) {
        // Remove vote - update UI immediately
        setUserVotes(prev => prev.filter(id => id !== optionId));
        setLocalVoteCounts(prev => ({
          ...prev,
          [optionId]: Math.max(0, (prev[optionId] || 0) - 1)
        }));
        setLocalTotalVotes(prev => Math.max(0, prev - 1));
      } else {
        // Add vote - update UI immediately
        if (poll.max_votes_allowed === 1) {
          // Single choice poll - remove previous vote and add new one
          const previousVote = userVotes[0];
          if (previousVote) {
            setLocalVoteCounts(prev => ({
              ...prev,
              [previousVote]: Math.max(0, (prev[previousVote] || 0) - 1),
              [optionId]: (prev[optionId] || 0) + 1
            }));
          } else {
            setLocalVoteCounts(prev => ({
              ...prev,
              [optionId]: (prev[optionId] || 0) + 1
            }));
            setLocalTotalVotes(prev => prev + 1);
          }
          setUserVotes([optionId]);
        } else {
          // Multiple choice poll - add to existing votes
          setUserVotes(prev => [...prev, optionId]);
          setLocalVoteCounts(prev => ({
            ...prev,
            [optionId]: (prev[optionId] || 0) + 1
          }));
          setLocalTotalVotes(prev => prev + 1);
        }
      }

      // Now make the API call
      if (hasVotedForOption) {
        // Remove vote
        const voteToRemove = poll.own_votes?.find((vote: any) => vote.option_id === optionId);
        if (voteToRemove) {
          await client.removePollVote(message.id, poll.id, voteToRemove.id);
        }
      } else {
        // Add vote
        await client.castPollVote(message.id, poll.id, { option_id: optionId });
      }

      console.log('Vote cast successfully');
    } catch (error) {
      console.error('Error voting on poll:', error);
      
      // Revert optimistic updates on error
      if (poll?.vote_counts_by_option) {
        setLocalVoteCounts(poll.vote_counts_by_option);
      }
      if (poll?.vote_count !== undefined) {
        setLocalTotalVotes(poll.vote_count);
      }
      if (poll?.own_votes) {
        const currentVotes = poll.own_votes.map((vote: any) => vote.option_id);
        setUserVotes(currentVotes);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const getTotalVotes = () => {
    return localTotalVotes;
  };

  const getOptionVotes = (optionId: string) => {
    return localVoteCounts[optionId] || 0;
  };

  const getVotePercentage = (optionId: string) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    const optionVotes = getOptionVotes(optionId);
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const isVotedOption = (optionId: string) => {
    return userVotes.includes(optionId);
  };

  return (
    <View style={{
      backgroundColor: '#2A2A2A',
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      marginHorizontal: 12,
      borderWidth: 1,
      borderColor: '#404040',
    }}>
      {/* Poll Title */}
      <Text style={{
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Urbanist-Bold',
        marginBottom: 4,
      }}>
        {poll?.name || 'Poll'}
      </Text>

      {/* Poll Description */}
      {poll?.description && (
        <Text style={{
          color: '#CCCCCC',
          fontSize: 14,
          fontFamily: 'Urbanist-Regular',
          marginBottom: 12,
        }}>
          {poll.description}
        </Text>
      )}

      {/* Poll Options */}
      <View style={{ marginBottom: 12 }}>
        {poll?.options?.map((option: any, index: number) => {
          const isVoted = isVotedOption(option.id);
          const votes = getOptionVotes(option.id);
          const percentage = getVotePercentage(option.id);
          const totalVotes = getTotalVotes();

          return (
            <TouchableOpacity
              key={option.id || index}
              style={{
                backgroundColor: isVoted ? '#FB2355' : '#404040',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                borderWidth: isVoted ? 2 : 1,
                borderColor: isVoted ? '#FB2355' : '#666666',
                opacity: isVoting ? 0.7 : 1,
              }}
              onPress={() => handleVote(option.id)}
              disabled={isVoting}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  {/* Vote indicator */}
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: isVoted ? '#FFFFFF' : 'transparent',
                    borderWidth: 2,
                    borderColor: isVoted ? '#FFFFFF' : '#CCCCCC',
                    marginRight: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isVoted && (
                      <Ionicons name="checkmark" size={12} color="#FB2355" />
                    )}
                  </View>

                  {/* Option text */}
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'Urbanist-Medium',
                    flex: 1,
                  }}>
                    {option.text}
                  </Text>
                </View>

                {/* Vote count and percentage */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    {votes} vote{votes !== 1 ? 's' : ''}
                  </Text>
                  {totalVotes > 0 && (
                    <Text style={{
                      color: '#CCCCCC',
                      fontSize: 11,
                      fontFamily: 'Urbanist-Regular',
                    }}>
                      {percentage}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Progress bar */}
              {totalVotes > 0 && (
                <View style={{
                  height: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  marginTop: 8,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 2,
                  }} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Poll Footer */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#404040',
      }}>
        <Text style={{
          color: '#CCCCCC',
          fontSize: 12,
          fontFamily: 'Urbanist-Regular',
        }}>
          Total votes: {getTotalVotes()}
        </Text>

        <Text style={{
          color: '#CCCCCC',
          fontSize: 12,
          fontFamily: 'Urbanist-Regular',
        }}>
          {poll?.max_votes_allowed === 1 ? 'Single choice' : 'Multiple choice'}
        </Text>
      </View>

      {/* Poll status */}
      {poll?.is_closed && (
        <View style={{
          backgroundColor: '#666666',
          borderRadius: 6,
          padding: 6,
          marginTop: 8,
          alignItems: 'center',
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: 11,
            fontFamily: 'Urbanist-Bold',
          }}>
            Poll Closed
          </Text>
        </View>
      )}
    </View>
  );
};

// Custom MessageSimple component that includes visible timestamps with 5-minute logic
const CustomMessageSimple = (props: any) => {
  // Get message from useMessageContext hook
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const channel = messageContext?.channel;
  const { user } = useGlobalContext();
  
  // Check if this message contains a poll (check for poll_id)
  const hasPoll = message?.poll_id || message?.poll;
  
  console.log('Message data:', {
    id: message?.id,
    text: message?.text,
    hasPoll: !!hasPoll,
    poll_id: message?.poll_id,
    poll: message?.poll,
    type: message?.type,
    attachments: message?.attachments
  });
  
  // If message has a poll, render our custom poll component
  if (hasPoll && message?.poll) {
    console.log('Rendering custom poll component');
    return (
      <View>
        {/* Show the message text if any */}
        {message.text && message.text !== `📊 ${message.poll.name}` && (
          <View style={{ marginBottom: 8 }}>
            <MessageSimple {...props} />
          </View>
        )}
        {/* Render our custom poll */}
        <CustomPollComponent message={message} poll={message.poll} />
      </View>
    );
  }
  
  // If poll_id exists but no poll data, use default MessageSimple
  if (hasPoll) {
    console.log('Rendering poll message with default MessageSimple');
    return <MessageSimple {...props} />;
  }
  
  // Check if we're in a thread
  const threadContext = useThreadContext();
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  
  // Check if we're in a DM channel (channel ID starts with 'dm-')
  const isDMChannel = channel?.id?.startsWith('dm-');
  
  // Check if this is my message
  const isMyMessage = message?.user?.id === user?.$id;
  
  // Function to check if this is the last message in the channel
  const isLastMessage = () => {
    if (!message?.created_at || !channel) return false;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel.state.messages || {});
    
    // Sort all messages by creation time
    const sortedMessages = messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Check if this message is the last one
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    return lastMessage?.id === message.id;
  };

  // Function to check if we should show timestamp based on 5-minute logic
  const shouldShowTimestamp = () => {
    if (!message?.created_at || !message?.user?.id) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel?.state.messages || {});
    
    // Find all messages from the same user
    const userMessages = messages
      .filter((msg: any) => msg.user?.id === currentUserId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentMessageIndex = userMessages.findIndex((msg: any) => msg.id === message.id);
    
    // If this is the last message from this user overall, show timestamp
    if (currentMessageIndex === userMessages.length - 1) {
      return true;
    }
    
    // Get the next message from the same user
    const nextMessage = userMessages[currentMessageIndex + 1];
    if (!nextMessage?.created_at) {
      return true; // Show timestamp if we can't find next message
    }
    
    const nextMessageTime = new Date(nextMessage.created_at);
    const timeDifference = nextMessageTime.getTime() - currentMessageTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show timestamp if more than 5 minutes will pass before the next message
    return timeDifference >= fiveMinutesInMs;
  };

  // Check if message has paid content attachments
  const hasPaidContent = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_content');
  
  // Check if message has blurry file attachments
  const hasBlurryFile = message?.attachments?.some((attachment: any) => attachment?.type === 'blurry_file');
  
  // Check if message has paid video attachments
  const hasPaidVideo = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_video');
  
  if (hasPaidContent) {
    console.log('Rendering message with paid content attachment');
    return (
      <View style={{ alignItems: 'flex-end' }}>
        {/* Render paid content attachments only (no text message) */}
        {message.attachments?.map((attachment: any, index: number) => (
          attachment?.type === 'paid_content' ? (
            <PaidContentAttachment 
              key={`paid-content-${index}`}
              attachment={attachment} 
            />
          ) : null
        ))}
        
        {/* Add timestamp for paid content messages */}
        {shouldShowTimestamp() && (
          <View style={{ 
            paddingTop: isInThread 
              ? (isLastMessage() ? 2 : 1) // Threads - tightest spacing
              : isDMChannel 
                ? (isLastMessage() ? 6 : 3) // DM channels - medium spacing
                : (isLastMessage() ? 8 : 4), // Group channels - most spacing
            paddingBottom: isInThread 
              ? (isLastMessage() ? 6 : 3) // Threads
              : isDMChannel 
                ? (isLastMessage() ? 10 : 5) // DM channels
                : (isLastMessage() ? 12 : 6), // Group channels
            paddingHorizontal: 5, // Consistent horizontal padding
            marginTop: isInThread 
              ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
              : isDMChannel 
                ? (isLastMessage() ? -25 : -1) // DM channels - moderate spacing
                : (isLastMessage() ? -10 : -6), // Group channels - original spacing
            marginBottom: isInThread 
              ? (isLastMessage() ? 1 : 0) // Threads
              : isDMChannel 
                ? (isLastMessage() ? 3 : 1) // DM channels
                : (isLastMessage() ? 4 : 2), // Group channels
            alignItems: 'flex-end', // Align right for paid content (always from sender)
            backgroundColor: 'transparent',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6, // Slightly more space between checkmark and time
              paddingHorizontal: 8, // Internal padding for the timestamp container
              paddingVertical: 3, // Vertical padding for better touch target
              borderRadius: 8, // Rounded background for timestamp
              backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle background
            }}>
              <Ionicons 
                name="checkmark" 
                size={13} // Slightly larger checkmark
                color="#00C851" // Green color
                style={{ opacity: 0.9 }}
              />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 12, // Slightly larger timestamp text
                fontWeight: '600', // Medium weight for better readability
                fontFamily: 'questrial',
                opacity: 0.8, // Slightly more visible
                letterSpacing: 0.3, // Better letter spacing
              }}>
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
  
  if (hasPaidVideo) {
    console.log('Rendering message with paid video attachment');
    return (
      <View style={{ alignItems: 'flex-end' }}>
        {/* Render paid video attachments only (no text message) */}
        {message.attachments?.map((attachment: any, index: number) => (
          attachment?.type === 'paid_video' ? (
            <PaidVideoAttachment 
              key={`paid-video-${index}`}
              attachment={attachment} 
            />
          ) : null
        ))}
        
        {/* Add timestamp for paid video messages */}
        {shouldShowTimestamp() && (
          <View style={{ 
            paddingTop: isInThread 
              ? (isLastMessage() ? 2 : 1) // Threads - tightest spacing
              : isDMChannel 
                ? (isLastMessage() ? 6 : 3) // DM channels - medium spacing
                : (isLastMessage() ? 8 : 4), // Group channels - most spacing
            paddingBottom: isInThread 
              ? (isLastMessage() ? 6 : 3) // Threads
              : isDMChannel 
                ? (isLastMessage() ? 10 : 5) // DM channels
                : (isLastMessage() ? 12 : 6), // Group channels
            paddingHorizontal: 5, // Consistent horizontal padding
            marginTop: isInThread 
              ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
              : isDMChannel 
                ? (isLastMessage() ? -25 : -1) // DM channels - moderate spacing
                : (isLastMessage() ? -13 : -5), // Group channels - original spacing
            marginBottom: isInThread 
              ? (isLastMessage() ? 1 : 0) // Threads
              : isDMChannel 
                ? (isLastMessage() ? 3 : 1) // DM channels
                : (isLastMessage() ? 4 : 2), // Group channels
            alignItems: 'flex-end', // Align right for paid videos (always from sender)
            backgroundColor: 'transparent',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6, // Slightly more space between checkmark and time
              paddingHorizontal: 8, // Internal padding for the timestamp container
              paddingVertical: 3, // Vertical padding for better touch target
              borderRadius: 8, // Rounded background for timestamp
              backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle background
            }}>
              <Ionicons 
                name="checkmark" 
                size={13} // Slightly larger checkmark
                color="#00C851" // Green color
                style={{ opacity: 0.9 }}
              />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 12, // Slightly larger timestamp text
                fontWeight: '600', // Medium weight for better readability
                fontFamily: 'questrial',
                opacity: 0.8, // Slightly more visible
                letterSpacing: 0.3, // Better letter spacing
              }}>
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
  
  if (hasBlurryFile) {
    console.log('Rendering message with blurry file attachment');
    return (
      <View style={{ alignItems: 'flex-end' }}>
        {/* Render blurry file attachments only (no text message) */}
        {message.attachments?.map((attachment: any, index: number) => (
          attachment?.type === 'blurry_file' ? (
            <BlurryFileAttachment 
              key={`blurry-file-${index}`}
              attachment={attachment} 
            />
          ) : null
        ))}
        
        {/* Add timestamp for blurry pdf file messages and else  */} 
        {shouldShowTimestamp() && (
          <View style={{ 
            paddingTop: isInThread 
              ? (isLastMessage() ? 2 : 1) // Threads - tightest spacing
              : isDMChannel 
                ? (isLastMessage() ? 6 : 3) // DM channels - medium spacing
                : (isLastMessage() ? 8 : 4), // Group channels - most spacing
            paddingBottom: isInThread 
              ? (isLastMessage() ? 6 : 3) // Threads
              : isDMChannel 
                ? (isLastMessage() ? 10 : 5) // DM channels
                : (isLastMessage() ? 12 : 6), // Group channels
            paddingHorizontal: 5, // Consistent horizontal padding
            marginTop: isInThread 
              ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
              : isDMChannel 
                ? (isLastMessage() ? -25 : -1) // DM channels - moderate spacing
                : (isLastMessage() ? -15 : -11), // Group channels - original spacing
            marginBottom: isInThread 
              ? (isLastMessage() ? 1 : 0) // Threads
              : isDMChannel 
                ? (isLastMessage() ? 3 : 1) // DM channels
                : (isLastMessage() ? 4 : 2), // Group channels
            alignItems: 'flex-end', // Align right for blurry files (always from sender)
            backgroundColor: 'transparent',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6, // Slightly more space between checkmark and time
              paddingHorizontal: 8, // Internal padding for the timestamp container
              paddingVertical: 3, // Vertical padding for better touch target
              borderRadius: 8, // Rounded background for timestamp
              backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle background
            }}>
              <Ionicons 
                name="checkmark" 
                size={13} // Slightly larger checkmark
                color="#00C851" // Green color
                style={{ opacity: 0.9 }}
              />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 12, // Slightly larger timestamp text
                fontWeight: '600', // Medium weight for better readability
                fontFamily: 'questrial',
                opacity: 0.8, // Slightly more visible
                letterSpacing: 0.3, // Better letter spacing
              }}>
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
  
  if (hasPaidContent) {
    console.log('Rendering message with paid content attachment');
    return (
      <View style={{ alignItems: 'flex-end' }}>
        {/* Render paid content attachments only (no text message) */}
        {message.attachments?.map((attachment: any, index: number) => (
          attachment?.type === 'paid_content' ? (
            <PaidContentAttachment 
              key={`paid-content-${index}`}
              attachment={attachment} 
            />
          ) : null
        ))}
        
        {/* Add timestamp for paid content messages */}
        {shouldShowTimestamp() && (
          <View style={{ 
            paddingTop: isInThread 
              ? (isLastMessage() ? 2 : 1) // Threads - tightest spacing
              : isDMChannel 
                ? (isLastMessage() ? 6 : 3) // DM channels - medium spacing
                : (isLastMessage() ? 8 : 4), // Group channels - most spacing
            paddingBottom: isInThread 
              ? (isLastMessage() ? 6 : 3) // Threads
              : isDMChannel 
                ? (isLastMessage() ? 10 : 5) // DM channels
                : (isLastMessage() ? 12 : 6), // Group channels
            paddingHorizontal: 5, // Consistent horizontal padding
            marginTop: isInThread 
              ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
              : isDMChannel 
                ? (isLastMessage() ? -25 : -1) // DM channels - moderate spacing
                : (isLastMessage() ? -30 : 2), // Group channels - original spacing
            marginBottom: isInThread 
              ? (isLastMessage() ? 1 : 0) // Threads
              : isDMChannel 
                ? (isLastMessage() ? 3 : 1) // DM channels
                : (isLastMessage() ? 4 : 2), // Group channels
            alignItems: 'flex-end', // Align right for paid content (always from sender)
            backgroundColor: 'transparent',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6, // Slightly more space between checkmark and time
              paddingHorizontal: 8, // Internal padding for the timestamp container
              paddingVertical: 3, // Vertical padding for better touch target
              borderRadius: 8, // Rounded background for timestamp
              backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle background
            }}>
              <Ionicons 
                name="checkmark" 
                size={13} // Slightly larger checkmark
                color="#00C851" // Green color
                style={{ opacity: 0.9 }}
              />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 12, // Slightly larger timestamp text
                fontWeight: '600', // Medium weight for better readability
                fontFamily: 'questrial',
                opacity: 0.8, // Slightly more visible
                letterSpacing: 0.3, // Better letter spacing
              }}>
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
  
  return (
    <View>
      {/* Render the default MessageSimple */}
      <MessageSimple {...props} />
      
      {/* Add our custom timestamp below */}
      {shouldShowTimestamp() && (
        <View style={{ 
          paddingTop: isInThread 
            ? (isLastMessage() ? 2 : 1) // Threads - tightest spacing
            : isDMChannel 
              ? (isLastMessage() ? 6 : 3) // DM channels - medium spacing
              : (isLastMessage() ? 8 : 4), // Group channels - most spacing
          paddingBottom: isInThread 
            ? (isLastMessage() ? 6 : 3) // Threads
            : isDMChannel 
              ? (isLastMessage() ? 10 : 5) // DM channels
              : (isLastMessage() ? 12 : 6), // Group channels
          paddingHorizontal: 0, // Consistent horizontal padding
          marginTop: isInThread 
            ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
            : isDMChannel 
              ? (isLastMessage() ? -30 : -1) // DM channels - moderate spacing
              : (isLastMessage() ? -30 : 2), // Group channels - original spacing
          marginBottom: isInThread 
            ? (isLastMessage() ? 1 : 0) // Threads
            : isDMChannel 
              ? (isLastMessage() ? 3 : 1) // DM channels
              : (isLastMessage() ? 4 : 2), // Group channels
          alignItems: isMyMessage ? 'flex-end' : 'flex-start', // Align right for our messages, left for others
          backgroundColor: 'transparent',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6, // Slightly more space between checkmark and time
            paddingHorizontal: 8, // Internal padding for the timestamp container
            paddingVertical: 3, // Vertical padding for better touch target
            borderRadius: 8, // Rounded background for timestamp
            backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle background
          }}>
            <Ionicons 
              name="checkmark" 
              size={13} // Slightly larger checkmark
              color="#00C851" // Green color
              style={{ opacity: 0.9 }}
            />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12, // Slightly larger timestamp text
              fontWeight: '600', // Medium weight for better readability
              fontFamily: 'questrial',
              opacity: 0.8, // Slightly more visible
              letterSpacing: 0.3, // Better letter spacing
            }}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Create a custom modal component for message actions
const CustomMessageModal = ({ visible, onClose, message, onThreadReply }: {
  visible: boolean;
  onClose: () => void;
  message: any;
  onThreadReply: (message: any) => void;
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const { supportedReactions } = useMessagesContext();
  const { user } = useGlobalContext();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(50);
      rotateAnim.setValue(0);
      
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Cool exit animations with rotation and scale down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.3,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, slideAnim, rotateAnim]);

  // Handle closing with animation
  const handleClose = () => {
    // Trigger exit animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.3,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Call onClose after animation completes
      onClose();
      setShowReactions(false);
    });
  };

  // Handle thread reply
  const handleThreadReply = () => {
    handleClose();
    if (message) {
      setTimeout(() => {
        onThreadReply(message);
      }, 50);
    }
  };

  // Handle reaction selection
  const handleReaction = async (reactionType: string) => {
    handleClose();
    
    try {
      if (message && user) {
        // Extract channel ID from message.cid (remove the "messaging:" prefix)
        const channelId = message.cid.replace('messaging:', '');
        const channel = client.channel('messaging', channelId);
        
        // Check if user already reacted with this type
        const existingReaction = message.own_reactions?.find((reaction: any) => 
          reaction.type === reactionType && reaction.user?.id === user.$id
        );
        
        if (existingReaction) {
          // Remove the reaction if it already exists
          await channel.deleteReaction(message.id, reactionType);
        } else {
          // Add the reaction if it doesn't exist
          await channel.sendReaction(message.id, { type: reactionType });
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async () => {
    if (!message || !user) return;
    
    // Check if user owns the message
    if (message.user?.id !== user.$id) {
      Alert.alert('Error', 'You can only delete your own messages');
      return;
    }
    
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              handleClose();
              
              // Extract channel ID from message.cid (remove the "messaging:" prefix)
              const channelId = message.cid.replace('messaging:', '');
              const channel = client.channel('messaging', channelId);
              
              // Delete the message
              await client.deleteMessage(message.id);
              
              // Haptic feedback
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              
              console.log('Message deleted successfully');
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <>
      <StatusBar style="light" />
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: 'transparent',
      }}>
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 26, 26, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
        }}>
          {/* Backdrop - tap to dismiss */}
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={handleClose}
            activeOpacity={1}
          />

          {/* Custom Modal Content */}
          <Animated.View style={{
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
              { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '15deg']
                })
              }
            ],
            alignSelf: 'center',
          }}>
            <View style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 16,
              marginHorizontal: 24,
              borderWidth: 1,
              borderColor: '#666666',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
              width: 280,
              alignSelf: 'center',
            }}>
              {/* Thread Reply Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  marginBottom: 12,
                  backgroundColor: '#2A2A2A',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#404040',
                }}
                onPress={handleThreadReply}
                activeOpacity={0.8}
              >
                <View style={{
                  backgroundColor: '#FB2355',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                </View>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  flex: 1,
                }}>
                  Reply in Thread
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#666666" />
              </TouchableOpacity>

              {/* Delete Message Button - only show for user's own messages */}
              {message?.user?.id === user?.$id && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    marginBottom: 12,
                    backgroundColor: '#2A2A2A',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#FF4444',
                  }}
                  onPress={handleDeleteMessage}
                  activeOpacity={0.8}
                >
                  <View style={{
                    backgroundColor: '#FF4444',
                    borderRadius: 16,
                    width: 32,
                    height: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={{
                    color: '#FF4444',
                    fontSize: 14,
                    fontWeight: '600',
                    fontFamily: 'questrial',
                    flex: 1,
                  }}>
                    Delete Message
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#666666" />
                </TouchableOpacity>
              )}

              {/* Reactions Grid */}
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 8,
                marginBottom: 8,
              }}>
                {supportedReactions?.map((item) => {
                  // Check if user has already reacted with this type
                  const hasUserReacted = message?.own_reactions?.some((reaction: any) => 
                    reaction.type === item.type && reaction.user?.id === user?.$id
                  );
                  
                  return (
                    <TouchableOpacity
                      key={item.type}
                      style={{
                        backgroundColor: '#2A2A2A',
                        borderRadius: 18,
                        width: 36,
                        height: 36,
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: 4,
                        borderWidth: 1,
                        borderColor: hasUserReacted ? '#666666' : '#404040',
                        position: 'relative',
                      }}
                      onPress={() => handleReaction(item.type)}
                      activeOpacity={0.7}
                    >
                      {item.Icon ? <item.Icon /> : null}
                      {hasUserReacted && (
                        <View style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#00C851',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Text style={{
                            color: '#FFFFFF',
                            fontSize: 8,
                            fontWeight: 'bold',
                          }}>
                            ✓
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#404040',
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  alignSelf: 'center',
                  borderWidth: 1,
                  borderColor: '#666666',
                }}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: '500',
                  fontFamily: 'questrial',
                  textAlign: 'center',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </>
  );
};

// Custom reactions for our chat
const customReactions: ReactionData[] = [
  { type: "love", Icon: () => <Text style={{ fontSize: 18 }}>❤️</Text> },
  { type: "like", Icon: () => <Text style={{ fontSize: 18 }}>👍</Text> },
  { type: "haha", Icon: () => <Text style={{ fontSize: 18 }}>😂</Text> },
  { type: "wow", Icon: () => <Text style={{ fontSize: 18 }}>😮</Text> },
  { type: "sad", Icon: () => <Text style={{ fontSize: 18 }}>😢</Text> },
  { type: "angry", Icon: () => <Text style={{ fontSize: 18 }}>😡</Text> },
  { type: "fire", Icon: () => <Text style={{ fontSize: 18 }}>🔥</Text> },
  { type: "100", Icon: () => <Text style={{ fontSize: 18 }}>💯</Text> },
  { type: "party", Icon: () => <Text style={{ fontSize: 18 }}>🎉</Text> },
  { type: "skull", Icon: () => <Text style={{ fontSize: 18 }}>💀</Text> },
];



const priceModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 120,
    padding: 20,
  },
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 100,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePreview: {
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FB2355',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FB2355',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    width: '100%',
  },
  currencySymbol: {
    color: '#FB2355',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'left',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Urbanist-SemiBold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#FB2355',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
  },
});

// Upload Modal Styles
const uploadModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    minWidth: 280,
  },
  spinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: 'rgba(251, 35, 85, 0.3)',
    borderTopColor: '#FB2355',
    marginBottom: 24,
  },
  spinnerInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(251, 35, 85, 0.1)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  progress: {
    color: '#CCCCCC',
    fontSize: 16,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FB2355',
  },
});

// Custom Price Input Modal
const PriceInputModal = ({ visible, onClose, onSubmit, imageUri }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (price: number) => void;
  imageUri: string | null;
}) => {
  const [price, setPrice] = useState('5.00');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }
    if (numPrice > 999) {
      setError('Price cannot exceed $999');
      return;
    }
    onSubmit(numPrice);
    onClose();
    setPrice('5.00');
    setError('');
  };

  const handleClose = () => {
    onClose();
    setPrice('5.00');
    setError('');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={priceModalStyles.overlay}>
        <View style={priceModalStyles.container}>
          <TouchableOpacity onPress={handleClose} style={priceModalStyles.closeButton}>
            <Text style={priceModalStyles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={priceModalStyles.title}>Set Content Price</Text>
          
          {imageUri && (
            <View style={priceModalStyles.imagePreview}>
              <Image source={{ uri: imageUri }} style={priceModalStyles.previewImage} />
            </View>
          )}
          
          <Text style={priceModalStyles.subtitle}>
            Set the price for your exclusive content
          </Text>
          
          <View style={priceModalStyles.inputContainer}>
            <Text style={priceModalStyles.currencySymbol}>$</Text>
            <TextInput
              style={priceModalStyles.priceInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="5.00"
              placeholderTextColor="#666"
              autoFocus
              selectTextOnFocus
            />
          </View>
          
          {error ? (
            <Text style={priceModalStyles.errorText}>{error}</Text>
          ) : null}
          
          <View style={priceModalStyles.buttonContainer}>
            <TouchableOpacity
              style={priceModalStyles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={priceModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={priceModalStyles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={priceModalStyles.submitButtonText}>Set Price</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Custom Upload Progress Modal
const FilePriceInputModal = ({ visible, onClose, onSubmit, fileUri }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (fileUri: string, price: number, title: string) => void;
  fileUri: string | null;
}) => {
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your file');
      return;
    }
    if (fileUri) {
      onSubmit(fileUri, numPrice, title.trim());
    }
    setPrice('');
    setTitle('');
    onClose();
  };

  const handleClose = () => {
    setPrice('');
    setTitle('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <BlurView
        intensity={20}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : 'height'}
          style={{
            width: '90%',
            maxWidth: 400,
          }}
        >
          <View style={{
            backgroundColor: '#1A1A1A',
            borderRadius: 20,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10,
            borderWidth: 1,
            borderColor: '#4CAF50',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: 'white',
                fontFamily: 'Urbanist-Bold',
              }}>
                Set File Price
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* File Preview */}
            {fileUri && (
              <View style={{
                width: '100%',
                height: 200,
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                marginBottom: 20,
                overflow: 'hidden',
                position: 'relative',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {/* Generic file icon since we can't preview all file types */}
                <View style={{
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#1A1A1A',
                }}>
                  <Text style={{
                    fontSize: 48,
                    marginBottom: 8,
                  }}>📄</Text>
                  <Text style={{
                    color: '#888',
                    fontSize: 14,
                    textAlign: 'center',
                    fontFamily: 'Urbanist-Regular',
                  }}>
                    File selected
                  </Text>
                </View>
                
                {/* Blur overlay to show it will be blurred */}
                <BlurView
                  intensity={15}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View style={{
                    backgroundColor: 'rgba(76, 175, 80, 0.9)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 15,
                  }}>
                    <Text style={{
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 'bold',
                      fontFamily: 'Urbanist-Bold',
                    }}>
                      📁 BLURRED PREVIEW
                    </Text>
                  </View>
                </BlurView>
              </View>
            )}

            {/* Title Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                color: '#888',
                fontSize: 14,
                marginBottom: 8,
                fontFamily: 'Urbanist-Regular',
              }}>
                File Title
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#2A2A2A',
                  borderRadius: 12,
                  padding: 16,
                  color: 'white',
                  fontSize: 16,
                  fontFamily: 'Urbanist-Regular',
                  borderWidth: 1,
                  borderColor: '#4CAF50',
                }}
                placeholder="Enter file title (e.g., Premium Guide)"
                placeholderTextColor="#666"
                value={title}
                onChangeText={setTitle}
                autoFocus={true}
              />
            </View>

            {/* Price Input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                color: '#888',
                fontSize: 14,
                marginBottom: 8,
                fontFamily: 'Urbanist-Regular',
              }}>
                File Price (USD)
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#2A2A2A',
                  borderRadius: 12,
                  padding: 16,
                  color: 'white',
                  fontSize: 16,
                  fontFamily: 'Urbanist-Regular',
                  borderWidth: 1,
                  borderColor: '#4CAF50',
                }}
                placeholder="Enter price (e.g., 9.99)"
                placeholderTextColor="#666"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#333',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={handleClose}
              >
                <Text style={{
                  color: '#888',
                  fontSize: 16,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#4CAF50',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  shadowColor: '#4CAF50',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                onPress={handleSubmit}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold',
                }}>
                  Send File
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
};

const VideoPriceInputModal = ({ visible, onClose, onSubmit, videoUri }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (price: number, title: string) => void;
  videoUri: string | null;
}) => {
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your video');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
      return;
    }
    onSubmit(numPrice, title.trim());
    setPrice('');
    setTitle('');
    onClose();
  };

  const handleClose = () => {
    setPrice('');
    setTitle('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
      }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            backgroundColor: '#1A1A1A',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingHorizontal: 24,
            paddingBottom: 40,
            minHeight: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <Text style={{
              color: 'white',
              fontSize: 24,
              fontFamily: 'Urbanist-Bold',
            }}>
              Set Video Price
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{
                color: '#9C27B0',
                fontSize: 18,
                fontFamily: 'Urbanist-SemiBold',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Video Preview */}
          {videoUri && (
            <View style={{
              backgroundColor: '#2A2A2A',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: '#9C27B0',
            }}>
              <View style={{
                backgroundColor: '#3A3A3A',
                borderRadius: 8,
                height: 200,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Text style={{ fontSize: 64, opacity: 0.6 }}>🎥</Text>
                <Text style={{
                  color: '#9C27B0',
                  fontSize: 14,
                  fontWeight: 'bold',
                  marginTop: 8,
                }}>
                  Video Preview
                </Text>
              </View>
              <Text style={{
                color: '#CCC',
                fontSize: 14,
                fontFamily: 'Urbanist-Regular',
                textAlign: 'center',
              }}>
                Video selected successfully
              </Text>
            </View>
          )}

          {/* Title Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              color: '#888',
              fontSize: 14,
              marginBottom: 8,
              fontFamily: 'Urbanist-Regular',
            }}>
              Video Title
            </Text>
            <TextInput
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
                fontFamily: 'Urbanist-Regular',
                borderWidth: 1,
                borderColor: '#9C27B0',
              }}
              placeholder="Enter video title"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              autoFocus={true}
              returnKeyType="next"
            />
          </View>

          {/* Price Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              color: '#888',
              fontSize: 14,
              marginBottom: 8,
              fontFamily: 'Urbanist-Regular',
            }}>
              Video Price (USD)
            </Text>
            <TextInput
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
                fontFamily: 'Urbanist-Regular',
                borderWidth: 1,
                borderColor: '#9C27B0',
              }}
              placeholder="Enter price (e.g., 9.99)"
              placeholderTextColor="#666"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Action Buttons */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#666',
              }}
              onPress={handleClose}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontFamily: 'Urbanist-SemiBold',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#9C27B0',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                shadowColor: '#9C27B0',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={handleSubmit}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontFamily: 'Urbanist-Bold',
              }}>
                Create Paid Video
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const AudioRecordingModal = ({ visible, onClose, onSend }: {
  visible: boolean;
  onClose: () => void;
  onSend: (audioUri: string, duration: number) => void;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need microphone access to record voice messages.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with custom options for better compatibility
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const status = await recordingRef.current.getStatusAsync();
      
      // Clean up
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const finalDuration = recordingTime;
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);
      
      if (uri) {
        // Pass both URI and duration
        onSend(uri, finalDuration);
      }
      onClose();
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      
      // Clean up
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);
      onClose();
    } catch (error) {
      console.error('Error cancelling recording:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ 
          backgroundColor: '#2A2A2A', 
          padding: 30, 
          borderRadius: 20, 
          alignItems: 'center',
          width: 280
        }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
            Voice Message
          </Text>
          
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isRecording ? '#FF4444' : '#FB2355',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Ionicons name="mic" size={30} color="white" />
          </View>
          
          <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 30 }}>
            {formatTime(recordingTime)}
          </Text>
          
          {!isRecording ? (
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <TouchableOpacity
                onPress={cancelRecording}
                style={{
                  backgroundColor: '#666',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 25
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={startRecording}
                style={{
                  backgroundColor: '#FB2355',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 25
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Recording</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={stopRecording}
              style={{
                backgroundColor: '#4CAF50',
                paddingHorizontal: 30,
                paddingVertical: 12,
                borderRadius: 25
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Stop & Send</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const UploadProgressModal = ({ visible, progress, uploadType = 'video' }: {
  visible: boolean;
  progress: string;
  uploadType?: 'video' | 'file' | 'photo';
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Scale in animation
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Continuous spin animation
      const spin = () => {
        spinValue.setValue(0);
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }).start(() => {
          if (visible) spin();
        });
      };
      spin();

      // Pulse animation for the upload icon
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (visible) pulse();
        });
      };
      pulse();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible, spinValue, scaleValue, pulseValue]);

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Animated.View style={{
          backgroundColor: '#1A1A1A',
          borderRadius: 20,
          padding: 32,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 300,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 16,
          borderWidth: 1,
          borderColor: '#2A2A2A',
          transform: [{ scale: scaleValue }],
        }}>
          {/* Upload Icon with Animation */}
          <Animated.View style={{
            marginBottom: 24,
            transform: [{ scale: pulseValue }],
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: uploadType === 'video' ? '#9C27B0' : '#4CAF50',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: uploadType === 'video' ? '#9C27B0' : '#4CAF50',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}>
              <Text style={{ fontSize: 32 }}>{uploadType === 'video' ? '🎥' : '📁'}</Text>
            </View>
          </Animated.View>

          {/* Spinning Progress Ring */}
          <Animated.View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 4,
            borderColor: '#2A2A2A',
            borderTopColor: uploadType === 'video' ? '#9C27B0' : '#4CAF50',
            marginBottom: 20,
            transform: [{ rotate: spinInterpolate }],
          }} />
          
          <Text style={{
            color: 'white',
            fontSize: 20,
            fontFamily: 'Urbanist-Bold',
            marginBottom: 8,
            textAlign: 'center',
          }}>
            {uploadType === 'video' ? 'Uploading Video' : uploadType === 'photo' ? 'Uploading Photo' : 'Uploading File'}
          </Text>
          
          <Text style={{
            color: uploadType === 'video' ? '#9C27B0' : uploadType === 'photo' ? '#FF4081' : '#4CAF50',
            fontSize: 16,
            fontFamily: 'Urbanist-SemiBold',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            {progress || 'Preparing upload...'}
          </Text>
          
          {/* Progress Bar */}
          <View style={{
            width: '100%',
            height: 6,
            backgroundColor: '#2A2A2A',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <Animated.View style={{
              height: '100%',
              backgroundColor: uploadType === 'video' ? '#9C27B0' : '#4CAF50',
              borderRadius: 3,
              width: progress.includes('Processing') ? '25%' : 
                    progress.includes('Uploading') ? '60%' : 
                    progress.includes('Finalizing') ? '90%' : 
                    progress.includes('success') ? '100%' : '10%',
              shadowColor: uploadType === 'video' ? '#9C27B0' : '#4CAF50',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
              elevation: 4,
            }} />
          </View>

          {/* Upload Tips */}
          <Text style={{
            color: '#888',
            fontSize: 12,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 16,
          }}>
            Please don't close the app during upload
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const { id: channelId } = useLocalSearchParams<{ id: string }>();
  const { user } = useGlobalContext();
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPollCreation, setShowPollCreation] = useState(false);
  const [thread, setThread] = useState<any>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(getTheme());
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showFilePriceModal, setShowFilePriceModal] = useState(false);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  
  // Paid Video states
  const [showVideoPriceModal, setShowVideoPriceModal] = useState(false);
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  
  // Paid Photo states
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  
  // File upload states
  const [isFileUploading, setIsFileUploading] = useState(false);
  
  // Profile image state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Audio recording state
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    setTheme(getTheme());
  }, [colorScheme]);

  useEffect(() => {
    const initializeChat = async () => {
      if (!user?.$id || !channelId) {
        setError('Missing user or channel ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Connect user to Stream Chat
        await connectUser(user.$id);

        // Get the channel
        const channelInstance = client.channel('messaging', channelId);
        await channelInstance.watch();

        setChannel(channelInstance);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [user, channelId]);

  // Load profile image with caching
  useEffect(() => {
    const loadProfileImage = async () => {
      if (!user?.$id) return;

      try {
        // Use cached profile image or fetch if not available
        const profileImageUrl = await chatDataCache.getOrFetchProfileImage(
          user.$id,
          async () => {
            console.log(`🔄 [ProfileImage] Fetching profile for user: ${user.$id}`);
        const profile = await getUserProfile(user.$id);
            return profile?.profileImageUri || '';
          }
        );

        if (profileImageUrl) {
          setProfileImage(profileImageUrl);
          console.log('✅ [ProfileImage] Loaded profile image (cached):', profileImageUrl.substring(0, 60) + '...');
        } else {
          console.log('❌ [ProfileImage] No profile image found');
        }
      } catch (error) {
        console.error('❌ [ProfileImage] Error loading profile image:', error);
      }
    };

    loadProfileImage();
  }, [user]);

  // Preload images from visible messages for better performance
  useEffect(() => {
    const preloadVisibleImages = async () => {
      if (!channel) return;

      try {
        // Get the latest messages from the channel
        const messages = channel.state.messages || [];
        
        // Extract image URLs from custom_photo attachments
        const imageUrls: string[] = [];
        
        messages.slice(-50).forEach((message: any) => { // Only preload last 50 messages
          if (message.attachments) {
            message.attachments.forEach((attachment: any) => {
              if (attachment.type === 'custom_photo' && attachment.image_url) {
                imageUrls.push(attachment.image_url);
              }
            });
          }
        });

        if (imageUrls.length > 0) {
          console.log(`🚀 [ImagePreload] Starting preload of ${imageUrls.length} images...`);
          
          // Import and use the image cache for preloading
          const { chatImageCache } = await import('../../lib/image-cache');
          await chatImageCache.preloadImages(imageUrls);
          
          console.log(`✅ [ImagePreload] Completed preloading ${imageUrls.length} images`);
        }
      } catch (error) {
        console.error('⚠️ [ImagePreload] Failed to preload images:', error);
      }
    };

    // Preload with a delay to not block initial render
    const preloadTimer = setTimeout(preloadVisibleImages, 2000);
    
    return () => clearTimeout(preloadTimer);
  }, [channel]);

  // Handle long press on message
  const handleLongPressMessage = (payload: any) => {
    if (payload.message) {
      setSelectedMessage(payload.message);
      setShowCustomModal(true);
    }
  };

  // Handle thread reply
  const handleThreadReply = (message: any) => {
    setThread(message);
  };

  // Function to handle poll creation
  const handleCreatePoll = async (pollData: any) => {
    try {
      if (!channel || !client) {
        console.error('No channel or client available');
        return;
      }

      console.log('Creating poll with data:', pollData);

      // Step 1: Create the poll using Stream Chat API
      const pollConfig = {
        name: pollData.poll.name,
        options: pollData.poll.options,
        allow_user_suggested_options: pollData.poll.allow_user_suggested_options,
        max_votes_allowed: pollData.poll.max_votes_allowed,
        voting_visibility: pollData.poll.voting_visibility,
        enforce_unique_vote: pollData.poll.max_votes_allowed === 1
      };

      console.log('Creating poll with config:', JSON.stringify(pollConfig, null, 2));
      
      const createdPoll = await client.createPoll(pollConfig);
      console.log('Poll created successfully:', createdPoll);

      // Step 2: Send a message with the poll_id
      const messageData = {
        text: `📊 ${pollData.text}`,
        poll_id: createdPoll.poll.id
      };

      console.log('Sending message with poll_id:', messageData);

      await channel.sendMessage(messageData);
      console.log('Poll message sent successfully');
      
      setShowPollCreation(false);
    } catch (error) {
      console.error('Error creating poll:', error);
    }
  };

  // Custom Poll Creation Component
  const CustomPollCreation = ({ visible, onClose, onCreatePoll }: {
    visible: boolean;
    onClose: () => void;
    onCreatePoll: (pollData: any) => void;
  }) => {
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
    const [allowUserSuggestedOptions, setAllowUserSuggestedOptions] = useState(false);
    const [maxVotesPerUser, setMaxVotesPerUser] = useState(1);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 50,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [visible]);

    const addOption = () => {
      if (pollOptions.length < 10) {
        setPollOptions([...pollOptions, '']);
      }
    };

    const removeOption = (index: number) => {
      if (pollOptions.length > 2) {
        setPollOptions(pollOptions.filter((_, i) => i !== index));
      }
    };

    const updateOption = (index: number, value: string) => {
      const newOptions = [...pollOptions];
      newOptions[index] = value;
      setPollOptions(newOptions);
    };

    const handleCreatePoll = () => {
      if (!pollQuestion.trim()) return;
      
      const validOptions = pollOptions.filter(option => option.trim());
      if (validOptions.length < 2) return;

      // Create poll options with proper structure
      const pollOptionsData = validOptions.map((option, index) => ({
        text: option.trim()
      }));

      console.log('Valid options:', validOptions);
      console.log('Poll options data:', pollOptionsData);

      const pollData = {
        text: pollQuestion.trim(),
        poll: {
          name: pollQuestion.trim(),
          options: pollOptionsData,
          allow_answers: allowUserSuggestedOptions,
          allow_user_suggested_options: allowUserSuggestedOptions,
          max_votes_allowed: allowMultipleAnswers ? maxVotesPerUser : 1,
          voting_visibility: 'public',
        },
      };

      console.log('Final poll data:', JSON.stringify(pollData, null, 2));

      onCreatePoll(pollData);
      
      // Reset form
      setPollQuestion('');
      setPollOptions(['', '']);
      setAllowMultipleAnswers(false);
      setAllowUserSuggestedOptions(false);
      setMaxVotesPerUser(1);
    };

    if (!visible) return null;

        return (
      <KeyboardAvoidingView
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableOpacity 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
          activeOpacity={1}
        />
        
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40,
        }}>
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: '#1A1A1A',
            borderRadius: 20,
            marginHorizontal: 20,
            maxHeight: '90%',
            width: '90%',
            borderWidth: 2,
            borderColor: '#FB2355',
            flex: 1,
            maxWidth: 400,
          }}>
            {/* Header - Fixed */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#2A2A2A',
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 22,
                fontWeight: 'bold',
                fontFamily: 'Urbanist-Bold',
              }}>
                Create Poll
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  backgroundColor: '#2A2A2A',
                  borderRadius: 20,
                  width: 36,
                  height: 36,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingTop: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Poll Question */}
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 8,
                fontFamily: 'questrial',
              }}>
                Poll Question
              </Text>
              <View style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#404040',
                marginBottom: 20,
              }}>
                <TextInput
                  style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontFamily: 'questrial',
                    minHeight: 44,
                  }}
                  placeholder="What's your question?"
                  placeholderTextColor="#666666"
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  multiline
                  maxLength={200}
                />
              </View>

              {/* Poll Options */}
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 8,
                fontFamily: 'questrial',
              }}>
                Options
              </Text>
              
              {pollOptions.map((option, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <View style={{
                    flex: 1,
                    backgroundColor: '#2A2A2A',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#404040',
                    marginRight: 8,
                  }}>
                    <TextInput
                      style={{
                        color: '#FFFFFF',
                        fontSize: 14,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontFamily: 'questrial',
                        minHeight: 44,
                      }}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor="#666666"
                      value={option}
                      onChangeText={(text: string) => updateOption(index, text)}
                      maxLength={80}
                    />
                  </View>
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      onPress={() => removeOption(index)}
                      style={{
                        backgroundColor: '#FF4444',
                        borderRadius: 20,
                        width: 36,
                        height: 36,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="remove" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              {pollOptions.length < 10 && (
                <TouchableOpacity
                  onPress={addOption}
                  style={{
                    backgroundColor: '#FB2355',
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                    fontFamily: 'questrial',
                  }}>
                    + Add Option
                  </Text>
                </TouchableOpacity>
              )}

              {/* Poll Settings */}
              <View style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  marginBottom: 12,
                  fontFamily: 'questrial',
                }}>
                  Settings
                </Text>
                
                <TouchableOpacity
                  onPress={() => setAllowMultipleAnswers(!allowMultipleAnswers)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                    paddingVertical: 4,
                  }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: allowMultipleAnswers ? '#FB2355' : '#666666',
                    backgroundColor: allowMultipleAnswers ? '#FB2355' : 'transparent',
                    marginRight: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {allowMultipleAnswers && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'questrial',
                  }}>
                    Allow multiple answers
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setAllowUserSuggestedOptions(!allowUserSuggestedOptions)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 4,
                  }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: allowUserSuggestedOptions ? '#FB2355' : '#666666',
                    backgroundColor: allowUserSuggestedOptions ? '#FB2355' : 'transparent',
                    marginRight: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {allowUserSuggestedOptions && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'questrial',
                  }}>
                    Allow users to add options
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Action Buttons - Fixed at bottom */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
              padding: 20,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#2A2A2A',
            }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: '#404040',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleCreatePoll}
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                style={{
                  flex: 1,
                  backgroundColor: (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) 
                    ? '#666666' : '#FB2355',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                }}>
                  Create Poll
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // Function to handle paid content creation
  const handlePaidContentCreation = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your photos to share paid content.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Show custom price input modal
        setSelectedImageUri(imageUri);
        setShowPriceModal(true);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Function to send paid content
  const sendPaidContent = async (imageUri: string, price: number) => {
    try {
      if (!channel) {
        console.error('No channel available');
        return;
      }

      if (!user?.$id) {
        console.error('No user ID available');
        Alert.alert('Error', 'User not authenticated. Please log in again.');
        return;
      }

      // Show custom upload modal
      setIsPhotoUploading(true);
      setUploadProgress('Uploading your content...');
      setShowUploadModal(true);

      // Create a unique ID for this paid content
      const paidContentId = `paid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload image to Appwrite storage
      let appwriteImageUrl = imageUri; // fallback to local URI
      
      try {
        console.log('Uploading image to Appwrite storage...');
        setUploadProgress('Processing image...');
        
        // Get file info to determine size
        const fileInfo = await fetch(imageUri);
        const fileBlob = await fileInfo.blob();
        
        setUploadProgress('Uploading to cloud storage...');
        
        // Create file object for upload
        const fileToUpload = {
          uri: imageUri,
          type: 'image/jpeg',
          name: `paid_content_${paidContentId}.jpg`,
          size: fileBlob.size,
        };

        // Upload to Appwrite storage
        const uploadedFile = await storage.createFile(
          config.storageId,
          ID.unique(),
          fileToUpload
        );

        // Get the file URL from Appwrite
        appwriteImageUrl = storage.getFileView(config.storageId, uploadedFile.$id).toString();
        
        console.log('Image uploaded successfully to Appwrite:', uploadedFile.$id);
        console.log('Appwrite image URL:', appwriteImageUrl);
        
        setUploadProgress('Finalizing...');
        
      } catch (uploadError) {
        console.error('Error uploading to Appwrite storage:', uploadError);
        // Continue with local URI as fallback
        console.log('Falling back to local URI for image');
        setUploadProgress('Preparing content...');
      }
      
      // Send message with paid content attachment (using Appwrite URL if available)
      await channel.sendMessage({
        attachments: [
          {
            type: 'paid_content',
            image_url: appwriteImageUrl,
            price: price.toFixed(2),
            paid_content_id: paidContentId,
            title: 'Paid Content',
            description: `Unlock this content for $${price.toFixed(2)}`,
          },
        ],
      });

      console.log('Paid content sent successfully with image URL:', appwriteImageUrl);
      
      // Hide upload modal
      setIsPhotoUploading(false);
      setShowUploadModal(false);
      setUploadProgress('');

    } catch (error) {
      console.error('Error sending paid content:', error);
      setIsPhotoUploading(false);
      setShowUploadModal(false);
      setUploadProgress('');
      Alert.alert('Error', 'Failed to send paid content. Please try again.');
    }
  };

  // Function to handle file creation
  const handleFileCreation = async () => {
    try {
      // Import DocumentPicker
      const DocumentPicker = await import('expo-document-picker');
      
      // Launch document picker for all file types
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all file types
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        setSelectedFileUri(selectedFile.uri);
        setShowFilePriceModal(true);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  // Function to handle paid video creation
  const handlePaidVideoCreation = async () => {
    try {
      console.log('🔧 handlePaidVideoCreation called');
      
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need permission to access your video library');
        return;
      }

      console.log('✅ Permission granted, opening video picker...');
      
      // Use ImagePicker specifically for videos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8, // Compress video slightly
        videoMaxDuration: 300, // 5 minutes max
      });

      console.log('🎥 Video picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('✅ Video selected:', asset);
        setSelectedVideoUri(asset.uri);
        setShowVideoPriceModal(true);
      } else {
        console.log('❌ Video selection cancelled or failed');
      }
    } catch (error) {
      console.error('❌ Error in handlePaidVideoCreation:', error);
      Alert.alert('Error', `Failed to select video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to send blurry file
  const sendBlurryFile = async (fileUri: string, price: number, title: string) => {
    try {
      console.log('🔧 sendBlurryFile called with:', { fileUri, price, title });
      setIsFileUploading(true);
      setShowUploadModal(true);
      setUploadProgress('Preparing file upload...');
      
      if (!channel) {
        console.error('❌ No channel available');
        Alert.alert('Error', 'No channel available');
        setUploadProgress('');
        setShowUploadModal(false);
        setIsFileUploading(false);
        return;
      }

      if (!user?.$id) {
        console.error('❌ No user ID available');
        Alert.alert('Error', 'User not authenticated. Please log in again.');
        setUploadProgress('');
        setShowUploadModal(false);
        setIsFileUploading(false);
        return;
      }

      console.log('✅ Channel and user available, preparing file...');
      setUploadProgress('Preparing file for upload...');

      // Create a unique ID for this file
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Upload file to Appwrite storage
      let appwriteFileUrl = fileUri; // fallback to local URI
      
      try {
        console.log('Uploading file to Appwrite storage...');
        setUploadProgress('Processing file...');
        
        // Get file info to determine size and type
        const fileInfo = await fetch(fileUri);
        const fileBlob = await fileInfo.blob();
        
        // Determine file type from URI or default to generic
        let fileType = 'application/octet-stream';
        let fileExtension = 'file';
        
        if (fileUri.includes('.')) {
          fileExtension = fileUri.split('.').pop()?.toLowerCase() || 'file';
          
          // Map common file extensions to MIME types
          const mimeTypes: { [key: string]: string } = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'mp4': 'video/mp4',
            'mp3': 'audio/mpeg',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
          };
          
          fileType = mimeTypes[fileExtension] || 'application/octet-stream';
        }
        
        setUploadProgress('Uploading to cloud storage...');
        
        // Create file object for upload
        const fileToUpload = {
          uri: fileUri,
          type: fileType,
          name: `blurry_file_${fileId}.${fileExtension}`,
          size: fileBlob.size,
        };

        // Upload to Appwrite storage
        const uploadedFile = await storage.createFile(
          config.storageId,
          ID.unique(),
          fileToUpload
        );

        // Get the file URL from Appwrite
        appwriteFileUrl = storage.getFileView(config.storageId, uploadedFile.$id).toString();
        
        console.log('File uploaded successfully to Appwrite:', uploadedFile.$id);
        console.log('Appwrite file URL:', appwriteFileUrl);
        
        setUploadProgress('Finalizing...');
        
      } catch (uploadError) {
        console.error('Error uploading file to Appwrite storage:', uploadError);
        // Continue with local URI as fallback
        console.log('Falling back to local URI for file');
        setUploadProgress('Preparing content...');
      }

      setUploadProgress('Sending file...');
      
      const messageData = {
        text: `📁 ${title} - $${price.toFixed(2)}`,
        attachments: [
          {
            type: 'blurry_file',
            image_url: appwriteFileUrl, // Appwrite URL for storage/backup
            local_file_uri: fileUri, // Original local URI for opening
            price: price.toFixed(2),
            file_id: fileId,
            title: title,
            description: `Unlock this file for $${price.toFixed(2)}`,
            is_blurred: true, // Mark as blurred
          },
        ],
      };

      console.log('📤 Sending message with data:', JSON.stringify(messageData, null, 2));
      
      // Send message with blurry file attachment
      const sentMessage = await channel.sendMessage(messageData);

      console.log('✅ Blurry file sent successfully:', sentMessage);
      setUploadProgress('File uploaded successfully!');
      
      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress('');
        setShowUploadModal(false);
        setIsFileUploading(false);
      }, 2000);

      // Reset state
      setSelectedFileUri(null);

    } catch (error) {
      console.error('❌ Error sending blurry file:', error);
      setUploadProgress('');
      setShowUploadModal(false);
      setIsFileUploading(false);
      Alert.alert('Error', `Failed to send file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Function to send paid video
  const handleSendAudio = async (audioUri: string, duration: number) => {
    try {
      if (channel) {
        // Format duration as MM:SS
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        console.log('🎤 Starting audio upload to Appwrite storage...');
        
        // Upload audio to Appwrite storage
        let appwriteAudioUrl = audioUri; // fallback to local URI
        let fileSize = Math.round(duration * 16000); // Default estimate
        
        try {
          // Get file info to determine size
          const fileInfo = await fetch(audioUri);
          const fileBlob = await fileInfo.blob();
          fileSize = fileBlob.size;
          
          console.log('📏 Audio file size:', fileSize, 'bytes');
          
          // Create unique filename
          const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Create file object for upload with proper headers
          const fileToUpload = {
            uri: audioUri,
            type: 'audio/mp4', // Use audio/mp4 MIME type for better compatibility
            name: `voice_message_${audioId}.m4a`,
            size: fileSize,
          };

          console.log('📤 Uploading audio file:', fileToUpload);

          // Upload to Appwrite storage
          const uploadedFile = await storage.createFile(
            config.storageId,
            ID.unique(),
            fileToUpload
          );

          // Get the file URL from Appwrite - try download URL for better media compatibility
          try {
            appwriteAudioUrl = storage.getFileDownload(config.storageId, uploadedFile.$id).toString();
            console.log('🎤 Using download URL:', appwriteAudioUrl);
          } catch (downloadError) {
            // Fallback to view URL
            appwriteAudioUrl = storage.getFileView(config.storageId, uploadedFile.$id).toString();
            console.log('🎤 Using view URL as fallback:', appwriteAudioUrl);
          }
          
          console.log('🎤 Audio uploaded successfully to Appwrite:', uploadedFile.$id);
          console.log('🎤 Appwrite audio URL:', appwriteAudioUrl);
          
        } catch (uploadError) {
          console.error('Error uploading audio to Appwrite storage:', uploadError);
          // Continue with local URI as fallback
          console.log('Falling back to local URI for audio');
        }
        
        await channel.sendMessage({
          text: '',
          attachments: [{
            type: 'custom_audio',
            asset_url: appwriteAudioUrl, // Use Appwrite URL if available, otherwise local
            file_size: fileSize,
            mime_type: 'audio/mp4', // Use audio/mp4 for better compatibility
            title: 'Voice Message',
            duration: formattedDuration,
            fallback: 'Voice Message',
          }],
        });
        console.log('✅ Voice message sent successfully with duration:', formattedDuration);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message');
    }
  };

  const sendPaidVideo = async (videoUri: string, price: number, title: string) => {
    try {
      console.log('🔧 sendPaidVideo called with:', { videoUri, price, title });
      setIsVideoUploading(true);
      setShowUploadModal(true);
      setUploadProgress('Preparing video upload...');

      if (!channel) {
        console.error('❌ No channel available');
        Alert.alert('Error', 'No channel available');
        setUploadProgress('');
        setShowUploadModal(false);
        setIsVideoUploading(false);
        return;
      }

      if (!user?.$id) {
        console.error('❌ No user ID available');
        Alert.alert('Error', 'User not authenticated. Please log in again.');
        setUploadProgress('');
        setShowUploadModal(false);
        setIsVideoUploading(false);
        return;
      }

      console.log('✅ Channel and user available, preparing video...');
      setUploadProgress('Preparing video for upload...');

      // Create a unique content ID for payment tracking
      const contentId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Upload video to Appwrite storage
      let appwriteVideoUrl = videoUri; // fallback to local URI
      
      try {
        console.log('Uploading video to Appwrite storage...');
        setUploadProgress('Processing video...');
        
        // Get file info to determine size
        const fileInfo = await fetch(videoUri);
        const fileBlob = await fileInfo.blob();
        
        setUploadProgress('Uploading to cloud storage...');
        
        // Create file object for upload
        const fileToUpload = {
          uri: videoUri,
          type: 'video/mp4',
          name: `paid_video_${contentId}.mp4`,
          size: fileBlob.size,
        };

        // Upload to Appwrite storage
        const uploadedFile = await storage.createFile(
          config.storageId,
          ID.unique(),
          fileToUpload
        );

        // Get the file URL from Appwrite
        appwriteVideoUrl = storage.getFileView(config.storageId, uploadedFile.$id).toString();
        
        console.log('Video uploaded successfully to Appwrite:', uploadedFile.$id);
        console.log('Appwrite video URL:', appwriteVideoUrl);
        
        setUploadProgress('Finalizing...');
        
      } catch (uploadError) {
        console.error('Error uploading video to Appwrite storage:', uploadError);
        // Continue with local URI as fallback
        console.log('Falling back to local URI for video');
        setUploadProgress('Preparing content...');
      }

      setUploadProgress('Sending paid video...');
      
              const messageData = {
          text: `🎥 ${title} - $${price.toFixed(2)}`,
          attachments: [
            {
              type: 'paid_video',
              video_url: appwriteVideoUrl, // Appwrite URL for storage/backup
              local_video_uri: videoUri, // Original local URI for playing
              price: price.toFixed(2),
              paid_content_id: contentId,
              title: title,
              description: `Unlock this premium video for $${price.toFixed(2)}`,
              is_blurred: true, // Mark as blurred/locked
            },
          ],
        };

      console.log('📤 Sending video message with data:', JSON.stringify(messageData, null, 2));
      
      // Send message with paid video attachment
      const sentMessage = await channel.sendMessage(messageData);

      console.log('✅ Paid video sent successfully:', sentMessage);
      setUploadProgress('Video uploaded successfully!');
      
      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress('');
        setShowUploadModal(false);
        setIsVideoUploading(false);
      }, 2000);

      // Reset state
      setSelectedVideoUri(null);

    } catch (error) {
      console.error('❌ Error sending paid video:', error);
      setUploadProgress('');
      setShowUploadModal(false);
      setIsVideoUploading(false);
      Alert.alert('Error', `Failed to send video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Custom MessageInput component with poll, paid content and file buttons
  const CustomMessageInput = () => (
    <View style={{ backgroundColor: '#1A1A1A', paddingBottom: 20 }}>
      {/* Horizontally scrollable buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          alignItems: 'center',
        }}
        style={{
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: '#FB2355',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginRight: 8,
          }}
          onPress={() => setShowPollCreation(true)}
        >
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            📊 Poll
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            backgroundColor: '#FFD700',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginRight: 8,
          }}
          onPress={handlePaidContentCreation}
        >
          <Text style={{
            color: '#1A1A1A',
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            📸 Paid Photos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            backgroundColor: isFileUploading ? '#2E7D32' : '#4CAF50',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginRight: 8,
            opacity: isFileUploading ? 0.7 : 1,
          }}
          onPress={handleFileCreation}
          disabled={isFileUploading}
        >
          {isFileUploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="white" style={{ marginRight: 4 }} />
              <Text style={{
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold',
              }}>
                Uploading...
              </Text>
            </View>
          ) : (
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
            }}>
              📁 Paid Files
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            backgroundColor: isVideoUploading ? '#7B1FA2' : '#9C27B0',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginRight: 8,
            opacity: isVideoUploading ? 0.7 : 1,
          }}
          onPress={handlePaidVideoCreation}
          disabled={isVideoUploading}
        >
          {isVideoUploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="white" style={{ marginRight: 4 }} />
              <Text style={{
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold',
              }}>
                Uploading...
              </Text>
            </View>
          ) : (
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
            }}>
              🎥 Paid Videos
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <MessageInput />
    </View>
  );

  const getChannelTitle = () => {
    if (!channel) return 'Chat';
    
    // For creator channels
    if (channelId?.startsWith('creator-')) {
      return 'My Box';
    }
    
    // For DM channels
    if (channelId?.startsWith('dm-')) {
      const members = Object.keys(channel.state.members || {});
      const otherMembers = members.filter(memberId => memberId !== user?.$id);
      if (otherMembers.length > 0) {
        return `Chat with ${otherMembers[0]}`;
      }
    }
    
    return channel.data?.name || 'Chat';
  };

  // Helper function to check if current user is the creator
  const isCreator = () => {
    return channelId?.startsWith('creator-') && user?.$id === channel?.data?.created_by_id;
  };

  // Helper function to get creator ID
  const getCreatorId = () => {
    return channel?.data?.created_by_id;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Image 
            source={require('../../assets/icon/loading-icon.png')} 
            style={{ width: 60, height: 60, marginBottom: 16 }} 
          />
          <Text style={{ 
            color: '#FB2355', 
            fontSize: 18, 
            marginBottom: 12,
            fontFamily: 'questrial'
          }}>
            Loading chat...
          </Text>
          <ActivityIndicator size="large" color="#FB2355" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }} edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Image 
            source={require('../../assets/icon/loading-icon.png')} 
            style={{ width: 80, height: 80, marginBottom: 16 }} 
          />
          <Text style={{ 
            color: 'white', 
            fontSize: 24, 
            fontFamily: 'Urbanist-Bold',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Error Loading Chat 😢
          </Text>
          <Text style={{ 
            color: 'white', 
            fontSize: 18, 
            textAlign: 'center',
            marginBottom: 24,
            fontFamily: 'questrial'
          }}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: '#FB2355',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 25,
            }}
            onPress={() => router.back()}
          >
            <Text style={{
              color: 'white',
              fontFamily: 'Urbanist-Bold',
              fontSize: 16,
            }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!channel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }} edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Image 
            source={require('../../assets/icon/loading-icon.png')} 
            style={{ width: 80, height: 80, marginBottom: 16 }} 
          />
          <Text style={{ 
            color: 'white', 
            fontSize: 24, 
            fontFamily: 'Urbanist-Bold',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Channel Not Found 😢
          </Text>
          <Text style={{ 
            color: 'white', 
            fontSize: 18, 
            textAlign: 'center',
            marginBottom: 24,
            fontFamily: 'questrial'
          }}>
            The chat you're looking for doesn't exist or you don't have access to it.
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: '#FB2355',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 25,
            }}
            onPress={() => router.back()}
          >
            <Text style={{
              color: 'white',
              fontFamily: 'Urbanist-Bold',
              fontSize: 16,
            }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Custom Photo Attachment Component with Caching
  const CustomPhotoAttachment = ({ attachment }: { attachment: any }) => {
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
          const { chatImageCache } = await import('../../lib/image-cache');
          const cachedPath = await chatImageCache.getCachedImagePath(attachment.image_url);
          
          if (isMounted) {
            setCachedImageUri(cachedPath);
            console.log(`✅ [CustomPhotoAttachment] Image ready: ${cachedPath === attachment.image_url ? 'original' : 'cached'}`);
          }
        } catch (error) {
          console.error('❌ [CustomPhotoAttachment] Failed to load cached image:', error);
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
                console.log(`✅ [CustomPhotoAttachment] Image rendered successfully`);
              }}
              onError={(error) => {
                console.error(`❌ [CustomPhotoAttachment] Image render failed:`, error.nativeEvent);
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

  // Custom Audio Attachment Component
  const CustomAudioAttachment = ({ attachment }: { attachment: any }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [forceUpdate, setForceUpdate] = useState(0);
    const statusCheckRef = useRef<any>(null);
    const timeoutRef = useRef<any>(null);
    
    // Get message context for long press functionality
    const messageContext = useMessageContext();
    const message = messageContext?.message;
    
    // Animation values for sound bars
    const animValues = useRef([
      new Animated.Value(0.3),
      new Animated.Value(0.5),
      new Animated.Value(0.8),
      new Animated.Value(0.4),
      new Animated.Value(0.7),
      new Animated.Value(0.2),
      new Animated.Value(0.6),
      new Animated.Value(0.9),
      new Animated.Value(0.3),
      new Animated.Value(0.5),
    ]).current;
    
    if (attachment?.type !== 'custom_audio') return null;

    // Audio status checking
    const startStatusCheck = (audioSound: Audio.Sound) => {
      if (statusCheckRef.current) {
        clearInterval(statusCheckRef.current);
      }
      
      // Add a small delay before starting to check, to let audio start properly
      setTimeout(() => {
        statusCheckRef.current = setInterval(async () => {
          try {
            const status = await audioSound.getStatusAsync();
            if (status.isLoaded) {
              setCurrentTime(status.positionMillis || 0);
              // Force component re-render for color updates
              setForceUpdate(prev => prev + 1);
              
              // Update sound bar progress in real-time
              updateSoundBarProgress();
              
              // Log less frequently to avoid console spam
              if (status.positionMillis && status.durationMillis && Math.floor(status.positionMillis / 1000) % 2 === 0) {
                console.log('📊 Audio progress:', {
                  progress: `${Math.floor(status.positionMillis / 1000)}s / ${Math.floor(status.durationMillis / 1000)}s`,
                  percentage: `${Math.round((status.positionMillis / status.durationMillis) * 100)}%`
                });
              }
              
              // Check if audio has finished - be more careful about false positives
              const hasFinished = status.didJustFinish || 
                                 (status.positionMillis && status.durationMillis && 
                                  status.positionMillis >= status.durationMillis - 100); // 100ms buffer
              
              // Don't use !status.isPlaying as it can be false during loading
              // Only reset if we're sure it's actually finished
              if (hasFinished && isPlaying) {
                console.log('🎵 Audio finished, resetting UI completely');
                resetAudioState(audioSound);
              } else if (!status.isPlaying && status.positionMillis > 1000 && isPlaying) {
                // Only consider it stopped if it was playing for more than 1 second
                console.log('🎵 Audio stopped after playing, resetting UI');
                resetAudioState(audioSound);
              }
            }
          } catch (error) {
            console.error('Status check error:', error);
            stopStatusCheck();
          }
        }, 100); // Check more frequently - every 100ms
      }, 300); // Wait 300ms before starting status checks
    };

    const resetAudioState = async (audioSound: Audio.Sound) => {
      console.log('🔄 Resetting all audio state and UI');
      setIsPlaying(false);
      setCurrentTime(0);
      stopSoundBarAnimation();
      stopStatusCheck();
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      try {
        await audioSound.setPositionAsync(0);
      } catch (error) {
        console.error('Error resetting position:', error);
      }
    };

    const stopStatusCheck = () => {
      if (statusCheckRef.current) {
        clearInterval(statusCheckRef.current);
        statusCheckRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Progress-based sound bar animation
    const updateSoundBarProgress = () => {
      if (!isPlaying || totalDuration === 0) return;
      
      const progress = currentTime / totalDuration; // 0 to 1
      const totalBars = animValues.length;
      const activeBars = Math.floor(progress * totalBars);
      
      // Debug logging (less frequent)
      if (Math.floor(currentTime / 1000) % 3 === 0) {
        console.log('🔍 Progress debug:', {
          currentTime: Math.round(currentTime / 1000),
          totalDuration: Math.round(totalDuration / 1000),
          progress: Math.round(progress * 100) + '%',
          totalBars,
          activeBars
        });
      }
      
      animValues.forEach((animValue, index) => {
        let targetHeight;
        
        if (index < activeBars) {
          // Bars that represent played audio - keep them active
          targetHeight = 0.7 + Math.sin(Date.now() / 200 + index) * 0.2; // Subtle animation
        } else if (index === activeBars && progress > 0) {
          // Current playing bar - make it most prominent
          targetHeight = 0.9 + Math.sin(Date.now() / 100) * 0.1; // More animation
        } else {
          // Future bars - keep them low
          targetHeight = 0.2 + Math.sin(Date.now() / 300 + index) * 0.1; // Very subtle
        }
        
        Animated.timing(animValue, {
          toValue: targetHeight,
          duration: 150,
          useNativeDriver: false,
        }).start();
      });
    };

    const startSoundBarAnimation = () => {
      console.log('🎵 Starting progress-based sound bar animation');
      // The animation will be driven by updateSoundBarProgress
      // which is called from the status check interval
    };

    const stopSoundBarAnimation = () => {
      console.log('🎵 Stopping sound bar animation');
      animValues.forEach((animValue, index) => {
        animValue.stopAnimation();
        // Reset to varied original heights for a more natural look
        const originalHeight = [0.3, 0.5, 0.8, 0.4, 0.7, 0.2, 0.6, 0.9, 0.3, 0.5][index];
        Animated.timing(animValue, {
          toValue: originalHeight,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    };

    const playAudio = async () => {
      try {
        if (sound) {
          // If audio is already loaded, check its status
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            if (isPlaying) {
              await sound.pauseAsync();
              setIsPlaying(false);
              stopSoundBarAnimation();
              stopStatusCheck();
            } else {
              // If audio finished, restart from beginning
              if (status.didJustFinish) {
                await sound.setPositionAsync(0);
              }
              await sound.playAsync();
              setIsPlaying(true);
              startSoundBarAnimation();
              startStatusCheck(sound);
            }
            return;
          }
        }

        // Configure audio mode for playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Load and play new audio
        console.log('🎵 Loading audio:', attachment.asset_url);
        
        // Try to load audio with headers if it's from Appwrite
        const audioSource = attachment.asset_url.includes('appwrite') 
          ? {
              uri: attachment.asset_url,
              headers: {
                'Accept': 'audio/mp4,audio/m4a,audio/*',
                'Content-Type': 'audio/mp4'
              }
            }
          : { uri: attachment.asset_url };
            
        console.log('🎵 Audio source:', audioSource);
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          audioSource,
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setTotalDuration(status.durationMillis || 0);
              
              // Also check for finish in the callback as backup
              if (status.didJustFinish) {
                console.log('🎵 Audio finished (callback), resetting UI');
                resetAudioState(newSound);
              }
            }
          }
        );
        
        setSound(newSound);
        setIsPlaying(true);
        startSoundBarAnimation();
        startStatusCheck(newSound);
        
        // Set a timeout as final fallback based on duration
        if (totalDuration > 0) {
          timeoutRef.current = setTimeout(() => {
            console.log('🎵 Audio timeout reached, forcing reset');
            resetAudioState(newSound);
          }, totalDuration + 1000); // Add 1 second buffer
        }
        
        console.log('🎵 Audio playing');
      } catch (error) {
        console.error('Error playing audio:', error);
        Alert.alert('Error', 'Could not play voice message');
      }
    };

    const stopAudio = async () => {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setCurrentTime(0);
        stopSoundBarAnimation();
        stopStatusCheck();
      }
    };

    // Cleanup when component unmounts
    React.useEffect(() => {
      return () => {
        if (sound) {
          sound.unloadAsync();
        }
        stopSoundBarAnimation();
        stopStatusCheck();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [sound]);

    const formatTime = (milliseconds: number) => {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePress = (event: any) => {
      // Prevent event bubbling to avoid opening thread
      event.stopPropagation();
      playAudio();
    };

    const handleLongPress = (event: any) => {
      // Prevent event bubbling
      event.stopPropagation();
      
      if (message) {
        setSelectedMessage(message);
        setShowCustomModal(true);
      }
    };

    // Sound Bars Component with Progress
    const SoundBars = () => {
      const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
      const totalBars = animValues.length;
      const activeBars = Math.floor(progress * totalBars);

      // Debug the actual values being used for colors (less frequent)
      if (Math.floor(currentTime / 1000) % 3 === 0) {
        console.log('🎨 Color debug:', {
          isPlaying,
          progress: Math.round(progress * 100) + '%',
          activeBars,
          currentTime: Math.round(currentTime / 1000),
          totalDuration: Math.round(totalDuration / 1000)
        });
      }

      return (
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          height: 40,
          justifyContent: 'space-between',
          flex: 1,
          paddingHorizontal: 4,
        }}>
          {animValues.map((animValue, index) => {
            let barColor;
            
            if (!isPlaying) {
              // Not playing - all bars gray
              barColor = '#666';
            } else {
              // During playback, use progress to determine colors
              if (index < activeBars) {
                // Played section - bright pink
                barColor = '#FB2355';
              } else if (index === activeBars && activeBars < totalBars) {
                // Currently playing bar - lighter pink
                barColor = '#FF6B8A';
              } else {
                // Unplayed section - darker gray
                barColor = '#444';
              }
            }
            
            return (
              <Animated.View
                key={index}
                style={{
                  flex: 1,
                  backgroundColor: barColor,
                  marginHorizontal: 1,
                  borderRadius: 2,
                  height: animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 32],
                  }),
                }}
              />
            );
          })}
        </View>
      );
    };

    return (
      <TouchableOpacity 
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={{
          backgroundColor: 'transparent',
          margin: -8,
          padding: 0,
          borderRadius: 0,
          overflow: 'visible',
        }}
      >
        <View style={{
          backgroundColor: '#2A2A2A',
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          width: 320,
          minHeight: 80,
        }}>
          {/* Play/Pause Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              playAudio();
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#FB2355',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16,
            }}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={24} 
              color="white"
              style={{ marginLeft: isPlaying ? 0 : 2 }} // Center play icon
            />
          </TouchableOpacity>

          {/* Content Area */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            {/* Title and Duration */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 8 
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontFamily: 'questrial',
                fontWeight: '600',
              }}>
                Voice Message
              </Text>
              
              <Text style={{
                color: '#FB2355',
                fontSize: 14,
                fontFamily: 'questrial',
                fontWeight: '500',
              }}>
                {isPlaying && totalDuration > 0 
                  ? `${formatTime(currentTime)} / ${formatTime(totalDuration)}`
                  : attachment.duration || '0:00'
                }
              </Text>
            </View>

            {/* Sound Bars */}
            <SoundBars />
          </View>
          
          {/* Stop Button when playing */}
          {isPlaying && (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                stopAudio();
              }}
              style={{ 
                marginLeft: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#444',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Ionicons name="stop" size={16} color="#FB2355" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Custom Input Buttons with Image Picker and Audio Recorder
  const CustomInputButtons = () => {
    const handleImagePick = async () => {
      try {
        console.log('📸 Opening custom image picker...');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          console.log('📸 Selected image:', asset.uri);
          
          if (!channel) {
            console.error('No channel available');
            return;
          }

          // Upload image to Appwrite storage first, then send message
          try {
            console.log('📸 Starting image upload to Appwrite storage...');
            
            // Get file info to determine size
            const fileInfo = await fetch(asset.uri);
            const fileBlob = await fileInfo.blob();
            
            console.log('📏 Image file size:', fileBlob.size, 'bytes');
            
            // Create unique filename
            const imageId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Create file object for upload
            const fileToUpload = {
              uri: asset.uri,
              type: 'image/jpeg',
              name: `photo_${imageId}.jpg`,
              size: fileBlob.size,
            };

            console.log('📤 Uploading image file:', fileToUpload);

            // Upload to Appwrite storage
            const uploadedFile = await storage.createFile(
              config.storageId,
              ID.unique(),
              fileToUpload
            );

            // Get the file URL from Appwrite
            const appwriteImageUrl = storage.getFileView(config.storageId, uploadedFile.$id).toString();
            
            console.log('📸 Image uploaded successfully to Appwrite:', uploadedFile.$id);
            console.log('📸 Appwrite image URL:', appwriteImageUrl);
            
            // Send message with the uploaded cloud URL
            await channel.sendMessage({
              text: '',
              attachments: [{
                type: 'custom_photo',
                image_url: appwriteImageUrl,
                fallback: 'Photo',
                caption: '',
                uploading: false,
              }],
            });
            
            console.log('✅ Custom photo sent successfully with cloud URL');
            
          } catch (uploadError) {
            console.error('Error uploading image to Appwrite storage:', uploadError);
            console.log('Sending with local URI as fallback');
            
            // Send message with local URI as fallback
            await channel.sendMessage({
              text: '',
              attachments: [{
                type: 'custom_photo',
                image_url: asset.uri,
                fallback: 'Photo',
                caption: '',
                uploading: false,
              }],
            });
            
            console.log('✅ Custom photo sent with local URI fallback');
          }

          console.log('✅ Custom photo sent successfully');
        }
      } catch (error) {
        console.error('Error picking image:', error);
        Alert.alert('Error', 'Failed to pick image');
      }
    };

    const handleAudioRecord = async () => {
      setShowRecordingModal(true);
    };

    return (
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity
          onPress={handleImagePick}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#FB2355',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
          }}
        >
          <Ionicons name="camera" size={18} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleAudioRecord}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#FB2355',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
          }}
        >
          <Ionicons name="mic" size={18} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-black" style={{ minHeight: 85 }}>
        {/* Cherrizbox Logo */}
        <TouchableOpacity onPress={() => router.back()}>
          <Image 
            source={require('../../assets/images/cherry-icon.png')}
            className="w-16 h-16 rounded-lg"
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        {/* Cherrizbox Logo and Text */}
        <View className="flex-row items-center">
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{
              fontSize: 42,
              fontWeight: 'bold',
              color: 'white',
              fontFamily: 'questrial',
              textAlign: 'center',
            }}>
              Cherrizbox
              <Text style={{
                color: '#FB2355',
                fontSize: 42,
                fontWeight: 'bold',
                fontFamily: 'questrial',
              }}>
                .
              </Text>
            </Text>
            <Text style={{
              color: '#FB2355',
              fontSize: 20,
              fontFamily: 'questrial',
              textAlign: 'center',
              marginTop: -6,
              letterSpacing: 2.5,
            }}>
              creator
            </Text>
          </View>
        </View>
        
        {/* Profile Picture */}
        <TouchableOpacity onPress={() => router.push('/edit-profile')}>
          <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center overflow-hidden">
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-xl text-white font-bold">
                {user?.name?.[0] || 'U'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Chat Interface with Keyboard Avoiding */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <OverlayProvider value={{ style: theme }}>
          <Chat client={client} style={theme}>
            <Channel 
              channel={channel} 
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
              thread={thread}
              threadList={!!thread}
              hasCommands={false}
              audioRecordingEnabled={false}
              InputButtons={CustomInputButtons}
              onPressMessage={({ message }) => {
                // Open thread when clicking on any message
                setThread(message);
              }}
              onLongPressMessage={handleLongPressMessage}
              MessageSimple={CustomMessageSimple}
              MessageAvatar={CustomMessageAvatar}
              MessageStatus={CustomMessageStatus}
              ShowThreadMessageInChannelButton={() => null}
              supportedReactions={customReactions}
              messageActions={() => []} // Disable default message actions
              Card={(props: any) => {
                console.log('🔍 Card component received props:', JSON.stringify(props, null, 2));
                console.log('🔍 Attachment type:', props?.type);
                console.log('🔍 Full props:', JSON.stringify(props, null, 2));
                
                // The props ARE the attachment, not nested under 'attachment'
                if (props?.type === 'custom_photo') {
                  console.log('✅ Rendering CustomPhotoAttachment');
                  return <CustomPhotoAttachment attachment={props} />;
                }
                
                if (props?.type === 'custom_audio') {
                  console.log('✅ Rendering CustomAudioAttachment');
                  return <CustomAudioAttachment attachment={props} />;
                }
                
                if (props?.type === 'blurry_file') {
                  console.log('✅ Rendering BlurryFileAttachment');
                  return <BlurryFileAttachment {...props} />;
                }
                console.log('🔄 Rendering PaidContentAttachment as fallback');
                return <PaidContentAttachment {...props} />;
              }} // Add custom attachment component
            >
              {/* Conditional rendering based on thread state */}
              {thread ? (
                <Thread />
              ) : (
                <View style={{ flex: 1 }}>
                  <MessageList 
                    EmptyStateIndicator={() => (
                      <View style={{ 
                        flex: 1, 
                        backgroundColor: '#2A2A2A', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        padding: 32 
                      }}>
                        <Image
                          source={
                            channelId?.startsWith('dm-')
                              ? require('../../assets/icon/loading-icon.png')
                              : require('../../assets/images/cherry-icon.png')
                          }
                          style={{ width: 60, height: 60, marginBottom: 18, opacity: 0.8 }}
                          resizeMode="contain"
                        />
                        <Text style={{ 
                          color: '#FFFFFF', 
                          fontSize: 18, 
                          fontFamily: 'questrial', 
                          textAlign: 'center', 
                          opacity: 0.7 
                        }}>
                          No messages yet. Start the conversation!
                        </Text>
                      </View>
                    )}
                    onThreadSelect={setThread}
                  />
                  <CustomMessageInput />
                  
                  {/* Poll Creation Modal */}
                  <CustomPollCreation
                    visible={showPollCreation}
                    onClose={() => setShowPollCreation(false)}
                    onCreatePoll={handleCreatePoll}
                  />
                </View>
              )}

              {/* Custom Message Modal */}
              <CustomMessageModal
                visible={showCustomModal}
                onClose={() => setShowCustomModal(false)}
                message={selectedMessage}
                onThreadReply={handleThreadReply}
              />
              
              {/* Price Input Modal */}
              <PriceInputModal
                visible={showPriceModal}
                onClose={() => setShowPriceModal(false)}
                onSubmit={(price) => {
                  if (selectedImageUri) {
                    sendPaidContent(selectedImageUri, price);
                  }
                }}
                imageUri={selectedImageUri}
              />
              
              {/* File Price Input Modal */}
              <FilePriceInputModal
                visible={showFilePriceModal}
                onClose={() => {
                  setShowFilePriceModal(false);
                  setSelectedFileUri(null);
                }}
                onSubmit={sendBlurryFile}
                fileUri={selectedFileUri}
              />
              
              {/* Video Price Input Modal */}
              <VideoPriceInputModal
                visible={showVideoPriceModal}
                onClose={() => {
                  setShowVideoPriceModal(false);
                  setSelectedVideoUri(null);
                }}
                onSubmit={(price, title) => {
                  if (selectedVideoUri) {
                    sendPaidVideo(selectedVideoUri, price, title);
                  }
                }}
                videoUri={selectedVideoUri}
              />
              
              {/* Upload Progress Modal */}
              <UploadProgressModal
                visible={showUploadModal}
                progress={uploadProgress}
                uploadType={isVideoUploading ? 'video' : isPhotoUploading ? 'photo' : isFileUploading ? 'file' : 'video'}
              />
              
              {/* Audio Recording Modal */}
              <AudioRecordingModal
                visible={showRecordingModal}
                onClose={() => setShowRecordingModal(false)}
                onSend={handleSendAudio}
              />
            </Channel>
          </Chat>
        </OverlayProvider>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}