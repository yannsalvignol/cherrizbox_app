import { useGlobalContext } from '@/lib/global-provider'
import { useTheme } from '@/lib/themes/useTheme'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, GestureResponderEvent, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { deleteAccount, logout } from '../../../lib/appwrite'

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  const { refetch } = useGlobalContext();
  const { theme, themeMode, setThemeMode } = useTheme();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const handleThemeToggle = () => {
    // Toggle between light and dark
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };



  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will:\n\n• Cancel all your active subscriptions\n• Delete all your personal data\n• Remove your account permanently',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Starting account deletion process...');
            setIsDeletingAccount(true);
            
            // Clear navigation history and navigate to delete screen
            router.dismissAll();
            router.replace('/delete');
            
            try {
              const result = await deleteAccount();
              
              console.log('✅ Account deleted successfully:', result);
              
              // Update global state to reflect that user is no longer logged in
              refetch();
              
              // Trigger success state on delete screen
              router.replace('/delete?success=true');
              
            } catch (error: any) {
              console.error('❌ Error deleting account:', error);
              
              // On error, go back to settings
              router.replace('/(root)/(tabs)/settings');
              
              // Check if this is a subscription cancellation failure
              const isSubscriptionError = error.message?.includes('subscription(s) failed to cancel');
              
              Alert.alert(
                isSubscriptionError ? 'Subscription Cancellation Failed' : 'Deletion Failed',
                isSubscriptionError 
                  ? `We couldn't cancel all your subscriptions, so your account was not deleted to prevent ongoing charges.\n\n${error.message}\n\nPlease contact support for assistance.`
                  : `Failed to delete account:\n\n${error.message}`,
                [{ text: 'OK' }],
                { 
                  userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light'
                }
              );
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
      { 
        userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light'
      }
    );
  };

  const renderSettingItem = (
    title: string,
    onPress: ((event: GestureResponderEvent) => void) | null | undefined,
    hasSwitch = false,
    isLogout = false,
    isLast = false,
    isThemeSwitch = false,
    isExpandable = false,
    isDangerous = false
  ) => (
    <TouchableOpacity 
      className="flex-row items-center justify-between"
      style={{
        paddingVertical: Platform.OS === 'android' ? 16 : 20,
        borderBottomWidth: !isLogout && !isLast ? 1 : 0,
        borderBottomColor: theme.border
      }}
      onPress={onPress || undefined}
      disabled={hasSwitch || isThemeSwitch}
    >
      <Text className={`font-questrial text-lg`} style={{ color: isLogout ? theme.primary : isDangerous ? theme.error : theme.text }}>{title}</Text>
      {hasSwitch ? (
        <Switch
          value={pushNotifications}
          onValueChange={setPushNotifications}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={'white'}
        />
      ) : isThemeSwitch ? (
        <Switch
          value={themeMode === 'dark'}
          onValueChange={handleThemeToggle}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={'white'}
        />
      ) : isLogout ? (
        <Ionicons 
          name="log-out-outline" 
          size={24} 
          color={theme.primary} 
        />
      ) : isExpandable ? (
        <Ionicons 
          name={showAdvancedSettings ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={theme.textTertiary} 
        />
      ) : isDangerous ? (
        <Ionicons 
          name="trash-outline" 
          size={24} 
          color={theme.error} 
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

      <ScrollView 
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Account Settings Section */}
        <View className="mb-8">
          <Text style={{ color: theme.primary, fontFamily: 'Nunito-Bold', fontSize: 18, marginBottom: 8 }}>Account Settings</Text>
          <View style={{ backgroundColor: theme.cardBackground, borderRadius: 8, paddingHorizontal: 16 }}>
            {renderSettingItem('Edit Profile', () => router.push('/edit-profile' as any))}
            {renderSettingItem('Change Password', handleChangePassword)}
            {renderSettingItem('Payment methods', () => router.push('/payment-methods'))}
            {renderSettingItem('Push Notifications', null, true)}
            {renderSettingItem('Advanced Account Settings', () => setShowAdvancedSettings(!showAdvancedSettings), false, false, false, false, true)}
            
            {/* Expandable Advanced Settings */}
            {showAdvancedSettings && (
              <>
                {renderSettingItem(
                  isDeletingAccount ? 'Deleting Account...' : 'Delete Account', 
                  isDeletingAccount ? null : handleDeleteAccount, 
                  false, false, false, false, false, true
                )}
              </>
            )}
            
            {renderSettingItem('Logout', handleLogout, false, true)}
          </View>
        </View>

        {/* Appearance Section */}
        <View className="mb-8">
          <Text style={{ color: theme.primary, fontFamily: 'Nunito-Bold', fontSize: 18, marginBottom: 8 }}>Appearance</Text>
          <View style={{ backgroundColor: theme.cardBackground, borderRadius: 8, paddingHorizontal: 16 }}>
            {renderSettingItem('Dark Mode', null, false, false, true, true)}
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
      </ScrollView>
    </SafeAreaView>
  );
} 