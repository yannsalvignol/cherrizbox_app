import { useGlobalContext } from '@/lib/global-provider';
import * as Font from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';

const LoadingScreen = () => {
  const router = useRouter();
  const { user, isStreamConnected } = useGlobalContext();

  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  
  // Animation for background zoom
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  // Start background zoom animation
  useEffect(() => {
    const zoomAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    
    zoomAnimation.start();
    
    return () => zoomAnimation.stop();
  }, [scaleAnimation]);

  // Preload assets and restore connection state early for faster startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Start all initialization tasks in parallel
        const initTasks = [];
        
        // Task 1: Restore Stream Chat connection state
        initTasks.push((async () => {
          try {
            const { restoreConnectionState, preloadStreamConnection } = await import('@/lib/stream-chat');
            const restored = await restoreConnectionState();
            
            if (restored.isValid && restored.userId) {
              await preloadStreamConnection(restored.userId);
            }
          } catch (error) {
            console.log('Could not restore connection state:', error);
          }
        })());
        
        // Task 2: Preload critical images
        initTasks.push((async () => {
          try {
            // Use direct paths instead of require for better Metro compatibility
            const imageUrls = [
              Image.resolveAssetSource(require('../assets/images/cherry-icon.png')).uri,
              Image.resolveAssetSource(require('../assets/icon/search.png')).uri,
              Image.resolveAssetSource(require('../assets/icon/settings.png')).uri,
              Image.resolveAssetSource(require('../assets/icon/logout.png')).uri,
              Image.resolveAssetSource(require('../assets/icon/edit.png')).uri,
              Image.resolveAssetSource(require('../assets/icon/ok.png')).uri,
              Image.resolveAssetSource(require('../assets/icon/cross.png')).uri,
              Image.resolveAssetSource(require('../assets/icon/pdf.png')).uri,
            ];
            
            await Promise.all(
              imageUrls.filter(url => url).map(url => Image.prefetch(url))
            );
            console.log('✅ Images preloaded');
          } catch (error) {
            console.log('Image preload error:', error);
            // Don't fail if images can't be preloaded
          }
        })());
        
        // Task 3: Load custom fonts
        initTasks.push((async () => {
          try {
            await Font.loadAsync({
              'questrial': require('../assets/fonts/Questrial-Regular.ttf'),
              'MuseoModerno-Regular': require('../assets/fonts/MuseoModerno-Regular.ttf'),
              'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
              'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
              'Nunito-SemiBold': require('../assets/fonts/Nunito-SemiBold.ttf'),
              'Urbanist-Regular': require('../assets/fonts/Urbanist-Regular.ttf'),
              'Urbanist-Bold': require('../assets/fonts/Urbanist-Bold.ttf'),
              'Urbanist-SemiBold': require('../assets/fonts/Urbanist-SemiBold.ttf'),
              'Urbanist-Medium': require('../assets/fonts/Urbanist-Medium.ttf'),
            });
            console.log('✅ Fonts loaded');
          } catch (error) {
            console.log('Font loading error:', error);
            // Don't fail if fonts can't be loaded
          }
        })());
        
        // Wait for all tasks to complete
        await Promise.allSettled(initTasks);
        setAssetsLoaded(true);
        
      } catch (error) {
        console.log('Initialization error:', error);
        setAssetsLoaded(true); // Continue anyway
      }
    };
    
    initializeApp();
  }, []);

  // Set minimum display time for splash (UX consideration)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, 500); // Reduced from 1000ms to 500ms
    return () => clearTimeout(timer);
  }, []);

      // Navigate when user state is determined, minimum time elapsed, AND assets loaded
  useEffect(() => {
    if (user === undefined || !minimumTimeElapsed || !assetsLoaded) return;
    
    // Navigate immediately when ready
    if (user) {
      router.replace('/(root)/(tabs)');
    } else {
      router.replace('/landing');
    }
  }, [router, user, isStreamConnected, minimumTimeElapsed, assetsLoaded]);



  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.backgroundContainer,
          {
            transform: [{ scale: scaleAnimation }],
          },
        ]}
      >
        <ImageBackground
          source={require('../assets/images/cherry.png')}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>
      <View style={styles.overlay}>
        <View style={styles.textRow}>
          <Text style={styles.cherrizbox}>Cherrizbox</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: '66%',
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cherrizbox: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'MuseoModerno-Regular',
  },
});

export default LoadingScreen;
