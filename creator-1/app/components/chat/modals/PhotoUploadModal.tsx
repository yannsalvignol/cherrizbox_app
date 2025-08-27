import { useTheme } from '@/lib/useTheme';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, View } from 'react-native';

interface PhotoUploadModalProps {
  visible: boolean;
  progress: string;
}

const PhotoUploadModal = ({ visible, progress }: PhotoUploadModalProps) => {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const shimmerValue = useRef(new Animated.Value(0)).current;

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
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (visible) pulse();
        });
      };
      pulse();

      // Shimmer animation for photo effect
      const shimmer = () => {
        Animated.sequence([
          Animated.timing(shimmerValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerValue, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (visible) shimmer();
        });
      };
      shimmer();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible, spinValue, scaleValue, pulseValue, shimmerValue]);

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shimmerInterpolate = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
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
          borderRadius: 24,
          padding: 36,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 320,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 20,
          borderWidth: 1,
          borderColor: theme.border,
          transform: [{ scale: scaleValue }],
        }}>
          {/* Photo Icon with Shimmer Effect */}
          <Animated.View style={{
            marginBottom: 28,
            transform: [{ scale: pulseValue }],
          }}>
            <View style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 15,
              elevation: 10,
              overflow: 'hidden',
            }}>
              <Text style={{ fontSize: 36 }}>📸</Text>
              
              {/* Shimmer overlay */}
              <Animated.View style={{
                position: 'absolute',
                top: -10,
                left: -10,
                right: -10,
                bottom: -10,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: [{ rotate: shimmerInterpolate }],
              }} />
            </View>
          </Animated.View>

          {/* Spinning Progress Ring */}
          <Animated.View style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            borderWidth: 4,
            borderColor: `${theme.primary}33`,
            borderTopColor: theme.primary,
            borderRightColor: theme.primary,
            marginBottom: 24,
            transform: [{ rotate: spinInterpolate }],
          }} />
          
          <Text style={{
            color: theme.text,
            fontSize: 22,
            fontFamily: 'Urbanist-Bold',
            marginBottom: 8,
            textAlign: 'center',
          }}>
            Uploading Photo
          </Text>
          
          <Text style={{
            color: theme.primary,
            fontSize: 16,
            fontFamily: 'Urbanist-SemiBold',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            {progress || 'Preparing your image...'}
          </Text>
          
          {/* Progress Bar with Photo Theme */}
          <View style={{
            width: '100%',
            height: 8,
            backgroundColor: `${theme.primary}33`,
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 4,
          }}>
            <Animated.View style={{
              height: '100%',
              backgroundColor: theme.primary,
              borderRadius: 4,
              width: progress.includes('Processing') ? '30%' : 
                    progress.includes('Uploading') ? '65%' : 
                    progress.includes('Finalizing') ? '90%' : 
                    progress.includes('success') ? '100%' : '15%',
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 6,
              elevation: 6,
            }} />
          </View>

          {/* Progress percentage */}
          <Text style={{
            color: `${theme.primary}CC`,
            fontSize: 12,
            fontFamily: 'Urbanist-Medium',
            marginBottom: 16,
          }}>
            {progress.includes('Processing') ? '30%' : 
             progress.includes('Uploading') ? '65%' : 
             progress.includes('Finalizing') ? '90%' : 
             progress.includes('success') ? '100%' : '15%'} complete
          </Text>

          {/* Upload Tips */}
          <Text style={{
            color: theme.textSecondary,
            fontSize: 12,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center',
            lineHeight: 16,
          }}>
            📱 Keep the app open for best results
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default PhotoUploadModal;