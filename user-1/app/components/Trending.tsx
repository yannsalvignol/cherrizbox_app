import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../lib/themes/useTheme';

interface TrendingProps {
  onTrendsChange?: (trends: string[]) => void;
}

const trendingTopics = [
  // First row
  ["Music", "Gaming", "Sports", "Comedy", "Food", "Travel", "Fashion", "Tech"],
  // Second row
  ["Movies", "Fitness", "Art", "Science", "History", "Anime", "Photography", "DIY"],
  // Third row
  ["Health", "Nature", "Coding", "Writing", "Gossip", "Politics", "Space", "Animals", "Cars"]
];

const Trending = ({ onTrendsChange }: TrendingProps) => {
  const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
  const { theme } = useTheme();

  const handleTrendPress = (trend: string) => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSelectedTrends(prev => {
      const newTrends = prev.includes(trend)
        ? prev.filter(t => t !== trend)
        : [...prev, trend];
      onTrendsChange?.(newTrends);
      return newTrends;
    });
  };

  return (
    <View style={{ paddingHorizontal: 16, marginTop: -8, marginBottom: 24 }}>
      <View>
        {trendingTopics.map((row, rowIndex) => (
          <View key={rowIndex} style={{ marginBottom: 5 }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              decelerationRate="fast"
              snapToInterval={100}
            >
              {row.map((topic, index) => {
                const isSelected = selectedTrends.includes(topic);
                return (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => handleTrendPress(topic)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      marginRight: 8,
                      borderWidth: 1,
                      backgroundColor: isSelected ? theme.primary : theme.cardBackground,
                      borderColor: isSelected ? theme.primary : theme.cardBackground
                    }}
                  >
                    <Text 
                      style={{
                        color: isSelected ? theme.textInverse : theme.text,
                        fontFamily: 'Urbanist-Regular'
                      }}
                    >
                      {topic}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ))}
      </View>
    </View>
  )
}

export default Trending