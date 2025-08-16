import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface CreatorNameModalProps {
  visible: boolean;
  onClose: () => void;
  tempCreatorName: string;
  setTempCreatorName: (name: string) => void;
  creatorNameError: string | null;
  setCreatorNameError: (error: string | null) => void;
  checkingCreatorName: boolean;
  onSave: (name: string) => Promise<void>;
  checkCreatorNameAvailability: (name: string) => Promise<boolean>;
}

export const CreatorNameModal: React.FC<CreatorNameModalProps> = ({
  visible,
  onClose,
  tempCreatorName,
  setTempCreatorName,
  creatorNameError,
  setCreatorNameError,
  checkingCreatorName,
  onSave,
  checkCreatorNameAvailability
}) => {
  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (tempCreatorName.trim()) {
      const isAvailable = await checkCreatorNameAvailability(tempCreatorName);
      if (isAvailable) {
        await onSave(tempCreatorName);
        onClose();
      } else {
        setCreatorNameError('This creator name is already taken');
      }
    }
  };

  const handleSavePress = async () => {
    Keyboard.dismiss();
    if (tempCreatorName.trim() && !checkingCreatorName) {
      const isAvailable = await checkCreatorNameAvailability(tempCreatorName);
      if (isAvailable) {
        Alert.alert(
          'Important Reminder',
          'Your creator name cannot be changed once your channel goes live. Make sure you\'re happy with your choice!',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Save Anyway',
              onPress: async () => {
                await onSave(tempCreatorName);
                onClose();
              }
            }
          ]
        );
      } else {
        setCreatorNameError('This creator name is already taken');
      }
    }
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
                <Ionicons name="person-circle-outline" size={24} color="#FD6F3E" />
              </View>
              <Text style={{ 
                color: 'black', 
                fontSize: 20, 
                fontWeight: '600', 
                fontFamily: 'questrial',
                letterSpacing: 0.5
              }}>Creator Name</Text>
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
                borderColor: creatorNameError ? '#F44336' : '#676767',
                marginBottom: 8,
                width: '100%',
                textAlign: 'center',
                fontFamily: 'questrial'
              }}
              value={tempCreatorName}
              onChangeText={(text) => {
                setTempCreatorName(text);
                setCreatorNameError(null); // Clear error when user types
              }}
              placeholder="Enter your creator name..."
              placeholderTextColor="rgba(0,0,0,0.5)"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={handleSubmit}
            />
            
            {/* Error Message */}
            {creatorNameError && (
              <Text style={{ 
                color: '#F44336', 
                fontSize: 14, 
                textAlign: 'center', 
                marginBottom: 16,
                fontFamily: 'questrial'
              }}>
                {creatorNameError}
              </Text>
            )}
            
            {/* Loading Indicator */}
            {checkingCreatorName && (
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: 16
              }}>
                <ActivityIndicator size="small" color="#FD6F3E" style={{ marginRight: 8 }} />
                <Text style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: 14,
                  fontFamily: 'questrial'
                }}>
                  Checking availability...
                </Text>
              </View>
            )}
            
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
                  backgroundColor: creatorNameError || checkingCreatorName ? '#666' : '#FD6F3E', 
                  borderRadius: 16, 
                  paddingVertical: 16, 
                  alignItems: 'center',
                  shadowColor: '#FD6F3E',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8
                }}
                onPress={handleSavePress}
                disabled={!!creatorNameError || checkingCreatorName || !tempCreatorName.trim()}
              >
                <Text style={{ 
                  color: 'black', 
                  fontSize: 16, 
                  fontFamily: 'questrial', 
                  fontWeight: '600'
                }}>
                  {checkingCreatorName ? 'Checking...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};