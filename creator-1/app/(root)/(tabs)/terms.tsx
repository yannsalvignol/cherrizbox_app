import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Terms() {
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
            Terms and Conditions
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
              1. Acceptance of Terms
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              By accessing and using cherrizbox ("Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these terms, please do not use our service. These Terms apply to all users of the Service, including creators and subscribers.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              2. Description of Service
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              cherrizbox is a platform that allows content creators to share exclusive content with subscribers through paid subscriptions. The Service includes messaging, content sharing, payment processing, and related features.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              3. User Accounts and Eligibility
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              You must be at least 18 years old to use this Service. You are responsible for maintaining the confidentiality of your account information and for all activities under your account. You must provide accurate, current, and complete information during registration and keep your account information updated.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              4. Content Guidelines and Prohibited Content
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Users must not post content that is: illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, invasive of privacy, hateful, or discriminatory. Content must not infringe on intellectual property rights, contain malware, or violate any laws. We reserve the right to remove any content that violates these guidelines without notice.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              5. Payment Terms and Subscriptions
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Subscription fees are charged in advance and are non-refundable except as required by law. Creators set their own subscription prices. We use Stripe for payment processing. By making payments, you agree to Stripe's terms of service. We reserve the right to change pricing with 30 days notice.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              6. Creator Responsibilities
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Creators are responsible for their content and must comply with all applicable laws. Creators must not share subscriber information or use the platform for illegal activities. Creators are responsible for paying applicable taxes on their earnings.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              7. Intellectual Property Rights
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              All content on cherrizbox, including text, graphics, logos, and software, is protected by intellectual property laws. Users retain ownership of their content but grant us a license to display and distribute it on the platform. Users must not infringe on others' intellectual property rights.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              8. Privacy and Data Protection
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We collect and process personal data in accordance with our Privacy Policy. By using the Service, you consent to the collection and use of your information as described in our Privacy Policy.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              9. Disclaimers and Limitation of Liability
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              The Service is provided "as is" without warranties of any kind. We disclaim all warranties, express or implied. Our liability is limited to the maximum extent permitted by law. We are not liable for any indirect, incidental, or consequential damages.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              10. Termination
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We may terminate or suspend your account immediately for violations of these Terms or for any reason at our sole discretion. Upon termination, your right to use the Service ceases immediately, and we may delete your account and content.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              11. Dispute Resolution
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              Any disputes arising from these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive your right to participate in class action lawsuits.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              12. Governing Law
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              These Terms shall be governed by and construed in accordance with the laws of the United States and the State of Delaware, without regard to conflict of law principles.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              13. Changes to Terms
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              14. Contact Information
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              If you have questions about these Terms, please contact us at legal@cherrizbox.app or through our support channels within the application.
            </Text>
          </View>

          <View>
            <Text style={{ color: '#FD6F3E', fontFamily: 'questrial', fontSize: 18, marginBottom: 8 }}>
              15. Severability
            </Text>
            <Text style={{ color: 'black', fontFamily: 'questrial', fontSize: 16, lineHeight: 24 }}>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect. The unenforceable provision will be replaced with an enforceable provision that most closely reflects the original intent.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
