import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Platform, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function WelcomeAnimation() {
    const router = useRouter();
    const { user, postsLoaded, imagesPreloaded } = useGlobalContext();
    
    // Animation values
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoPosition = useRef(new Animated.Value(-200)).current;
    const logoFloat = useRef(new Animated.Value(0)).current;
    const logoPulse = useRef(new Animated.Value(1)).current;
    const welcomeOpacity = useRef(new Animated.Value(0)).current;
    const welcomeScale = useRef(new Animated.Value(0.8)).current;
    const welcomeFloat = useRef(new Animated.Value(0)).current;
    const backgroundOpacity = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(1)).current;
    const dotPulse = useRef(new Animated.Value(1)).current;
    const loadingTextOpacity = useRef(new Animated.Value(0)).current;
    const [loadingText, setLoadingText] = useState('');

    // iOS-compatible vibration function
    const triggerVibration = (pattern?: number | number[]) => {
        if (Platform.OS === 'ios') {
            // iOS vibration patterns
            if (pattern) {
                Vibration.vibrate(pattern);
            } else {
                Vibration.vibrate();
            }
        } else {
            // Android vibration
            if (pattern) {
                Vibration.vibrate(pattern);
            } else {
                Vibration.vibrate(100);
            }
        }
    };

    useEffect(() => {
        let textAnimationCleanup: (() => void) | undefined;

        // Start the animation sequence
        const startAnimation = () => {
            // Initial vibration when animation starts
            triggerVibration([0, 200]);

            // Fade in background
            Animated.timing(backgroundOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Logo flies in from top
            Animated.parallel([
                Animated.timing(logoPosition, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(logoScale, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Vibration when logo lands
                triggerVibration([0, 100]);
            });

            // Welcome text appears after logo
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(welcomeOpacity, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(welcomeScale, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    // Vibration when text appears
                    triggerVibration([0, 50, 50, 50]);
                });
            }, 400);

            // Start continuous floating animations
            setTimeout(() => {
                // Logo floating animation
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(logoFloat, {
                            toValue: -10,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(logoFloat, {
                            toValue: 10,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();

                // Welcome text floating animation
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(welcomeFloat, {
                            toValue: -5,
                            duration: 3000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(welcomeFloat, {
                            toValue: 5,
                            duration: 3000,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();

                // Logo pulse animation
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(logoPulse, {
                            toValue: 1.05,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(logoPulse, {
                            toValue: 1,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();

                // Dot pulse animation
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(dotPulse, {
                            toValue: 1.2,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(dotPulse, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
                
                // Loading text sequence
                const loadingSteps = [
                    "Connecting to servers...",
                    "Encrypting files & channels...",
                    "Warming up the cache...",
                    "Finalizing setup...",
                ];

                let isMounted = true;
                let stepIndex = 0;
                let animation: Animated.CompositeAnimation;

                const runAnimationStep = () => {
                    if (!isMounted) return;

                    setLoadingText(loadingSteps[stepIndex % loadingSteps.length]);
                    stepIndex++;

                    loadingTextOpacity.setValue(0);
                    animation = Animated.sequence([
                        Animated.timing(loadingTextOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.delay(900),
                        Animated.timing(loadingTextOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]);

                    animation.start(({ finished }) => {
                        if (finished && isMounted) {
                            runAnimationStep();
                        }
                    });
                };

                runAnimationStep();
                
                textAnimationCleanup = () => {
                    isMounted = false;
                    animation?.stop();
                };

            }, 1000);

            // Wait for content to be ready and then transition
            setTimeout(() => {
                if (postsLoaded && imagesPreloaded) {
                    // Final vibration before transition - more noticeable pattern
                    triggerVibration([0, 200, 100, 200, 100, 200]);
                    
                    // First, navigate to main screen in background (without animation)
                    router.replace('/(root)/(tabs)');
                    
                    // Then fade out the welcome overlay
                    setTimeout(() => {
                        Animated.sequence([
                            Animated.parallel([
                                Animated.timing(logoScale, {
                                    toValue: 1.2,
                                    duration: 150,
                                    useNativeDriver: true,
                                }),
                                Animated.timing(welcomeScale, {
                                    toValue: 1.2,
                                    duration: 150,
                                    useNativeDriver: true,
                                }),
                            ]),
                            Animated.timing(overlayOpacity, {
                                toValue: 0,
                                duration: 200,
                                useNativeDriver: true,
                            }),
                        ]).start();
                    }, 50); // Small delay to ensure navigation is complete
                }
            }, 3500); // Show animation for 3.5 seconds minimum
        };

        startAnimation();

        return () => {
            if (textAnimationCleanup) {
                textAnimationCleanup();
            }
        };
    }, [postsLoaded, imagesPreloaded]);

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
                <Animated.View 
                    style={{
                        flex: 1,
                        backgroundColor: 'black',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: backgroundOpacity,
                    }}
                >
                    {/* Flying Logo */}
                    <Animated.View
                        style={{
                            transform: [
                                { translateY: logoPosition },
                                { scale: logoScale },
                                { translateY: logoFloat },
                                { scale: logoPulse },
                            ],
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
                            transform: [
                                { scale: welcomeScale },
                                { translateY: welcomeFloat },
                            ],
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
                            <Animated.Text style={{
                                fontSize: 40,
                                fontWeight: 'bold',
                                color: '#FB2355',
                                fontFamily: 'questrial',
                                marginLeft: 2,
                                marginBottom: 2,
                                transform: [{ scale: dotPulse }],
                            }}>
                                .
                            </Animated.Text>
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
                        
                        <Animated.Text style={{
                            fontSize: 16,
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontFamily: 'Urbanist-Regular',
                            marginTop: 30,
                            opacity: loadingTextOpacity,
                        }}>
                            {loadingText}
                        </Animated.Text>
                    </Animated.View>
                </Animated.View>
            </SafeAreaView>
        </Animated.View>
    );
} 