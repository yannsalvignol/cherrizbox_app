import { Ionicons } from '@expo/vector-icons'
import { Query } from 'appwrite'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { config, databases, getCurrentUser, getUserProfile } from '../../../lib/appwrite'

export default function Profile() {
  const router = useRouter();
  const [isPaidContent, setIsPaidContent] = useState(false);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedToggle, setSelectedToggle] = useState<'membership' | 'earnings' | 'posts'>('membership');
  const [hasExistingGroup, setHasExistingGroup] = useState(false);

  // For swipe toggle
  const toggleOptions = ['membership', 'earnings', 'posts'] as const;
  const toggleIndex = toggleOptions.indexOf(selectedToggle);

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

        // Check if user already has a chat group
        const response = await databases.listDocuments(
          config.databaseId,
          config.photoCollectionId,
          [
            Query.equal('IdCreator', user.$id)
          ]
        );
        setHasExistingGroup(response.documents.length > 0);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleCreateGroup = () => {
    if (hasExistingGroup) {
      router.push('/already-have-group');
      return;
    }
    router.push('/my_page');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Header with cherry icon and title */}
      <View className="flex-row items-center px-4 pt-1 pb-2">
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
        
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 0 }}>
          <Text style={{ color: 'white', fontSize: 38, fontWeight: 'bold', textAlign: 'center', fontFamily: 'questrial' }}>
            Cherrizbox
            <Text style={{ color: '#FB2355', fontFamily: 'questrial' }}>.</Text>
          </Text>
          <Text style={{
            color: '#FB2355',
            fontSize: 18,
            fontFamily: 'questrial',
            textAlign: 'center',
            marginTop: -3,
            letterSpacing: 2,
          }}>
            creator
          </Text>
        </View>
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
            className="w-full bg-[#1A1A1A] py-3 rounded-lg items-center flex-row justify-center mb-1"
            onPress={() => router.push('/payment-methods')}
          >
            <Text style={{ color: 'white', fontFamily: 'questrial' }}>Add Payment Methods</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="w-full py-4 rounded-lg items-center"
            style={{ 
              backgroundColor: hasExistingGroup ? '#1A1A1A' : '#1A1A1A', 
              borderWidth: 2, 
              borderColor: hasExistingGroup ? '#666' : '#FB2355' 
            }}
            onPress={handleCreateGroup}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name="chatbubble-ellipses-outline" 
                size={22} 
                color={hasExistingGroup ? '#666' : '#FB2355'} 
                style={{ marginRight: 10 }} 
              />
              <Text style={{ 
                color: hasExistingGroup ? '#666' : 'white', 
                fontSize: 22, 
                fontFamily: 'questrial' 
              }}>
                {hasExistingGroup ? 'Chat Group Active' : 'Create my Chat group'}
              </Text>
              <Ionicons 
                name="chatbubble-ellipses-outline" 
                size={22} 
                color={hasExistingGroup ? '#666' : '#FB2355'} 
                style={{ marginLeft: 10 }} 
              />
            </View>
          </TouchableOpacity>

          {/* Swipe-style Toggle group */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#1A1A1A',
            borderRadius: 999,
            marginTop: 6,
            marginBottom: 18,
            overflow: 'hidden',
            position: 'relative',
            height: 36,
          }}>
            {/* Pink slider */}
            <View style={{
              position: 'absolute',
              top: 4,
              left: `${(100 / 3) * toggleIndex}%`,
              width: '33.33%',
              height: 28,
              backgroundColor: '#FB2355',
              borderRadius: 999,
              zIndex: 1,
            }} />
            {toggleOptions.map((option, idx) => (
              <Pressable
                key={option}
                onPress={() => setSelectedToggle(option)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2, paddingVertical: 4 }}
              >
                <Text className={`font-questrial ${selectedToggle === option ? 'text-white' : 'text-gray-400'}`} style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Delete Chat Button at the bottom */}
      <View className="w-full px-6 mt-auto mb-8">
        <TouchableOpacity 
          className="w-full bg-[#1A1A1A] py-4 rounded-lg items-center border border-red-500"
          onPress={() => router.push('/confirm-delete-chat')}
        >
          <Text style={{ color: '#FF4444', fontSize: 18, fontFamily: 'questrial' }}>
            Delete my group Chat
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
