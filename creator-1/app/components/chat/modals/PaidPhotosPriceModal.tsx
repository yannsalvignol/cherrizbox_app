import { useTheme } from '@/lib/useTheme';
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
  const { theme } = useTheme();
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
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.container, { backgroundColor: theme.modalBackground, shadowColor: theme.shadow }]}>
          <TouchableOpacity onPress={handleClose} style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.closeButtonText, { color: theme.primary }]}>✕</Text>
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: theme.text }]}>Set Content Price</Text>
          
          {imageUri && (
            <View style={[styles.imagePreview, { borderColor: theme.border }]}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            </View>
          )}
          
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Set the price for your exclusive content
          </Text>
          
          <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
            <Text style={[styles.currencySymbol, { color: theme.inputText }]}>
              {userCurrency && formatPrice ? formatPrice(0, userCurrency).replace('0.00', '').replace('0,00', '') : '$'}
            </Text>
            <TextInput
              style={[styles.priceInput, { color: theme.inputText }]}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="5.00"
              placeholderTextColor={theme.inputPlaceholder}
              autoFocus
              selectTextOnFocus
            />
          </View>
          
          {error ? (
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          ) : null}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Set Price</Text>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 120,
    padding: 20,
  },
  container: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
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
    borderWidth: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    width: '100%',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'left',
  },
  errorText: {
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Urbanist-SemiBold',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Urbanist-Bold',
  },
});

export default PaidPhotosPriceModal;