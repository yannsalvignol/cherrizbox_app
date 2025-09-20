import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { getCreatorIdByName, getCurrentUser, getUserSubscriptions } from '../../lib/appwrite';
import { useGlobalContext } from '../../lib/global-provider';
import { createDirectMessageChannel, initializeStreamChatOnPaymentSuccess, preSetupChannels } from '../../lib/stream-chat';

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
  // Detail rows animations
  const detailRow1Opacity = useRef(new Animated.Value(0)).current;
  const detailRow1Slide = useRef(new Animated.Value(30)).current;
  const detailRow2Opacity = useRef(new Animated.Value(0)).current;
  const detailRow2Slide = useRef(new Animated.Value(30)).current;
  const detailRow3Opacity = useRef(new Animated.Value(0)).current;
  const detailRow3Slide = useRef(new Animated.Value(30)).current;
  // Floating particles
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;
  const particle4 = useRef(new Animated.Value(0)).current;
  const [logoCentered, setLogoCentered] = useState(false);

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
        // Start staggered detail row animations
        Animated.stagger(400, [
          Animated.parallel([
            Animated.timing(detailRow1Opacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.spring(detailRow1Slide, {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(detailRow2Opacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.spring(detailRow2Slide, {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(detailRow3Opacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.spring(detailRow3Slide, {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
        
        // Start floating particles animation
        const startParticleAnimation = (particle: Animated.Value, delay: number) => {
          Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(particle, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(particle, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
              }),
            ])
          ).start();
        };
        
        startParticleAnimation(particle1, 0);
        startParticleAnimation(particle2, 800);
        startParticleAnimation(particle3, 1600);
        startParticleAnimation(particle4, 2400);
      });
      
      // Background processing starts here
      (async () => {
          // Initialize Stream Chat and refresh data during animation completion
          console.log('🔄 Initializing Stream Chat and refreshing data during animation...');
          
          try {
            // Get current user for Stream Chat initialization
            const user = await getCurrentUser();
            if (user) {
              console.log('🎉 Initializing Stream Chat after successful payment...');
              await initializeStreamChatOnPaymentSuccess(user.$id);
              
              // Push notifications are now handled automatically in stream-chat.ts during connection
              
              // Set up channels for ALL active subscriptions (like the global provider does)
              console.log('🚀 Setting up channels for all active subscriptions...');
              try {
                // Get fresh subscription data
                const userSubscriptions = await getUserSubscriptions(user.$id);
                const activeCreatorIds = userSubscriptions
                  .filter(sub => sub.status === 'active' && (!sub.endsAt || new Date(sub.endsAt) > new Date()))
                  .map(sub => sub.creatorId)
                  .filter(id => id && id !== user.$id); // Filter out invalid IDs and self
                
                if (activeCreatorIds.length > 0) {
                  console.log('📋 Setting up channels for active creators:', activeCreatorIds);
                  
                  // Pre-setup channels for all active creators (like global provider does)
                  await preSetupChannels(user.$id, activeCreatorIds);
                  console.log('✅ All channels pre-setup completed');
                  
                  // Verify specific DM channel for the creator from this payment exists
                  const creatorNameStr = Array.isArray(creatorName) ? creatorName[0] : creatorName;
                  if (creatorNameStr) {
                    try {
                      const specificCreatorId = await getCreatorIdByName(creatorNameStr);
                      if (specificCreatorId && specificCreatorId !== user.$id && activeCreatorIds.includes(specificCreatorId)) {
                        console.log('✅ Payment creator channel already set up during pre-setup phase');
                        // No need to create again - preSetupChannels already handled this
                      } else if (specificCreatorId && specificCreatorId !== user.$id) {
                        console.log('💬 Creating direct message channel for payment creator (not in active list)...');
                        await createDirectMessageChannel(user.$id, specificCreatorId);
                        console.log('✅ Direct message channel created for payment creator');
                      }
                    } catch (dmError) {
                      console.error('❌ Error with specific DM channel:', dmError);
                      // Don't throw - not critical
                    }
                  }
                } else {
                  console.log('⚠️ No active creators found for channel setup');
                }
              } catch (channelError) {
                console.error('❌ Error setting up channels:', channelError);
                // Don't throw - continue with data refresh
              }
            }

            // Refresh posts and creators
            await Promise.all([refreshPosts(), refreshCreators()]);
            console.log('✅ Stream Chat initialization, channel setup, and data refresh completed');
            
            // Simple navigation
            router.replace('/(root)/(tabs)');
          } catch (error) {
            console.error('❌ Error during Stream Chat initialization or data refresh:', error);
            // Still navigate away even if initialization fails
            router.replace('/(root)/(tabs)');
          }
        })();
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

  // Particle animations
  const particle1Y = particle1.interpolate({
    inputRange: [0, 1],
    outputRange: [height, -100],
  });
  const particle1Opacity = particle1.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });
  const particle2Y = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [height, -100],
  });
  const particle2Opacity = particle2.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });
  const particle3Y = particle3.interpolate({
    inputRange: [0, 1],
    outputRange: [height, -100],
  });
  const particle3Opacity = particle3.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });
  const particle4Y = particle4.interpolate({
    inputRange: [0, 1],
    outputRange: [height, -100],
  });
  const particle4Opacity = particle4.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });



  return (
    <View style={styles.container}>
      {/* Animated background gradient with app colors */}
      <LinearGradient
        colors={['#191A1D', '#FD6F3E', '#191A1D']}
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

      {/* Floating particles */}
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.1,
            opacity: particle1Opacity,
            transform: [{ translateY: particle1Y }],
          },
        ]}
      >
        <Ionicons name="diamond" size={12} color="rgba(255, 215, 0, 0.8)" />
      </Animated.View>
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.8,
            opacity: particle2Opacity,
            transform: [{ translateY: particle2Y }],
          },
        ]}
      >
        <Ionicons name="star" size={10} color="rgba(253, 111, 62, 0.8)" />
      </Animated.View>
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.3,
            opacity: particle3Opacity,
            transform: [{ translateY: particle3Y }],
          },
        ]}
      >
        <Ionicons name="heart" size={8} color="rgba(255, 215, 0, 0.6)" />
      </Animated.View>
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.7,
            opacity: particle4Opacity,
            transform: [{ translateY: particle4Y }],
          },
        ]}
      >
        <Ionicons name="sparkles" size={14} color="rgba(253, 111, 62, 0.7)" />
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
            colors={['#FD6F3E', '#FFD700']}
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
        {/* Success details with staggered animations */}
        <View style={styles.detailsContainer}>
          <Animated.View 
            style={[
              styles.detailRow,
              {
                opacity: detailRow1Opacity,
                transform: [{ translateY: detailRow1Slide }],
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={20} color="#18C07A" />
            <Text style={styles.detailText}>Payment processed securely</Text>
          </Animated.View>
          <Animated.View 
            style={[
              styles.detailRow,
              {
                opacity: detailRow2Opacity,
                transform: [{ translateY: detailRow2Slide }],
              },
            ]}
          >
            <Ionicons name="time" size={20} color="#FAFAFA" />
            <Text style={styles.detailText}>Access granted immediately</Text>
          </Animated.View>
          <Animated.View 
            style={[
              styles.detailRow,
              {
                opacity: detailRow3Opacity,
                transform: [{ translateY: detailRow3Slide }],
              },
            ]}
          >
            <Ionicons name="notifications" size={20} color="#FFFF00" />
            <Text style={styles.detailText}>Confirmation sent to your email</Text>
          </Animated.View>
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
  particle: {
    position: 'absolute',
    zIndex: 1,
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
    shadowColor: '#FD6F3E',
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
    shadowColor: '#FD6F3E',
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