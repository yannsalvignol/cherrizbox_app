import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentMethods() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Header with back button */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="absolute left-4 z-10"
        >
          <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial' }}>
            Back
          </Text>
        </TouchableOpacity>
      </View>

      {/* Coming Soon Message */}
      <View className="flex-1 items-center justify-center px-6">
        <Text style={{ color: 'white', fontSize: 24, fontFamily: 'questrial', textAlign: 'center', marginBottom: 16 }}>
          Features not available yet, soon available!! 😎
        </Text>
        <Text style={{ color: '#888', fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }}>
          We're working hard to bring you the best payment experience! 🚀
        </Text>
        <Text style={{ color: '#888', fontSize: 16, fontFamily: 'questrial', textAlign: 'center', marginTop: 8 }}>
          Stay tuned! ⭐️
        </Text>
      </View>
    </SafeAreaView>
  )
} 