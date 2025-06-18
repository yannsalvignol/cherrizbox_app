import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

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

  const handleTrendPress = (trend: string) => {
    setSelectedTrends(prev => {
      const newTrends = prev.includes(trend)
        ? prev.filter(t => t !== trend)
        : [...prev, trend];
      onTrendsChange?.(newTrends);
      return newTrends;
    });
  };

  return (
    <View className="px-4 -mt-2 mb-6">
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
                    className={`py-2 px-4 rounded-full mr-2 border ${
                      isSelected 
                        ? 'bg-[#FB2355] border-[#FB2355]' 
                        : 'bg-[#1A1A1A] border-gray-600'
                    }`}
                  >
                    <Text 
                      style={{
                        color: 'white',
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