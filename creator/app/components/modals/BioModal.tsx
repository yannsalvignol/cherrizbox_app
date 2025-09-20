import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Keyboard, Modal, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../../lib/useTheme';

interface BioModalProps {
  visible: boolean;
  onClose: () => void;
  tempBio: string;
  setTempBio: (bio: string) => void;
  onSave: (bio: string) => void;
}

export const BioModal: React.FC<BioModalProps> = ({
  visible,
  onClose,
  tempBio,
  setTempBio,
  onSave
}) => {
  const { theme } = useTheme();
  const handleSave = () => {
    Keyboard.dismiss();
    onSave(tempBio);
    onClose();
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    onSave(tempBio);
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
                <Ionicons name="document-text-outline" size={24} color={theme.primary} />
              </View>
              <Text style={{ 
                color: theme.text, 
                fontSize: 20, 
                fontWeight: '600', 
                fontFamily: 'questrial',
                letterSpacing: 0.5
              }}>Edit Bio</Text>
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
                borderColor: theme.borderDark,
                marginBottom: 8,
                width: '100%',
                minHeight: 120,
                textAlignVertical: 'top',
                fontFamily: 'questrial'
              }}
              value={tempBio}
              onChangeText={setTempBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.inputPlaceholder}
              multiline
              maxLength={300}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={handleSubmit}
            />
            
            <Text style={{ 
              color: theme.text, 
              fontSize: 14, 
              alignSelf: 'flex-end', 
              marginBottom: 24,
              fontFamily: 'questrial'
            }}>{tempBio.length}/300 characters</Text>
            
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
                  backgroundColor: theme.primary, 
                  borderRadius: 16, 
                  paddingVertical: 16, 
                  alignItems: 'center',
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8
                }}
                onPress={handleSave}
              >
                <Text style={{ 
                  color: theme.textInverse, 
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