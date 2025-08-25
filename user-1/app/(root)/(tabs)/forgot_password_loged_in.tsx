import { useGlobalContext } from "@/lib/global-provider";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { useTheme } from "../../../lib/themes/useTheme";
import FormField from "../../components/FormField";
import OtpInput from "../../components/OtpInput";

const PasswordCriteria = ({ password, isFocused, theme }: { password: string; isFocused: boolean; theme: any }) => {
  if (!isFocused) return null;

  const criteria = [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains capital letter', met: /[A-Z]/.test(password) },
      { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  return (
      <View style={{ 
        marginTop: 8, 
        backgroundColor: theme.cardBackground, 
        padding: 12, 
        borderRadius: 8 
      }}>
          <Text style={{ 
            fontSize: 14, 
            fontFamily: 'Urbanist-Bold', 
            color: theme.textSecondary, 
            marginBottom: 8 
          }}>
            Password Requirements:
          </Text>
          {criteria.map((criterion, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  {criterion.met ? (
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={{ marginRight: 8 }} />
                  ) : (
                      <Ionicons name="close-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                  )}
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Urbanist-Regular',
                    color: criterion.met ? '#22c55e' : '#ef4444'
                  }}>
                      {criterion.label}
                  </Text>
              </View>
          ))}
      </View>
  );
};

const ForgotPasswordLoggedIn = () => {
  const { user, refetch } = useGlobalContext();
  const { theme } = useTheme();
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(2);
    } catch (e: any) {
      setError(e.message || "An error occurred. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(3); // Move to password creation step
    } catch (e: any) {
      setError(e.message || "Invalid code. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    } catch (e: any) {
      setError(
        e.message || "Failed to reset password. Please check your code."
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    <SafeAreaView style={{ backgroundColor: theme.backgroundTertiary, flex: 1 }}>
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
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, padding: 8 }}
            >
              <Ionicons name="chevron-back" size={32} color={theme.text} />
            </TouchableOpacity>

            <View style={{ width: '100%', marginTop: 96 }}>
              <Text style={{ 
                color: theme.text, 
                fontFamily: 'Urbanist-Bold', 
                fontSize: 30 
              }}>
                {title}
              </Text>
              <Text style={{ 
                color: theme.textSecondary, 
                fontFamily: 'Urbanist-Regular', 
                fontSize: 16, 
                marginTop: 12, 
                marginBottom: 32 
              }}>
                {subtitle}
              </Text>
            </View>

            {error ? (
              <Text style={{ 
                color: theme.error, 
                marginBottom: 16, 
                textAlign: 'center', 
                fontFamily: 'Urbanist-SemiBold' 
              }}>
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
                  style={{
                    width: '100%',
                    backgroundColor: theme.primary,
                    paddingVertical: 16,
                    borderRadius: 25,
                    marginTop: 32
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.textInverse} />
                  ) : (
                    <Text style={{ 
                      color: theme.textInverse, 
                      textAlign: 'center', 
                      fontFamily: 'Urbanist-Bold', 
                      fontSize: 18 
                    }}>
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
                  style={{
                    width: '100%',
                    backgroundColor: theme.primary,
                    paddingVertical: 16,
                    borderRadius: 25,
                    marginTop: 32
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.textInverse} />
                  ) : (
                    <Text style={{ 
                      color: theme.textInverse, 
                      textAlign: 'center', 
                      fontFamily: 'Urbanist-Bold', 
                      fontSize: 18 
                    }}>
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
                <PasswordCriteria password={password} isFocused={isPasswordFocused} theme={theme} />
                    <FormField 
                  title="Confirm New Password"
                  value={confirmPassword}
                  handleChangeText={(text: string) => setConfirmPassword(text)}
                  otherStyles="mt-4"
                  secureTextEntry
                    />
                    <TouchableOpacity 
                  onPress={handleResetPassword}
                  style={{
                    width: '100%',
                    backgroundColor: theme.primary,
                    paddingVertical: 16,
                    borderRadius: 25,
                    marginTop: 32
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.textInverse} />
                  ) : (
                    <Text style={{ 
                      color: theme.textInverse, 
                      textAlign: 'center', 
                      fontFamily: 'Urbanist-Bold', 
                      fontSize: 18 
                    }}>
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
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: theme.modalOverlay 
        }}>
          <View style={{ 
            backgroundColor: theme.modalBackground, 
            width: '80%', 
            padding: 32, 
            borderRadius: 16, 
            alignItems: 'center' 
          }}>
            <Ionicons name="checkmark-circle" size={80} color={theme.success} />
            <Text style={{ 
              fontSize: 24, 
              fontFamily: 'Urbanist-Bold', 
              marginTop: 16, 
              color: theme.text 
            }}>
              Success!
            </Text>
            <Text style={{ 
              fontSize: 16, 
              fontFamily: 'Urbanist-Regular', 
              color: theme.textSecondary, 
              marginTop: 8, 
              textAlign: 'center' 
            }}>
              Your password has been changed. You will now be logged out.
                        </Text>
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                width: '100%',
                backgroundColor: theme.primary,
                paddingVertical: 12,
                borderRadius: 25,
                marginTop: 32
              }}
            >
              <Text style={{ 
                color: theme.textInverse, 
                textAlign: 'center', 
                fontFamily: 'Urbanist-Bold', 
                fontSize: 18 
              }}>
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