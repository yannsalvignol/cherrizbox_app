import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = () => {
    const router = useRouter();
    const logoAnimation = useRef(new Animated.Value(0)).current;
    const textAnimation = useRef(new Animated.Value(0)).current;
    const dot1Animation = useRef(new Animated.Value(0)).current;
    const dot2Animation = useRef(new Animated.Value(0)).current;
    const dot3Animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
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

        // Navigate to main app after 4 seconds total
        const navigationTimer = setTimeout(() => {
            router.replace('/(root)/(tabs)');
        }, 4000);

        return () => {
            clearTimeout(textTimer);
            clearTimeout(dotsTimer);
            clearTimeout(navigationTimer);
        };
    }, []);

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
                    <Text style={styles.welcomeText}>Welcome to</Text>
                    <Text style={styles.cherrizboxText}>cherrizbox</Text>
                    <Text style={styles.subtitleText}>Loading your experience...</Text>
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
        shadowColor: '#FB2355',
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
        backgroundColor: '#FB2355',
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