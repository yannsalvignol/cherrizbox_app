import { useGlobalContext } from '@/lib/global-provider';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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
  onVerificationSuccess?: () => void; // Add callback for successful verification
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
  onChangeUsername,
  onVerificationSuccess
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useGlobalContext();
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!visible) return null;

  // Handle post-verification setup (channel creation, photo upload, etc.)
  const handlePostVerificationSetup = async (userId: string) => {
    try {
      console.log('🚀 [Verification] Starting post-verification setup...');
      
      const { databases, config } = await import('@/lib/appwrite');
      const { ID, Query } = await import('react-native-appwrite');
      
      // Get user profile data
      const { getUserProfile, getUserPhoto } = await import('@/lib/appwrite');
      const profile = await getUserProfile(userId);
      
      if (!profile) {
        console.error('❌ [Verification] No profile found for user');
        return;
      }

      // 1. Create/update photo document
      console.log('📸 [Verification] Checking photo document...');
      const userPhoto = await getUserPhoto(userId);
      
      if (!userPhoto) {
        // Create new photo document
        console.log('📸 [Verification] Creating new photo document...');
        await databases.createDocument(
          config.databaseId,
          config.photoCollectionId,
          ID.unique(),
          {
            thumbnail: profile.profileImageUri || '',
            compressed_thumbnail: profile.compressed_thumbnail || '',
            title: profile.creatorsname || 'Creator',
            prompte: profile.creatorsname || 'Creator',
            IdCreator: userId,
            PhotosLocation: profile.Location || '',
            payment: JSON.stringify({
              monthlyPrice: '10', // Default or from profile
              yearlyPrice: '21'   // Default or from profile
            }),
            PhotoTopics: profile.topics || '',
            Bio: profile.ProfilesBio || ''
          }
        );
        console.log('✅ [Verification] Created new photo document');
      } else {
        console.log('✅ [Verification] Photo document already exists');
      }

      // 2. Copy photo document to available collection
      try {
        console.log('🔄 [Verification] Copying photo document to available collection...');
        
        if (!config.photosAvailableToUsersCollectionId) {
          console.log('⚠️ [Verification] Available collection not configured, skipping copy');
        } else {
          const photoDocs = await databases.listDocuments(
            config.databaseId,
            config.photoCollectionId,
            [Query.equal('IdCreator', userId)]
          );
          
          if (photoDocs.documents.length > 0) {
            const photoDoc = photoDocs.documents[0];
            
            await databases.createDocument(
              config.databaseId,
              config.photosAvailableToUsersCollectionId,
              ID.unique(),
              {
                thumbnail: photoDoc.thumbnail,
                title: photoDoc.title,
                prompte: photoDoc.prompte,
                IdCreator: photoDoc.IdCreator,
                payment: photoDoc.payment,
                PhotosLocation: photoDoc.PhotosLocation,
                PhotoTopics: photoDoc.PhotoTopics,
                Bio: photoDoc.Bio,
                compressed_thumbnail: photoDoc.compressed_thumbnail,
                ...(photoDoc.currency && { currency: photoDoc.currency })
              }
            );
            console.log('✅ [Verification] Photo document copied to available collection');
          }
        }
      } catch (error) {
        console.error('❌ [Verification] Error copying photo document:', error);
        // Don't fail the entire process
      }

      // 3. Send verification notification email
      try {
        console.log('📧 [Verification] Sending verification notification...');
        const { sendCreatorVerificationNotification } = await import('@/lib/appwrite');
        await sendCreatorVerificationNotification({
          userId: userId,
          creatorName: profile.creatorsname || 'Creator',
          location: profile.Location,
          topics: profile.topics,
          bio: profile.ProfilesBio,
          phoneNumber: profile.phoneNumber,
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth,
          monthlyPrice: '10', // From payment data
          yearlyPrice: '21',  // From payment data
          profileImageUri: profile.profileImageUri || '',
          compressedThumbnail: profile.compressed_thumbnail || ''
        });
        console.log('✅ [Verification] Verification notification sent');
      } catch (error) {
        console.error('❌ [Verification] Error sending notification:', error);
        // Don't fail the entire process
      }

      // 4. Create the creator's group chat
      try {
        console.log('🚀 [Verification] Creating creator channel...');
        const { createCreatorChannel } = await import('@/lib/stream-chat');
        const creatorDisplayName = profile.creatorsname || 'Creator';
        
        const channel = await createCreatorChannel(userId, creatorDisplayName);
        console.log('✅ [Verification] Creator channel created successfully:', channel.id);
        
        // Add a small delay to ensure channel is fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
      } catch (error) {
        console.error('❌ [Verification] Error creating creator channel:', error);
        return false;
      }
      
    } catch (error) {
      console.error('❌ [Verification] Post-verification setup failed:', error);
      return false;
    }
  };

  // Enhanced verification that includes channel creation
  const handleVerificationWithSetup = async () => {
    if (!user?.$id || !socialMediaCode.trim()) return;
    
    setIsCreatingChannel(true);
    
    try {
      console.log('🚀 [Verification] Starting enhanced verification process...');
      
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Get user document to check the social_media_number
      const userDocs = await databases.listDocuments(
        config.databaseId,
        config.creatorCollectionId,
        [Query.equal('creatoraccountid', user.$id)]
      );
      
      if (userDocs.documents.length === 0) {
        throw new Error('User document not found');
      }
      
      const userDoc = userDocs.documents[0];
      const storedCode = userDoc.social_media_number;
      
      if (storedCode !== socialMediaCode.trim()) {
        throw new Error('Invalid code. Please try again.');
      }
      
      console.log('✅ [Verification] Code verified, updating account state...');
      
      // Code matches, update both social_media_number_correct and account_state
      await databases.updateDocument(
        config.databaseId,
        config.creatorCollectionId,
        userDoc.$id,
        {
          social_media_number_correct: true,
          account_state: 'ok'
        }
      );
      
      console.log('✅ [Verification] Account state updated to ok');
      
      // Now handle post-verification setup (channel creation, etc.)
      const setupSuccess = await handlePostVerificationSetup(user.$id);
      
      if (setupSuccess) {
        Alert.alert(
          'Channel Created! 🎉',
          'Your creator channel has been successfully created and is now under review. You\'ll be notified once it\'s approved!',
          [{ 
            text: 'OK', 
            style: 'default',
            onPress: () => {
              if (onVerificationSuccess) {
                onVerificationSuccess();
              }
              onClose();
            }
          }]
        );
      } else {
        console.log('⚠️ [Verification] Channel creation failed, but verification succeeded');
        if (onVerificationSuccess) {
          onVerificationSuccess();
        }
        onClose();
      }
      
    } catch (error) {
      console.error('❌ [Verification] Enhanced verification failed:', error);
      setLocalError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  // Check if the platform is Google or Apple
  const isGoogleOrApple = socialMediaPlatform === 'Google' || socialMediaPlatform === 'Apple';

  if (isGoogleOrApple) {
    return (
      <View style={{
        backgroundColor: theme.modalBackground,
        borderRadius: 20,
        padding: 28,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: theme.primary,
        width: '100%',
        alignItems: 'center'
      }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 20,
          width: '100%'
        }}>
          <View style={{
            backgroundColor: theme.primary,
            borderRadius: 8,
            padding: 6,
            marginRight: 10
          }}>
            <Ionicons name="star" size={16} color={theme.textInverse} />
          </View>
          <Text style={{ 
            color: theme.text, 
            fontSize: 16, 
            fontFamily: 'Urbanist-Bold',
            flex: 1
          }}>
            Choose Your Platform
          </Text>
        </View>

        {/* Message */}
        <View style={{
          backgroundColor: theme.backgroundSecondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: theme.primary,
          alignItems: 'center',
          width: '100%'
        }}>
          <Text style={{
            color: theme.text,
            fontSize: 16,
            fontFamily: 'Urbanist-Bold',
            textAlign: 'center',
            marginBottom: 8
          }}>
            We need a social media platform to verify you
          </Text>
          <Text style={{
            color: theme.textSecondary,
            fontSize: 14,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center'
          }}>
            Please select a social media platform where you have a presence so we can verify your account
          </Text>
        </View>

        {/* Pick Social Media Button */}
        <TouchableOpacity 
          style={{ 
            backgroundColor: theme.primary, 
            borderRadius: 12, 
            paddingVertical: 16, 
            paddingHorizontal: 32,
            width: '100%',
            alignItems: 'center',
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            marginBottom: 16
          }}
          onPress={() => {
            onClose();
            router.push('/change-username');
          }}
        >
          <Text style={{ 
            color: theme.textInverse, 
            fontSize: 16, 
            fontFamily: 'Urbanist-Bold'
          }}>
            Pick social media where you are a legend
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: theme.modalBackground,
      borderRadius: 20,
      padding: 28,
      marginBottom: 24,
      borderWidth: 2,
      borderColor: theme.primary,
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
          backgroundColor: theme.primary,
          borderRadius: 8,
          padding: 6,
          marginRight: 10
        }}>
          <Ionicons name="shield-checkmark" size={16} color={theme.textInverse} />
        </View>
        <Text style={{ 
          color: theme.text, 
          fontSize: 16, 
          fontFamily: 'Urbanist-Bold',
          flex: 1
        }}>
          Verify Account
        </Text>
      </View>

      {/* Social Media Info */}
      <View style={{
        backgroundColor: theme.backgroundSecondary,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.primary,
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
                  color={network?.color || theme.primary} 
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={{
                color: theme.primary,
                fontSize: 16,
                fontFamily: 'Urbanist-Bold'
              }}>
                @{socialMediaUsername}
              </Text>
            </View>
          );
        })()}
        <Text style={{
          color: theme.textSecondary,
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
            backgroundColor: theme.backgroundSecondary,
            borderRadius: 12,
            padding: 16,
            color: theme.text,
            fontSize: 20,
            fontFamily: 'Urbanist-Bold',
            textAlign: 'center',
            letterSpacing: 4,
            borderWidth: 2,
            borderColor: verificationError ? theme.error : theme.primary,
            width: '100%'
          }}
          placeholder="000000"
          placeholderTextColor={theme.textTertiary}
          value={socialMediaCode}
          onChangeText={(text) => {
            // Only allow numbers and limit to 6 digits
            const numericText = text.replace(/[^0-9]/g, '');
            onCodeChange(numericText.slice(0, 6));
            // Clear local error when user types
            if (localError) setLocalError('');
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
        {(verificationError || localError) ? (
          <Text style={{ 
            color: theme.error, 
            fontSize: 12, 
            marginTop: 4,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center'
          }}>
            {localError || verificationError}
          </Text>
        ) : null}
      </View>

      {/* Single Action Button */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: socialMediaCode.length === 6 ? theme.primary : theme.backgroundTertiary, 
          borderRadius: 12, 
          paddingVertical: 14, 
          paddingHorizontal: 32,
          width: '100%',
          alignItems: 'center',
          shadowColor: socialMediaCode.length === 6 ? theme.primary : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: socialMediaCode.length === 6 ? 0.3 : 0,
          shadowRadius: 8,
          elevation: socialMediaCode.length === 6 ? 8 : 0,
          marginBottom: 16,
          opacity: socialMediaCode.length === 6 ? 1 : 0.6
        }}
        onPress={() => {
          Keyboard.dismiss();
          handleVerificationWithSetup();
        }}
        disabled={socialMediaCode.length !== 6 || isVerifyingCode || isCreatingChannel}
      >
        <Text style={{ 
          color: socialMediaCode.length === 6 ? theme.textInverse : theme.textTertiary, 
          fontSize: 16, 
          fontFamily: 'Urbanist-Bold'
        }}>
          {isCreatingChannel ? 'Creating Channel...' : isVerifyingCode ? 'Verifying...' : 'Verify Code'}
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
          backgroundColor: theme.backgroundSecondary,
          borderWidth: 1,
          borderColor: theme.primary,
          alignItems: 'center'
        }}
      >
        <Text style={{
          color: theme.primary,
          fontSize: 12,
          fontFamily: 'Urbanist-Medium',
          textDecorationLine: 'underline'
        }}>
          Wrong username? Change it
        </Text>
      </TouchableOpacity>

      {/* Code Delivery Time Info */}
      <Text style={{
        color: theme.textSecondary,
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
          backgroundColor: theme.backgroundSecondary,
          borderWidth: 1,
          borderColor: theme.primary,
          alignSelf: 'center'
        }}
      >
        <Text style={{
          color: theme.primary,
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