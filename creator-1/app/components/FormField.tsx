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
}

const FormField = ({ title, value, handleChangeText, otherStyles, keyboardType, onFocus, onBlur }: FormFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);

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
                    secureTextEntry={title.toLowerCase().includes('password') && !showPassword}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
                {title.toLowerCase().includes('password') && (
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