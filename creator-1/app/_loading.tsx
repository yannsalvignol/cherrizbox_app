import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

const LoadingScreen = () => {
  const router = useRouter();
  const { user, isStreamConnected } = useGlobalContext();
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    // Only navigate after checking user state
    if (user === undefined) return; // still loading
    const timer = setTimeout(() => {
      if (user) {
        router.replace('/(root)/(tabs)');
      } else {
        router.replace('/sign-up');
      }
    }, 1000); // shorter splash for better UX
    return () => clearTimeout(timer);
  }, [router, user]);

  // Update loading text based on connection status
  useEffect(() => {
    if (user && isStreamConnected) {
      setLoadingText('Ready!');
    } else if (user) {
      setLoadingText('Connecting to chat...');
    } else {
      setLoadingText('Loading...');
    }
  }, [user, isStreamConnected]);

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
    color: 'white',
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
