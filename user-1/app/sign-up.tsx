import { checkIfEmailIsCreator, checkIfUserExists, createUser, ensureUserDocument, login, loginWithApple, sendVerificationEmailViaFunction, SignIn } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorRetryAction, setErrorRetryAction] = useState<(() => void) | null>(null);

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

        setIsSubmitting(true);

        try {
            // Check if email is a creator first
            console.log(`🔍 [handleSendVerification] Checking if email is creator`);
            const isCreator = await checkIfEmailIsCreator(form.email);
            if (isCreator) {
                console.log(`❌ [handleSendVerification] Email is creator - blocking signup`);
                Alert.alert(
                    'Account Already Exists',
                    'You already have an account on Cherrizbox app. You need to use a different address to use Cherrizbox Pro.',
                    [{ text: 'OK' }]
                );
                setIsSubmitting(false);
                return;
            }

            // Check if user already exists
            console.log(`🔍 [handleSendVerification] Checking if user already exists`);
            const userCheck = await checkIfUserExists(form.email, form.username);
            if (userCheck.exists) {
                console.log(`❌ [handleSendVerification] User already exists:`, userCheck.type);
                const message = userCheck.type === 'email' 
                    ? 'An account with this email address already exists. Please use a different email or try logging in instead.'
                    : 'This username is already taken. Please choose a different username.';
                
                Alert.alert(
                    'Account Already Exists',
                    message,
                    [
                        { text: 'Try Login', onPress: () => router.push('/log-in') },
                        { text: 'OK', style: 'cancel' }
                    ]
                );
                setIsSubmitting(false);
                return;
            }

            console.log(`✅ [handleSendVerification] User checks passed, moving to verification screen`);
            
            // Generate verification code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedCode(code);
            console.log(`🔢 [handleSendVerification] Generated verification code: ${code}`);
            
            // Immediately show verification screen
            setVerificationSent(true);
            setTimer(600); // Reset timer
            setResendButtonDisabled(true);
            setIsSubmitting(false);
            
            // Send email in the background
            console.log(`📧 [handleSendVerification] Sending email in background...`);
            sendVerificationEmailViaFunction(form.email, code)
                .then(() => {
                    console.log(`✅ [handleSendVerification] Email sent successfully in background`);
                })
                .catch((error) => {
                    console.log(`❌ [handleSendVerification] Background email failed:`, error);
                    // Show a subtle notification that email failed, but don't block the user
                    Alert.alert(
                        'Email Issue', 
                        'There was an issue sending the verification email. You can try resending it.',
                        [{ text: 'OK' }]
                    );
                });
            
        } catch (error) {
            console.log(`❌ [handleSendVerification] Process failed:`, error);
            setIsSubmitting(false);
            setErrorRetryAction(() => handleSendVerification);
            setShowErrorModal(true);
        }
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
            
            // Reset navigation stack and navigate to welcome animation
            router.dismissAll();
            router.replace('/welcome-animation');
        } catch (error) {
            console.log('❌ [handleVerifyAndCreateAccount] Account creation failed:', error);
            
            if (error instanceof Error && error.message.includes('A user with the same id, email, or phone already exists')) {
                // Show specific alert for duplicate user
                Alert.alert(
                    'Account Already Exists',
                    'An account with this email address already exists. Please try logging in instead.',
                    [
                        { text: 'Try Login', onPress: () => router.push('/log-in') },
                        { text: 'OK', style: 'cancel' }
                    ]
                );
            } else {
                // Show custom error modal for other errors
                setErrorRetryAction(() => handleVerifyAndCreateAccount);
                setShowErrorModal(true);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogin = async () => {
        try {
            const result = await login();
            if(result){
                await ensureUserDocument();
                refetch();
                
                // Reset navigation stack and navigate to welcome animation
                router.dismissAll();
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
            console.log('[Apple Sign-Up] Starting Apple Authentication...');
            
            // Check if Apple Authentication is available
            const isAvailable = await AppleAuthentication.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Apple Sign-In Not Available', 'Apple Sign-In is not available on this device.');
                return;
            }

            // Request Apple Authentication
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            console.log('[Apple Sign-Up] Apple credential received:', {
                user: credential.user,
                email: credential.email,
                fullName: credential.fullName,
                authorizationCode: !!credential.authorizationCode
            });

            if (!credential.authorizationCode) {
                throw new Error('No authorization code received from Apple');
            }

            // Extract name information
            const firstName = credential.fullName?.givenName || '';
            const lastName = credential.fullName?.familyName || '';

            console.log('[Apple Sign-Up] Calling Dart function with authorization code...');
            
            // Call our updated loginWithApple function with the authorization code
            const result = await loginWithApple(credential.authorizationCode, firstName, lastName);
            
            if(result){
                await ensureUserDocument();
                refetch();
                
                // Reset navigation stack and navigate to welcome animation
                router.dismissAll();
                router.replace('/welcome-animation');
            } else{
                console.log('Apple Login Failed');
            }
        } catch (error: any) {
            if (error?.code === 'ERR_REQUEST_CANCELED') {
                console.log('Apple Sign-In was canceled by user');
                return;
            }
            
            if (error?.message === "CREATOR_EMAIL_BLOCKED") {
                router.push('/email-exists-error');
            } else {
                console.log('Apple Login Failed:', error);
            }
        }
    };

    const handleRetry = () => {
        setShowErrorModal(false);
        if (errorRetryAction) {
            errorRetryAction();
        }
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
        setErrorRetryAction(null);
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
        <View className="flex-1 bg-white">
            {/* Custom Error Modal */}
            <Modal visible={showErrorModal} transparent animationType="fade">
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <View style={{
                        width: '85%',
                        maxWidth: 350,
                        backgroundColor: '#1A1A1A',
                        borderRadius: 20,
                        padding: 24,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10
                    }}>
                        {/* Error Icon */}
                        <View style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: '#FD6F3E',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 16
                        }}>
                            <Text style={{ fontSize: 28, color: 'white' }}>⚠️</Text>
                        </View>
                        
                        {/* Title */}
                        <Text style={{
                            color: 'white',
                            fontSize: 20,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            marginBottom: 8
                        }}>
                            Connection Issue
                        </Text>
                        
                        {/* Message */}
                        <Text style={{
                            color: '#B0B0B0',
                            fontSize: 16,
                            textAlign: 'center',
                            lineHeight: 22,
                            marginBottom: 24
                        }}>
                            Unable to complete registration due to poor network connection. Please check your internet and try again.
                        </Text>
                        
                        {/* Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#333',
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center'
                                }}
                                onPress={handleCloseErrorModal}
                            >
                                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#FD6F3E',
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center'
                                }}
                                onPress={handleRetry}
                            >
                                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                                    Try Again
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView contentContainerStyle={{}}>
                <View className="px-2 pt-20">
                    <TouchableOpacity onPress={() => verificationSent && setVerificationSent(false)} className="absolute top-4 left-4 z-10">
                        {verificationSent && <Ionicons name="arrow-back" size={24} color="black" />}
                    </TouchableOpacity>
                    
                    {verificationSent ? (
                        <View className="items-center">
                            <Text className="text-black font-['Urbanist-Bold'] text-3xl mt-12 text-center">Verify Your Email</Text>
                            <Text className="text-gray-500 font-['Urbanist-Regular'] text-base mt-4 text-center">
                                We've sent a 6-digit code to {form.email}. Please enter it below.
                            </Text>
                            <Text className="text-gray-400 font-['Urbanist-Regular'] text-sm mt-2 text-center">
                                Don't see it? Check your spam or junk folder.
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
                                className={`w-full bg-[#FD6F3E] py-5 rounded-full mt-12 ${isSubmitting ? 'opacity-50' : ''}`}
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
                                    <Text className={`font-['Urbanist-Bold'] ml-2 ${resendButtonDisabled || timer > 0 ? 'text-gray-400' : 'text-[#FD6F3E]'}`}>
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
                    <View style={{ marginTop: 20 }}>
                        <FormField 
                            title="Username" 
                            value={form.username}
                            handleChangeText={(text) => setForm({ ...form, username: text })}
                        />
                    </View>
                    
                    <View style={{ marginTop: -5 }}>
                        <FormField 
                            title="Email" 
                            value={form.email}
                            handleChangeText={(text) => setForm({ ...form, email: text })}
                            keyboardType="email-address" 
                        />
                    </View>
                    
                    <View style={{ marginTop: -5 }}>
                        <FormField 
                            title="Password" 
                            value={form.password}
                            handleChangeText={(text) => setForm({ ...form, password: text })}
                            secureTextEntry
                            disableAutofill
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlur={() => setIsPasswordFocused(false)}
                        />
                        <PasswordCriteria password={form.password} isFocused={isPasswordFocused} />
                    </View>
                    
                    <View style={{ marginTop: -5 }}>
                        <FormField 
                            title="Confirm Password" 
                            value={form.confirmPassword}
                            handleChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                            secureTextEntry
                            disableAutofill
                        />
                    </View>
                    <TouchableOpacity 
                        className={`w-full bg-[#FD6F3E] py-6 rounded-full mt-10 ${isSubmitting ? 'opacity-50' : ''}`}
                                onPress={handleSendVerification}
                        disabled={isSubmitting}
                    >
                        <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'Urbanist-Light', fontSize: 20 }}>
                                    {isSubmitting ? 'Sending Code...' : 'Register'}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center justify-center mt-10">
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

                    <View className="flex-row justify-center items-center mt-6">
                        <Text className="text-black font-['Urbanist-Bold']">
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/log-in')}>
                            <Text className="text-[#FD6F3E] font-['Urbanist-Bold']">
                                Login Now
                            </Text>
                        </TouchableOpacity>
                    </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    
});

export default App;
