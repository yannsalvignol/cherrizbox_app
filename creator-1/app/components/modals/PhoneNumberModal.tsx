import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
      <View className="flex-1 bg-black/80 justify-center items-center">
        <View className="rounded-3xl w-[90%] max-w-md overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#FD6F3E' }}>
          {/* Header */}
          <View className="bg-gradient-to-r from-[#FD6F3E] to-[#FF6B9D] p-6">
            <View className="flex-row justify-between items-center">
              <View>
                <Text style={{ color: 'black', fontSize: 24, fontFamily: 'questrial', fontWeight: 'bold' }}>Phone Number</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'questrial', marginTop: 4 }}>Enter your contact number</Text>
              </View>
              <TouchableOpacity 
                onPress={onClose}
                className="w-10 h-10 bg-black/20 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="black" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View className="p-6">
            {/* Country Code Display */}
            <View className="flex-row items-center justify-center mb-6">
              <View className="rounded-xl px-4 py-3 mr-3 border border-[#676767]" style={{ backgroundColor: '#F8F8F8' }}>
                <Text style={{ color: 'black', fontSize: 24 }}>{selectedCountry.flag}</Text>
              </View>
              <View className="rounded-xl px-4 py-3 border border-[#676767]" style={{ backgroundColor: '#F8F8F8' }}>
                <Text style={{ color: 'black', fontSize: 18, fontFamily: 'questrial', fontWeight: '600' }}>{selectedCountry.code}</Text>
              </View>
            </View>

            {/* Phone Number Input */}
            <View className="mb-6">
              <Text style={{ color: 'black', fontSize: 14, fontFamily: 'Nunito-Regular', marginBottom: 12, textAlign: 'center' }}>Enter your phone number</Text>
              <View className="rounded-xl px-4 py-4 border-2 border-[#676767]" style={{ backgroundColor: '#F8F8F8' }}>
                <TextInput
                  className="text-black text-3xl Nunito-Regular text-center"
                  placeholder={selectedCountry.format}
                  placeholderTextColor="rgba(0,0,0,0.5)"
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
                    color: 'black', 
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
              className="bg-[#FD6F3E] rounded-xl py-4 items-center"
              onPress={handleSave}
            >
              <Text style={{ color: 'black', fontSize: 18, fontFamily: 'questrial', fontWeight: '600' }}>Save Phone Number</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};