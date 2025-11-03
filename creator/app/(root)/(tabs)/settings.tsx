import { useGlobalContext } from '@/lib/global-provider'
import { useTheme } from '@/lib/useTheme'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, GestureResponderEvent, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { logout } from '../../../lib/appwrite'

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  const { refetch } = useGlobalContext();
  const { theme, isDark, setThemeMode } = useTheme();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [isTogglingPushNotifications, setIsTogglingPushNotifications] = useState(false);

  // Load push notification preference on component mount
  useEffect(() => {
    const loadPushPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('@push_notifications_enabled');
        if (saved !== null) {
          setPushNotifications(JSON.parse(saved));
        }
      } catch (error) {
        console.log('Error loading push notification preference:', error);
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

  const handleThemeToggle = (value: boolean) => {
    setThemeMode(value ? 'dark' : 'light');
  };

  const handlePushNotificationToggle = async (value: boolean) => {
    // Prevent multiple simultaneous toggles
    if (isTogglingPushNotifications) return;
    
    setIsTogglingPushNotifications(true);
    
    try {
      console.log(`📱 [Settings] Starting push notification toggle to: ${value}`);
      
      // Save preference to AsyncStorage
      await AsyncStorage.setItem('@push_notifications_enabled', JSON.stringify(value));
      setPushNotifications(value);

      if (value) {
        // Enable push notifications
        console.log('📱 [Settings] Enabling push notifications...');
        console.log('📱 [Settings] Step 1: Importing Firebase messaging...');
        
        // Import Firebase modules using modular API (same as stream-chat.ts)
        const { getMessaging, getToken, requestPermission, AuthorizationStatus } = await import('@react-native-firebase/messaging');
        console.log('📱 [Settings] Step 2: Firebase messaging imported successfully');
        
        // Get messaging instance using modular API
        const messaging = getMessaging();
        
        // Request permission
        console.log('📱 [Settings] Step 3: Requesting push notification permission...');
        const authStatus = await requestPermission(messaging);
        console.log('📱 [Settings] Step 4: Permission status received:', authStatus);
        
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;
        console.log('📱 [Settings] Step 5: Permission enabled:', enabled);

        if (enabled) {
          console.log('📱 [Settings] Step 6: Permission granted, proceeding with device registration...');
          
          // Re-register device with Stream Chat
          const { client, getConnectedUserId, connectUser } = await import('../../../lib/stream-chat');
          console.log('📱 [Settings] Step 7: Stream Chat modules imported');
          
          let connectedUserId = getConnectedUserId();
          console.log('📱 [Settings] Step 8: Connected user ID:', connectedUserId);
          
          // If not connected, try to connect first
          if (!connectedUserId) {
            console.log('📱 [Settings] Step 8.1: Stream Chat not connected, attempting to connect...');
            try {
              const { getCurrentUser } = await import('../../../lib/appwrite');
              const user = await getCurrentUser();
              console.log('📱 [Settings] Step 8.2: Current user from Appwrite:', user?.$id);
              
              if (user) {
                console.log('📱 [Settings] Step 8.3: Connecting to Stream Chat...');
                const connected = await connectUser(user.$id);
                console.log('📱 [Settings] Step 8.4: Stream Chat connection result:', connected);
                
                if (connected) {
                  connectedUserId = getConnectedUserId();
                  console.log('📱 [Settings] Step 8.5: New connected user ID:', connectedUserId);
                }
              } else {
                console.log('   [Settings] Step 8.2 FAILED: No current user from Appwrite');
              }
            } catch (connectionError: any) {
              console.log('   [Settings] Step 8.3 FAILED: Stream Chat connection error:', connectionError);
            }
          }
          
          if (connectedUserId) {
            console.log('📱 [Settings] Step 9: Getting FCM token...');
            const fcmToken = await getToken(messaging);
            console.log('📱 [Settings] Step 10: FCM token obtained:', fcmToken ? fcmToken.substring(0, 20) + '...' : 'null');
            
            if (fcmToken) {
              try {
                console.log('📱 [Settings] Step 11: Calling client.addDevice...');
                console.log('📱 [Settings] Parameters:', {
                  token: fcmToken.substring(0, 20) + '...',
                  provider: 'firebase',
                  userId: connectedUserId,
                  providerName: 'default'
                });
                
                await client.addDevice(fcmToken, 'firebase', connectedUserId, 'default');
                console.log(' [Settings] Step 12: Push notifications re-enabled successfully');
                
                Alert.alert(
                  'Push Notifications Enabled',
                  'You will now receive notifications for new messages.',
                  [{ text: 'OK' }]
                );
              } catch (error: any) {
                console.log('   [Settings] Step 11 FAILED: Failed to re-register device:', error);
                console.log('   [Settings] Error details:', {
                  message: error?.message,
                  code: error?.code,
                  name: error?.name,
                  stack: error?.stack
                });
                
                Alert.alert(
                  'Registration Failed',
                  `Failed to enable push notifications: ${error?.message || 'Unknown error'}`,
                  [{ text: 'OK' }]
                );
              }
            } else {
              console.log('   [Settings] Step 10 FAILED: No FCM token available');
              Alert.alert(
                'Token Error',
                'Could not get Firebase token. Please try again.',
                [{ text: 'OK' }]
              );
            }
          } else {
            console.log('   [Settings] Step 8 FAILED: No connected user ID');
            Alert.alert(
              'Connection Error',
              'Stream Chat is not connected. Please try again.',
              [{ text: 'OK' }]
            );
          }
        } else {
          console.log('   [Settings] Step 5 FAILED: Permission denied, reverting toggle');
          // Permission denied, revert toggle
          setPushNotifications(false);
          await AsyncStorage.setItem('@push_notifications_enabled', JSON.stringify(false));
          
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive push notifications.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Disable push notifications
        console.log('📱 [Settings] Disabling push notifications...');
        console.log('📱 [Settings] Disable Step 1: Importing modules...');
        
        try {
          const { client } = await import('../../../lib/stream-chat');
          const { getMessaging, getToken } = await import('@react-native-firebase/messaging');
          console.log('📱 [Settings] Disable Step 2: Modules imported successfully');
          
          // Get messaging instance using modular API
          const messaging = getMessaging();
          
          console.log('📱 [Settings] Disable Step 3: Getting FCM token...');
          const fcmToken = await getToken(messaging);
          console.log('📱 [Settings] Disable Step 4: FCM token:', fcmToken ? fcmToken.substring(0, 20) + '...' : 'null');
          
          if (fcmToken) {
            console.log('📱 [Settings] Disable Step 5: Calling client.removeDevice...');
            // Remove device from Stream Chat
            await client.removeDevice(fcmToken);
            console.log(' [Settings] Disable Step 6: Push notifications disabled successfully');
            
            Alert.alert(
              'Push Notifications Disabled',
              'You will no longer receive push notifications. You can re-enable them anytime in settings.',
              [{ text: 'OK' }]
            );
          } else {
            console.log('  [Settings] Disable Step 4 WARNING: No FCM token, but proceeding anyway');
            Alert.alert(
              'Push Notifications Disabled',
              'Push notifications have been disabled in settings.',
              [{ text: 'OK' }]
            );
          }
        } catch (error: any) {
          console.log('   [Settings] Disable FAILED: Failed to remove device:', error);
          console.log('   [Settings] Disable error details:', {
            message: error?.message,
            code: error?.code,
            name: error?.name
          });
          // Still update the UI state even if removal failed
          Alert.alert(
            'Push Notifications Disabled',
            'Push notifications have been disabled in settings (device removal may have failed).',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('   [Settings] Error toggling push notifications:', error);
      // Revert the toggle on error
      setPushNotifications(!value);
      await AsyncStorage.setItem('@push_notifications_enabled', JSON.stringify(!value));
      
      Alert.alert(
        'Error',
        'Failed to update push notification settings. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      // Always reset loading state
      setIsTogglingPushNotifications(false);
      console.log('📱 [Settings] Push notification toggle process completed');
    }
  };

  const renderSettingItem = (
    title: string,
    onPress: ((event: GestureResponderEvent) => void) | null | undefined,
    hasSwitch = false,
    isLogout = false,
    isLast = false,
    switchValue?: boolean,
    onSwitchChange?: (value: boolean) => void,
    isPushNotificationSwitch = false
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isPushNotificationSwitch && isTogglingPushNotifications && (
            <Text style={{ 
              color: theme.textTertiary, 
              fontSize: 12, 
              marginRight: 8,
              fontFamily: 'Urbanist-Regular'
            }}>
              {pushNotifications ? 'Disabling...' : 'Enabling...'}
            </Text>
          )}
          <Switch
            value={switchValue !== undefined ? switchValue : pushNotifications}
            onValueChange={onSwitchChange || handlePushNotificationToggle}
            trackColor={{ 
              false: theme.border, 
              true: (isPushNotificationSwitch && isTogglingPushNotifications) ? theme.backgroundTertiary : theme.primary 
            }}
            thumbColor={(isPushNotificationSwitch && isTogglingPushNotifications) ? theme.textTertiary : theme.background}
            disabled={isPushNotificationSwitch && isTogglingPushNotifications}
          />
        </View>
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
            {renderSettingItem('Push Notifications', null, true, false, false, pushNotifications, handlePushNotificationToggle, true)}
            {renderSettingItem('Logout', handleLogout, false, true)}
          </View>
        </View>

        {/* Appearance Section */}
        <View className="mb-8">
          <Text style={{ color: theme.primary, fontFamily: 'Nunito-Bold', fontSize: 18, marginBottom: 8 }}>Appearance</Text>
          <View style={{ backgroundColor: theme.cardBackground, borderRadius: 8, paddingHorizontal: 16 }}>
            {renderSettingItem('Dark Theme', null, true, false, true, isDark, handleThemeToggle, false)}
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