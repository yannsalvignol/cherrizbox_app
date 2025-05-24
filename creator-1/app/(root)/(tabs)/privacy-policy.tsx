import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Image 
            source={require('../../../assets/icon/back.png')}
            className="w-8 h-8"
            resizeMode="contain"
          />
          <Text style={{ color: 'white', fontSize: 20, marginLeft: 12, fontFamily: 'questrial' }}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="space-y-6">
          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              1. Information We Collect
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We collect information that you provide directly to us, including your name, email address, and any other information you choose to provide. We also collect information about your use of our services and your interactions with our platform.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              2. How We Use Your Information
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to protect our users and the public.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              3. Information Sharing
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We do not share your personal information with third parties except as described in this policy. We may share your information with service providers who assist us in operating our platform.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              4. Data Security
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              5. Your Rights
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              You have the right to access, correct, or delete your personal information. You can also object to our processing of your personal information or request that we restrict our processing of your personal information.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
