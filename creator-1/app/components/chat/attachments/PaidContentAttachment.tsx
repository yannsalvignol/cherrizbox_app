import { checkPaidContentPurchase } from '@/lib/appwrite';
import { chatDataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMessageContext } from 'stream-chat-react-native';

interface PaidContentAttachmentProps {
  attachment?: any;
  onPressIn?: () => void;
  userCurrency?: string;
  formatPrice?: (price: number, currency?: string) => string;
  [key: string]: any; // For additional props
}

const PaidContentAttachment = (props: PaidContentAttachmentProps) => {
  // The props object IS the attachment when called from Card component
  const attachment = props.attachment || props; // Handle both cases
  const { onPressIn, userCurrency, formatPrice } = props;

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
      <View style={{
        alignItems: 'flex-end',  // Align to the right
        width: '100%',
        marginRight: -5,  // Use margin for negative values
      }}>
        <View style={{
          width: 300,
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
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
                backgroundColor: '#404040',
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
                      {formatPrice ? formatPrice(attachment?.price || 5.00, userCurrency) : `$${attachment?.price || '5.00'}`}
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
      </View>
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
    backgroundColor: '#1A1A1A',
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
    color: '#1A1A1A',
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
    backgroundColor: '#1A1A1A',
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

export default PaidContentAttachment;