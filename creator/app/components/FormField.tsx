import React, { useState } from 'react';
import { Image, TextInput, TouchableOpacity, View } from 'react-native';


interface FormFieldProps {
  title: string;
  value: string;
  handleChangeText: (text: string) => void;
  otherStyles?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  onFocus?: () => void;
  onBlur?: () => void;
  editable?: boolean;
  secureTextEntry?: boolean;
}

const FormField = ({ title, value, handleChangeText, otherStyles, keyboardType, onFocus, onBlur, editable = true, secureTextEntry }: FormFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);

    // Determine if we should show password toggle
    const shouldShowPasswordToggle = title.toLowerCase().includes('password') && secureTextEntry !== undefined;
    const isPasswordField = title.toLowerCase().includes('password');
    const finalSecureTextEntry = secureTextEntry !== undefined ? (secureTextEntry && !showPassword) : (isPasswordField && !showPassword);

    return (
        <View className={`${otherStyles}`}>
            <View className="flex-row items-center bg-[#ECECEC] rounded-lg">
                <TextInput
                    placeholder={title}
                    value={value}
                    onChangeText={handleChangeText}
                    keyboardType={keyboardType}
                    className="flex-1 px-5 py-6 font-['Urbanist-Regular']"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={finalSecureTextEntry}
                    editable={editable}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    textAlignVertical="center"
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                />
                {shouldShowPasswordToggle && (
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