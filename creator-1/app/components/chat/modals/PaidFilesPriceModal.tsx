import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PaidFilesPriceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (fileUri: string, price: number, title: string) => void;
  fileUri: string | null;
  userCurrency?: string;
}

const PaidFilesPriceModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  fileUri, 
  userCurrency 
}: PaidFilesPriceModalProps) => {
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your file');
      return;
    }
    if (fileUri) {
      onSubmit(fileUri, numPrice, title.trim());
    }
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
      animationType="fade"
      onRequestClose={handleClose}
    >
      <BlurView
        intensity={20}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : 'height'}
          style={{
            width: '90%',
            maxWidth: 400,
          }}
        >
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10,
            borderWidth: 1,
            borderColor: '#676767',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: 'black',
                fontFamily: 'Urbanist-Bold',
              }}>
                Set File Price
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={{ color: '#FD6F3E', fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* File Preview */}
            {fileUri && (
              <View style={{
                width: '100%',
                height: 200,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                marginBottom: 20,
                overflow: 'hidden',
                position: 'relative',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#676767',
              }}>
                {/* PDF icon preview */}
                <Image
                  source={require('../../../../assets/icon/pdf.png')}
                  style={{ width: 84, height: 84 }}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Title Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                color: '#676767',
                fontSize: 14,
                marginBottom: 8,
                fontFamily: 'Urbanist-Regular',
              }}>
                File Title
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
                placeholder="Enter file title (e.g., Premium Guide)"
                placeholderTextColor="#666"
                value={title}
                onChangeText={setTitle}
                autoFocus={true}
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
                File Price ({userCurrency || 'USD'})
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
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#f5f5f5',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={handleClose}
              >
                <Text style={{
                  color: '#666',
                  fontSize: 16,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FD6F3E',
                  paddingVertical: 16,
                  borderRadius: 12,
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
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold',
                }}>
                  Send File
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
};

export default PaidFilesPriceModal;