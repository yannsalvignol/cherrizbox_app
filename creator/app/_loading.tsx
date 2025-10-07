import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const LoadingScreen = () => {
  const router = useRouter();
  const globalContext = useGlobalContext();
  const user = globalContext?.user;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simple timeout to ensure minimum loading time
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

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
    if (!isReady || !globalContext) return;
    
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
  }, [isReady, user, router, globalContext]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/icon/loading-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
});

export default LoadingScreen;