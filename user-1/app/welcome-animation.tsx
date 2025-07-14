import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Platform, Text, Vibration, View } from 'react-native';
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
    const [isReady, setIsReady] = useState(false);

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
                    setIsReady(true);
                });
            });
        };

        startAnimation();
    }, []);

    // Check if content is ready and dismiss animation
    useEffect(() => {
        if (isReady && postsLoaded && imagesPreloaded) {
            // Final vibration
            triggerVibration([0, 100]);
            
            // Navigate immediately
            router.replace('/(root)/(tabs)');
            
            // Fade out overlay
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
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
                    <Animated.View
                        style={{
                            transform: [{ scale: logoScale }],
                            opacity: logoOpacity,
                            alignItems: 'center',
                            marginBottom: 40,
                        }}
                    >
                        <Image
                            source={require('../assets/images/cherry-icon.png')}
                            style={{
                                width: 120,
                                height: 120,
                                borderRadius: 20,
                                backgroundColor: 'white',
                            }}
                            resizeMode="contain"
                        />
                    </Animated.View>

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
                        
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
                            <Text style={{
                                fontSize: 40,
                                fontWeight: 'bold',
                                color: 'white',
                                fontFamily: 'questrial',
                            }}>
                                Cherrizbox
                            </Text>
                            <Text style={{
                                fontSize: 40,
                                fontWeight: 'bold',
                                color: '#FB2355',
                                fontFamily: 'questrial',
                                marginLeft: 2,
                                marginBottom: 2,
                            }}>
                                .
                            </Text>
                        </View>

                        <Text style={{
                            fontSize: 18,
                            color: '#FB2355',
                            fontFamily: 'Urbanist-Medium',
                            textAlign: 'center',
                            opacity: 0.8,
                        }}>
                            Your content is ready! 🎉
                        </Text>
                        
                        {/* Show channel setup status if creators are loaded */}
                        {creators.length > 0 && (
                            <Text style={{
                                fontSize: 14,
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontFamily: 'Urbanist-Regular',
                                textAlign: 'center',
                                marginTop: 16,
                            }}>
                                Setting up {creators.filter(c => c.status === 'active').length} creator channels...
                            </Text>
                        )}
                    </Animated.View>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
} 