import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../lib/useTheme';

interface Country {
  name: string;
  code: string;
  flag: string;
  format: string;
}

interface PhoneNumberModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCountry: Country;
  tempPhoneNumber: string;
  setTempPhoneNumber: (number: string) => void;
  onSave: (number: string) => void;
  formatPhoneNumber: (digits: string, format: string) => string;
}

export const PhoneNumberModal: React.FC<PhoneNumberModalProps> = ({
  visible,
  onClose,
  selectedCountry,
  tempPhoneNumber,
  setTempPhoneNumber,
  onSave,
  formatPhoneNumber
}) => {
  const { theme } = useTheme();
  const handleSave = () => {
    onSave(tempPhoneNumber);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.modalOverlay, justifyContent: 'center', alignItems: 'center' }}>
        <View className="rounded-3xl w-[90%] max-w-md overflow-hidden" style={{ backgroundColor: theme.modalBackground, borderWidth: 2, borderColor: theme.primary }}>
          {/* Header */}
          <View style={{ backgroundColor: theme.primary, padding: 24 }}>
            <View className="flex-row justify-between items-center">
              <View>
                <Text style={{ color: theme.textInverse, fontSize: 24, fontFamily: 'questrial', fontWeight: 'bold' }}>Phone Number</Text>
                <Text style={{ color: 'rgba(0,0,0,0.8)', fontSize: 14, fontFamily: 'questrial', marginTop: 4 }}>Enter your contact number</Text>
              </View>
              <TouchableOpacity 
                onPress={onClose}
                style={{ width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={20} color={theme.textInverse} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View className="p-6">
            {/* Country Code Display */}
            <View className="flex-row items-center justify-center mb-6">
              <View className="rounded-xl px-4 py-3 mr-3" style={{ backgroundColor: theme.inputBackground, borderWidth: 1, borderColor: theme.borderDark }}>
                <Text style={{ color: theme.text, fontSize: 24 }}>{selectedCountry.flag}</Text>
              </View>
              <View className="rounded-xl px-4 py-3" style={{ backgroundColor: theme.inputBackground, borderWidth: 1, borderColor: theme.borderDark }}>
                <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'questrial', fontWeight: '600' }}>{selectedCountry.code}</Text>
              </View>
            </View>

            {/* Phone Number Input */}
            <View className="mb-6">
              <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Nunito-Regular', marginBottom: 12, textAlign: 'center' }}>Enter your phone number</Text>
              <View className="rounded-xl px-4 py-4" style={{ backgroundColor: theme.inputBackground, borderWidth: 2, borderColor: theme.borderDark }}>
                <TextInput
                  className="text-3xl Nunito-Regular text-center"
                  placeholder={selectedCountry.format}
                  placeholderTextColor={theme.inputPlaceholder}
                  value={tempPhoneNumber}
                  onChangeText={(text) => {
                    // Remove formatting to get raw digits
                    const rawDigits = text.replace(/\D/g, '');
                    // Format according to country format
                    const formatted = formatPhoneNumber(rawDigits, selectedCountry.format);
                    setTempPhoneNumber(formatted);
                  }}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  style={{ 
                    color: theme.inputText, 
                    letterSpacing: 2,
                    textAlign: 'center', 
                    fontSize: 28,
                    paddingHorizontal: 20
                  }}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: theme.primary }}
              onPress={handleSave}
            >
              <Text style={{ color: theme.textInverse, fontSize: 18, fontFamily: 'questrial', fontWeight: '600' }}>Save Phone Number</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};