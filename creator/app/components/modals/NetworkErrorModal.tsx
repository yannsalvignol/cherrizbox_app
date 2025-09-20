import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface NetworkErrorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NetworkErrorModal: React.FC<NetworkErrorModalProps> = ({
  visible,
  onClose
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <View style={{ 
          backgroundColor: '#18181B', 
          borderRadius: 18, 
          padding: 28, 
          width: '85%', 
          maxWidth: 400, 
          alignItems: 'center', 
          borderWidth: 1, 
          borderColor: '#FD6F3E' 
        }}>
          <View style={{ 
            backgroundColor: 'rgba(251, 35, 85, 0.1)', 
            borderRadius: 12, 
            padding: 12, 
            marginBottom: 16 
          }}>
            <Ionicons name="wifi-outline" size={32} color="#FD6F3E" />
          </View>
          <Text style={{ 
            color: 'white', 
            fontFamily: 'Urbanist-Bold', 
            fontSize: 22, 
            marginBottom: 10, 
            textAlign: 'center' 
          }}>
            Network Issue
          </Text>
          <Text style={{ 
            color: '#CCCCCC', 
            fontFamily: 'Urbanist-Regular', 
            fontSize: 15, 
            marginBottom: 20, 
            textAlign: 'center', 
            lineHeight: 22 
          }}>
            We're experiencing network issues. Please check your connection and try again later.
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ 
              backgroundColor: '#FD6F3E', 
              borderRadius: 10, 
              paddingVertical: 12, 
              paddingHorizontal: 32 
            }}
          >
            <Text style={{ 
              color: 'white', 
              fontFamily: 'Urbanist-Bold', 
              fontSize: 16 
            }}>
              Try Again Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};