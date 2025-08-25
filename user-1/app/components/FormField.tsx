import React, { useState } from 'react';
import { Image, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../lib/themes/useTheme';


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
    const { theme } = useTheme();

    return (
        <View style={{ marginBottom: otherStyles?.includes('mt-') ? 0 : 16 }}>
            <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: theme.cardBackground, 
                borderRadius: 8 
            }}>
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
                    style={{ 
                        flex: 1, 
                        paddingHorizontal: 20, 
                        paddingVertical: 24, 
                        fontFamily: 'Urbanist-Regular',
                        color: theme.text
                    }}
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={(title.toLowerCase().includes('password') || secureTextEntry) && !showPassword}
                />
                {(title.toLowerCase().includes('password') || secureTextEntry) && (
                    <TouchableOpacity 
                        style={{ paddingHorizontal: 16 }}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Image 
                            source={showPassword ? require('../../assets/icon/eye_hide.png') : require('../../assets/icon/eye.png')}
                            style={{ width: 24, height: 24 }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}

export default FormField