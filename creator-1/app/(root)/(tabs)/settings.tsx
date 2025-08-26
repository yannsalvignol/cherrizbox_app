import { useGlobalContext } from '@/lib/global-provider'
import { useTheme } from '@/lib/useTheme'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { GestureResponderEvent, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { logout } from '../../../lib/appwrite'

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  const { refetch } = useGlobalContext();
  const { theme, isDark, setThemeMode } = useTheme();
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
      // Navigate to login
      router.replace('/log-in');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to update state and navigate
      refetch();
      router.replace('/log-in');
    }
  };

  const handleChangePassword = () => {
    router.push('/(root)/(tabs)/forgot_password_loged_in');
  };

  const handleThemeToggle = (value: boolean) => {
    setThemeMode(value ? 'dark' : 'light');
  };

  const renderSettingItem = (
    title: string,
    onPress: ((event: GestureResponderEvent) => void) | null | undefined,
    hasSwitch = false,
    isLogout = false,
    isLast = false,
    switchValue?: boolean,
    onSwitchChange?: (value: boolean) => void
  ) => (
    <TouchableOpacity 
      className={`flex-row items-center justify-between py-5`}
      style={{ 
        borderBottomWidth: !isLogout && !isLast ? 1 : 0, 
        borderBottomColor: theme.border 
      }}
      onPress={onPress || undefined}
      disabled={hasSwitch}
    >
      <Text 
        className="font-questrial text-lg" 
        style={{ color: isLogout ? theme.primary : theme.text }}
      >
        {title}
      </Text>
      {hasSwitch ? (
        <Switch
          value={switchValue !== undefined ? switchValue : pushNotifications}
          onValueChange={onSwitchChange || setPushNotifications}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={theme.background}
        />
      ) : isLogout ? (
        <Ionicons 
          name="log-out-outline" 
          size={24} 
          color={theme.primary} 
        />
      ) : (
        <Ionicons 
          name="chevron-forward" 
          size={24} 
          color={theme.textTertiary} 
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Ionicons 
            name="chevron-back-outline" 
            size={32} 
            color={theme.text} 
            style={{ marginRight: 4 }}
          />
          <Text style={{ color: theme.text, fontSize: 24, marginLeft: 8, fontFamily: 'Nunito-Bold' }}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4">
        {/* Account Settings Section */}
        <View className="mb-8">
          <Text style={{ color: theme.primary, fontFamily: 'Nunito-Bold', fontSize: 18, marginBottom: 8 }}>Account Settings</Text>
          <View style={{ backgroundColor: theme.cardBackground, borderRadius: 8, paddingHorizontal: 16 }}>
            {renderSettingItem('Edit Profile', () => router.push('/edit-profile' as any))}
            {renderSettingItem('Change Password', handleChangePassword)}
            {renderSettingItem('Payment methods', () => router.push('/payment-methods'))}
            {renderSettingItem('Dark Theme', null, true, false, false, isDark, handleThemeToggle)}
            {renderSettingItem('Push Notifications', null, true)}
            {renderSettingItem('Logout', handleLogout, false, true)}
          </View>
        </View>

        {/* More Section */}
        <View>
          <Text style={{ color: theme.primary, fontFamily: 'Nunito-Bold', fontSize: 18, marginBottom: 8 }}>More</Text>
          <View style={{ backgroundColor: theme.cardBackground, borderRadius: 8, paddingHorizontal: 16 }}>
            {renderSettingItem('About us', () => router.push('/about'))}
            {renderSettingItem('Privacy Policy', () => router.push('/privacy-policy'))}
            {renderSettingItem('Terms and Conditions', () => router.push('/terms'), false, false, true)}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
} 