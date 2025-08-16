import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';

interface Gender {
  value: string;
  label: string;
  icon: string;
}

interface GenderPickerModalProps {
  visible: boolean;
  onClose: () => void;
  genders: Gender[];
  selectedGender: Gender | null;
  onSelectGender: (gender: Gender) => void;
}

export const GenderPickerModal: React.FC<GenderPickerModalProps> = ({
  visible,
  onClose,
  genders,
  selectedGender,
  onSelectGender
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-[#676767] rounded-t-3xl p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-black text-xl font-bold">Select Gender</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={32} color="#FD6F3E" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={genders}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-row items-center py-3 border-b border-gray-800"
                onPress={() => {
                  onSelectGender(item);
                  onClose();
                }}
              >
                <Text className="text-black text-xl mr-3">{item.icon}</Text>
                <Text className="text-black text-lg">{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};