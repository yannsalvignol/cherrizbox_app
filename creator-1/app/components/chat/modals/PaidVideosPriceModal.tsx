import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PaidVideosPriceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (price: number, title: string) => void;
  videoUri: string | null;
  userCurrency?: string;
}

const PaidVideosPriceModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  videoUri, 
  userCurrency 
}: PaidVideosPriceModalProps) => {
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your video');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
      return;
    }
    onSubmit(numPrice, title.trim());
    setPrice('');
    setTitle('');
    onClose();
  };

  const handleClose = () => {
    setPrice('');
    setTitle('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
      }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingHorizontal: 24,
            paddingBottom: 40,
            minHeight: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <Text style={{
              color: 'black',
              fontSize: 24,
              fontFamily: 'Urbanist-Bold',
            }}>
              Set Video Price
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{
                color: '#666666',
                fontSize: 18,
                fontFamily: 'Urbanist-SemiBold',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Video Preview */}
          {videoUri && (
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Ionicons name="videocam-outline" size={64} color="#FD6F3E" />
            </View>
          )}

          {/* Title Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              color: '#676767',
              fontSize: 14,
              marginBottom: 8,
              fontFamily: 'Urbanist-Regular',
            }}>
              Video Title
            </Text>
            <TextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                color: 'black',
                fontSize: 16,
                fontFamily: 'Urbanist-Regular',
                borderWidth: 1,
                borderColor: '#676767',
              }}
              placeholder="Enter video title"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              autoFocus={true}
              returnKeyType="next"
            />
          </View>

          {/* Price Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              color: '#676767',
              fontSize: 14,
              marginBottom: 8,
              fontFamily: 'Urbanist-Regular',
            }}>
              Video Price ({userCurrency || 'USD'})
            </Text>
            <TextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                color: 'black',
                fontSize: 16,
                fontFamily: 'Urbanist-Regular',
                borderWidth: 1,
                borderColor: '#676767',
              }}
              placeholder="Enter price (e.g., 9.99)"
              placeholderTextColor="#666"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Action Buttons */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#f5f5f5',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#676767',
              }}
              onPress={handleClose}
            >
              <Text style={{
                color: '#666666',
                fontSize: 16,
                fontFamily: 'Urbanist-SemiBold',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FD6F3E',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                shadowColor: '#FD6F3E',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={handleSubmit}
            >
              <Text style={{
                color: 'black',
                fontSize: 16,
                fontFamily: 'Urbanist-Bold',
              }}>
                Create Paid Video
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default PaidVideosPriceModal;