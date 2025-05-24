import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from './components/FormField';

const ForgotPassword = () => {
    const router = useRouter();
    const [form, setForm] = useState({
        email: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        console.log('Send Code button pressed');
        // Logic will be added later
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView>
                <View className="flex-1 px-4">
                    <Text className="text-black font-['Urbanist-Bold'] text-4xl mt-[50px]">    
                        Forgot Password?
                    </Text>
                    <Text className="text-gray-500 font-['Urbanist-Bold'] text-lg mt-2">
                        Don't worry! It occurs. Please enter the email address linked with your account.
                    </Text>
                    
                    <FormField 
                        title="Enter your email" 
                        value={form.email} 
                        handleChangeText={(text: string) => setForm({...form, email: text})} 
                        otherStyles="mt-7" 
                        keyboardType="email-address" 
                    />
                    
                    <TouchableOpacity 
                        className={`w-full bg-[#FB2355] py-6 rounded-full mt-7 ${isSubmitting ? 'opacity-50' : ''}`}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'Urbanist-Light', fontSize: 20 }}>
                            {isSubmitting ? 'Sending...' : 'Send Code'}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-center items-center mt-7">
                        <Text className="text-black font-['Urbanist-Bold']">
                            Remember Password?{' '}
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

export default ForgotPassword;
