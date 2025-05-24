import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getCurrentUser, getUserProfile } from '../../../lib/appwrite'

export default function Profile() {
  const router = useRouter();
  const [isPaidContent, setIsPaidContent] = useState(false);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user?.$id) {
        const userProfile = await getUserProfile(user.$id);
        setProfile(userProfile);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Header with cherry icon and title */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity 
          onPress={() => router.replace('/(root)/(tabs)/')} 
          className="absolute left-4 z-10"
        >
          <Image 
            source={require('../../../assets/images/cherry-icon.png')}
            className="w-14 h-14"
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <Text style={{ color: 'white', fontSize: 38, fontWeight: 'bold', textAlign: 'center', flex: 1, fontFamily: 'questrial' }}>
          Cherrybox<Text style={{ color: '#FB2355', fontFamily: 'questrial' }}>.</Text>
        </Text>
      </View>

      {/* Profile Picture Section */}
      <View className="items-center mb-6">
        <View className="w-32 h-32 rounded-full bg-[#1A1A1A] items-center justify-center mb-3 overflow-hidden">
          {profile?.profileImageUri ? (
            <Image
              source={{ uri: profile.profileImageUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>{currentUser?.name?.[0] || 'P'}</Text>
          )}
        </View>
        <View className="w-full px-6 relative">
          <Text style={{ color: 'white', fontSize: 20, textAlign: 'center', fontFamily: 'questrial' }}>
            {currentUser?.name || 'Profile Name'}
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/(root)/(tabs)/settings')} 
            className="absolute right-12 top-3"
          >
            <Image 
              source={require('../../../assets/icon/settings.png')}
              className="w-9 h-9"
              resizeMode="contain"
              style={{ tintColor: 'white' }}
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center justify-center mb-4">
          <Text style={{ color: 'white', fontSize: 14, fontFamily: 'questrial' }}>
            {currentUser?.email || 'email@example.com'}
          </Text>
          <Image 
            source={require('../../../assets/icon/ok.png')}
            className="w-4 h-4 ml-2"
            resizeMode="contain"
            style={{ tintColor: '#4CAF50' }}
          />
        </View>
        
        {/* Action Buttons */}
        <View className="w-full px-6">
          <TouchableOpacity 
            className="w-full bg-[#1A1A1A] py-2 rounded-lg items-center flex-row justify-center mb-1"
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={{ color: 'white', fontFamily: 'questrial' }}>Edit Profile</Text>
            <Image 
              source={require('../../../assets/icon/down_arrow.png')}
              className="w-5 h-5 ml-2"
              resizeMode="contain"
              style={{ tintColor: 'white' }}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="w-full bg-[#1A1A1A] py-3 rounded-lg items-center flex-row justify-center mb-6"
            onPress={() => router.push('/payment-methods')}
          >
            <Text style={{ color: 'white', fontFamily: 'questrial' }}>Add Payment Methods</Text>
          </TouchableOpacity>
          
          {/* Custom Content Type Toggle */}
          <View className="w-full items-center">
            <View className="flex-row bg-[#1A1A1A] rounded-full overflow-hidden relative p-1">
              {/* Sliding pink background */}
              <View 
                className={`absolute w-1/2 h-full rounded-full bg-[#FB2355] top-1 ${
                  isPaidContent ? 'right-1' : 'left-1'
                }`}
              />
              
              {/* Toggle options */}
              <Pressable 
                onPress={() => setIsPaidContent(false)}
                className="flex-1 py-2 px-8 items-center z-10"
              >
                <Text className={`font-questrial ${!isPaidContent ? 'text-white' : 'text-gray-400'}`}>
                  All content
                </Text>
              </Pressable>
              <Pressable 
                onPress={() => setIsPaidContent(true)}
                className="flex-1 py-2 px-8 items-center z-10"
              >
                <Text className={`font-questrial ${isPaidContent ? 'text-white' : 'text-gray-400'}`}>
                  Paid content
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
