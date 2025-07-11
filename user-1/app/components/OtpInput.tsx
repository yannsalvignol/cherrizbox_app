import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

interface OtpInputProps {
  code: string;
  setCode: (code: string) => void;
  onCodeFilled?: (code: string) => void;
  numberOfDigits?: number;
}

const OtpInput: React.FC<OtpInputProps> = ({ 
  code, 
  setCode, 
  onCodeFilled, 
  numberOfDigits = 6 
}) => {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleTextChange = (text: string, index: number) => {
    const newCode = code.split('');
    newCode[index] = text;
    const finalCode = newCode.join('').slice(0, numberOfDigits);
    setCode(finalCode);

    if (text && index < numberOfDigits - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (finalCode.length === numberOfDigits) {
        if (onCodeFilled) {
            onCodeFilled(finalCode);
        }
    }
  };

  const handleKeyPress = ({ nativeEvent: { key } }: { nativeEvent: { key: string } }, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };
  
  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  const handleContainerPress = () => {
    const firstEmptyIndex = code.length;
    if (inputRefs.current[firstEmptyIndex]) {
        inputRefs.current[firstEmptyIndex]?.focus();
    } else {
        inputRefs.current[numberOfDigits - 1]?.focus();
    }
  }

  return (
    <Pressable onPress={handleContainerPress} style={styles.container}>
      {Array.from({ length: numberOfDigits }).map((_, index) => {
        const isFocused = focusedIndex === index;
        const char = code[index];
        return (
          <View
            key={index}
            style={[
              styles.inputContainer,
              isFocused && styles.inputFocused,
            ]}
          >
            <TextInput
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={styles.inputText}
              value={char}
              onChangeText={(text) => handleTextChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              keyboardType="number-pad"
              maxLength={1}
              selectionColor="#FB2355"
            />
          </View>
        );
      })}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 20,
  },
  inputContainer: {
    width: 48,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECECEC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: '#FB2355',
  },
  inputText: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    color: '#000',
    textAlign: 'center',
  },
});

export default OtpInput; 