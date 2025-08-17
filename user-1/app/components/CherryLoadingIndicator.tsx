import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

interface CherryLoadingIndicatorProps {
  size?: number;
  style?: any;
}

export const CherryLoadingIndicator: React.FC<CherryLoadingIndicatorProps> = ({ 
  size = 80, 
  style 
}) => {
  const outerRotation = useRef(new Animated.Value(0)).current;
  const innerRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Outer circle rotates clockwise
    const outerAnimation = Animated.loop(
      Animated.timing(outerRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Inner circle rotates counter-clockwise
    const innerAnimation = Animated.loop(
      Animated.timing(innerRotation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );

    outerAnimation.start();
    innerAnimation.start();

    return () => {
      outerAnimation.stop();
      innerAnimation.stop();
    };
  }, [outerRotation, innerRotation]);

  const outerRotationInterpolate = outerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerRotationInterpolate = innerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'], // Counter-clockwise
  });

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Outer circle */}
      <Animated.View
        style={[
          styles.circle,
          styles.outerCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate: outerRotationInterpolate }],
          },
        ]}
      />
      
      {/* Inner circle */}
      <Animated.View
        style={[
          styles.circle,
          styles.innerCircle,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
            transform: [{ rotate: innerRotationInterpolate }],
          },
        ]}
      />
      
      {/* Cherry icon in the center */}
      <View style={styles.centerIcon}>
        <Image
          source={require('../../assets/images/loading-icon.png')}
          style={{
            width: size * 0.4,
            height: size * 0.4,
          }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderWidth: 3,
    borderStyle: 'solid',
  },
  outerCircle: {
    borderColor: '#FD6F3E',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  innerCircle: {
    borderColor: '#FF8A65',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  centerIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});