import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { ID } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config, databases, getCurrentUser, getUserProfile, isProfileComplete } from '../../../lib/appwrite';

export default function MyPage3() {
  const { imageUrl } = useLocalSearchParams();
  const router = useRouter();
  const [showCongrats, setShowCongrats] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const checkProfile = useCallback(async () => {
    setCheckingProfile(true);
    const user = await getCurrentUser();
    if (user && user.$id) {
      const profile = await getUserProfile(user.$id);
      setProfileComplete(isProfileComplete(profile));
    } else {
      setProfileComplete(false);
    }
    setCheckingProfile(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkProfile();
    }, [checkProfile])
  );

  useEffect(() => {
    if (showCongrats) {
      // Start with scale 0
      scaleAnim.setValue(0);
      
      // Animate to scale 1.2 with a spring effect
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start(() => {
        // After reaching 1.2, animate back to 1
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
      });

      // Trigger vibration
      Vibration.vibrate([0, 100, 50, 100]);
    }
  }, [showCongrats]);

  const handleGoPublic = async () => {
    try {
      // Get current user info
      const user = await getCurrentUser();
      if (!user || !user.$id) throw new Error('User not found');

      // Fetch profile document from profileCollectionId to get creatorsname, creatorpayment, Location, and topics
      const profileDoc = await databases.listDocuments(
        config.databaseId,
        config.profileCollectionId,
        []
      );
      let creatorsname = '';
      let creatorpayment = null;
      let location = '';
      let topics = '';
      let profilesBio = '';
      if (profileDoc.documents && profileDoc.documents.length > 0) {
        const byUserId = profileDoc.documents.find(doc => doc.userId === user.$id);
        if (byUserId) {
          creatorsname = byUserId.creatorsname || '';
          creatorpayment = byUserId.creatorpayment || null;
          location = byUserId.Location || '';
          topics = byUserId.topics || '';
          profilesBio = byUserId.ProfilesBio || '';
        } else if (profileDoc.documents[0]) {
          creatorsname = profileDoc.documents[0].creatorsname || '';
          creatorpayment = profileDoc.documents[0].creatorpayment || null;
          location = profileDoc.documents[0].Location || '';
          topics = profileDoc.documents[0].topics || '';
          profilesBio = profileDoc.documents[0].ProfilesBio || '';
        }
      }
      if (!creatorsname) throw new Error('Creator name not found in profile');

      // Fetch user document from userCollectionId to get creatoraccountid
      const userDoc = await databases.listDocuments(
        config.databaseId,
        config.userCollectionId,
        []
      );
      let creatoraccountid = '';
      if (userDoc.documents && userDoc.documents.length > 0) {
        const byAccountId = userDoc.documents.find(doc => doc.creatoraccountid === user.$id);
        if (byAccountId && byAccountId.creatoraccountid) {
          creatoraccountid = byAccountId.creatoraccountid;
        } else if (userDoc.documents[0].creatoraccountid) {
          creatoraccountid = userDoc.documents[0].creatoraccountid;
        }
      }
      if (!creatoraccountid) throw new Error('creatoraccountid not found in user collection');

      // Add to photos collection with payment info, location, and topics
      await databases.createDocument(
        config.databaseId,
        config.photoCollectionId,
        ID.unique(),
        {
          thumbnail: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl,
          title: creatorsname,
          prompte: creatorsname,
          IdCreator: creatoraccountid,
          payment: creatorpayment,
          PhotosLocation: location,
          PhotoTopics: topics,
          Bio: profilesBio
        }
      );
      setShowCongrats(true);
      setTimeout(() => {
        router.replace('/');
      }, 3000);
    } catch (error) {
      alert('Failed to go public: ' + (error && (error as any).message ? (error as any).message : error));
    }
  };

  if (showCongrats) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Text style={{ color: '#FB2355', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, letterSpacing: 1 }}>
            🎉 Congratulations! 🎉
          </Text>
          <Text style={{ color: 'white', fontSize: 22, textAlign: 'center', marginBottom: 16, fontFamily: 'questrial' }}>
            Your chat is now public!
          </Text>
          <Animated.Text 
            style={{ 
              color: '#FB2355', 
              fontSize: 48, 
              textAlign: 'center', 
              marginTop: 16,
              transform: [{ scale: scaleAnim }]
            }}
          >
            🚀
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        {/* Top text */}
        <Text style={{ color: 'white', fontSize: 32, fontFamily: 'questrial', fontWeight: 'bold', marginBottom: 32, marginTop: 8, letterSpacing: 1 }}>
          Almost done !
        </Text>
        {/* Image and edit button overlay */}
        <View style={{ marginBottom: 24, alignItems: 'center', position: 'relative', width: 320, height: 500 }}>
          {imageUrl ? (
            <Image
              source={{ uri: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl }}
              style={{ width: 320, height: 500, borderRadius: 28, backgroundColor: '#222' }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: 'white', fontSize: 18, fontFamily: 'questrial' }}>
              No image to display.
            </Text>
          )}
          {/* Edit profile button overlayed on image */}
          <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' }}>
            <BlurView
              intensity={90}
              tint="dark"
              style={{
                borderRadius: 35,
                padding: 2,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 35,
                  paddingVertical: 12,
                  paddingHorizontal: 28,
                  minWidth: 180,
                  alignItems: 'center',
                }}
                onPress={() => router.push('/edit-profile')}
              >
                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', fontWeight: 'bold' }}>Edit profile</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
        {/* Go public button */}
        <TouchableOpacity
          style={{
            backgroundColor: profileComplete ? '#FB2355' : '#444',
            borderRadius: 30,
            paddingVertical: 22,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 10,
            elevation: 4,
            opacity: checkingProfile ? 0.5 : 1,
            width: 320,
            marginBottom: 0,
          }}
          activeOpacity={profileComplete ? 0.85 : 1}
          onPress={profileComplete ? handleGoPublic : undefined}
          disabled={!profileComplete || checkingProfile}
        >
          <Text style={{ color: 'white', fontSize: 24, fontFamily: 'questrial', fontWeight: 'bold', letterSpacing: 1 }}>
            Go public !
          </Text>
        </TouchableOpacity>
        {/* Warning/message below button */}
        {!checkingProfile && profileComplete === false && (
          <View style={{
            backgroundColor: 'rgba(251,35,85,0.12)',
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 18,
            marginTop: 18,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            maxWidth: 340,
            alignSelf: 'center',
          }}>
            <Ionicons name="alert-circle" size={22} color="#FB2355" style={{ marginRight: 10 }} />
            <Text style={{
              color: '#FB2355',
              fontSize: 15,
              fontFamily: 'questrial',
              fontWeight: '600',
              textAlign: 'center',
              flex: 1,
            }}>
              Please complete your profile before going public.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
} 