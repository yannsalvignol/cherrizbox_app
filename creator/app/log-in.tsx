import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignIn, login, loginWithApple } from '../lib/appwrite';

const LoginScreen = () => {
    const router = useRouter();
    const { refetch } = useGlobalContext();
    const [form, setForm] = useState({
        email: '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);
    
    // Animation refs for double spinning wheels
    const outerSpinValue = useRef(new Animated.Value(0)).current;
    const innerSpinValue = useRef(new Animated.Value(0)).current;

    // Start/stop spinning animations
    useEffect(() => {
        if (isAppleLoading) {
            // Outer wheel - clockwise
            const outerSpin = Animated.loop(
                Animated.timing(outerSpinValue, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                { iterations: -1 }
            );

            // Inner wheel - counterclockwise (faster)
            const innerSpin = Animated.loop(
                Animated.timing(innerSpinValue, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                { iterations: -1 }
            );

            outerSpin.start();
            innerSpin.start();

            return () => {
                outerSpin.stop();
                innerSpin.stop();
            };
        } else {
            // Reset animations when not loading
            outerSpinValue.setValue(0);
            innerSpinValue.setValue(0);
        }
    }, [isAppleLoading]);

    // Create rotation interpolations
    const outerRotation = outerSpinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const innerRotation = innerSpinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'], // Counter-clockwise
    });

    // Double Spinning Wheels Component
    const DoubleSpinningWheels = () => (
        <View style={{ position: 'relative', width: 32, height: 32, marginRight: 12 }}>
            {/* Loading icon in center */}
            <View style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
            }}>
                <Image
                    source={require('../assets/icon/loading-icon.png')}
                    style={{ width: 20, height: 20 }}
                    resizeMode="contain"
                />
            </View>
            
            {/* Outer spinning wheel */}
            <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 32,
                height: 32,
                transform: [{ rotate: outerRotation }],
                zIndex: 1,
            }}>
                <View style={{
                    width: 32,
                    height: 32,
                    borderWidth: 1.5,
                    borderColor: 'transparent',
                    borderTopColor: '#FFF',
                    borderRightColor: '#FFF',
                    borderRadius: 16,
                }} />
            </Animated.View>
            
            {/* Inner spinning wheel */}
            <Animated.View style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: 24,
                height: 24,
                transform: [{ rotate: innerRotation }],
                zIndex: 2,
            }}>
                <View style={{
                    width: 24,
                    height: 24,
                    borderWidth: 1.5,
                    borderColor: 'transparent',
                    borderBottomColor: '#FFF',
                    borderLeftColor: '#FFF',
                    borderRadius: 12,
                }} />
            </Animated.View>
        </View>
    );

    const handleLogin = async () => {
        try {
            const result = await login();
            if (result === true) {
                await refetch();
                router.dismissAll();
                router.replace('/welcome');
            } else if (result && typeof result === 'object' && result.error === 'EMAIL_EXISTS_IN_USER_COLLECTION') {
                router.dismissAll();
                router.replace('/email-exists-error');
            } else {
                console.log('Login Failed');
            }
        } catch (error: any) {
            if (error.message === 'EMAIL_EXISTS_IN_USER_COLLECTION') {
                router.dismissAll();
                router.replace('/email-exists-error');
            } else {
                console.log('Login Failed:', error);
            }
        }
    };

    const handleAppleLogin = async () => {
        try {
            setIsAppleLoading(true);
            
            // Check if Apple Authentication is available
            const isAvailable = await AppleAuthentication.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'Apple Sign In is not available on this device');
                return;
            }

            // Perform Apple Sign In
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            console.log('Apple credential:', credential);

            // Extract the authorization code
            if (!credential.authorizationCode) {
                Alert.alert('Error', 'No authorization code received from Apple');
                return;
            }

            // Call your backend function with the authorization code
            const result = await loginWithApple(
                credential.authorizationCode,
                credential.fullName?.givenName || undefined,
                credential.fullName?.familyName || undefined
            );

            if (result === true) {
                await refetch();
                router.dismissAll();
                router.replace('/welcome');
            } else if (result && typeof result === 'object' && result.error === 'EMAIL_EXISTS_IN_USER_COLLECTION') {
                router.dismissAll();
                router.replace('/email-exists-error');
            } else {
                console.log('Apple Login Failed');
            }
        } catch (error: any) {
            if (error.code === 'ERR_CANCELED') {
                // User canceled the sign-in flow
                console.log('Apple Sign In was canceled');
                return;
            }
            
            if (error.message === 'EMAIL_EXISTS_IN_USER_COLLECTION') {
                router.dismissAll();
                router.replace('/email-exists-error');
            } else {
                console.log('Apple Login Failed:', error);
                Alert.alert('Error', 'Apple Sign In failed. Please try again.');
            }
        } finally {
            setIsAppleLoading(false);
        }
    };

    const submit = async () => {
        if (!form.email || !form.password) {
            setError('Please fill in all fields');
            return;
        }

        setError(''); // Clear any previous errors
        try {
            setIsSubmitting(true);
            await SignIn(form.email, form.password);
            await refetch(); // Refresh the global state to update login status
            router.dismissAll();
            router.replace('/welcome');
        } catch (error: any) {
            if (error.message === 'EMAIL_EXISTS_IN_USER_COLLECTION') {
                router.dismissAll();
                router.replace('/email-exists-error');
            } else {
                setError('Invalid email or password');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView>
                <View className="flex-1 px-4">
                    <Text 
                        className="text-black font-['Urbanist-Bold'] text-4xl mt-[50px]"
                        allowFontScaling={false}
                    >    
                        Welcome back! Glad to see you, Again!
                    </Text>
                    
                    {/* Email field */}
                    <View className="mt-7 flex-row items-center bg-[#ECECEC] rounded-lg">
                        <TextInput
                            placeholder="Email"
                            value={form.email}
                            onChangeText={(e) => setForm({ ...form, email: e })}
                            className="flex-1 px-5 py-6 font-['Urbanist-Regular']"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            allowFontScaling={false}
                        />
                    </View>
                    {/* Custom password input with eye icon */}
                    <View className="mt-7 flex-row items-center bg-[#ECECEC] rounded-lg">
                        <TextInput
                            placeholder="Password"
                            value={form.password}
                            onChangeText={(e) => setForm({ ...form, password: e })}
                            className="flex-1 px-5 py-6 font-['Urbanist-Regular']"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry={!showPassword}
                            allowFontScaling={false}
                        />
                        <TouchableOpacity
                            className="px-4"
                            onPress={() => setShowPassword((prev) => !prev)}
                        >
                            <Image
                                source={showPassword ? require('../assets/icon/eye_hide.png') : require('../assets/icon/eye.png')}
                                className="w-6 h-6"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                    {error ? (
                        <Text 
                            style={{ color: '#ef4444' }} 
                            className="mt-2 text-center font-['Urbanist-SemiBold']"
                            allowFontScaling={false}
                        >
                            {error}
                        </Text>
                    ) : null}
                    
                    <TouchableOpacity 
                        className="self-end mt-2"
                        onPress={() => router.push('/forgot_password_loged_out')}
                    >
                        <Text 
                            className="text-[#FD6F3E] font-['Urbanist-Bold']"
                            allowFontScaling={false}
                        >
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        className={`w-full bg-[#FD6F3E] py-6 rounded-full mt-7 ${isSubmitting ? 'opacity-50' : ''}`}
                        onPress={submit}
                        disabled={isSubmitting}
                    >
                        <Text 
                            style={{ color: 'white', textAlign: 'center', fontFamily: 'Urbanist-Light', fontSize: 20 }}
                            allowFontScaling={false}
                        >
                            {isSubmitting ? 'Signing in...' : 'Login'}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center justify-center mt-7">
                        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} />
                        <Text 
                            style={{ color: '#9CA3AF', fontFamily: 'Urbanist-Bold', marginHorizontal: 16 }}
                            allowFontScaling={false}
                        >
                            Or login with
                        </Text>
                        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} />
                    </View>

                    {/* Social Login Buttons */}
                    <View className="mt-4 px-2 w-full">
                        {/* Google */}
                        <TouchableOpacity 
                            onPress={handleLogin}
                            activeOpacity={0.8}
                            className="flex-row items-center justify-center bg-white py-4 rounded-3xl w-full mb-4 px-6 border border-gray-300"
                        >
                            <Ionicons name="logo-google" size={24} color="#000" style={{ marginRight: 12 }} />
                            <Text 
                                style={{ color: '#000', fontFamily: 'Urbanist-Bold', fontSize: 16 }}
                                allowFontScaling={false}
                            >
                                Continue with Google
                            </Text>
                        </TouchableOpacity>

                        {/* Apple */}
                        <TouchableOpacity 
                            onPress={handleAppleLogin}
                            activeOpacity={0.8}
                            className={`flex-row items-center justify-center py-4 rounded-3xl w-full px-6 border border-black ${isAppleLoading ? 'opacity-90' : ''}`}
                            style={{ backgroundColor: '#000' }}
                            disabled={isAppleLoading}
                        >
                            {isAppleLoading ? (
                                <DoubleSpinningWheels />
                            ) : (
                                <Ionicons name="logo-apple" size={24} color="#FFF" style={{ marginRight: 12 }} />
                            )}
                            <Text 
                                style={{ color: '#FFF', fontFamily: 'Urbanist-Bold', fontSize: 16 }}
                                allowFontScaling={false}
                            >
                                {isAppleLoading ? 'Signing in...' : 'Continue with Apple'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center items-center mt-1">
                        <Text 
                            className="text-black font-['Urbanist-Bold']"
                            allowFontScaling={false}
                        >
                            Don't have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/landing')}>
                            <Text 
                                className="text-[#FD6F3E] font-['Urbanist-Bold']"
                                allowFontScaling={false}
                            >
                                Register Now
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({});

export default LoginScreen;
