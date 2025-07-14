import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

const LoadingScreen = () => {
  const router = useRouter();
  const { user, isStreamConnected, posts, imagesPreloaded, postsLoaded, loading, creators } = useGlobalContext();
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    // Wait until user is loaded, posts are loaded, and images are preloaded
    if (user === undefined || loading || (user && !postsLoaded) || (user && !imagesPreloaded)) return;

    const timer = setTimeout(() => {
      if (user) {
        router.replace('/(root)/(tabs)');
      } else {
        router.replace('/sign-up');
      }
    }, 500); // Shorter delay now that preloading is handled
    return () => clearTimeout(timer);
  }, [router, user, postsLoaded, imagesPreloaded, loading]);

  // Update loading text based on connection status and preloading
  useEffect(() => {
    if (user && imagesPreloaded && postsLoaded) {
      setLoadingText('Ready!');
    } else if (user && postsLoaded && !imagesPreloaded) {
      setLoadingText('Preloading images...');
    } else if (user && isStreamConnected && !postsLoaded) {
      setLoadingText('Loading posts...');
    } else if (user && isStreamConnected) {
      setLoadingText('Loading content...');
    } else if (user) {
      setLoadingText('Connecting...');
    } else {
      setLoadingText('Loading...');
    }
  }, [user, isStreamConnected, postsLoaded, imagesPreloaded]);

  // Get active creators count for channel setup status
  const activeCreatorsCount = creators.filter(c => c.status === 'active').length;

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
        
        {/* Show channel setup status if user is connected and has active creators */}
        {user && isStreamConnected && activeCreatorsCount > 0 && (
          <Text style={styles.channelText}>
            Setting up {activeCreatorsCount} creator channels...
          </Text>
        )}
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
  channelText: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'questrial',
    marginTop: 8,
    opacity: 0.6,
  },
});

export default LoadingScreen;
