import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface NetworkType {
  name: string;
  type: string;
  icon: any;
  color?: string;
}

interface SocialMediaVerificationModalProps {
  visible: boolean;
  socialMediaPlatform: string;
  socialMediaUsername: string;
  socialMediaCode: string;
  verificationError: string;
  isVerifyingCode: boolean;
  networks: NetworkType[];
  onCodeChange: (code: string) => void;
  onVerifyCode: () => void;
  onResendCode: () => void;
  onClose: () => void;
  onChangeUsername: () => void;
}

export const SocialMediaVerificationModal: React.FC<SocialMediaVerificationModalProps> = ({
  visible,
  socialMediaPlatform,
  socialMediaUsername,
  socialMediaCode,
  verificationError,
  isVerifyingCode,
  networks,
  onCodeChange,
  onVerifyCode,
  onResendCode,
  onClose,
  onChangeUsername
}) => {
  const router = useRouter();

  if (!visible) return null;

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 28,
      marginBottom: 24,
      borderWidth: 2,
      borderColor: '#FD6F3E',
      width: '100%',
      alignItems: 'center'
    }}>
      {/* Compact Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 16,
        width: '100%'
      }}>
        <View style={{
          backgroundColor: '#FD6F3E',
          borderRadius: 8,
          padding: 6,
          marginRight: 10
        }}>
          <Ionicons name="shield-checkmark" size={16} color="white" />
        </View>
        <Text style={{ 
          color: 'black', 
          fontSize: 16, 
          fontFamily: 'Urbanist-Bold',
          flex: 1
        }}>
          Verify Account
        </Text>
      </View>

      {/* Social Media Info */}
      <View style={{
        backgroundColor: 'rgba(253, 111, 62, 0.1)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FD6F3E',
        alignItems: 'center',
        width: '100%'
      }}>
        {(() => {
          const network = networks.find(n => n.name === socialMediaPlatform);
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              {network?.type === 'image' ? (
                <Image source={network.icon} style={{ width: 20, height: 20, marginRight: 8 }} />
              ) : (
                <Ionicons 
                  name={network?.icon as any} 
                  size={20} 
                  color={network?.color || '#FD6F3E'} 
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={{
                color: '#FD6F3E',
                fontSize: 16,
                fontFamily: 'Urbanist-Bold'
              }}>
                @{socialMediaUsername}
              </Text>
            </View>
          );
        })()}
        <Text style={{
          color: 'rgba(0,0,0,0.7)',
          fontSize: 12,
          fontFamily: 'Urbanist-Regular'
        }}>
          Enter the 6-digit code sent to your {socialMediaPlatform}
        </Text>
      </View>

      {/* OTP Style Input */}
      <View style={{ 
        width: '100%',
        marginBottom: 20
      }}>
        <TextInput
          style={{
            backgroundColor: '#F8F8F8',
            borderRadius: 12,
            padding: 16,
            color: 'black',
            fontSize: 20,
            fontFamily: 'Urbanist-Bold',
            textAlign: 'center',
            letterSpacing: 4,
            borderWidth: 2,
            borderColor: verificationError ? '#FD6F3E' : '#FD6F3E',
            width: '100%'
          }}
          placeholder="000000"
          placeholderTextColor="rgba(0,0,0,0.4)"
          value={socialMediaCode}
          onChangeText={(text) => {
            // Only allow numbers and limit to 6 digits
            const numericText = text.replace(/[^0-9]/g, '');
            onCodeChange(numericText.slice(0, 6));
          }}
          keyboardType="numeric"
          maxLength={6}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => {
            if (socialMediaCode.length === 6) {
              onVerifyCode();
            } else {
              Keyboard.dismiss();
            }
          }}
        />
        {verificationError ? (
          <Text style={{ 
            color: '#FD6F3E', 
            fontSize: 12, 
            marginTop: 4,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center'
          }}>
            {verificationError}
          </Text>
        ) : null}
      </View>

      {/* Single Action Button */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: socialMediaCode.length === 6 ? '#FD6F3E' : 'rgba(253, 111, 62, 0.4)', 
          borderRadius: 12, 
          paddingVertical: 14, 
          paddingHorizontal: 32,
          width: '100%',
          alignItems: 'center',
          shadowColor: socialMediaCode.length === 6 ? '#FD6F3E' : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: socialMediaCode.length === 6 ? 0.3 : 0,
          shadowRadius: 8,
          elevation: socialMediaCode.length === 6 ? 8 : 0,
          marginBottom: 16
        }}
        onPress={() => {
          Keyboard.dismiss();
          onVerifyCode();
        }}
        disabled={socialMediaCode.length !== 6 || isVerifyingCode}
      >
        <Text style={{ 
          color: 'white', 
          fontSize: 16, 
          fontFamily: 'Urbanist-Bold'
        }}>
          {isVerifyingCode ? 'Verifying...' : 'Verify Code'}
        </Text>
      </TouchableOpacity>

      {/* Change Username Link */}
      <TouchableOpacity 
        onPress={() => {
          onClose();
          router.push('/change-username');
        }}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: 'rgba(253, 111, 62, 0.1)',
          borderWidth: 1,
          borderColor: '#FD6F3E',
          alignItems: 'center'
        }}
      >
        <Text style={{
          color: '#FD6F3E',
          fontSize: 12,
          fontFamily: 'Urbanist-Medium',
          textDecorationLine: 'underline'
        }}>
          Wrong username? Change it
        </Text>
      </TouchableOpacity>

      {/* Code Delivery Time Info */}
      <Text style={{
        color: 'rgba(0, 0, 0, 0.6)',
        fontSize: 15,
        fontFamily: 'Urbanist-Regular',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8
      }}>
        We're making sure it's truly the legend we think you are! Once we're sure, the Cherrizbox team will slide into your DMs on your chosen social network to send you the verification code !
      </Text>
      
      {/* Resend Code Link */}
      <TouchableOpacity 
        onPress={onResendCode}
        style={{
          marginTop: 12,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: 'rgba(253, 111, 62, 0.1)',
          borderWidth: 1,
          borderColor: '#FD6F3E',
          alignSelf: 'center'
        }}
      >
        <Text style={{
          color: '#FD6F3E',
          fontSize: 12,
          fontFamily: 'Urbanist-Regular',
          textAlign: 'center'
        }}>
          I did not receive any code, ask to send it again
        </Text>
      </TouchableOpacity>
    </View>
  );
};