import { completePasswordRecovery } from '@/lib/appwrite';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from './components/FormField';

const PasswordReset = () => {
    const router = useRouter();
    const { userId, secret } = useLocalSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in both fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }
        if (typeof userId !== 'string' || typeof secret !== 'string') {
            Alert.alert('Error', 'Invalid reset link. Please try again.');
            return;
        }

        setIsSubmitting(true);
        try {
            await completePasswordRecovery(userId, secret, password);
            Alert.alert(
                'Success',
                'Your password has been reset successfully. Please log in.',
                [{ text: 'OK', onPress: () => router.replace('/log-in') }]
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
            Alert.alert('Error', `Failed to reset password: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 px-4 py-8 justify-center">
                <Text className="text-black font-['Urbanist-Bold'] text-4xl">
                    Reset Your Password
                </Text>
                <Text className="text-gray-500 font-['Urbanist-Regular'] text-lg mt-2 mb-8">
                    Please enter your new password below.
                </Text>
                
                <FormField 
                    title="New Password" 
                    value={password} 
                    handleChangeText={setPassword}
                    otherStyles="mt-4"
                    secureTextEntry
                />
                <FormField 
                    title="Confirm New Password" 
                    value={confirmPassword} 
                    handleChangeText={setConfirmPassword}
                    otherStyles="mt-4"
                    secureTextEntry
                />
                
                <TouchableOpacity 
                    className={`w-full bg-[#FB2355] py-5 rounded-full mt-10 ${isSubmitting ? 'opacity-50' : ''}`}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'Urbanist-SemiBold', fontSize: 18 }}>
                        {isSubmitting ? 'Resetting...' : 'Set New Password'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace('/log-in')} className="mt-6">
                    <View className="flex-row items-center justify-center">
                        <Ionicons name="arrow-back" size={16} color="#6B7280" />
                        <Text className="text-gray-500 font-['Urbanist-Regular'] text-base ml-2">
                            Back to Login
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default PasswordReset; 