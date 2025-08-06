import { formatPrice } from '@/lib/currency';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Image, Linking, Modal, Text, TouchableOpacity, View } from 'react-native';

interface TipAttachment {
  type: string;
  attachment_type?: string;
  appwrite_url?: string;
  local_uri?: string;
  title?: string;
  tip_amount?: number;
  currency?: string;
}

interface CustomTipAttachmentProps {
  attachment: TipAttachment;
}

export const CustomTipAttachment: React.FC<CustomTipAttachmentProps> = ({ attachment }) => {
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  
  // Return null if no attachment or not a custom attachment
  if (!attachment || attachment.type !== 'custom_attachment') {
    return null;
  }

  const renderAttachmentContent = () => {
    const { attachment_type, appwrite_url, local_uri, title } = attachment;
    // Use Appwrite URL if available, fallback to local URI
    const fileUri = appwrite_url || local_uri;
    
    if (attachment_type === 'video') {
      return (
        <Video
          source={{ uri: fileUri }}
          style={{ width: '100%', height: 200 }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
        />
      );
    } else if (attachment_type === 'document') {
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1A1A1A',
          borderRadius: 8,
          padding: 20,
        }}>
          <Ionicons name="document-attach-outline" size={48} color="#FFFFFF" style={{ opacity: 0.7 }} />
          <Text style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontFamily: 'questrial',
            marginTop: 8,
            textAlign: 'center',
            opacity: 0.9,
          }}>
            {title}
          </Text>
        </View>
      );
    } else {
      // Image
      return (
        <Image
          source={{ uri: fileUri }}
          style={{ width: '100%', height: 200 }}
          resizeMode="cover"
        />
      );
    }
  };

  const handleAttachmentPress = async () => {
    const fileUri = attachment.appwrite_url || attachment.local_uri;
    if (fileUri) {
      if (attachment.attachment_type === 'image') {
        // For images, show full screen modal
        setShowFullScreenImage(true);
      } else if (attachment.attachment_type === 'document') {
        // For documents, try to open with default app first (works for URLs)
        try {
          await Linking.openURL(fileUri);
        } catch (error) {
          console.warn('Failed to open document with default app:', error);
          // Fallback to sharing if it's a local file
          if (attachment.local_uri && !attachment.appwrite_url) {
            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (isSharingAvailable) {
              try {
                await Sharing.shareAsync(attachment.local_uri);
              } catch (shareError) {
                console.warn('Failed to share document:', shareError);
                Alert.alert('Error', 'Unable to open or share this document.');
              }
            } else {
              Alert.alert('Error', 'Unable to open this document.');
            }
          } else {
            Alert.alert('Error', 'Unable to open this document.');
          }
        }
      } else {
        // For other file types, try to open with default app
        try {
          await Linking.openURL(fileUri);
        } catch (error) {
          console.warn('Failed to open file:', error);
          Alert.alert('Error', 'Unable to open this file.');
        }
      }
    }
  };

  return (
    <>
      <View style={{
        backgroundColor: '#2A2A2A',
        borderRadius: 16,
        overflow: 'hidden',
        marginVertical: 8,
        marginLeft: 12,
        marginRight: -2,
        borderWidth: 1,
        borderColor: '#404040',
        alignSelf: 'flex-end',
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      }}>
        {/* Attachment Content */}
        <TouchableOpacity
          onPress={handleAttachmentPress}
          activeOpacity={0.8}
        >
          <View style={{ height: 200 }}>
            {renderAttachmentContent()}
          </View>
        </TouchableOpacity>
        
        {/* Tip Information */}
        <View style={{
          backgroundColor: '#1A1A1A',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: '#404040',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontFamily: 'questrial',
              fontWeight: '600',
              opacity: 0.9,
            }}>
              Tip: {formatPrice((attachment.tip_amount?.toFixed(2) || '0.00'), attachment.currency || 'usd')}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Full Screen Image Modal */}
      <Modal
        visible={showFullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullScreenImage(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 20,
              padding: 10,
            }}
            onPress={() => setShowFullScreenImage(false)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
            onPress={() => setShowFullScreenImage(false)}
            activeOpacity={1}
          >
            <Image
              source={{ uri: attachment.appwrite_url || attachment.local_uri }}
              style={{
                width: '100%',
                height: '100%',
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};