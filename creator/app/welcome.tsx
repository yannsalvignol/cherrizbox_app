import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '../lib/global-provider';

const WelcomeScreen = () => {
    const router = useRouter();
    const { user, preloadProfileData } = useGlobalContext();
    const logoAnimation = useRef(new Animated.Value(0)).current;
    const textAnimation = useRef(new Animated.Value(0)).current;
    const dot1Animation = useRef(new Animated.Value(0)).current;
    const dot2Animation = useRef(new Animated.Value(0)).current;
    const dot3Animation = useRef(new Animated.Value(0)).current;
    
    const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
    const [preloadCompleted, setPreloadCompleted] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        // Set minimum display time
        const minimumTimer = setTimeout(() => {
            if (isMounted) {
                setMinimumTimeElapsed(true);
            }
        }, 2000); // 2 seconds minimum display time

        // Preload profile data early if user is logged in
        if (user) {
            console.log('  [Welcome] Preloading profile data during welcome screen');
            preloadProfileData()
                .then(() => {
                    if (isMounted) {
                        console.log(' [Welcome] Profile data preloading completed');
                        setPreloadCompleted(true);
                    }
                })
                .catch(error => {
                    if (isMounted) {
                        console.error('   [Welcome] Error preloading profile data:', error);
                        setPreloadCompleted(true); // Continue anyway
                    }
                });
        } else {
            setPreloadCompleted(true); // No user, no need to preload
        }

        // Start logo animation immediately
        Animated.loop(
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
            ])
        ).start();

        // Start text fade in after 1 second delay
        const textTimer = setTimeout(() => {
            Animated.timing(textAnimation, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }).start();
        }, 1000);

        // Start loading dots animation after 1.5 seconds
        const dotsTimer = setTimeout(() => {
            // Animate dots in sequence
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dot1Animation, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot2Animation, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot3Animation, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.parallel([
                        Animated.timing(dot1Animation, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(dot2Animation, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(dot3Animation, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            ).start();
        }, 1500);

        return () => {
            isMounted = false;
            clearTimeout(minimumTimer);
            clearTimeout(textTimer);
            clearTimeout(dotsTimer);
        };
    }, [user]); // Removed preloadProfileData from dependencies to prevent infinite loop

    // Navigate when both minimum time has elapsed and preloading is complete
    useEffect(() => {
        if (minimumTimeElapsed && preloadCompleted) {
            console.log('  [Welcome] Minimum time elapsed and preload completed, navigating...');
            router.replace('/(root)/(tabs)');
        }
    }, [minimumTimeElapsed, preloadCompleted, router]);

    const logoTranslateY = logoAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    const logoScale = logoAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1],
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Animated Logo */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            transform: [
                                { translateY: logoTranslateY },
                                { scale: logoScale },
                            ],
                        },
                    ]}
                >
                    <Image
                        source={require('./../assets/icon/loading-icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Welcome Text */}
                <Animated.View
                    style={[
                        styles.textContainer,
                        {
                            opacity: textAnimation,
                        },
                    ]}
                >
                    <Text style={styles.welcomeText} allowFontScaling={false}>Welcome to</Text>
                    <Text style={styles.cherrizboxText} allowFontScaling={false}>cherrizbox</Text>
                </Animated.View>

                {/* Loading Dots */}
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingDots}>
                        <Animated.View 
                            style={[
                                styles.dot, 
                                styles.dot1,
                                {
                                    opacity: dot1Animation,
                                    transform: [{
                                        scale: dot1Animation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.5, 1],
                                        }),
                                    }],
                                }
                            ]} 
                        />
                        <Animated.View 
                            style={[
                                styles.dot, 
                                styles.dot2,
                                {
                                    opacity: dot2Animation,
                                    transform: [{
                                        scale: dot2Animation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.5, 1],
                                        }),
                                    }],
                                }
                            ]} 
                        />
                        <Animated.View 
                            style={[
                                styles.dot, 
                                styles.dot3,
                                {
                                    opacity: dot3Animation,
                                    transform: [{
                                        scale: dot3Animation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.5, 1],
                                        }),
                                    }],
                                }
                            ]} 
                        />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    logoContainer: {
        marginBottom: 40,
    },
    logo: {
        width: 120,
        height: 120,
        borderRadius: 20,
        shadowColor: '#FD6F3E',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    welcomeText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Urbanist-Regular',
        marginBottom: 8,
    },
    cherrizboxText: {
        color: '#FFFFFF',
        fontSize: 36,
        fontFamily: 'MuseoModerno-Regular',
        marginBottom: 16,
    },
    subtitleText: {
        color: '#888888',
        fontSize: 16,
        fontFamily: 'Urbanist-Regular',
    },
    loadingContainer: {
        marginTop: 40,
    },
    loadingDots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FD6F3E',
        marginHorizontal: 4,
    },
    dot1: {
        opacity: 0,
    },
    dot2: {
        opacity: 0,
    },
    dot3: {
        opacity: 0,
    },
});

export default WelcomeScreen; 