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
            backgroundColor: '#1A1A1A',
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
              color: 'white',
              fontSize: 24,
              fontFamily: 'Urbanist-Bold',
            }}>
              Set Video Price
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{
                color: '#9C27B0',
                fontSize: 18,
                fontFamily: 'Urbanist-SemiBold',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Video Preview */}
          {videoUri && (
            <View style={{
              backgroundColor: '#2A2A2A',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: '#9C27B0',
            }}>
              <View style={{
                backgroundColor: '#3A3A3A',
                borderRadius: 8,
                height: 200,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Text style={{ fontSize: 64, opacity: 0.6 }}>🎥</Text>
                <Text style={{
                  color: '#9C27B0',
                  fontSize: 14,
                  fontWeight: 'bold',
                  marginTop: 8,
                }}>
                  Video Preview
                </Text>
              </View>
              <Text style={{
                color: '#CCC',
                fontSize: 14,
                fontFamily: 'Urbanist-Regular',
                textAlign: 'center',
              }}>
                Video selected successfully
              </Text>
            </View>
          )}

          {/* Title Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              color: '#888',
              fontSize: 14,
              marginBottom: 8,
              fontFamily: 'Urbanist-Regular',
            }}>
              Video Title
            </Text>
            <TextInput
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
                fontFamily: 'Urbanist-Regular',
                borderWidth: 1,
                borderColor: '#9C27B0',
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
              color: '#888',
              fontSize: 14,
              marginBottom: 8,
              fontFamily: 'Urbanist-Regular',
            }}>
              Video Price ({userCurrency || 'USD'})
            </Text>
            <TextInput
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
                fontFamily: 'Urbanist-Regular',
                borderWidth: 1,
                borderColor: '#9C27B0',
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
                backgroundColor: '#2A2A2A',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#666',
              }}
              onPress={handleClose}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontFamily: 'Urbanist-SemiBold',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#9C27B0',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                shadowColor: '#9C27B0',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={handleSubmit}
            >
              <Text style={{
                color: 'white',
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