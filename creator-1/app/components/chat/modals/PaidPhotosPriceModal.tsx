import React, { useState } from 'react';
import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PaidPhotosPriceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (price: number) => void;
  imageUri: string | null;
  userCurrency?: string;
  formatPrice?: (price: number, currency?: string) => string;
}

const PaidPhotosPriceModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  imageUri, 
  userCurrency, 
  formatPrice 
}: PaidPhotosPriceModalProps) => {
  const [price, setPrice] = useState('5.00');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }
    if (numPrice > 999) {
      setError(`Price cannot exceed ${formatPrice ? formatPrice(999, userCurrency) : '$999'}`);
      return;
    }
    onSubmit(numPrice);
    onClose();
    setPrice('5.00');
    setError('');
  };

  const handleClose = () => {
    onClose();
    setPrice('5.00');
    setError('');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Set Content Price</Text>
          
          {imageUri && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            </View>
          )}
          
          <Text style={styles.subtitle}>
            Set the price for your exclusive content
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>
              {userCurrency && formatPrice ? formatPrice(0, userCurrency).replace('0.00', '').replace('0,00', '') : '$'}
            </Text>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="5.00"
              placeholderTextColor="#666"
              autoFocus
              selectTextOnFocus
            />
          </View>
          
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Set Price</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 120,
    padding: 20,
  },
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 100,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePreview: {
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    width: '100%',
  },
  currencySymbol: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'left',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Urbanist-SemiBold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
  },
});

export default PaidPhotosPriceModal;