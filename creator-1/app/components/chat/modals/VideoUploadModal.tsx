import { useTheme } from '@/lib/useTheme';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, View } from 'react-native';

interface VideoUploadModalProps {
  visible: boolean;
  progress: string;
}

const VideoUploadModal = ({ visible, progress }: VideoUploadModalProps) => {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const waveValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Scale in animation with bounce
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }).start();

      // Continuous spin animation (slower for video)
      const spin = () => {
        spinValue.setValue(0);
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }).start(() => {
          if (visible) spin();
        });
      };
      spin();

      // Dramatic pulse animation for video
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
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

      // Wave animation for video processing effect
      const wave = () => {
        Animated.sequence([
          Animated.timing(waveValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(waveValue, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (visible) wave();
        });
      };
      wave();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible, spinValue, scaleValue, pulseValue, waveValue]);

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const waveInterpolate = waveValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
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
          minWidth: 340,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 15 },
          shadowOpacity: 0.4,
          shadowRadius: 25,
          elevation: 25,
          borderWidth: 1,
          borderColor: theme.border,
          transform: [{ scale: scaleValue }],
        }}>
          {/* Video Icon with Dramatic Animation */}
          <Animated.View style={{
            marginBottom: 28,
            transform: [{ scale: pulseValue }],
          }}>
            <View style={{
              width: 95,
              height: 95,
              borderRadius: 47.5,
              backgroundColor: theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 12,
            }}>
              <Text style={{ fontSize: 38 }}>🎥</Text>
            </View>
          </Animated.View>

          {/* Video Processing Waves */}
          <View style={{
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {[0, 1, 2, 3, 4].map((index) => (
              <Animated.View
                key={index}
                style={{
                  width: 4,
                  height: 20,
                  backgroundColor: theme.primary,
                  borderRadius: 2,
                  marginHorizontal: 2,
                  opacity: waveInterpolate,
                  transform: [{
                    scaleY: waveValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1.5 - (index * 0.1)],
                    })
                  }],
                }}
              />
            ))}
          </View>

          {/* Spinning Progress Ring with Video Theme */}
          <Animated.View style={{
            width: 75,
            height: 75,
            borderRadius: 37.5,
            borderWidth: 5,
            borderColor: `${theme.primary}33`,
            borderTopColor: theme.primary,
            borderRightColor: theme.primary,
            borderBottomColor: `${theme.primary}99`,
            marginBottom: 24,
            transform: [{ rotate: spinInterpolate }],
          }} />
          
          <Text style={{
            color: theme.text,
            fontSize: 24,
            fontFamily: 'Urbanist-Bold',
            marginBottom: 8,
            textAlign: 'center',
          }}>
            Uploading Video
          </Text>
          
          <Text style={{
            color: theme.primary,
            fontSize: 16,
            fontFamily: 'Urbanist-SemiBold',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            {progress || 'Preparing your video...'}
          </Text>
          
          {/* Progress Bar with Video Theme */}
          <View style={{
            width: '100%',
            height: 8,
            backgroundColor: `${theme.primary}33`,
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 6,
          }}>
            <Animated.View style={{
              height: '100%',
              borderRadius: 4,
              width: progress.includes('Processing') ? '20%' : 
                    progress.includes('Uploading') ? '70%' : 
                    progress.includes('Finalizing') ? '95%' : 
                    progress.includes('success') ? '100%' : '10%',
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 6,
              elevation: 6,
            }} />
          </View>

          {/* Progress indicator */}
          <Text style={{
            color: `${theme.primary}CC`,
            fontSize: 12,
            fontFamily: 'Urbanist-Medium',
            marginBottom: 18,
          }}>
            {progress.includes('Processing') ? '20%' : 
             progress.includes('Uploading') ? '70%' : 
             progress.includes('Finalizing') ? '95%' : 
             progress.includes('success') ? '100%' : '10%'} complete
          </Text>

          {/* Video Upload Specific Tips */}
          <Text style={{
            color: theme.textSecondary,
            fontSize: 12,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center',
            lineHeight: 16,
          }}>
            🎬 Large videos may take longer to process
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default VideoUploadModal;