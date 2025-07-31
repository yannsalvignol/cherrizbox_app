import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Terms() {
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
            Terms and Conditions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="space-y-6">
          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              1. Acceptance of Terms
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              By accessing and using Cherrizbox, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              2. User Responsibilities
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account. You agree to notify us immediately of any unauthorized use of your account.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              3. Content Guidelines
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Users must not post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable. We reserve the right to remove any content that violates these guidelines.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              4. Intellectual Property
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              All content on Cherrizbox, including but not limited to text, graphics, logos, and software, is the property of Cherrizbox or its content suppliers and is protected by international copyright laws.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              5. Termination
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We reserve the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our sole discretion.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
