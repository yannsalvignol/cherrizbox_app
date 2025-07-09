import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

const LoadingScreen = () => {
  const router = useRouter();
  const { user, isStreamConnected, posts, imagesPreloaded } = useGlobalContext();
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    // Wait until user is loaded and images are preloaded
    if (user === undefined || (user && !imagesPreloaded)) return;

    const timer = setTimeout(() => {
      if (user) {
        router.replace('/(root)/(tabs)');
      } else {
        router.replace('/sign-up');
      }
    }, 500); // Shorter delay now that preloading is handled
    return () => clearTimeout(timer);
  }, [router, user, imagesPreloaded]);

  // Update loading text based on connection status and preloading
  useEffect(() => {
    if (user && imagesPreloaded) {
      setLoadingText('Ready!');
    } else if (user && posts.length > 0 && !imagesPreloaded) {
      setLoadingText('Preloading images...');
    } else if (user && isStreamConnected) {
      setLoadingText('Loading content...');
    } else if (user) {
      setLoadingText('Connecting...');
    } else {
      setLoadingText('Loading...');
    }
  }, [user, isStreamConnected, posts.length, imagesPreloaded]);

  return (
    <ImageBackground
      source={require('../assets/images/cherry.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.textRow}>
          <Text style={styles.cherrizbox}>Cherrizbox</Text>
          <Text style={styles.dot}>.</Text>
        </View>
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: '66%',
    width: '100%',
    alignItems: 'center',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cherrizbox: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'questrial',
  },
  dot: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white', // purple dot
    fontFamily: 'questrial',
    marginLeft: 2,
    marginBottom: 2,
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'questrial',
    marginTop: 10,
    opacity: 0.8,
  },
});

export default LoadingScreen;
