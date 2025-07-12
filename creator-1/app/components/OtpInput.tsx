import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

const OtpInput = ({ code, setCode }: { code: string; setCode: (code: string) => void }) => {
    const inputs = useRef<Array<TextInput | null>>([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const handleTextChange = (text: string, index: number) => {
        const newCode = code.split('');
        newCode[index] = text;
        const finalCode = newCode.join('').slice(0, 6);
        setCode(finalCode);

        if (text && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = ({ nativeEvent: { key } }: { nativeEvent: { key: string } }, index: number) => {
        if (key === 'Backspace' && !code[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleFocus = (index: number) => {
        setFocusedIndex(index);
    };

    const handleBlur = () => {
        setFocusedIndex(-1);
    };

    const handleContainerPress = () => {
        // Find the first empty input and focus it
        const firstEmptyIndex = code.length < 6 ? code.length : 5;
        inputs.current[firstEmptyIndex]?.focus();
    };

    return (
        <Pressable onPress={handleContainerPress} style={styles.pressableContainer}>
            <View style={styles.container}>
                {Array(6).fill(0).map((_, index) => (
                    <TextInput
                        key={index}
                        ref={(ref) => {inputs.current[index] = ref}}
                        style={[
                            styles.input,
                            focusedIndex === index && styles.inputFocused,
                            code[index] && styles.inputFilled,
                        ]}
                        keyboardType="number-pad"
                        maxLength={1}
                        onChangeText={(text) => handleTextChange(text, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        value={code[index] || ''}
                        onFocus={() => handleFocus(index)}
                        onBlur={handleBlur}
                        selectTextOnFocus
                        textContentType="oneTimeCode"
                    />
                ))}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    pressableContainer: {
        width: '100%',
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    input: {
        width: 50,
        height: 60,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 24,
        fontFamily: 'Urbanist-Bold',
        color: '#1F2937',
        backgroundColor: '#F9FAFB',
    },
    inputFocused: {
        borderColor: '#FB2355',
        borderWidth: 2,
        shadowColor: '#FB2355',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    inputFilled: {
        borderColor: '#22c55e',
    },
});

export default OtpInput; 