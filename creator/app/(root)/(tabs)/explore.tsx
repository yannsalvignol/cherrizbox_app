import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Explore() {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 px-4">
                <Text className="text-black font-['Urbanist-Bold'] text-4xl mt-[50px]">
                    Explore
                </Text>
                <Text className="text-gray-500 font-['Urbanist-Regular'] text-lg mt-2">
                    Discover new content
                </Text>
            </View>
        </SafeAreaView>
    );
} 