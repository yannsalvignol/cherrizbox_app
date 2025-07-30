import { createUser, ensureUserDocument, login, loginWithApple, sendVerificationEmailViaFunction, SignIn } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from './components/FormField';
import OtpInput from './components/OtpInput';

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
    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [timer, setTimer] = useState(600); // 10 minutes in seconds
    const [resendButtonDisabled, setResendButtonDisabled] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [verificationError, setVerificationError] = useState('');

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (verificationSent && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setResendButtonDisabled(false);
        }
        return () => clearInterval(interval);
    }, [verificationSent, timer]);

    const handleSendVerification = async () => {
        console.log(`📝 [handleSendVerification] Starting verification process`);
        console.log(`📝 [handleSendVerification] Form data:`, { 
            username: form.username, 
            email: form.email, 
            passwordLength: form.password.length,
            confirmPasswordLength: form.confirmPassword.length 
        });
        
        if (!form.username || !form.email || !form.password || !form.confirmPassword) {
            console.log(`❌ [handleSendVerification] Missing required fields`);
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (form.password !== form.confirmPassword) {
            console.log(`❌ [handleSendVerification] Passwords do not match`);
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        const hasMinLength = form.password.length >= 8;
        const hasCapitalLetter = /[A-Z]/.test(form.password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(form.password);

        console.log(`🔍 [handleSendVerification] Password validation:`, {
            hasMinLength,
            hasCapitalLetter,
            hasSpecialChar
        });

        if (!hasMinLength || !hasCapitalLetter || !hasSpecialChar) {
            console.log(`❌ [handleSendVerification] Password does not meet security requirements`);
            Alert.alert('Error', 'Password does not meet security requirements.');
            return;
        }

        console.log(`✅ [handleSendVerification] Form validation passed, generating verification code`);
        setIsSubmitting(true);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        console.log(`🔢 [handleSendVerification] Generated verification code: ${code}`);
        
        try {
            console.log(`📧 [handleSendVerification] Calling email verification function`);
            await sendVerificationEmailViaFunction(form.email, code);
            console.log(`✅ [handleSendVerification] Email verification successful`);
            setVerificationSent(true);
            setTimer(600); // Reset timer
            setResendButtonDisabled(true);
            console.log(`⏰ [handleSendVerification] Timer reset to 600 seconds`);
        } catch (error) {
            console.log(`❌ [handleSendVerification] Email verification failed:`, error);
            if (error instanceof Error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Error', 'Could not send verification email. Please try again.');
            }
        }
        setIsSubmitting(false);
        console.log(`🏁 [handleSendVerification] Process completed`);
    };

    const handleVerifyAndCreateAccount = async () => {
        if (verificationCode !== generatedCode) {
            setVerificationError('Invalid verification code. Please try again.');
            return;
        }
        setVerificationError(''); // Clear error on successful check
        setIsSubmitting(true);
        try {
            const preloadPromise = preloadCommonImages();
            await createUser(form.email, form.password, form.username);
            await SignIn(form.email, form.password);
            
            await Promise.race([
                preloadPromise,
                new Promise(resolve => setTimeout(resolve, 5000))
            ]);
            
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
            await ensureUserDocument();
            refetch();
        } else{
            console.log('Login Failed');
        }
    };

    const handleAppleLogin = async () => {
        const result = await loginWithApple();
        if(result){
            await ensureUserDocument();
            refetch();
        } else{
            console.log('Apple Login Failed');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text>Loading...</Text>
            </View>
        );
    }
    
    if (!loading && isLogged) return <Redirect href="/" />;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
                <View className="px-2 pt-4 pb-8">
                    <TouchableOpacity onPress={() => verificationSent && setVerificationSent(false)} className="absolute top-4 left-4 z-10">
                        {verificationSent && <Ionicons name="arrow-back" size={24} color="black" />}
                    </TouchableOpacity>
                    
                    {verificationSent ? (
                        <View className="items-center">
                            <Text className="text-black font-['Urbanist-Bold'] text-3xl mt-12 text-center">Verify Your Email</Text>
                            <Text className="text-gray-500 font-['Urbanist-Regular'] text-base mt-4 text-center">
                                We've sent a 6-digit code to {form.email}. Please enter it below.
                            </Text>

                            <View className="w-full mt-12">
                                <OtpInput
                                    code={verificationCode}
                                    setCode={(code) => {
                                        setVerificationCode(code);
                                        if (verificationError) setVerificationError('');
                                    }}
                                />
                            </View>

                            {verificationError ? (
                                <Text style={{ color: '#ef4444' }} className="mt-2 text-center font-['Urbanist-SemiBold']">
                                    {verificationError}
                                </Text>
                            ) : null}

                            <TouchableOpacity 
                                className={`w-full bg-[#FB2355] py-5 rounded-full mt-12 ${isSubmitting ? 'opacity-50' : ''}`}
                                onPress={handleVerifyAndCreateAccount}
                                disabled={isSubmitting || verificationCode.length !== 6}
                            >
                                <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'Urbanist-SemiBold', fontSize: 18 }}>
                                    {isSubmitting ? 'Verifying...' : 'Verify & Create Account'}
                                </Text>
                            </TouchableOpacity>

                            <View className="flex-row items-center mt-6">
                                <Text className="text-gray-500 font-['Urbanist-Regular']">Didn't receive a code?</Text>
                                <TouchableOpacity onPress={handleSendVerification} disabled={resendButtonDisabled || timer > 0}>
                                    <Text className={`font-['Urbanist-Bold'] ml-2 ${resendButtonDisabled || timer > 0 ? 'text-gray-400' : 'text-[#FB2355]'}`}>
                                        Resend {timer > 0 ? `(${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                    <Text className="text-black font-['Urbanist-Bold'] text-4xl mt-6">    
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
                                secureTextEntry
                                disableAutofill
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                    />
                            <PasswordCriteria password={form.password} isFocused={isPasswordFocused} />
                    <FormField 
                        title="Confirm Password" 
                        value={form.confirmPassword}
                        handleChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                        otherStyles="mt-7"
                                secureTextEntry
                                disableAutofill
                    />
                    <TouchableOpacity 
                        className={`w-full bg-[#FB2355] py-6 rounded-full mt-7 ${isSubmitting ? 'opacity-50' : ''}`}
                                onPress={handleSendVerification}
                        disabled={isSubmitting}
                    >
                        <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'Urbanist-Light', fontSize: 20 }}>
                                    {isSubmitting ? 'Sending Code...' : 'Register'}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center justify-center mt-7">
                        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} />
                        <Text style={{ color: '#9CA3AF', fontFamily: 'Urbanist-Bold', marginHorizontal: 16 }}>
                            Or register with
                        </Text>
                        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} />
                    </View>

                    {/* Social Sign-Up Buttons */}
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
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/log-in')}>
                            <Text className="text-[#FB2355] font-['Urbanist-Bold']">
                                Login Now
                            </Text>
                        </TouchableOpacity>
                    </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    
});

export default App;
