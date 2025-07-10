import { createUser, login, SignIn } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from './components/FormField';



const PasswordCriteria = ({ password, isFocused }: { password: string; isFocused: boolean }) => {
    if (!isFocused) return null;

    const criteria = [
        { label: 'At least 8 characters', met: password.length >= 8 },
        { label: 'Contains capital letter', met: /[A-Z]/.test(password) },
        { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    return (
        <View className="mt-2 bg-gray-50 p-3 rounded-lg">
            <Text className="text-sm font-['Urbanist-Bold'] text-gray-700 mb-2">Password Requirements:</Text>
            {criteria.map((criterion, index) => (
                <View key={index} className="flex-row items-center mt-1">
                    {criterion.met ? (
                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={{ marginRight: 8 }} />
                    ) : (
                        <Ionicons name="close-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                    )}
                    <Text className={`text-sm font-['Urbanist-Regular'] ${criterion.met ? 'text-green-600' : 'text-red-500'}`}>
                        {criterion.label}
                    </Text>
                </View>
            ))}
        </View>
    );
};


const App = () => {
    const router = useRouter();
    const { refetch, loading, isLogged, preloadCommonImages } = useGlobalContext();
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!loading && isLogged) return <Redirect href="/" />;

    const handleSubmit = async () => {
        if (!form.username || !form.email || !form.password || !form.confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (form.password !== form.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        try {
            setIsSubmitting(true);
            
            // Start preloading common images in the background during sign-up
            const preloadPromise = preloadCommonImages();
            
            // Create user account
            await createUser(form.email, form.password, form.username);
            await SignIn(form.email, form.password);
            
            // Wait for image preloading to complete (with a timeout to avoid blocking)
            try {
                await Promise.race([
                    preloadPromise,
                    new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
                ]);
            } catch (error) {
                console.log('Image preloading during sign-up completed or timed out');
            }
            
            refetch();
            router.replace('/welcome-animation');
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Error', 'Failed to create account');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogin = async () => {
        const result = await login();
        if(result){
            refetch();
        } else{
            console.log('Login Failed');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView>
                <View className="flex-1 px-4">
                    <Text className="text-black font-['Urbanist-Bold'] text-4xl mt-[50px]">    
                        Hello! Register to get in the Cherrizbox.
                    </Text>
                    <FormField 
                        title="Username" 
                        value={form.username}
                        handleChangeText={(text) => setForm({ ...form, username: text })}
                        otherStyles="mt-7" 
                    />
                    <FormField 
                        title="Email" 
                        value={form.email}
                        handleChangeText={(text) => setForm({ ...form, email: text })}
                        otherStyles="mt-7" 
                        keyboardType="email-address" 
                    />
                    <FormField 
                        title="Password" 
                        value={form.password}
                        handleChangeText={(text) => setForm({ ...form, password: text })}
                        otherStyles="mt-7"
                    />
                    <FormField 
                        title="Confirm Password" 
                        value={form.confirmPassword}
                        handleChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                        otherStyles="mt-7"
                    />
                    <TouchableOpacity 
                        className={`w-full bg-[#FB2355] py-6 rounded-full mt-7 ${isSubmitting ? 'opacity-50' : ''}`}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'Urbanist-Light', fontSize: 20 }}>
                            {isSubmitting ? 'Creating Account & Caching Images...' : 'Register'}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center justify-center mt-7">
                        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} />
                        <Text style={{ color: '#9CA3AF', fontFamily: 'Urbanist-Bold', marginHorizontal: 16 }}>
                            Or register with
                        </Text>
                        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} />
                    </View>

                    <View className="flex-row items-center justify-between mt-4 px-4">
                        <TouchableOpacity>
                            <Image 
                                source={require('../assets/images/facebook.png')}
                                    className="w-32 h-32"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogin}>
                            <Image 
                                source={require('../assets/images/google.png')}
                                    className="w-32 h-32"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Image 
                                source={require('../assets/images/apple.png')}
                                    className="w-32 h-32"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center items-center mt-1">
                        <Text className="text-black font-['Urbanist-Bold']">
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/log-in')}>
                            <Text className="text-[#FB2355] font-['Urbanist-Bold']">
                                Login Now
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({});

export default App;
