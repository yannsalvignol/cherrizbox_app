import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentMethods() {
  const router = useRouter();

  const PaymentMethodItem = ({ 
    icon, 
    title, 
    description, 
    isComingSoon = false 
  }: {
    icon: string;
    title: string;
    description: string;
    isComingSoon?: boolean;
  }) => (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isComingSoon ? '#E0E0E0' : '#FD6F3E',
      opacity: isComingSoon ? 0.7 : 1
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: isComingSoon ? '#F0F0F0' : 'rgba(253, 111, 62, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16
        }}>
          <Ionicons 
            name={icon as any} 
            size={24} 
            color={isComingSoon ? '#888888' : '#FD6F3E'} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              color: 'black',
              fontSize: 18,
              fontFamily: 'Urbanist-Bold',
              marginRight: 8
            }}>
              {title}
            </Text>
            {isComingSoon && (
              <View style={{
                backgroundColor: '#FD6F3E',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 12,
                  fontFamily: 'Urbanist-Bold'
                }}>
                  Coming Soon
                </Text>
              </View>
            )}
          </View>
          <Text style={{
            color: '#666666',
            fontSize: 14,
            fontFamily: 'Urbanist-Regular',
            lineHeight: 20,
            marginTop: 4
          }}>
            {description}
          </Text>
        </View>
      </View>
    </View>
  );

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
            Payment Methods
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ backgroundColor: '#DCDEDF' }}
      >
        {/* Header Info */}
        <View style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: 12, 
          padding: 20, 
          marginBottom: 24,
          alignItems: 'center'
        }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(253, 111, 62, 0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <Ionicons name="card-outline" size={32} color="#FD6F3E" />
          </View>
          <Text style={{
            color: 'black',
            fontSize: 24,
            fontFamily: 'Urbanist-Bold',
            textAlign: 'center',
            marginBottom: 8
          }}>
            Supported Payment Methods
          </Text>
          <Text style={{
            color: '#666666',
            fontSize: 16,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center',
            lineHeight: 24
          }}>
            We support multiple secure payment options for your convenience
          </Text>
        </View>

        {/* Payment Methods */}
        <Text style={{
          color: '#FD6F3E',
          fontSize: 18,
          fontFamily: 'Urbanist-Bold',
          marginBottom: 16
        }}>
          Available Now
        </Text>

        <PaymentMethodItem
          icon="card"
          title="Credit & Debit Cards"
          description="Visa, Mastercard, American Express, Discover, and all major credit and debit cards"
        />

        <PaymentMethodItem
          icon="phone-portrait"
          title="Apple Pay"
          description="Quick and secure payments using Touch ID, Face ID, or your device passcode"
        />

        <PaymentMethodItem
          icon="link"
          title="Link by Stripe"
          description="Save your payment info securely and pay with one click across participating sites"
        />

        <Text style={{
          color: '#888888',
          fontSize: 18,
          fontFamily: 'Urbanist-Bold',
          marginBottom: 16,
          marginTop: 24
        }}>
          Coming Soon
        </Text>

        <PaymentMethodItem
          icon="logo-google"
          title="Google Pay"
          description="Fast, simple way to pay using your Google account and saved payment methods"
          isComingSoon={true}
        />

        {/* Security Info */}
        <View style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: 12, 
          padding: 20, 
          marginTop: 24,
          borderLeftWidth: 4,
          borderLeftColor: '#FD6F3E'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="shield-checkmark" size={24} color="#FD6F3E" style={{ marginRight: 12 }} />
            <Text style={{
              color: 'black',
              fontSize: 18,
              fontFamily: 'Urbanist-Bold'
            }}>
              Secure & Protected
            </Text>
          </View>
          <Text style={{
            color: '#666666',
            fontSize: 15,
            fontFamily: 'Urbanist-Regular',
            lineHeight: 22
          }}>
            All payments are processed securely through Stripe, a PCI-compliant payment processor. Your payment information is encrypted and never stored on our servers.
          </Text>
        </View>

        {/* Support Info */}
        <View style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: 12, 
          padding: 20, 
          marginTop: 16
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="help-circle" size={24} color="#FD6F3E" style={{ marginRight: 12 }} />
            <Text style={{
              color: 'black',
              fontSize: 18,
              fontFamily: 'Urbanist-Bold'
            }}>
              Need Help?
            </Text>
          </View>
          <Text style={{
            color: '#666666',
            fontSize: 15,
            fontFamily: 'Urbanist-Regular',
            lineHeight: 22
          }}>
            Having trouble with payments? Contact our support team at support@cherrizbox.app or through the app's support channels.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}