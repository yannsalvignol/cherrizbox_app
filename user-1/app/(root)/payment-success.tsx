import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { getCreatorIdByName, getCurrentUser } from '../../lib/appwrite';
import { useGlobalContext } from '../../lib/global-provider';
import { createDirectMessageChannel } from '../../lib/stream-chat';

const { width, height } = Dimensions.get('window');

export default function PaymentSuccess() {
  const router = useRouter();
  const navigation = useNavigation();
  const { creatorName } = useLocalSearchParams();
  const { refreshPosts, refreshCreators } = useGlobalContext();
  
  // Animation values for logo movement and scale
  const logoTranslateY = useRef(new Animated.Value(-height * 0.18)).current;
  const logoScale = useRef(new Animated.Value(2.2)).current;
  const logoOpacity = useRef(new Animated.Value(0.13)).current;
  // Animation for the rest of the content
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(40)).current;
  // Other animated values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const [logoCentered, setLogoCentered] = useState(false);
  // Add state for loading the channel
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Log the creator name when component mounts
  useEffect(() => {
    const creatorNameStr = Array.isArray(creatorName) ? creatorName[0] : creatorName;
    console.log('🎯 Payment Success Screen - Creator Name:', creatorNameStr);
  }, [creatorName]);

  useEffect(() => {
    // Disable gestures (swipe back) for this screen
    navigation.setOptions?.({ gestureEnabled: false });
    // Block hardware back button on Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    // Animate logo to center and scale down
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(contentSlide, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        // Fade out the logo as content appears
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setLogoCentered(true);
      // Haptic feedback on iOS at the right moment
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Start pulse and checkmark animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }).start(() => {
        // Refetch data during animation completion
        console.log('🔄 Refreshing posts and creators during animation...');
        Promise.all([refreshPosts(), refreshCreators()]).then(() => {
          console.log('✅ Data refresh completed during animation');
          // Automatically navigate to app tabs after refresh
          router.replace('/(root)/(tabs)');
        }).catch((error) => {
          console.error('❌ Error refreshing data during animation:', error);
          // Still navigate away even if refresh fails
          router.replace('/(root)/(tabs)');
        });
      });
    });
    // Rotate background icons
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Replace the onPress handler for the Continue button:
  const handleContinue = async () => {
    console.log('🚀 Payment success - starting channel creation process...');
    setCreatingChannel(true);
    
    const startTime = Date.now();
    
    try {
      console.log('👤 Getting current user...');
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('No current user found');
      }
      console.log('✅ Current user retrieved:', { userId: user.$id, name: user.name });

      const creatorNameStr = Array.isArray(creatorName) ? creatorName[0] : creatorName;
      if (!creatorNameStr) {
        console.warn('⚠️ No creator name available - skipping channel creation');
        // Data already refreshed during animation, just navigate
        console.log('🏠 Navigating to app tabs...');
        router.replace('/(root)/(tabs)');
        return;
      }
      
      console.log('🎯 Looking up creator ID for:', creatorNameStr);
      const creatorId = await getCreatorIdByName(creatorNameStr);
      if (!creatorId) {
        throw new Error(`Creator ID not found for: ${creatorNameStr}`);
      }
      console.log('✅ Creator ID found:', creatorId);

      // Safety check: prevent creating DM channel with yourself
      if (user.$id === creatorId) {
        console.warn('⚠️ Cannot create DM channel with yourself. Current user and creator are the same.');
        console.log('👤 Current user ID:', user.$id);
        console.log('🎯 Creator ID:', creatorId);
        console.log('📝 Creator name:', creatorNameStr);
        // Data already refreshed during animation, just navigate
        console.log('🏠 Navigating to app tabs...');
        router.replace('/(root)/(tabs)');
        return;
      }

      console.log('💬 Creating direct message channel...');
      console.log('👥 Channel members:', { user1: user.$id, user2: creatorId });
      const channel = await createDirectMessageChannel(user.$id, creatorId);
      console.log('✅ Direct message channel created successfully!');
      console.log('📊 Channel details:', {
        channelId: channel.id,
        channelType: channel.type,
        memberCount: Object.keys(channel.state.members).length
      });

      const totalTime = Date.now() - startTime;
      console.log(`⏱️ Channel creation completed in ${totalTime}ms`);

      // Data already refreshed during animation, just navigate
      console.log('🏠 Navigating to app tabs...');
      router.replace('/(root)/(tabs)');
      
    } catch (err) {
      const totalTime = Date.now() - startTime;
      console.error('❌ Failed to create DM channel:', err);
      console.error('⏱️ Process failed after', totalTime, 'ms');
      console.error('🔍 Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Data already refreshed during animation, just navigate
      console.log('🏠 Navigating to app tabs despite channel creation failure...');
      router.replace('/(root)/(tabs)');
    } finally {
      setCreatingChannel(false);
      console.log('🏁 Channel creation process finished');
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated background gradient with app colors */}
      <LinearGradient
        colors={['#191A1D', '#FB2355', '#191A1D']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating background icons */}
      <Animated.View 
        style={[
          styles.floatingIcon,
          styles.floatingIcon1,
          { transform: [{ rotate: rotateInterpolate }] }
        ]}
      >
        <Ionicons name="card" size={40} color="rgba(255, 215, 0, 0.10)" />
      </Animated.View>
      <Animated.View 
        style={[
          styles.floatingIcon,
          styles.floatingIcon2,
          { transform: [{ rotate: rotateInterpolate }] }
        ]}
      >
        <Ionicons name="shield-checkmark" size={35} color="rgba(255, 215, 0, 0.08)" />
      </Animated.View>
      <Animated.View 
        style={[
          styles.floatingIcon,
          styles.floatingIcon3,
          { transform: [{ rotate: rotateInterpolate }] }
        ]}
      >
        <Ionicons name="checkmark-circle" size={30} color="rgba(255, 215, 0, 0.06)" />
      </Animated.View>

      {/* Animated cherrizbox logo (loading icon) moves to center */}
      <Animated.Image
        source={require('../../assets/icon/loading-icon.png')}
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [
              { translateY: logoTranslateY },
              { scale: logoScale },
            ],
          },
        ]}
        resizeMode="contain"
      />

      {/* Main content appears after logo is centered */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
          },
        ]}
        pointerEvents={logoCentered ? 'auto' : 'none'}
      >
        {/* Success icon with pulse animation */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#FB2355', '#FFD700']}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
              <Ionicons name="checkmark" size={60} color="white" />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
        {/* Success text */}
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>Your subscription is now active</Text>
        {/* Success details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark" size={20} color="#18C07A" />
            <Text style={styles.detailText}>Payment processed securely</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color="#FAFAFA" />
            <Text style={styles.detailText}>Access granted immediately</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="notifications" size={20} color="#FFFF00" />
            <Text style={styles.detailText}>Confirmation sent to your email</Text>
          </View>
        </View>
        {/* Continue button removed */}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logo: {
    position: 'absolute',
    left: width / 2 - 60,
    top: height / 2 - 60,
    width: 120,
    height: 120,
    zIndex: 1,
  },
  floatingIcon: {
    position: 'absolute',
  },
  floatingIcon1: {
    top: height * 0.1,
    right: width * 0.1,
  },
  floatingIcon2: {
    top: height * 0.3,
    left: width * 0.05,
  },
  floatingIcon3: {
    bottom: height * 0.2,
    right: width * 0.15,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 32,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 2,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FB2355',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    color: '#FAFAFA',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'questrial',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#FFD700',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    fontFamily: 'questrial',
  },
  detailsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  detailText: {
    color: '#FFD700',
    fontSize: 16,
    marginLeft: 12,
    fontFamily: 'questrial',
  },
  button: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FB2355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'questrial',
  },
}); 