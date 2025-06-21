import { useGlobalContext } from '@/lib/global-provider'
import { useNavigation, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { GestureResponderEvent, Image, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { logout } from '../../../lib/appwrite'

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  const { refetch } = useGlobalContext();
  const [pushNotifications, setPushNotifications] = useState(true);

  // Enable swipe to go back
  React.useEffect(() => {
    navigation.setOptions({
      gestureEnabled: true,
      gestureDirection: 'horizontal',
    });
  }, [navigation]);

  const handleLogout = async () => {
    try {
      await logout();
      // Update global state
      refetch();
      // Navigate to sign-up
      router.replace('/sign-up');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to update state and navigate
      refetch();
      router.replace('/sign-up');
    }
  };

  const handleChangePassword = () => {
    router.push('/(root)/(tabs)/forgot_password_loged_in');
  };

  const renderSettingItem = (
    title: string,
    onPress: ((event: GestureResponderEvent) => void) | null | undefined,
    hasSwitch = false,
    isLogout = false
  ) => (
    <TouchableOpacity 
      className={`flex-row items-center justify-between py-5 ${!isLogout ? 'border-b border-[#333333]' : ''}`}
      onPress={onPress || undefined}
      disabled={hasSwitch}
    >
      <Text className={`font-questrial text-lg ${isLogout ? 'text-[#FB2355]' : 'text-white'}`} style={{ color: 'white' }}>{title}</Text>
      {hasSwitch ? (
        <Switch
          value={pushNotifications}
          onValueChange={setPushNotifications}
          trackColor={{ false: '#333333', true: '#FB2355' }}
          thumbColor={'white'}
        />
      ) : isLogout ? (
        <Image 
          source={require('../../../assets/icon/logout.png')}
          className="w-6 h-6"
          resizeMode="contain"
          style={{ tintColor: '#FB2355' }}
        />
      ) : (
        <Image 
          source={require('../../../assets/icon/right_arrow.png')}
          className="w-6 h-6"
          resizeMode="contain"
          style={{ tintColor: '#666666' }}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Image 
            source={require('../../../assets/icon/back.png')}
            className="w-8 h-8"
            resizeMode="contain"
            style={{ tintColor: 'white' }}
          />
          <Text style={{ color: 'white', fontSize: 24, marginLeft: 12, fontFamily: 'Nunito-Bold' }}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4">
        {/* Account Settings Section */}
        <View className="mb-8">
          <Text style={{ color: '#FB2355', fontFamily: 'Nunito-Bold', fontSize: 18, marginBottom: 8 }}>Account Settings</Text>
          <View className="bg-[#1A1A1A] rounded-lg px-4">
            {renderSettingItem('Edit Profile', () => router.push('/edit-profile' as any))}
            {renderSettingItem('Change Password', handleChangePassword)}
            {renderSettingItem('Add a payment method', () => router.push('/payment-methods' as any))}
            {renderSettingItem('Push Notifications', null, true)}
            {renderSettingItem('Delete my group Chat', () => router.push('/confirm-delete-chat' as any), false, true)}
            {renderSettingItem('Logout', handleLogout, false, true)}
          </View>
        </View>

        {/* More Section */}
        <View>
          <Text style={{ color: '#FB2355', fontFamily: 'Nunito-Bold', fontSize: 18, marginBottom: 8 }}>More</Text>
          <View className="bg-[#1A1A1A] rounded-lg px-4">
            {renderSettingItem('About us', () => router.push('/about'))}
            {renderSettingItem('Privacy Policy', () => router.push('/privacy-policy'))}
            {renderSettingItem('Terms and Conditions', () => router.push('/terms'))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
} 