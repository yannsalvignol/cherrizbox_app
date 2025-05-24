import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyPage2() {
  const { imageUrl } = useLocalSearchParams();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        {/* Top text */}
        <Text style={{ color: 'white', fontSize: 24, fontFamily: 'questrial', marginBottom: 24, fontWeight: 'bold' }}>
          Do you like it ?
        </Text>
        {imageUrl ? (
          <Image
            source={{ uri: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl }}
            style={{ width: 250, height: 350, borderRadius: 20, marginBottom: 24, backgroundColor: '#222' }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: 'white', fontSize: 18, fontFamily: 'questrial' }}>
            No image to display.
          </Text>
        )}
        {/* Bottom buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#222',
              borderRadius: 50,
              padding: 18,
              marginHorizontal: 24,
              borderWidth: 2,
              borderColor: '#FF4444',
            }}
            onPress={() => router.back()}
          >
            <Image
              source={require('../../../assets/icon/cross.png')}
              style={{ width: 32, height: 32, tintColor: '#FF4444' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#222',
              borderRadius: 50,
              padding: 18,
              marginHorizontal: 24,
              borderWidth: 2,
              borderColor: '#4CAF50',
            }}
            onPress={() => router.push({ pathname: '/my_page3', params: { imageUrl } })}
          >
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
