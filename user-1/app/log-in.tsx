import { useGlobalContext } from '@/lib/global-provider';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignIn, login } from '../lib/appwrite';
import FormField from './components/FormField';

const LoginScreen = () => {
    const router = useRouter();
    const { refetch, preloadCommonImages } = useGlobalContext();
    const [form, setForm] = useState({
        email: '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async () => {
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
    };

    const submit = async () => {
        if (!form.email || !form.password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setIsSubmitting(true);
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
            console.error('Login error:', error);
            Alert.alert('Error', error.message || 'Login failed');
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
                        handleChangeText={(e: string) => setForm({...form, email: e})} 
                        otherStyles="mt-7" 
                        keyboardType="email-address" 
                    />
                    <FormField 
                        title="Password" 
                        value={form.password} 
                        handleChangeText={(e: string) => setForm({...form, password: e})} 
                        otherStyles="mt-7" 
                    />
                    
                    <TouchableOpacity 
                        className="self-end mt-2"
                        onPress={() => router.push('/forgot_password_loged_out')}
                    >
                        <Text className="text-[#FB2355] font-['Urbanist-Bold']">
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        className={`w-full bg-[#FB2355] py-6 rounded-full mt-7 ${isSubmitting ? 'opacity-50' : ''}`}
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

                    <View className="flex-row items-center mt-4 px-4">
                        <View className="w-24 mr-10">
                            <TouchableOpacity>
                                <Image 
                                    source={require('../assets/images/facebook.png')}
                                    className="w-32 h-32"
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>
                        <View className="w-24 mr-10">
                            <TouchableOpacity onPress={handleLogin}>
                                <Image 
                                    source={require('../assets/images/google.png')}
                                    className="w-32 h-32"
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>
                        <View className="w-24">
                            <TouchableOpacity>
                                <Image 
                                    source={require('../assets/images/apple.png')}
                                    className="w-32 h-32"
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row justify-center items-center mt-1">
                        <Text className="text-black font-['Urbanist-Bold']">
                            Don't have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/sign-up')}>
                            <Text className="text-[#FB2355] font-['Urbanist-Bold']">
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
