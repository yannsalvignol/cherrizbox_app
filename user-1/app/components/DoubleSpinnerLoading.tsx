import React, { useEffect, useRef } from 'react';
import { Animated, Image, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface DoubleSpinnerLoadingProps {
  size?: number;
  strokeWidth?: number;
  outerColor?: string;
  innerColor?: string;
  backgroundColor?: string;
}

const DoubleSpinnerLoading: React.FC<DoubleSpinnerLoadingProps> = ({
  size = 80,
  strokeWidth = 3,
  outerColor = '#FD6F3E',
  innerColor = '#FF8A65',
  backgroundColor = '#F0F0F0',
}) => {
  const outerSpinValue = useRef(new Animated.Value(0)).current;
  const innerSpinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Outer circle - clockwise rotation
    const outerSpin = Animated.loop(
      Animated.timing(outerSpinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Inner circle - counter-clockwise rotation
    const innerSpin = Animated.loop(
      Animated.timing(innerSpinValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );

    outerSpin.start();
    innerSpin.start();

    return () => {
      outerSpin.stop();
      innerSpin.stop();
    };
  }, [outerSpinValue, innerSpinValue]);

  const outerRadius = (size - strokeWidth) / 2;
  const innerRadius = (size - strokeWidth * 2 - 12) / 2;
  const circumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  // Outer circle - 75% of circumference
  const outerStrokeDasharray = circumference;
  const outerStrokeDashoffset = circumference * 0.25;

  // Inner circle - 60% of circumference
  const innerStrokeDasharray = innerCircumference;
  const innerStrokeDashoffset = innerCircumference * 0.4;

  const outerRotation = outerSpinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerRotation = innerSpinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'], // Counter-clockwise
  });

  return (
    <View style={{ width: size, height: size, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer spinning circle */}
      <Animated.View
        style={{
          position: 'absolute',
          transform: [{ rotate: outerRotation }],
        }}
      >
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={outerRadius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Outer progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={outerRadius}
            stroke={outerColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={outerStrokeDasharray}
            strokeDashoffset={outerStrokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* Inner spinning circle */}
      <Animated.View
        style={{
          position: 'absolute',
          transform: [{ rotate: innerRotation }],
        }}
      >
        <Svg width={size - 12} height={size - 12}>
          {/* Inner progress circle */}
          <Circle
            cx={(size - 12) / 2}
            cy={(size - 12) / 2}
            r={innerRadius}
            stroke={innerColor}
            strokeWidth={strokeWidth - 1}
            fill="transparent"
            strokeDasharray={innerStrokeDasharray}
            strokeDashoffset={innerStrokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* Center icon */}
      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={require('../../assets/icon/loading-icon.png')}
          style={{
            width: size * 0.3,
            height: size * 0.3,
            resizeMode: 'contain',
          }}
        />
      </View>
    </View>
  );
};

export default DoubleSpinnerLoading;
