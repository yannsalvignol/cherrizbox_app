import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ImageBackground, StyleSheet, Text, View } from 'react-native';

const LoadingScreen = () => {
  const router = useRouter();
  const { user, isStreamConnected, posts, imagesPreloaded, postsLoaded, loading, creators } = useGlobalContext();
  const [loadingText, setLoadingText] = useState('Initializing...');
  const dotAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
  const logoAnimation = useRef(new Animated.Value(0)).current;

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

  // Elegant logo bouncing animation
  useEffect(() => {
    const animateLogo = () => {
      Animated.sequence([
        Animated.timing(logoAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Restart animation after a short delay
        setTimeout(animateLogo, 1000);
      });
    };

    animateLogo();
  }, []);

  // Netflix-like loading animation
  useEffect(() => {
    const animateDots = () => {
      const animations = dotAnimations.map((anim, index) => {
        return Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.stagger(200, animations).start(() => {
        // Restart animation after a short delay
        setTimeout(animateDots, 500);
      });
    };

    animateDots();
  }, []);

  // Get active creators count for channel setup status
  const activeCreatorsCount = creators.filter(c => c.status === 'active').length;

  // Interpolate logo animation values
  const logoScale = logoAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const logoTranslateY = logoAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  return (
    <ImageBackground
      source={require('../assets/images/cherry.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.textRow}>
          <Animated.Text 
            style={[
              styles.cherrizbox,
              {
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateY }
                ]
              }
            ]}
          >
            cherrizbox
          </Animated.Text>
        </View>
        
        {/* Netflix-like loading animation */}
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.dot, { opacity: dotAnimations[0] }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnimations[1] }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnimations[2] }]} />
        </View>
        
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
    color: 'white',
    fontFamily: 'MuseoModerno-Regular',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FD6F3E',
    marginHorizontal: 4,
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
