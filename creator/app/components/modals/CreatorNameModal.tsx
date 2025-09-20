import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../../lib/useTheme';

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
  const { theme } = useTheme();
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
          backgroundColor: theme.modalOverlay, 
          justifyContent: 'center', 
          alignItems: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <Animated.View style={{
            backgroundColor: theme.modalBackground,
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
            borderColor: theme.borderDark,
            alignItems: 'center',
          }}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 24,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              width: '100%'
            }}>
              <View style={{
                backgroundColor: 'rgba(253, 111, 62, 0.1)',
                borderRadius: 12,
                padding: 8,
                marginRight: 12
              }}>
                <Ionicons name="person-circle-outline" size={24} color={theme.primary} />
              </View>
              <Text style={{ 
                color: theme.text, 
                fontSize: 20, 
                fontWeight: '600', 
                fontFamily: 'questrial',
                letterSpacing: 0.5
              }}>Creator Name</Text>
            </View>
            
            <TextInput
              style={{
                backgroundColor: theme.inputBackground,
                color: theme.inputText,
                borderRadius: 16,
                paddingHorizontal: 20,
                paddingVertical: 16,
                fontSize: 16,
                borderWidth: 1,
                borderColor: creatorNameError ? theme.error : theme.borderDark,
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
              placeholderTextColor={theme.inputPlaceholder}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={handleSubmit}
            />
            
            {/* Error Message */}
            {creatorNameError && (
              <Text style={{ 
                color: theme.error, 
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
                <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={{ 
                  color: theme.textSecondary, 
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
                  backgroundColor: theme.textTertiary, 
                  borderRadius: 16, 
                  paddingVertical: 16, 
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.textTertiary
                }}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <Text style={{ 
                  color: theme.textInverse, 
                  fontSize: 16, 
                  fontFamily: 'questrial',
                  fontWeight: '500'
                }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: creatorNameError || checkingCreatorName ? theme.textTertiary : theme.primary, 
                  borderRadius: 16, 
                  paddingVertical: 16, 
                  alignItems: 'center',
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8
                }}
                onPress={handleSavePress}
                disabled={!!creatorNameError || checkingCreatorName || !tempCreatorName.trim()}
              >
                <Text style={{ 
                  color: theme.textInverse, 
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