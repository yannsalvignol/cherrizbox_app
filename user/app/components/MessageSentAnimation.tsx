import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, View } from 'react-native';

interface MessageSentAnimationProps {
  visible: boolean;
  tipAmount?: string;
  currency?: string;
  onComplete?: () => void;
}

export const MessageSentAnimation: React.FC<MessageSentAnimationProps> = ({ 
  visible, 
  tipAmount = '0.00',
  currency = 'USD',
  onComplete
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Start entrance animation sequence
      Animated.sequence([
        // 1. Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // 2. Scale in container
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        // 3. Slide up and scale in checkmark
        Animated.parallel([
          Animated.timing(slideUpAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(checkScaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 6,
            delay: 200,
          }),
        ]),
      ]).start();

      // Start pulse animation for success icon
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      setTimeout(() => {
        pulseAnimation.start();
      }, 600);

      // Auto-hide after 2.5 seconds
      const hideTimer = setTimeout(() => {
        hideAnimation();
      }, 2500);

      return () => {
        clearTimeout(hideTimer);
        pulseAnimation.stop();
      };
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      checkScaleAnim.setValue(0);
      pulseAnim.setValue(1);
      fadeAnim.setValue(0);
      slideUpAnim.setValue(50);
    }
  }, [visible]);

  const hideAnimation = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
    >
      <Animated.View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
      }}>
        <Animated.View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 24,
          padding: 40,
          alignItems: 'center',
          minWidth: 320,
          maxWidth: '85%',
          transform: [{ scale: scaleAnim }],
          borderWidth: 0.5,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 8,
        }}>
          {/* Success Icon with Animation */}
          <Animated.View style={{
            marginBottom: 24,
            transform: [
              { scale: pulseAnim },
              { translateY: slideUpAnim }
            ],
          }}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#000000',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <Animated.View style={{
                transform: [{ scale: checkScaleAnim }]
              }}>
                <Ionicons name="checkmark" size={48} color="#FFFFFF" />
              </Animated.View>
            </View>
          </Animated.View>

          {/* Success Text */}
          <Animated.Text style={{
            color: '#000000',
            fontSize: 24,
            fontFamily: 'questrial',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 12,
            transform: [{ translateY: slideUpAnim }],
          }}>
            Message Sent!
          </Animated.Text>

          {/* Tip Amount */}
          <Animated.View style={{
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.15)',
            transform: [{ translateY: slideUpAnim }],
          }}>
            <Text style={{
              color: '#000000',
              fontSize: 18,
              fontFamily: 'questrial',
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              Tip: {tipAmount}
            </Text>
          </Animated.View>

          {/* Success Message */}
          <Animated.Text style={{
            color: 'rgba(0, 0, 0, 0.7)',
            fontSize: 16,
            fontFamily: 'questrial',
            textAlign: 'center',
            lineHeight: 22,
            transform: [{ translateY: slideUpAnim }],
          }}>
            Your message with tip has been sent successfully!
          </Animated.Text>

          {/* Floating particles effect */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}>
            {[...Array(6)].map((_, index) => (
              <Animated.View
                key={index}
                style={{
                  position: 'absolute',
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#000000',
                  top: `${20 + (index * 10)}%`,
                  left: `${10 + (index * 15)}%`,
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.1],
                    outputRange: [0.3, 0.8],
                  }),
                  transform: [{
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.1],
                      outputRange: [0.5, 1.5],
                    })
                  }],
                }}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};