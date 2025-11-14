import { checkPaidContentPurchase } from '@/lib/appwrite';
import { dataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Share, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessageContext } from 'stream-chat-react-native';

interface PaidContentAttachmentProps {
  attachment: {
    type: string;
    paid_content_id?: string;
    price?: string;
    image_url?: string;
  };
  onPressIn?: () => void;
}

import { PaidContentPaymentModal } from '@/app/components/modals/PaidContentPaymentModal';

export const PaidContentAttachment: React.FC<PaidContentAttachmentProps> = ({ attachment, onPressIn }) => {
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
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
        console.error('Error checking purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, user?.$id]);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    // Debug: Log essential data for payment modal
    console.log('Opening payment modal with data:', {
      contentId: attachment?.paid_content_id,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price
    });
    
    // Show Stripe payment modal
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('   [PaidContent] Payment successful for paid content');
    console.log('   [PaidContent] Invalidating cache for contentId:', attachment?.paid_content_id);
    
    // Clear the purchase status from cache to force refresh
    if (user?.$id && attachment?.paid_content_id) {
      dataCache.delete(`purchase_${user.$id}_${attachment.paid_content_id}`);
      console.log(' [PaidContent] Cache invalidated - next check will query database');
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

  const openImageViewer = () => {
    if (isUnlocked) {
      setShowImageViewer(true);
    }
  };

  const closeImageViewer = () => {
    setShowImageViewer(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: attachment?.image_url || '',
        message: 'Shared from SynopsisX - Exclusive Content'
      });
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const handleInfo = () => {
    const createdAt = message?.created_at ? new Date(message.created_at).toLocaleString() : 'Unknown';
    const sender = messageSender?.name || 'Unknown sender';
    const price = attachment?.price || '5.00';
    
    Alert.alert(
      'Paid Content Information',
      `Sent by: ${sender}\nDate: ${createdAt}\nPrice: $${price}\nStatus: Unlocked`,
      [{ text: 'OK' }]
    );
  };

  if (attachment?.type === 'paid_content') {
    return (
      <>
        <TouchableOpacity
          onPress={openImageViewer}
          style={{
          width: 300,
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
          marginLeft: 0,
          marginRight: 5,
          position: 'relative',
          }}
          activeOpacity={isUnlocked ? 0.8 : 1}
          disabled={!isUnlocked}
        >
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
                            intensity={Platform.OS === 'ios' ? 50 : 30}
                {...(Platform.OS === 'android' && {
                  experimentalBlurMethod: 'dimezisBlurView'
                })}
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
                backgroundColor: 'rgba(51, 50, 51, 0.95)',
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
                      fontFamily: 'questrial',
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
                fontFamily: 'questrial',
              }}>
                Unlocked
              </Text>
            </View>
          )}

          {/* Timestamp in bottom right corner */}
          {message?.created_at && (
            <Text style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '600',
              fontFamily: 'questrial',
              opacity: 0.9,
              textShadowColor: 'rgba(0, 0, 0, 0.8)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </Text>
          )}
        </TouchableOpacity>

        {/* Stripe Payment Modal - Note: This needs to be imported from chat.tsx or moved to separate file */}
        <PaidContentPaymentModal
          visible={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          amount={parseFloat(attachment?.price || '5.00')}
          contentTitle="Exclusive Content"
          contentId={attachment?.paid_content_id}
          creatorId={messageSender?.id}
          creatorName={messageSender?.name}
          imageUrl={attachment?.image_url}
          contentType="image"
        />

        {/* Apple-Style Full Screen Image Viewer Modal */}
        <Modal
          visible={showImageViewer}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'black',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Full Screen Image */}
            <Image
              source={{ uri: attachment?.image_url }}
              style={{
                width: '100%',
                height: '100%'
              }}
              resizeMode="contain"
            />

            {/* Top Controls Bar - Close Button Only */}
            <View style={{
              position: 'absolute',
              top: insets.top + 10,
              left: 20,
              paddingVertical: 10
            }}>
              {/* Close Button */}
              <TouchableOpacity
                onPress={closeImageViewer}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Bottom Left - Info Button */}
            <TouchableOpacity
              onPress={handleInfo}
              style={{
                position: 'absolute',
                bottom: insets.bottom + 30,
                left: 20,
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Ionicons name="information-circle-outline" size={26} color="white" />
            </TouchableOpacity>

            {/* Bottom Right - Share Button */}
            <TouchableOpacity
              onPress={handleShare}
              style={{
                position: 'absolute',
                bottom: insets.bottom + 30,
                right: 20,
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Ionicons name="share-outline" size={26} color="white" />
            </TouchableOpacity>

            {/* Bottom Center - Paid Content Badge */}
            <View style={{
              position: 'absolute',
              bottom: insets.bottom + 35,
              alignSelf: 'center',
              backgroundColor: 'rgba(0, 200, 81, 0.9)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons name="lock-open" size={16} color="white" />
              <Text style={{
                color: 'white',
                fontSize: 14,
                fontWeight: 'bold',
                marginLeft: 6,
                fontFamily: 'questrial'
              }}>
                Exclusive Content - ${attachment?.price || '5.00'}
              </Text>
            </View>
          </View>
        </Modal>
      </>
  );
  }

  return null;
};