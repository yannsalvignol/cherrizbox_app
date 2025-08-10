import { client } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface EditMessageModalProps {
  visible: boolean;
  onClose: () => void;
  message: any;
}

const EditMessageModal = ({ visible, onClose, message }: EditMessageModalProps) => {
  const [editedText, setEditedText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Initialize text when message changes
  useEffect(() => {
    if (message?.text) {
      setEditedText(message.text);
    }
  }, [message]);

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(50);
      
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Focus text input after animation
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      });
    }
  }, [visible, fadeAnim, scaleAnim, slideAnim]);

  // Handle closing with animation
  const handleClose = () => {
    // Trigger exit animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.3,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Call onClose after animation completes
      onClose();
      setEditedText('');
    });
  };

  // Handle message update
  const handleUpdateMessage = async () => {
    if (!message || !editedText.trim()) return;
    
    // Check if text actually changed
    if (editedText.trim() === message.text?.trim()) {
      handleClose();
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Update the message using Stream Chat client
      await client.updateMessage({
        id: message.id,
        text: editedText.trim(),
      });
      
      // Haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      console.log('Message updated successfully');
      handleClose();
      
    } catch (error) {
      console.error('Error updating message:', error);
      Alert.alert('Error', 'Failed to update message. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: 'transparent',
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
      }}>
        {/* Backdrop - tap to dismiss */}
        <TouchableOpacity 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          onPress={handleClose}
          activeOpacity={1}
        />

        {/* Modal Content */}
        <Animated.View style={{
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
          alignSelf: 'center',
          width: '90%',
          maxWidth: 400,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            paddingVertical: 20,
            paddingHorizontal: 20,
            borderWidth: 1,
            borderColor: '#666666',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <View style={{
                backgroundColor: '#4CAF50',
                borderRadius: 16,
                width: 32,
                height: 32,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="pencil-outline" size={16} color="#FFFFFF" />
              </View>
              <Text style={{
                color: 'black',
                fontSize: 18,
                fontWeight: 'bold',
                fontFamily: 'questrial',
                flex: 1,
              }}>
                Edit Message
              </Text>
            </View>

            {/* Text Input */}
            <View style={{
              borderWidth: 2,
              borderColor: '#E0E0E0',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 20,
              minHeight: 120,
            }}>
              <TextInput
                ref={textInputRef}
                style={{
                  color: 'black',
                  fontSize: 16,
                  fontFamily: 'questrial',
                  textAlignVertical: 'top',
                  flex: 1,
                }}
                value={editedText}
                onChangeText={setEditedText}
                placeholder="Enter your message..."
                placeholderTextColor="#999999"
                multiline
                maxLength={500}
                editable={!isUpdating}
              />
            </View>

            {/* Character Count */}
            <Text style={{
              color: '#666666',
              fontSize: 12,
              fontFamily: 'questrial',
              textAlign: 'right',
              marginBottom: 20,
            }}>
              {editedText.length}/500
            </Text>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
            }}>
              {/* Cancel Button */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F5F5F5',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E0E0E0',
                }}
                onPress={handleClose}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: '#666666',
                  fontSize: 16,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* Update Button */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: editedText.trim() && editedText.trim() !== message?.text?.trim() ? '#4CAF50' : '#CCCCCC',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: isUpdating ? 0.7 : 1,
                }}
                onPress={handleUpdateMessage}
                disabled={isUpdating || !editedText.trim() || editedText.trim() === message?.text?.trim()}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                }}>
                  {isUpdating ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default EditMessageModal;