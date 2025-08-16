import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Keyboard, Modal, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  tempLocation: string;
  setTempLocation: (location: string) => void;
  onSave: (location: string) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  tempLocation,
  setTempLocation,
  onSave
}) => {
  const handleSave = () => {
    Keyboard.dismiss();
    onSave(tempLocation);
    onClose();
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    onSave(tempLocation);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.75)', 
          justifyContent: 'center', 
          alignItems: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <Animated.View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 32,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 20,
            borderWidth: 1,
            borderColor: '#676767',
            alignItems: 'center',
          }}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 24,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E0E0E0',
              width: '100%'
            }}>
              <View style={{
                backgroundColor: 'rgba(251, 35, 85, 0.1)',
                borderRadius: 12,
                padding: 8,
                marginRight: 12
              }}>
                <Ionicons name="location-outline" size={24} color="#FD6F3E" />
              </View>
              <Text style={{ 
                color: 'black', 
                fontSize: 20, 
                fontWeight: '600', 
                fontFamily: 'questrial',
                letterSpacing: 0.5
              }}>Edit Location</Text>
            </View>
            
            <TextInput
              style={{
                backgroundColor: '#F8F8F8',
                color: 'black',
                borderRadius: 16,
                paddingHorizontal: 20,
                paddingVertical: 16,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#676767',
                marginBottom: 24,
                width: '100%',
                textAlign: 'center',
                fontFamily: 'questrial'
              }}
              value={tempLocation}
              onChangeText={setTempLocation}
              placeholder="Enter your location..."
              placeholderTextColor="rgba(0,0,0,0.5)"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={handleSubmit}
            />
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              width: '100%',
              gap: 12
            }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: '#676767', 
                  borderRadius: 16, 
                  paddingVertical: 16, 
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#676767'
                }}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <Text style={{ 
                  color: 'white', 
                  fontSize: 16, 
                  fontFamily: 'questrial',
                  fontWeight: '500'
                }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: '#FD6F3E', 
                  borderRadius: 16, 
                  paddingVertical: 16, 
                  alignItems: 'center',
                  shadowColor: '#FD6F3E',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8
                }}
                onPress={handleSave}
              >
                <Text style={{ 
                  color: 'black', 
                  fontSize: 16, 
                  fontFamily: 'questrial', 
                  fontWeight: '600'
                }}>Save</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};