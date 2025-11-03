import { useGlobalContext } from '@/lib/global-provider'
import { useTheme } from '@/lib/themes/useTheme'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
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
  const [isProcessingPushNotifications, setIsProcessingPushNotifications] = useState(false);

  // load saved notification settings
  useEffect(() => {
    const loadPushPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('@push_notifications_enabled');
        if (saved !== null) {
          setPushNotifications(JSON.parse(saved));
        }
      } catch (error) {
        console.log('Failed to load notification settings:', error);
      }
    };
    loadPushPreference();
  }, []);

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

  const handlePushNotificationToggle = async (value: boolean) => {
    // Prevent multiple simultaneous operations
    if (isProcessingPushNotifications) {
      return;
    }
    
    setIsProcessingPushNotifications(true);
    
    try {
      // Save preference to AsyncStorage
      await AsyncStorage.setItem('@push_notifications_enabled', JSON.stringify(value));
      setPushNotifications(value);

      if (value) {
        // Enable push notifications
        console.log('turning on notifications...');
        
        // get firebase stuff
        const { getMessaging, getToken, requestPermission, AuthorizationStatus } = await import('@react-native-firebase/messaging');
        console.log('got firebase');
        
        // Request permission
        console.log('asking for permission...');
        const messaging = getMessaging();
        const authStatus = await requestPermission(messaging);
        console.log('got permission status:', authStatus);
        
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;
        console.log('permission granted:', enabled);

        if (enabled) {
          console.log('setting up device...');
          
          // setup chat stuff
          const { client, getConnectedUserId, connectUser } = await import('../../../lib/stream-chat');
          console.log('got chat stuff');
          
          let connectedUserId = getConnectedUserId();
          console.log('user id:', connectedUserId);
          
          // If not connected, try to connect first
          if (!connectedUserId) {
            console.log('not connected, trying to connect...');
            try {
              const { getCurrentUser } = await import('../../../lib/appwrite');
              const user = await getCurrentUser();
              console.log('got user:', user?.$id);
              
              if (user) {
                console.log('connecting to chat...');
                const connected = await connectUser(user.$id);
                console.log('connected:', connected);
                
                if (connected) {
                  connectedUserId = getConnectedUserId();
                  console.log('new user id:', connectedUserId);
                }
              } else {
                console.log('no user found');
              }
            } catch (connectionError: any) {
              console.log('failed to connect:', connectionError);
            }
          }
          
          if (connectedUserId) {
            console.log('getting token...');
            const fcmToken = await getToken(messaging);
            console.log('got token');
            
            if (fcmToken) {
              try {
                console.log('adding device...');
                
                await client.addDevice(fcmToken, 'firebase', connectedUserId, 'default');
                console.log('notifications enabled');
                
                Alert.alert(
                  'Push Notifications Enabled',
                  'You will now receive notifications for new messages.',
                  [{ text: 'OK' }],
                  { userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light' }
                );
              } catch (error: any) {
                console.log('failed to setup device:', error);
                console.log('error info:', error?.message);
                
                Alert.alert(
                  'Registration Failed',
                  `Failed to enable push notifications: ${error?.message || 'Unknown error'}`,
                  [{ text: 'OK' }],
                  { userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light' }
                );
              }
            } else {
              console.log('no token available');
              Alert.alert(
                'Token Error',
                'Could not get Firebase token. Please try again.',
                [{ text: 'OK' }],
                { userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light' }
              );
            }
          } else {
            console.log('not connected to chat');
            Alert.alert(
              'Connection Error',
              'Stream Chat is not connected. Please try again.',
              [{ text: 'OK' }],
              { userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light' }
            );
          }
        } else {
          console.log('  [Settings] Step 5 FAILED: Permission denied, reverting toggle');
          // Permission denied, revert toggle
          setPushNotifications(false);
          await AsyncStorage.setItem('@push_notifications_enabled', JSON.stringify(false));
          
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive push notifications.',
            [{ text: 'OK' }],
            { userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light' }
          );
        }
      } else {
        // Disable push notifications
        console.log('  [Settings] Disabling push notifications...');
        console.log('  [Settings] Disable Step 1: Importing modules...');
        
        try {
          const { client } = await import('../../../lib/stream-chat');
          const { getMessaging, getToken } = await import('@react-native-firebase/messaging');
          console.log('  [Settings] Disable Step 2: Modules imported successfully');
          
          console.log('  [Settings] Disable Step 3: Getting FCM token...');
          const messaging = getMessaging();
          const fcmToken = await getToken(messaging);
          console.log('  [Settings] Disable Step 4: FCM token:', fcmToken ? fcmToken.substring(0, 20) + '...' : 'null');
          
          if (fcmToken) {
            console.log('  [Settings] Disable Step 5: Calling client.removeDevice...');
            // Remove device from Stream Chat
            await client.removeDevice(fcmToken);
            console.log(' [Settings] Disable Step 6: Push notifications disabled successfully');
            
            Alert.alert(
              'Push Notifications Disabled',
              'You will no longer receive push notifications. You can re-enable them anytime in settings.',
              [{ text: 'OK' }],
              { userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light' }
            );
          } else {
            console.log('  [Settings] Disable Step 4 WARNING: No FCM token, but proceeding anyway');
            Alert.alert(
              'Push Notifications Disabled',
              'Push notifications have been disabled in settings.',
              [{ text: 'OK' }],
              { userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light' }
            );
          }
        } catch (error: any) {
          console.log('  [Settings] Disable FAILED: Failed to remove device:', error);
          console.log('  [Settings] Disable error details:', {
            message: error?.message,
            code: error?.code,
            name: error?.name
          });
          // Still update the UI state even if removal failed
          Alert.alert(
            'Push Notifications Disabled',
            'Push notifications have been disabled in settings (device removal may have failed).',
            [{ text: 'OK' }],
            { userInterfaceStyle: themeMode === 'dark' ? 'dark' : 'light' }
          );
        }
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      // Revert the toggle on error
      setPushNotifications(!value);
    } finally {
      setIsProcessingPushNotifications(false);
    }
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
            console.log('deleting account...');
            setIsDeletingAccount(true);
            
            // go to delete screen
            router.dismissAll();
            router.replace('/delete');
            
            try {
              const result = await deleteAccount();
              
              console.log('account deleted:', result);
              
              // Update global state to reflect that user is no longer logged in
              refetch();
              
              // Trigger success state on delete screen
              router.replace('/delete?success=true');
              
            } catch (error: any) {
              console.error('  Error deleting account:', error);
              
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
          onValueChange={handlePushNotificationToggle}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={'white'}
          disabled={isProcessingPushNotifications}
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
            {renderSettingItem('Manage Subscriptions', () => router.push('/manage-subscriptions'))}
            {renderSettingItem(isProcessingPushNotifications ? 'Push Notifications (Processing...)' : 'Push Notifications', null, true)}
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