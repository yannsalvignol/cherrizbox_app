import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmailExistsError() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#DCDEDF' }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Ionicons 
            name="chevron-back-outline" 
            size={32} 
            color="black" 
            style={{ marginRight: 4 }}
          />
          <Text style={{ color: 'black', fontSize: 20, marginLeft: 8, fontFamily: 'Nunito-Bold' }}>
            Back
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        {/* Error Icon */}
        <View style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: 'rgba(253, 111, 62, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32
        }}>
          <Ionicons name="warning-outline" size={60} color="#FD6F3E" />
        </View>

        {/* Title */}
        <Text style={{
          color: 'black',
          fontSize: 24,
          fontFamily: 'Urbanist-Bold',
          textAlign: 'center',
          marginBottom: 16
        }}>
          Account Already Exists
        </Text>

        {/* Message */}
        <Text style={{
          color: '#666666',
          fontSize: 16,
          fontFamily: 'Urbanist-Regular',
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 32
        }}>
          You already have an account on Cherrizbox Pro. You need to use a different address to use Cherrizbox Pro.
        </Text>

        {/* Cherry Logo */}
        <View style={{
          width: 84,
          height: 84,
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          overflow: 'hidden'
        }}>
          <Image 
            source={require('../assets/images/icon.png')}
            style={{ width: 84, height: 84, borderRadius: 20 }}
            resizeMode="contain"
          />
        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', gap: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#FD6F3E',
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 24,
              alignItems: 'center'
            }}
            onPress={() => router.replace('/log-in')}
          >
            <Text style={{
              color: 'black',
              fontSize: 16,
              fontFamily: 'Urbanist-Bold'
            }}>
              Try Different Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: 'transparent',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E0E0E0',
              paddingVertical: 16,
              paddingHorizontal: 24,
              alignItems: 'center'
            }}
            onPress={() => router.replace('/')}
          >
            <Text style={{
              color: 'black',
              fontSize: 16,
              fontFamily: 'Urbanist-Medium'
            }}>
              Go to Landing Page
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}