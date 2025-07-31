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
          <Text style={{ color: 'white', fontSize: 24, fontFamily: 'MuseoModerno-Regular', marginBottom: 8, letterSpacing: 1 }}>
            cherrizbox
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
              Cherrizbox is redefining creator–audience engagement. We empower creators with massive followings to engage every subscriber meaningfully, ensuring that every message gets a thoughtful response.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              What We Do
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Our platform ensures that creators can always respond to their audience, no matter how large their following grows. We make it possible for every subscriber to feel heard and valued, creating authentic connections at scale.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              The Problem We Solve
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              High-profile creators are drowning in messages. Existing platforms don't allow them to respond to everyone without sacrificing authenticity. We close this gap by ensuring every message gets an answer.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Our Team
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Founded by engineering students passionate about the creator economy, our team combines technical expertise with deep understanding of what creators and their audiences need. We've been working on this project for over a year, gathering feedback that reinforces our vision.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FB2355', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Contact Us
            </Text>
            <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Have questions or suggestions? We'd love to hear from you. Reach out to our support team at support@cherrizbox.com
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 