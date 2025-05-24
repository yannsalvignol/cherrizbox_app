import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function About() {
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
            About Us
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="items-center mb-8">
          <Image 
            source={require('../../../assets/images/cherry-icon.png')}
            className="w-24 h-24 mb-4"
            resizeMode="contain"
          />
          <Text style={{ color: 'white', fontSize: 24, fontFamily: 'questrial', marginBottom: 8 }}>
            Cherrybox<Text style={{ color: '#FB2355' }}>.</Text>
          </Text>
          <Text style={{ color: '#666666', fontFamily: 'questrial', fontSize: 16, textAlign: 'center' }}>
            Version 1.0.0
          </Text>
        </View>

        <View className="space-y-6">
          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Our Mission
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Cherrybox is dedicated to creating a safe and engaging platform for content creators and their audiences. We strive to provide innovative tools and features that enhance the connection between creators and their community.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              What We Do
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We provide a platform where creators can share exclusive content with their subscribers, manage their content effectively, and build meaningful relationships with their audience. Our focus is on delivering a seamless, user-friendly experience while maintaining the highest standards of privacy and security.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Contact Us
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Have questions or suggestions? We'd love to hear from you. Reach out to our support team at support@cherrybox.com
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 