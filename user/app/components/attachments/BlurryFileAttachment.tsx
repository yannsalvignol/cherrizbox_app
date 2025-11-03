import { PaidContentPaymentModal } from '@/app/components/modals/PaidContentPaymentModal';
import { dataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { useTheme } from '@/lib/themes/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useMessageContext } from 'stream-chat-react-native';
import { checkPaidContentPurchase } from '../../../lib/appwrite';

interface BlurryFileAttachmentProps {
  attachment?: any;
  userCurrency?: string;
  formatPrice?: (price: number, currency?: string) => string;
  [key: string]: any; // For additional props
}

const BlurryFileAttachment = (props: BlurryFileAttachmentProps) => {
  const { theme } = useTheme();
  const { attachment, userCurrency, formatPrice } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInAppViewer, setShowInAppViewer] = useState(false);
  const insets = useSafeAreaInsets();


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





  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    // Debug: Log essential data for payment modal
    console.log('Opening payment modal for PDF with data:', {
      contentId: attachment?.paid_content_id,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price,
      title: attachment?.title
    });
    
    // Show Stripe payment modal
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('   [BlurryFile] Payment successful for PDF content');
    console.log('   [BlurryFile] Invalidating cache for contentId:', attachment?.paid_content_id);
    
    // Clear the purchase status from cache to force refresh
    if (user?.$id && attachment?.paid_content_id) {
      dataCache.delete(`purchase_${user.$id}_${attachment.paid_content_id}`);
      console.log(' [BlurryFile] Cache invalidated - next check will query database');
    }
    
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    // Haptic feedback
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
      
      const fileUri = attachment?.file_url;
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
      width: 300,
      height: 200,
      borderRadius: 12,
      marginVertical: 8,
      position: 'relative',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      backgroundColor: theme.cardBackground,
      shadowColor: '#000000',
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
            shadowColor: '#000000',
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
    return (
      <View style={{
        width: 300,
        height: 200,
        borderRadius: 12,
        backgroundColor: theme.cardBackground,
        marginVertical: 8,
        position: 'relative',
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      }}>
        {/* File content - Always show PDF icon interface */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.cardBackground,
          padding: 16,
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
            onPress={() => {
              setShowInAppViewer(true);
            }}
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 28,
              paddingVertical: 12,
              borderRadius: 22,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000000',
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
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name="download" size={18} color={theme.text} />
          )}
        </TouchableOpacity>
        
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
      marginRight: -20,  // Move further to the right
      paddingRight: 16,  // Add padding to prevent touching screen edge
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
            fileUri={attachment.file_url || ''}
          />
        )}
      </View>

      {/* Stripe Payment Modal for PDF Content */}
      <PaidContentPaymentModal
        visible={showPaymentModal}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        amount={parseFloat(attachment?.price || '5.00')}
        contentTitle={attachment?.title || 'Premium PDF File'}
        contentId={attachment?.paid_content_id}
        creatorId={messageSender?.id}
        creatorName={messageSender?.name}
        imageUrl={attachment?.file_url}
        contentType="pdf"
      />

      {/* In-App PDF Viewer Modal */}
      <Modal
        visible={showInAppViewer}
        transparent={false}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={{
          flex: 1,
          backgroundColor: theme.backgroundSecondary,
          paddingTop: insets.top
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: theme.backgroundSecondary,
            borderBottomWidth: 0.5,
            borderBottomColor: theme.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8
          }}>
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowInAppViewer(false)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 8
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={30} color={theme.text} />
              <Text style={{
                fontSize: 16,
                color: theme.text,
                marginLeft: 6,
                fontFamily: 'Urbanist-SemiBold'
              }}>
                Back
              </Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: theme.text,
              fontFamily: 'Urbanist-Bold',
              flex: 1,
              textAlign: 'center',
              marginHorizontal: 20,
              opacity: 0.95
            }} numberOfLines={1}>
              {attachment?.title || 'PDF Document'}
            </Text>

            {/* Share Button */}
            <TouchableOpacity
              onPress={async () => {
                try {
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(attachment?.file_url || '', {
                      dialogTitle: 'Share PDF',
                      UTI: 'com.adobe.pdf',
                    });
                  }
                } catch (error) {
                  console.error('Error sharing PDF:', error);
                }
              }}
              style={{
                padding: 12
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={30} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* PDF Viewer Container */}
          <View style={{
            flex: 1,
            margin: 16,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: theme.background,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8
          }}>
            <WebView
              source={{ uri: attachment?.file_url || '' }}
              style={{ 
                flex: 1,
                backgroundColor: theme.background
              }}
              startInLoadingState={true}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              scalesPageToFit={true}
              renderLoading={() => (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: theme.background
                }}>
                  <View style={{
                    backgroundColor: theme.backgroundSecondary,
                    borderRadius: 16,
                    padding: 32,
                    alignItems: 'center'
                  }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{
                      marginTop: 20,
                      fontSize: 18,
                      color: theme.text,
                      fontFamily: 'Urbanist-SemiBold'
                    }}>
                      Loading PDF...
                    </Text>
                    <Text style={{
                      marginTop: 8,
                      fontSize: 14,
                      color: theme.textSecondary,
                      fontFamily: 'Urbanist-Regular',
                      textAlign: 'center'
                    }}>
                      Please wait while we prepare your document
                    </Text>
                  </View>
                </View>
              )}
            onError={(error) => {
              console.error('WebView error:', error);
              Alert.alert(
                'Error Loading PDF',
                'Could not load the PDF file. Would you like to open it externally?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Open Externally',
                    onPress: async () => {
                      try {
                        const supported = await Linking.canOpenURL(attachment?.file_url || '');
                        if (supported) {
                          await Linking.openURL(attachment?.file_url || '');
                        } else {
                          if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(attachment?.file_url || '', {
                              dialogTitle: 'Open PDF with...',
                              UTI: 'com.adobe.pdf',
                            });
                          }
                        }
                      } catch (err) {
                        console.error('Error opening PDF externally:', err);
                      }
                    }
                  }
                ]
              );
            }}
            />
          </View>
        </View>
      </Modal>
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

BlurryFileAttachment.displayName = 'BlurryFileAttachment';

export default BlurryFileAttachment;