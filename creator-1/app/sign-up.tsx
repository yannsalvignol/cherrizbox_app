import { createUser, login, loginWithApple, sendVerificationEmail, SignIn } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    const { refetch, loading, isLogged } = useGlobalContext();
    const { socialMedia, socialMediaUsername, socialMediaNumber } = useLocalSearchParams();
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
    const [resendDisabled, setResendDisabled] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [verificationError, setVerificationError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (verificationSent && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setResendDisabled(false);
        }
        return () => clearInterval(interval);
    }, [verificationSent, timer]);

    const handleSendVerification = async () => {
        if (!form.username || !form.email || !form.password || !form.confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (form.password !== form.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        const hasMinLength = form.password.length >= 8;
        const hasCapitalLetter = /[A-Z]/.test(form.password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(form.password);

        if (!hasMinLength || !hasCapitalLetter || !hasSpecialChar) {
            Alert.alert('Error', 'Password does not meet security requirements.');
            return;
        }

        // Check if social media information is present
        if (!socialMedia || !socialMediaUsername || !socialMediaNumber) {
            Alert.alert('Error', 'Social media information is required. Please start from the beginning.');
            router.replace('/landing');
            return;
        }

        setIsSubmitting(true);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        
        const { success } = await sendVerificationEmail(form.email, code);

        if (success) {
            setVerificationSent(true);
            setTimer(600); // Reset timer
            setResendDisabled(true);
        } else {
            Alert.alert('Error', 'Could not send verification email. Please try again.');
        }
        setIsSubmitting(false);
    };

    const handleVerifyAndCreateAccount = async () => {
        if (verificationCode !== generatedCode) {
            setVerificationError('Invalid verification code. Please try again.');
            return;
        }
        setVerificationError(''); // Clear error on successful check
        setIsSubmitting(true);
        try {
            await createUser(
                form.email, 
                form.password, 
                form.username, 
                socialMedia as string, 
                socialMediaUsername as string,
                socialMediaNumber as string
            );
            await SignIn(form.email, form.password);
            refetch();
            router.replace('/welcome');
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
        // Check if social media information is present
        if (!socialMedia || !socialMediaUsername || !socialMediaNumber) {
            Alert.alert('Error', 'Social media information is required. Please start from the beginning.');
            router.replace('/landing');
            return;
        }

        const result = await login(socialMedia as string, socialMediaUsername as string, socialMediaNumber as string);
        if(result){
            refetch();
            router.replace('/welcome');
        } else{
            console.log('Login Failed');
        }
    };

    const handleAppleLogin = async () => {
        // Check if social media information is present
        if (!socialMedia || !socialMediaUsername || !socialMediaNumber) {
            Alert.alert('Error', 'Social media information is required. Please start from the beginning.');
            router.replace('/landing');
            return;
        }

        const result = await loginWithApple(socialMedia as string, socialMediaUsername as string, socialMediaNumber as string);
        if(result){
            refetch();
            router.replace('/welcome');
        } else {
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
    
    if (!loading && isLogged) return <Redirect href="/(root)/(tabs)" />;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start' }}>
                <View className="flex-1 px-4 pt-8">
                    
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
                                <TouchableOpacity onPress={handleSendVerification} disabled={resendDisabled || timer > 0}>
                                    <Text className={`font-['Urbanist-Bold'] ml-2 ${resendDisabled || timer > 0 ? 'text-gray-400' : 'text-[#FB2355]'}`}>
                                        Resend {timer > 0 ? `(${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text className="text-black font-['Urbanist-Bold'] text-4xl mt-4">    
                                Hello! Register to Cherrizbox <Text style={{ color: '#FB2355' }}>Creator</Text>.
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
                            {/* Password field with eye icon */}
                            <View className="mt-7 flex-row items-center bg-[#ECECEC] rounded-lg">
                                <TextInput
                                    placeholder="Password"
                                    value={form.password}
                                    onChangeText={(text) => setForm({ ...form, password: text })}
                                    className="flex-1 px-5 py-6 font-['Urbanist-Regular']"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={!showPassword}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    textContentType="newPassword"
                                    autoComplete="new-password"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    spellCheck={false}
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
                            <PasswordCriteria password={form.password} isFocused={isPasswordFocused} />
                            {/* Confirm Password field with eye icon */}
                            <View className="mt-7 flex-row items-center bg-[#ECECEC] rounded-lg">
                                <TextInput
                                    placeholder="Confirm Password"
                                    value={form.confirmPassword}
                                    onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                                    className="flex-1 px-5 py-6 font-['Urbanist-Regular']"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={!showConfirmPassword}
                                    textContentType="oneTimeCode"
                                    autoComplete="one-time-code"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    spellCheck={false}
                                />
                                <TouchableOpacity
                                    className="px-4"
                                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                                >
                                    <Image
                                        source={showConfirmPassword ? require('../assets/icon/eye_hide.png') : require('../assets/icon/eye.png')}
                                        className="w-6 h-6"
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            </View>
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


                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({});

export default App;
