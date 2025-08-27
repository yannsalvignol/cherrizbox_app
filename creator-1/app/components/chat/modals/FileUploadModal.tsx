import { useTheme } from '@/lib/useTheme';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, View } from 'react-native';

interface FileUploadModalProps {
  visible: boolean;
  progress: string;
}

const FileUploadModal = ({ visible, progress }: FileUploadModalProps) => {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const floatValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Scale in animation
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 45,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Continuous spin animation
      const spin = () => {
        spinValue.setValue(0);
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }).start(() => {
          if (visible) spin();
        });
      };
      spin();

      // Subtle pulse animation
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (visible) pulse();
        });
      };
      pulse();

      // Floating animation for file icon
      const float = () => {
        Animated.sequence([
          Animated.timing(floatValue, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatValue, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (visible) float();
        });
      };
      float();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible, spinValue, scaleValue, pulseValue, floatValue]);

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatInterpolate = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
    >
      <View style={{
        flex: 1,
        backgroundColor: theme.modalOverlay,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Animated.View style={{
          backgroundColor: theme.modalBackground,
          borderRadius: 20,
          padding: 32,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 300,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 18,
          elevation: 18,
          borderWidth: 1,
          borderColor: theme.border,
          transform: [{ scale: scaleValue }],
        }}>
          {/* File Icon with Floating Animation */}
          <Animated.View style={{
            marginBottom: 24,
            transform: [
              { scale: pulseValue },
              { translateY: floatInterpolate }
            ],
          }}>
            <View style={{
              width: 85,
              height: 85,
              borderRadius: 42.5,
              backgroundColor: theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}>
              <Text style={{ fontSize: 34 }}>📁</Text>
            </View>
          </Animated.View>

          {/* Document Stack Animation */}
          <View style={{
            marginBottom: 20,
            alignItems: 'center',
          }}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={{
                  position: index > 0 ? 'absolute' : 'relative',
                  width: 40,
                  height: 6,
                  backgroundColor: `${theme.primary}${ (8 - index * 2) * 16 + (8 - index * 2)}`,
                  borderRadius: 3,
                  marginBottom: index === 0 ? 4 : 0,
                  transform: [
                    { translateX: index * 2 },
                    { translateY: index * -2 }
                  ],
                }}
              />
            ))}
          </View>

          {/* Spinning Progress Ring */}
          <Animated.View style={{
            width: 65,
            height: 65,
            borderRadius: 32.5,
            borderWidth: 4,
            borderColor: `${theme.primary}33`,
            borderTopColor: theme.primary,
            borderRightColor: theme.primary,
            marginBottom: 20,
            transform: [{ rotate: spinInterpolate }],
          }} />
          
          <Text style={{
            color: theme.text,
            fontSize: 20,
            fontFamily: 'Urbanist-Bold',
            marginBottom: 8,
            textAlign: 'center',
          }}>
            Uploading File
          </Text>
          
          <Text style={{
            color: theme.primary,
            fontSize: 16,
            fontFamily: 'Urbanist-SemiBold',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            {progress || 'Processing your file...'}
          </Text>
          
          {/* Progress Bar with File Theme */}
          <View style={{
            width: '100%',
            height: 6,
            backgroundColor: `${theme.primary}33`,
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <Animated.View style={{
              height: '100%',
              backgroundColor: theme.primary,
              borderRadius: 3,
              width: progress.includes('Processing') ? '25%' : 
                    progress.includes('Uploading') ? '60%' : 
                    progress.includes('Finalizing') ? '85%' : 
                    progress.includes('success') ? '100%' : '10%',
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
              elevation: 4,
            }} />
          </View>

          {/* File Upload Specific Tips */}
          <Text style={{
            color: theme.textSecondary,
            fontSize: 12,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 16,
          }}>
            🔒 Your file is being securely processed
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default FileUploadModal;