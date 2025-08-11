import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicy() {
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
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ backgroundColor: '#DCDEDF' }}
      >
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 14, lineHeight: 20, marginBottom: 16, fontStyle: 'italic' }}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>
          
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              1. Introduction
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Welcome to cherrizbox ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              2. Information We Collect
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
              We collect information about you in a variety of ways:
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24, marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>Personal Data:</Text> Name, email address, phone number, date of birth, gender, location, profile pictures, payment information, and social media usernames.
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24, marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>Usage Data:</Text> Information about how you access and use our service, including device information, IP address, browser type, pages visited, time spent, and interaction data.
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              <Text style={{ fontWeight: 'bold' }}>Content Data:</Text> Messages, photos, videos, files, and other content you create, upload, or share through our service.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              3. How We Use Your Information
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
              We use the information we collect for various purposes:
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              • Provide, operate, and maintain our service{'\n'}
              • Process transactions and manage subscriptions{'\n'}
              • Improve, personalize, and expand our service{'\n'}
              • Communicate with you, including customer service and updates{'\n'}
              • Send you marketing and promotional communications{'\n'}
              • Monitor usage and analyze trends{'\n'}
              • Detect, prevent, and address technical issues and fraud{'\n'}
              • Comply with legal obligations and enforce our terms
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              4. Information Sharing and Disclosure
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
              We may share your information in the following situations:
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              • <Text style={{ fontWeight: 'bold' }}>Service Providers:</Text> Third-party companies that help us operate our service (Stripe for payments, Appwrite for data storage){'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Business Transfers:</Text> In connection with mergers, acquisitions, or asset sales{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Legal Requirements:</Text> When required by law or to protect our rights{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Consent:</Text> With your explicit consent for specific purposes{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Public Content:</Text> Content you choose to make public on the platform
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              5. Data Security
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, access controls, and regular security audits. However, no method of transmission over the internet is 100% secure.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              6. Data Retention
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, comply with legal obligations, resolve disputes, and enforce our agreements. Account data is typically retained for the duration of your account plus a reasonable period thereafter.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              7. Your Privacy Rights
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Depending on your location, you may have the following rights:{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Access:</Text> Request access to your personal information{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Correction:</Text> Request correction of inaccurate information{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Deletion:</Text> Request deletion of your personal information{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Portability:</Text> Request transfer of your data{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Objection:</Text> Object to processing of your information{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Restriction:</Text> Request restriction of processing
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              8. Cookies and Tracking Technologies
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We use cookies, web beacons, and similar tracking technologies to collect and use personal information about you. This helps us provide and improve our service, analyze usage patterns, and deliver targeted content. You can control cookies through your device settings.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              9. Third-Party Services
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Our service may contain links to third-party websites or integrate with third-party services (such as social media platforms). We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies before providing any information.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              10. Children's Privacy
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Our service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              11. International Data Transfers
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We ensure appropriate safeguards are in place to protect your information during such transfers.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              12. California Privacy Rights (CCPA)
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              If you are a California resident, you have additional rights under the California Consumer Privacy Act, including the right to know what personal information we collect, the right to delete personal information, and the right to opt-out of the sale of personal information.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              13. European Privacy Rights (GDPR)
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              If you are in the European Economic Area, you have rights under the General Data Protection Regulation, including the right to access, rectify, erase, restrict processing, data portability, and to object to processing of your personal data.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              14. Changes to This Privacy Policy
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We will also notify you via email or through our service for material changes.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              15. Contact Us
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              If you have questions about this Privacy Policy or our data practices, please contact us at:{'\n'}
              Email: privacy@cherrizbox.app{'\n'}
              Address: Legal Department, cherrizbox Inc.{'\n'}
              Or through our support channels within the application.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
