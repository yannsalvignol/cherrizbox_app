import { dataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useMessageContext } from 'stream-chat-react-native';
import { checkPaidContentPurchase } from '../../../lib/appwrite';
import { CherryLoadingIndicator } from '../CherryLoadingIndicator';
import { PaidContentPaymentModal } from '../modals/PaidContentPaymentModal';

interface PaidVideoAttachmentProps {
  attachment: any;
  onPressIn?: () => void;
}

export const PaidVideoAttachment: React.FC<PaidVideoAttachmentProps> = ({ attachment, onPressIn }) => {
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<Video>(null);

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

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    console.log('Opening payment modal for video with data:', {
      contentId: attachment?.paid_content_id,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price
    });
    
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('💳 [PaidVideo] Payment successful for paid video');
    console.log('💳 [PaidVideo] Invalidating cache for contentId:', attachment?.paid_content_id);
    
    // Clear the purchase status from cache to force refresh
    if (user?.$id && attachment?.paid_content_id) {
      dataCache.delete(`purchase_${user.$id}_${attachment.paid_content_id}`);
      console.log('✅ [PaidVideo] Cache invalidated - next check will query database');
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

  const handlePlayPress = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (attachment?.type === 'paid_video') {
    return (
      <>
        <View style={{
          width: 320,
          height: 240,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
          marginLeft: 0,
          marginRight: 5,
          position: 'relative',
          backgroundColor: '#000',
        }}>
          {isUnlocked ? (
            // Unlocked video player
            <>
              <Video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                source={{ uri: attachment?.local_video_uri || attachment?.video_url }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded) {
                    setIsPlaying(status.isPlaying);
                    setIsVideoLoaded(true);
                  }
                }}
                onLoadStart={() => {
                  setIsVideoLoaded(false);
                }}
                onLoad={() => {
                  setIsVideoLoaded(true);
                }}
              />
              
              {/* Loading indicator for unlocked video */}
              {!isVideoLoaded && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                }}>
                  <CherryLoadingIndicator size={80} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                    marginTop: 12,
                    fontFamily: 'questrial',
                    textAlign: 'center',
                  }}>
                    Loading video...
                  </Text>
                </View>
              )}
              
              {/* Unlocked indicator */}
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
            </>
          ) : (
            // Locked video preview
            <>
              {/* Video thumbnail or placeholder */}
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#1A1A1A',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="videocam" size={64} color="#666666" />
              </View>
              
              {/* Blur overlay */}
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
              
              {/* Lock overlay */}
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
                  backgroundColor: 'rgba(104, 98, 99, 0.9)',
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
                      <Ionicons name="play" size={28} color="#FFFFFF" />
                      <Ionicons 
                        name="lock-closed" 
                        size={16} 
                        color="#FFFFFF" 
                        style={{ position: 'absolute', bottom: 8, right: 8 }}
                      />
                    </>
                  )}
                </View>
                
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginTop: 16,
                  fontFamily: 'questrial',
                  textAlign: 'center',
                }}>
                  {attachment?.title || 'Premium Video'}
                </Text>
                
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginTop: 8,
                  fontFamily: 'questrial',
                }}>
                  ${attachment?.price || '9.99'}
                </Text>
              </TouchableOpacity>

              {/* Timestamp in bottom right corner for locked state */}
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
            </>
          )}
        </View>

        {/* Payment Modal */}
        <PaidContentPaymentModal
          visible={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          amount={parseFloat(attachment?.price || '9.99')}
          contentTitle={attachment?.title || 'Premium Video'}
          contentId={attachment?.paid_content_id}
          creatorId={messageSender?.id}
          creatorName={messageSender?.name}
          imageUrl={attachment?.video_url}
          contentType="video"
        />
      </>
    );
  }

  return null;
};