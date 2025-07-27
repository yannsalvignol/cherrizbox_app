import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignIn, login, loginWithApple } from '../lib/appwrite';
import FormField from './components/FormField';

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

    const handleLogin = async () => {
        const result = await login();
        if(result){
            await refetch();
            router.replace('/(root)/(tabs)');
        } else{
            console.log('Login Failed');
        }
    };

    const handleAppleLogin = async () => {
        const result = await loginWithApple();
        if(result){
            await refetch();
            router.replace('/(root)/(tabs)');
        } else {
            console.log('Apple Login Failed');
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
            router.replace('/(root)/(tabs)');
        } catch (error: any) {
            setError('Invalid email or password');
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
                    {/* Custom password input with eye icon */}
                    <View className="mt-7 flex-row items-center bg-[#ECECEC] rounded-lg">
                        <TextInput
                            placeholder="Password"
                            value={form.password}
                            onChangeText={(e) => setForm({ ...form, password: e })}
                            className="flex-1 px-5 py-6 font-['Urbanist-Regular']"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry={!showPassword}
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
                        <Text style={{ color: '#ef4444' }} className="mt-2 text-center font-['Urbanist-SemiBold']">
                            {error}
                        </Text>
                    ) : null}
                    
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
                            {isSubmitting ? 'Signing in...' : 'Login'}
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
