import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function About() {
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
          <Text style={{ color: 'black', fontSize: 20, marginLeft: 8, fontFamily: 'questrial' }}>
            About Us
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ backgroundColor: '#DCDEDF' }}
      >
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <View className="items-center mb-8">
            <Image 
              source={require('../../../assets/images/cherry-icon.png')}
              className="w-24 h-24 mb-4"
              resizeMode="contain"
            />
            <Text style={{ color: 'black', fontSize: 24, fontFamily: 'questrial', marginBottom: 8 }}>
              Cherrybox<Text style={{ color: '#FD6F3E' }}>.</Text>
            </Text>
            <Text style={{ color: '#888888', fontFamily: 'questrial', fontSize: 16, textAlign: 'center' }}>
              Version 1.0.0
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Who We Are
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Cherrybox is a French SAS (Société par Actions Simplifiée) founded by a passionate team of 4 people. We are officially registered in France and operate with the support of Legal Place, the leading French business structure service, ensuring full compliance with French business regulations and standards.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Our Mission
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Cherrybox is dedicated to creating a safe and engaging platform for content creators and their audiences. We strive to provide innovative tools and features that enhance the connection between creators and their community while empowering them to monetize their content effectively.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              What We Do
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We provide a comprehensive platform where creators can share exclusive content with their subscribers, manage their content effectively, and build meaningful relationships with their audience. Our focus is on delivering a seamless, user-friendly experience while maintaining the highest standards of privacy, security, and creator empowerment.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Our Values
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              • <Text style={{ fontWeight: 'bold' }}>Creator First:</Text> We prioritize the needs and success of content creators{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Privacy & Security:</Text> Your data and content are protected with industry-leading security{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Innovation:</Text> Continuously improving our platform with cutting-edge features{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Community:</Text> Building strong connections between creators and their audiences{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Transparency:</Text> Open and honest communication with our users
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Company Information
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              <Text style={{ fontWeight: 'bold' }}>Company:</Text> Cherrybox SAS{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Legal Structure:</Text> French SAS (Société par Actions Simplifiée){'\n'}
              <Text style={{ fontWeight: 'bold' }}>Registration:</Text> Incorporated in France{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Business Support:</Text> Legal Place (French business structure service){'\n'}
              <Text style={{ fontWeight: 'bold' }}>Team Size:</Text> 4 dedicated professionals
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Contact Us
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Have questions or suggestions? We'd love to hear from you.{'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>Support:</Text> support@cherrybox.app{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Business:</Text> hello@cherrybox.app{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Legal:</Text> legal@cherrybox.app{'\n\n'}
              Or reach out through our support channels within the application.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 