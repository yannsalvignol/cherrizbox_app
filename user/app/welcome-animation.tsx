import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function WelcomeAnimation() {
    const router = useRouter();
    const { user, postsLoaded, imagesPreloaded, creators } = useGlobalContext();
    
    // Simplified animation values
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const welcomeOpacity = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(1)).current;
    const loadingBarWidth = useRef(new Animated.Value(0)).current;
    const loadingBarOpacity = useRef(new Animated.Value(0)).current;
    const [isReady, setIsReady] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // iOS-compatible vibration function
    const triggerVibration = (pattern?: number | number[]) => {
        if (Platform.OS === 'ios') {
            if (pattern) {
                Vibration.vibrate(pattern);
            } else {
                Vibration.vibrate();
            }
        } else {
            if (pattern) {
                Vibration.vibrate(pattern);
            } else {
                Vibration.vibrate(100);
            }
        }
    };

    useEffect(() => {
        // Start simple animation sequence
        const startAnimation = () => {
            // Initial vibration
            triggerVibration([0, 100]);

            // Logo appears with scale and opacity
            Animated.parallel([
                Animated.timing(logoScale, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Welcome text appears after logo
                Animated.timing(welcomeOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    triggerVibration([0, 50]);
                    
                    // Show loading bar after welcome text
                    Animated.timing(loadingBarOpacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        // Start smooth loading animation
                        startSmoothLoading();
                    });
                    
                    setIsReady(true);
                });
            });
        };

        startAnimation();
    }, []);

    // Smooth loading animation function
    const startSmoothLoading = () => {
        let currentProgress = 0;
        
        progressInterval.current = setInterval(() => {
            if (currentProgress < 95) {
                // Simulate realistic loading with variable speed
                const increment = Math.random() * 3 + 0.5; // Random between 0.5-3.5
                currentProgress = Math.min(currentProgress + increment, 95);
                
                setLoadingProgress(Math.round(currentProgress));
                
                // Animate loading bar width
                Animated.timing(loadingBarWidth, {
                    toValue: currentProgress,
                    duration: 150,
                    useNativeDriver: false,
                }).start();
            }
        }, 100); // Update every 100ms
    };

    // Clean up interval
    useEffect(() => {
        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, []);

    // Check if content is ready and complete loading
    useEffect(() => {
        if (isReady && postsLoaded && imagesPreloaded) {
            // Complete the loading bar quickly
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
            
            // Animate to 100% completion
            setLoadingProgress(100);
            Animated.timing(loadingBarWidth, {
                toValue: 100,
                duration: 300,
                useNativeDriver: false,
            }).start(() => {
                // Final vibration
                triggerVibration([0, 100]);
                
                // Short delay to show completion, then navigate
                setTimeout(() => {
                    router.replace('/(root)/(tabs)');
                    
                    // Fade out overlay
                    Animated.timing(overlayOpacity, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }).start();
                }, 300);
            });
        }
    }, [isReady, postsLoaded, imagesPreloaded]);

    return (
        <Animated.View 
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'black',
                zIndex: 9999,
                opacity: overlayOpacity,
            }}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
                <View 
                    style={{
                        flex: 1,
                        backgroundColor: 'black',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    {/* Logo */}
                    <Animated.Image
                        source={require('../assets/icon/loading-icon.png')}
                        style={{
                            width: 120,
                            height: 120,
                            marginBottom: 40,
                            transform: [{ scale: logoScale }],
                            opacity: logoOpacity,
                        }}
                        resizeMode="contain"
                    />

                    {/* Welcome Text */}
                    <Animated.View
                        style={{
                            opacity: welcomeOpacity,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{
                            fontSize: 32,
                            fontWeight: 'bold',
                            color: 'white',
                            fontFamily: 'questrial',
                            textAlign: 'center',
                            marginBottom: 8,
                        }}>
                            Welcome to
                        </Text>
                        
                        <Text style={{
                            fontSize: 40,
                            color: 'white',
                            fontFamily: 'MuseoModerno-Regular',
                            marginBottom: 16,
                        }}>
                            Cherrizbox
                        </Text>

           
                        
                        {/* Aesthetic Loading Bar */}
                        <Animated.View
                            style={{
                                opacity: loadingBarOpacity,
                                marginTop: 24,
                                marginBottom: 16,
                                width: 240,
                                alignItems: 'center',
                            }}
                        >
                            {/* Loading Bar Background */}
                            <View
                                style={{
                                    width: '100%',
                                    height: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Loading Bar Fill */}
                                <Animated.View
                                    style={{
                                        height: '100%',
                                        backgroundColor: 'white',
                                        borderRadius: 2,
                                        width: loadingBarWidth.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%'],
                                        }),
                                        shadowColor: 'white',
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.5,
                                        shadowRadius: 4,
                                    }}
                                />
                            </View>
                            
                            {/* Progress Percentage */}
                            <Text style={{
                                fontSize: 12,
                                color: 'rgba(255, 255, 255, 0.8)',
                                fontFamily: 'Urbanist-Regular',
                                marginTop: 8,
                                letterSpacing: 0.5,
                            }}>
                                {Math.round(loadingProgress)}%
                            </Text>
                        </Animated.View>

                        {/* Show initialization status based on subscriptions */}
                        {creators.length > 0 ? (
                            <Text style={{
                                fontSize: 14,
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontFamily: 'Urbanist-Regular',
                                textAlign: 'center',
                            }}>
                                {creators.filter(c => c.status === 'active').length > 0 
                                    ? `Setting up ${creators.filter(c => c.status === 'active').length} creator channels...`
                                    : 'Loading your content...'
                                }
                            </Text>
                        ) : (
                            <Text style={{
                                fontSize: 14,
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontFamily: 'Urbanist-Regular',
                                textAlign: 'center',
                            }}>
                                Loading your content...
                            </Text>
                        )}
                    </Animated.View>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
} 