import React, { useState } from 'react';
import { Image, TextInput, TouchableOpacity, View } from 'react-native';


interface FormFieldProps {
  title: string;
  value: string;
  handleChangeText: (text: string) => void;
  otherStyles?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  secureTextEntry?: boolean;
  placeholder?: string;
  maxLength?: number;
  editable?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  disableAutofill?: boolean;
}

const FormField = ({ title, value, handleChangeText, otherStyles, keyboardType, secureTextEntry, placeholder, maxLength, editable = true, onFocus, onBlur, disableAutofill }: FormFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View className={`${otherStyles}`}>
            <View className="flex-row items-center bg-[#ECECEC] rounded-lg">
                <TextInput
                    placeholder={placeholder || title}
                    value={value}
                    onChangeText={handleChangeText}
                    keyboardType={keyboardType}
                    maxLength={maxLength}
                    editable={editable}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    textContentType={disableAutofill ? 'oneTimeCode' : 'none'}
                    passwordRules={disableAutofill ? '' : undefined}
                    className="flex-1 px-5 py-6 font-['Urbanist-Regular']"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={(title.toLowerCase().includes('password') || secureTextEntry) && !showPassword}
                />
                {(title.toLowerCase().includes('password') || secureTextEntry) && (
                    <TouchableOpacity 
                        className="px-4"
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Image 
                            source={showPassword ? require('../../assets/icon/eye_hide.png') : require('../../assets/icon/eye.png')}
                            className="w-6 h-6"
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}

export default FormField