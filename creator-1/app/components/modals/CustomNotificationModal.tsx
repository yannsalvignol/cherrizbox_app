import React from 'react';
import {
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface CustomNotificationModalProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const CustomNotificationModal: React.FC<CustomNotificationModalProps> = ({
  visible,
  message,
  type,
  onClose
}) => {
  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 60,
      left: 16,
      right: 16,
      zIndex: 1000,
      backgroundColor: type === 'success' ? '#4CAF50' : '#F44336',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }}>
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: 'bold',
        }}>
          {type === 'success' ? '✓' : '✕'}
        </Text>
      </View>
      <Text style={{
        color: 'white',
        fontSize: 14,
        fontFamily: 'Urbanist-Regular',
        flex: 1,
      }}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={onClose}
        style={{
          padding: 4,
        }}
      >
        <Text style={{
          color: 'white',
          fontSize: 18,
          fontWeight: 'bold',
        }}>
          ×
        </Text>
      </TouchableOpacity>
    </View>
  );
};