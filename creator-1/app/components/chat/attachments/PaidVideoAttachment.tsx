import { checkPaidContentPurchase } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useMessageContext } from 'stream-chat-react-native';

interface PaidVideoAttachmentProps {
  attachment?: any;
  userCurrency?: string;
  formatPrice?: (price: number, currency?: string) => string;
  [key: string]: any; // For additional props
}

const PaidVideoAttachment = (props: PaidVideoAttachmentProps) => {
  const { attachment, userCurrency, formatPrice } = props;
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
      <View style={{
        alignItems: 'flex-end',  // Align to the right
        width: '100%',
        marginRight: -5,  // Use margin for negative values
      }}>
        <View style={{
          width: videoDimensions.width,
          height: videoDimensions.height,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
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
                  <Ionicons name="play" size={32} color="#1A1A1A" />
                  <View style={{
                    position: 'absolute',
                    bottom: -3,
                    right: -3,
                    backgroundColor: '#1A1A1A',
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
                    backgroundColor: '#1A1A1A',
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
                      Unlock for {formatPrice ? formatPrice(attachment?.price || 5.00, userCurrency) : `$${attachment?.price || '5.00'}`}
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

               {/* Timestamp in corner */}
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
                   textShadowRadius: 3,
                 }}>
                   {new Date(message.created_at).toLocaleTimeString([], { 
                     hour: '2-digit', 
                     minute: '2-digit',
                     hour12: true 
                   })}
                 </Text>
               )}
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
      </View>
    );
  }

  return null;
};

export default PaidVideoAttachment;