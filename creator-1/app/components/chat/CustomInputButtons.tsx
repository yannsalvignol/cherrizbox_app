import { Ionicons } from '@expo/vector-icons';
import { ID } from 'appwrite';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { useChannelContext } from 'stream-chat-react-native';
import { config, storage } from '../../../lib/appwrite';

// Global state for recording modal - this is a simple solution
// In a production app, you might want to use a more sophisticated state management solution
let globalSetShowRecordingModal: ((show: boolean) => void) | null = null;

export const setGlobalRecordingModalHandler = (handler: (show: boolean) => void) => {
  globalSetShowRecordingModal = handler;
};

/**
 * Custom input buttons component with image picker and audio recorder
 * 
 * Features:
 * - Image picker with Appwrite storage upload
 * - Audio recording modal trigger
 * - Custom photo message sending
 * - Error handling and fallback to local URI
 * - Compatible with Stream Chat InputButtons interface
 */
const CustomInputButtons: React.FC = () => {
  const { channel } = useChannelContext();
  
  // For now, we'll handle the recording modal differently
  // TODO: Consider using a global context for recording modal state
  /**
   * Handle image selection and upload
   */
  const handleImagePick = async (): Promise<void> => {
    try {
      console.log('📸 Opening custom image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 Selected image:', asset.uri);
        
        if (!channel) {
          console.error('No channel available');
          return;
        }

        // Upload image to Appwrite storage first, then send message
        try {
          console.log('📸 Starting image upload to Appwrite storage...');
          
          // Get file info to determine size
          const fileInfo = await fetch(asset.uri);
          const fileBlob = await fileInfo.blob();
          
          console.log('📏 Image file size:', fileBlob.size, 'bytes');
          
          // Create unique filename
          const imageId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Create file object for upload
          const fileToUpload = {
            uri: asset.uri,
            type: 'image/jpeg',
            name: `photo_${imageId}.jpg`,
            size: fileBlob.size,
          };

          console.log('📤 Uploading image file:', fileToUpload);

          // Upload to Appwrite storage
          const uploadedFile = await storage.createFile(
            config.storageId,
            ID.unique(),
            fileToUpload
          );

          // Get the file URL from Appwrite
          const appwriteImageUrl = storage.getFileView(config.storageId, uploadedFile.$id).toString();
          
          console.log('📸 Image uploaded successfully to Appwrite:', uploadedFile.$id);
          console.log('📸 Appwrite image URL:', appwriteImageUrl);
          
          // Send message with the uploaded cloud URL
          await channel.sendMessage({
            text: '',
            attachments: [{
              type: 'custom_photo',
              image_url: appwriteImageUrl,
              fallback: 'Photo',
              caption: '',
              uploading: false,
            }],
          });
          
          console.log('✅ Custom photo sent successfully with cloud URL');
          
        } catch (uploadError) {
          console.error('Error uploading image to Appwrite storage:', uploadError);
          console.log('Sending with local URI as fallback');
          
          // Send message with local URI as fallback
          await channel.sendMessage({
            text: '',
            attachments: [{
              type: 'custom_photo',
              image_url: asset.uri,
              fallback: 'Photo',
              caption: '',
              uploading: false,
            }],
          });
          
          console.log('✅ Custom photo sent with local URI fallback');
        }

        console.log('✅ Custom photo sent successfully');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  /**
   * Handle audio recording modal trigger
   */
  const handleAudioRecord = async (): Promise<void> => {
    if (globalSetShowRecordingModal) {
      globalSetShowRecordingModal(true);
    } else {
      console.warn('Audio recording modal handler not set');
      Alert.alert('Audio Recording', 'Audio recording is not properly initialized');
    }
  };

  return (
    <View style={{ flexDirection: 'row' }}>
      <TouchableOpacity
        onPress={handleImagePick}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 8,
        }}
      >
        <Ionicons name="camera" size={28} color="black" />
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={handleAudioRecord}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 0,
        }}
      >
        <Ionicons name="mic" size={28} color="black" />
      </TouchableOpacity>
    </View>
  );
};

export default CustomInputButtons;