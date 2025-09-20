import { useGlobalContext } from '@/lib/global-provider';
import { client } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { ReactionData, useMessagesContext } from 'stream-chat-react-native';

interface CustomMessageModalProps {
  visible: boolean;
  onClose: () => void;
  message: any;
  onThreadReply: (message: any) => void;
}

export const CustomMessageModal: React.FC<CustomMessageModalProps> = ({
  visible,
  onClose,
  message,
  onThreadReply,
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
      // Subtle haptic on open
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
    // Immediate subtle feedback on tap
    Haptics.selectionAsync().catch(() => {});
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
          // Light confirmation when reaction is added
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const renderReactionItem = ({ item }: { item: ReactionData }) => {
    return (
      <TouchableOpacity
        key={item.type}
        style={{
          backgroundColor: '#2A2A2A',
          borderRadius: 25,
          width: 50,
          height: 50,
          justifyContent: 'center',
          alignItems: 'center',
          marginHorizontal: 8,
          marginVertical: 8,
          borderWidth: 2,
          borderColor: '#404040',
          shadowColor: '#FD6F3E',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}
        onPress={() => handleReaction(item.type)}
        activeOpacity={0.7}
      >
        {item.Icon ? <item.Icon /> : null}
      </TouchableOpacity>
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
                  backgroundColor: '#FD6F3E',
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