import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignIn, login, loginWithApple } from '../lib/appwrite';
import FormField from './components/FormField';

const LoginScreen = () => {
    const router = useRouter();
    const { refetch, preloadCommonImages } = useGlobalContext();
    const [form, setForm] = useState({
        email: '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        try {
            const result = await login();
            if(result){
                // Start preloading common images in the background during login
                const preloadPromise = preloadCommonImages();
                
                await refetch();
                
                // Wait for image preloading to complete (with a timeout to avoid blocking)
                try {
                    await Promise.race([
                        preloadPromise,
                        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
                    ]);
                } catch (error) {
                    console.log('Image preloading during login completed or timed out');
                }
                
                router.replace('/welcome-animation');
            } else{
                console.log('Login Failed');
            }
        } catch (error: any) {
            if (error?.message === "CREATOR_EMAIL_BLOCKED") {
                router.push('/email-exists-error');
            } else {
                console.log('Login Failed:', error);
            }
        }
    };

    const handleAppleLogin = async () => {
        try {
            const result = await loginWithApple();
            if(result){
                const preloadPromise = preloadCommonImages();
                await refetch();
                try {
                    await Promise.race([
                        preloadPromise,
                        new Promise(resolve => setTimeout(resolve, 5000))
                    ]);
                } catch (error) {
                    console.log('Image preloading during login completed or timed out');
                }
                router.replace('/welcome-animation');
            } else{
                console.log('Apple Login Failed');
            }
        } catch (error: any) {
            if (error?.message === "CREATOR_EMAIL_BLOCKED") {
                router.push('/email-exists-error');
            } else {
                console.log('Apple Login Failed:', error);
            }
        }
    };

    const submit = async () => {
        if (!form.email || !form.password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(''); // Clear previous errors
            await SignIn(form.email, form.password);
            
            // Start preloading common images in the background during login
            const preloadPromise = preloadCommonImages();
            
            await refetch(); // Refresh the global state to update login status
            
            // Wait for image preloading to complete (with a timeout to avoid blocking)
            try {
                await Promise.race([
                    preloadPromise,
                    new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
                ]);
            } catch (error) {
                console.log('Image preloading during login completed or timed out');
            }
            
            router.replace('/welcome-animation');
        } catch (error: any) {
            if (error?.message === "CREATOR_EMAIL_BLOCKED") {
                router.push('/email-exists-error');
            } else {
                setError('Invalid credentials. Please check your email and password.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView>
                <View className="flex-1 px-4">
                    <Text className="text-black font-['Urbanist-Bold'] text-4xl mt-[50px]">    
                        Welcome back! Glad to see you, Again!
                    </Text>
                    
                    <FormField 
                        title="Email" 
                        value={form.email} 
                        handleChangeText={(e: string) => {
                            setForm({...form, email: e});
                            setError('');
                        }} 
                        otherStyles="mt-7" 
                        keyboardType="email-address" 
                    />
                    <FormField 
                        title="Password" 
                        value={form.password} 
                        handleChangeText={(e: string) => {
                            setForm({...form, password: e});
                            setError('');
                        }} 
                        otherStyles="mt-7" 
                    />
                    
                    {error ? (
                        <Text style={{ color: '#ef4444' }} className="mt-2 text-center font-['Urbanist-SemiBold']">
                            {error}
                        </Text>
                    ) : null}

                    <TouchableOpacity 
                        className="self-end mt-2"
                        onPress={() => router.push('/forgot_password_loged_out')}
                    >
                        <Text className="text-[#FD6F3E] font-['Urbanist-Bold']">
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        className={`w-full bg-[#FD6F3E] py-6 rounded-full mt-7 ${isSubmitting ? 'opacity-50' : ''}`}
                        onPress={submit}
                        disabled={isSubmitting}
                    >
                        <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'Urbanist-Light', fontSize: 20 }}>
                            {isSubmitting ? 'Signing in & Caching Images...' : 'Login'}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center justify-center mt-7">
                        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} />
                        <Text style={{ color: '#9CA3AF', fontFamily: 'Urbanist-Bold', marginHorizontal: 16 }}>
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
                            <Text style={{ color: '#000', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>
                                Continue with Google
                            </Text>
                        </TouchableOpacity>

                        {/* Apple */}
                        <TouchableOpacity 
                            onPress={handleAppleLogin}
                            activeOpacity={0.8}
                            className="flex-row items-center justify-center py-4 rounded-3xl w-full px-6 border border-black"
                            style={{ backgroundColor: '#000' }}
                        >
                            <Ionicons name="logo-apple" size={24} color="#FFF" style={{ marginRight: 12 }} />
                            <Text style={{ color: '#FFF', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>
                                Continue with Apple
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center items-center mt-1">
                        <Text className="text-black font-['Urbanist-Bold']">
                            Don't have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/sign-up')}>
                            <Text className="text-[#FD6F3E] font-['Urbanist-Bold']">
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
