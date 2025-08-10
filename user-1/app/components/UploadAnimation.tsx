import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, View } from 'react-native';

interface UploadAnimationProps {
  visible: boolean;
  fileName?: string;
  progress?: number; // 0-100
}

export const UploadAnimation: React.FC<UploadAnimationProps> = ({ 
  visible, 
  fileName = 'File',
  progress = 0 
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Start entrance animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Start rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      progressAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible]);

  useEffect(() => {
    // Animate progress
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Animated.View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 20,
          padding: 32,
          alignItems: 'center',
          minWidth: 280,
          transform: [{ scale: scaleAnim }],
          borderWidth: 0.5,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 8,
        }}>
          {/* Upload Icon with Animation */}
          <Animated.View style={{
            marginBottom: 20,
            transform: [
              { scale: pulseAnim },
              { rotate: spin }
            ],
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#000000',
            }}>
              <Ionicons name="cloud-upload" size={36} color="#000000" />
            </View>
          </Animated.View>

          {/* Upload Text */}
          <Text style={{
            color: '#000000',
            fontSize: 20,
            fontFamily: 'questrial',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Uploading File
          </Text>

          {/* File Name */}
          <Text style={{
            color: 'rgba(0, 0, 0, 0.7)',
            fontSize: 14,
            fontFamily: 'questrial',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            {fileName}
          </Text>

          {/* Progress Bar */}
          <View style={{
            width: '100%',
            height: 6,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 16,
          }}>
            <Animated.View style={{
              height: '100%',
              backgroundColor: '#000000',
              borderRadius: 3,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            }} />
          </View>

          {/* Progress Text */}
          <Text style={{
            color: '#000000',
            fontSize: 16,
            fontFamily: 'questrial',
            fontWeight: '600',
          }}>
            {Math.round(progress)}%
          </Text>

          {/* Status Dots Animation */}
          <View style={{
            flexDirection: 'row',
            marginTop: 16,
            gap: 8,
          }}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#000000',
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [{
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.1],
                      outputRange: [0.8, 1.2],
                    })
                  }],
                }}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};