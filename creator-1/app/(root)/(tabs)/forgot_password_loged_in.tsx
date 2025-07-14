import { useGlobalContext } from "@/lib/global-provider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    codeBasedPasswordReset,
    logout,
    verifyCodeAndResetPassword
} from "../../../lib/appwrite";
import FormField from "../../components/FormField";
import OtpInput from "../../components/OtpInput";

const PasswordCriteria = ({ password, isFocused }: { password: string; isFocused: boolean }) => {
  if (!isFocused) return null;

  const criteria = [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains capital letter', met: /[A-Z]/.test(password) },
      { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  return (
      <View className="mt-2 bg-gray-800 p-3 rounded-lg">
          <Text className="text-sm font-['Urbanist-Bold'] text-gray-300 mb-2">Password Requirements:</Text>
          {criteria.map((criterion, index) => (
              <View key={index} className="flex-row items-center mt-1">
                  {criterion.met ? (
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={{ marginRight: 8 }} />
                  ) : (
                      <Ionicons name="close-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                  )}
                  <Text className={`text-sm font-['Urbanist-Regular'] ${criterion.met ? 'text-green-400' : 'text-red-400'}`}>
                      {criterion.label}
                  </Text>
              </View>
          ))}
      </View>
  );
};

const ForgotPasswordLoggedIn = () => {
  const { user, refetch } = useGlobalContext();
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [email, setEmail] = useState(user?.email || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleRequestCode = async () => {
    if (!email) {
      setError("Your email address could not be found.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await codeBasedPasswordReset(email);
      setStep(2);
    } catch (e: any) {
      setError(e.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      if (!user?.email) throw new Error("User email not found.");
      await verifyCodeAndResetPassword(user.email, code);
      setStep(3); // Move to password creation step
    } catch (e: any) {
      setError(e.message || "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    refetch(); // Update global state
    router.replace('/sign-up');
  }

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    const hasMinLength = password.length >= 8;
    const hasCapitalLetter = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasMinLength || !hasCapitalLetter || !hasSpecialChar) {
        setError("Password does not meet security requirements.");
        return;
    }

    setIsLoading(true);
    setError("");
    try {
      if (!user?.email) throw new Error("User email not found.");
      await verifyCodeAndResetPassword(user.email, code, password);
      setShowSuccessModal(true);
    } catch (e: any) {
      setError(
        e.message || "Failed to reset password. Please check your code."
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStepInfo = () => {
    switch (step) {
      case 1:
        return {
          title: "Change Password",
          subtitle: "We'll send a verification code to your registered email address.",
        };
      case 2:
        return {
          title: "Check Your Email",
          subtitle: `We've sent a 6-digit code to ${email}.`,
        };
      case 3:
        return {
          title: "Create New Password",
          subtitle: "Your new password must be different from previous ones.",
        };
      default:
        return { title: "", subtitle: "" };
    }
  };

  const { title, subtitle } = getStepInfo();

    return (
    <SafeAreaView className="bg-black flex-1">
      {!showSuccessModal && (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="absolute top-0 left-0 z-10 p-2"
            >
              <Ionicons name="chevron-back" size={32} color="white" />
            </TouchableOpacity>

            <View className="w-full mt-24">
              <Text className="text-white font-['Urbanist-Bold'] text-3xl">
                {title}
              </Text>
              <Text className="text-gray-400 font-['Urbanist-Regular'] text-base mt-3 mb-8">
                {subtitle}
              </Text>
            </View>

            {error ? (
              <Text style={{ color: '#ef4444' }} className="mb-4 text-center font-['Urbanist-SemiBold']">
                {error}
              </Text>
            ) : null}

            {step === 1 && (
              <>
                <FormField
                  title="Email Address"
                  value={email}
                  editable={false}
                  handleChangeText={() => {}}
                />
                <TouchableOpacity
                  onPress={handleRequestCode}
                  className="w-full bg-[#FB2355] py-4 rounded-full mt-8"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: 'white' }} className="text-center font-['Urbanist-Bold'] text-lg">
                      Send Code
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <OtpInput 
                  code={code}
                  setCode={setCode}
                />
                <TouchableOpacity
                  onPress={handleVerifyCode}
                  className="w-full bg-[#FB2355] py-4 rounded-full mt-8"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: 'white' }} className="text-center font-['Urbanist-Bold'] text-lg">
                      Verify
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <FormField
                  title="New Password"
                  value={password}
                  handleChangeText={(text: string) => setPassword(text)}
                  secureTextEntry
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
                <PasswordCriteria password={password} isFocused={isPasswordFocused} />
                    <FormField 
                  title="Confirm New Password"
                  value={confirmPassword}
                  handleChangeText={(text: string) => setConfirmPassword(text)}
                  otherStyles="mt-4"
                  secureTextEntry
                    />
                    <TouchableOpacity 
                  onPress={handleResetPassword}
                  className="w-full bg-[#FB2355] py-4 rounded-full mt-8"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: 'white' }} className="text-center font-['Urbanist-Bold'] text-lg">
                      Reset Password
                        </Text>
                  )}
                    </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={handleLogout}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-4/5 p-8 rounded-2xl items-center shadow-lg">
            <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
            <Text className="text-2xl font-['Urbanist-Bold'] mt-4 text-black">
              Success!
            </Text>
            <Text className="text-base font-['Urbanist-Regular'] text-gray-600 mt-2 text-center">
              Your password has been changed. You will now be logged out.
                        </Text>
            <TouchableOpacity
              onPress={handleLogout}
              className="w-full bg-[#FB2355] py-3 rounded-full mt-8"
            >
              <Text style={{ color: 'white' }} className="text-center font-['Urbanist-Bold'] text-lg">
                Log Out
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
      </Modal>

        </SafeAreaView>
    );
};

export default ForgotPasswordLoggedIn;