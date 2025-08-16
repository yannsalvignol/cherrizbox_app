import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  completedColor?: string;
  incompleteColor?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 60,
  strokeWidth = 4,
  color = '#000000',
  backgroundColor = '#F0F0F0',
  textColor = '#000000',
  fontSize = 12,
  completedColor = '#4CAF50',
  incompleteColor = '#FD6F3E',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  // Handle visual progress over 100%
  const isOver100 = percentage >= 100;
  const displayPercentage = isOver100 ? 100 : percentage; // Show full circle if over 100%
  const overflowPercentage = isOver100 ? percentage - 100 : 0; // Additional progress over 100%
  
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;
  const overflowStrokeDashoffset = circumference - (overflowPercentage / 100) * circumference;
  
  // Determine color based on completion
  const progressColor = percentage >= 100 ? completedColor : incompleteColor;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Main progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
        {/* Overflow progress circle (for percentages over 100%) */}
        {isOver100 && overflowPercentage > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth - 2} // Slightly smaller radius for inner circle
            stroke={completedColor}
            strokeWidth={Math.max(strokeWidth - 1, 2)} // Slightly thinner stroke
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={overflowStrokeDashoffset}
            strokeLinecap="round"
            opacity={0.7} // Slightly transparent to show it's additional
          />
        )}
      </Svg>
      {/* Percentage text */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: textColor,
            fontSize: fontSize,
            fontFamily: 'Urbanist-Bold',
          }}
        >
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
};

export default CircularProgress;