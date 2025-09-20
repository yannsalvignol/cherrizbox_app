import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/themes/useTheme';

export default function About() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }} edges={['top']}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingTop: 8, 
        paddingBottom: 16 
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons 
            name="chevron-back-outline" 
            size={32} 
            color={theme.text} 
            style={{ marginRight: 4 }}
          />
          <Text style={{ color: theme.text, fontSize: 20, marginLeft: 8, fontFamily: 'questrial' }}>
            About Us
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ backgroundColor: theme.cardBackground, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Image 
              source={require('../../../assets/images/cherry-icon-low.png')}
              style={{ width: 96, height: 96, marginBottom: 16 }}
              resizeMode="contain"
            />
            <Text style={{ color: theme.text, fontSize: 24, fontFamily: 'MuseoModerno-Regular', marginBottom: 8 }}>
              cherrizbox
            </Text>
            <Text style={{ color: theme.textSecondary, fontFamily: 'questrial', fontSize: 16, textAlign: 'center' }}>
              Version 1.0.0
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: theme.primary, fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Who We Are
            </Text>
            <Text style={{ color: theme.text, fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Cherrizbox is a French SAS (Société par Actions Simplifiée) founded by a passionate team of 4 people. We are officially registered in France and operate with the support of Legal Place, the leading French business structure service, ensuring full compliance with French business regulations and standards.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: theme.primary, fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Our Mission
            </Text>
            <Text style={{ color: theme.text, fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Cherrizbox is dedicated to creating a safe and engaging platform for content creators and their audiences. We strive to provide innovative tools and features that enhance the connection between creators and their community while empowering them to monetize their content effectively.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: theme.primary, fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              What We Do
            </Text>
            <Text style={{ color: theme.text, fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We provide a comprehensive platform where creators can share exclusive content with their subscribers, manage their content effectively, and build meaningful relationships with their audience. Our focus is on delivering a seamless, user-friendly experience while maintaining the highest standards of privacy, security, and creator empowerment.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: theme.primary, fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Our Values
            </Text>
            <Text style={{ color: theme.text, fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              • <Text style={{ fontWeight: 'bold' }}>Creator First:</Text> We prioritize the needs and success of content creators{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Privacy & Security:</Text> Your data and content are protected with industry-leading security{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Innovation:</Text> Continuously improving our platform with cutting-edge features{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Community:</Text> Building strong connections between creators and their audiences{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Transparency:</Text> Open and honest communication with our users
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: theme.primary, fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Company Information
            </Text>
            <Text style={{ color: theme.text, fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              <Text style={{ fontWeight: 'bold' }}>Company:</Text> cherrizbox SAS{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Legal Structure:</Text> French SAS (Société par Actions Simplifiée){'\n'}
              <Text style={{ fontWeight: 'bold' }}>Registration:</Text> Incorporated in France{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Business Support:</Text> Legal Place (French business structure service){'\n'}
              <Text style={{ fontWeight: 'bold' }}>Team Size:</Text> 4 dedicated professionals
            </Text>
          </View>

          <View>
            <Text style={{ color: theme.primary, fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              Contact Us
            </Text>
            <Text style={{ color: theme.text, fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Have questions or suggestions? We'd love to hear from you.{'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>Support:</Text> support@cherrizbox.app{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Business:</Text> hello@cherrizbox.app{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Legal:</Text> legal@cherrizbox.app{'\n\n'}
              Or reach out through our support channels within the application.
            </Text>
          </View>
        </View>

        {/* Built With / Technologies Section */}
        <View style={{ backgroundColor: theme.cardBackground, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <Text style={{ color: theme.primary, fontFamily: 'questrial', fontSize: 18, marginBottom: 12 }}>
            Built With
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <View style={{ width: '33%', alignItems: 'center', marginVertical: 12 }}>
              <Ionicons name="logo-javascript" size={48} color="#F7DF1E" />
            </View>
            <View style={{ width: '33%', alignItems: 'center', marginVertical: 12 }}>
              <Ionicons name="logo-figma" size={48} color="#F24E1E" />
            </View>
            <View style={{ width: '33%', alignItems: 'center', marginVertical: 12 }}>
              <Ionicons name="logo-react" size={48} color="#61DAFB" />
            </View>
            <View style={{ width: '33%', alignItems: 'center', marginVertical: 12 }}>
              <Ionicons name="logo-nodejs" size={48} color="#339933" />
            </View>
            <View style={{ width: '33%', alignItems: 'center', marginVertical: 12 }}>
              <Ionicons name="logo-npm" size={48} color="#CB3837" />
            </View>
            <View style={{ width: '33%', alignItems: 'center', marginVertical: 12 }}>
              <Ionicons name="logo-python" size={48} color="#3776AB" />
            </View>
          </View>
        </View>

        {/* Follow Us Section */}
        <View style={{ backgroundColor: theme.cardBackground, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <Text style={{ color: theme.primary, fontFamily: 'questrial', fontSize: 18, marginBottom: 12 }}>
            Follow Us
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/company/cherrizbox')}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="logo-linkedin" size={48} color="#0A66C2" />
                <Text style={{ color: '#0A66C2', fontFamily: 'questrial', marginTop: 6 }}>LinkedIn</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.instagram.com/cherrizbox')}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="logo-instagram" size={48} color="#E1306C" />
                <Text style={{ color: '#E1306C', fontFamily: 'questrial', marginTop: 6 }}>Instagram</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 