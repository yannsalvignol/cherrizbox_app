import { useGlobalContext } from '@/lib/global-provider';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const globalContext = useGlobalContext();
  const user = globalContext?.user;
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Questrial: require("../assets/fonts/Questrial-Regular.ttf"),
    Urbanist: require("../assets/fonts/Urbanist-Regular.ttf"),
    "Urbanist-Bold": require("../assets/fonts/Urbanist-Bold.ttf"),
    "Urbanist-Medium": require("../assets/fonts/Urbanist-Medium.ttf"),
    "Urbanist-SemiBold": require("../assets/fonts/Urbanist-SemiBold.ttf"),
    "Urbanist-Light": require("../assets/fonts/Urbanist-Light.ttf"),
    "Urbanist-ExtraLight": require("../assets/fonts/Urbanist-ExtraLight.ttf"),
    "Urbanist-Black": require("../assets/fonts/Urbanist-Black.ttf"),
    "MuseoModerno-Regular": require("../assets/fonts/MuseoModerno-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Simple timeout to ensure minimum loading time
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      console.log('Safety timeout reached, navigating to landing');
      router.replace('/landing');
    }, 5000);

    return () => clearTimeout(safetyTimer);
  }, [router]);

  // Navigate when ready
  useEffect(() => {
    if (!isReady || !fontsLoaded || !globalContext) return;
    
    try {
      if (user) {
        router.replace('/(root)/(tabs)');
      } else {
        router.replace('/landing');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to landing screen
      router.replace('/landing');
    }
  }, [isReady, fontsLoaded, user, router, globalContext]);

  // Show loading state while not ready
  if (!isReady || !fontsLoaded || !globalContext) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Image
          source={require('../assets/icon/loading-icon.png')}
          style={{ width: 160, height: 160 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // This should never render as we navigate above
  return null;
} 