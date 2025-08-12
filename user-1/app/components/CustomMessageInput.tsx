import { uploadFileToAppwrite } from '@/lib/appwrite';
import { formatPrice, getCurrencyInfo } from '@/lib/currency';
import { createTipPaymentIntent } from '@/lib/tip-payment';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MessageInput } from 'stream-chat-react-native';
import { MessageSentAnimation } from './MessageSentAnimation';
import StripePaymentSheet from './StripePaymentSheet';
import { UploadAnimation } from './UploadAnimation';

interface CustomMessageInputProps {
  currentChatType: string;
  setSelectedAttachment: (attachment: any) => void;
  selectedAttachment: any;
  tipAmount: number;
  setTipAmount: (amount: number) => void;
  currentChannel: any;
  creatorCurrency: string;
  creatorName: string;
  userId: string;
  creatorId: string;
  isThreadInput?: boolean;
}

export const CustomMessageInput: React.FC<CustomMessageInputProps> = ({ 
  currentChatType, 
  setSelectedAttachment,
  selectedAttachment,
  tipAmount,
  setTipAmount,
  currentChannel,
  creatorCurrency,
  creatorName,
  userId,
  creatorId,
  isThreadInput = false
}) => {
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showStripeSheet, setShowStripeSheet] = useState(false);
  const [pendingMessageData, setPendingMessageData] = useState<any>(null);
  const [showUploadAnimation, setShowUploadAnimation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [showMessageSentAnimation, setShowMessageSentAnimation] = useState(false);
  const [sentTipAmount, setSentTipAmount] = useState('');

  // Import tip payment logic from separate file
  const createTipPaymentIntentWrapper = async (amount: number, interval: string, creatorName: string, currency?: string) => {
    return createTipPaymentIntent(amount, interval, creatorName, currency, currentChannel, userId);
  };

  // Handle successful payment - send the pending message
  const handlePaymentSuccess = async () => {
    try {
      if (!pendingMessageData || !currentChannel) {
        console.error('❌ No pending message data or current channel');
        return;
      }

      console.log('✅ Payment successful! Sending message...');
      console.log('📤 Sending message with data:', JSON.stringify(pendingMessageData, null, 2));
      
      // Send the message that was prepared before payment
      await currentChannel.sendMessage(pendingMessageData);
      
      console.log('✅ Message sent successfully after payment');
      
      // Store tip amount for success animation
      const tipAmountFormatted = formatPrice(pendingMessageData.attachments[0].tip_amount.toFixed(2), pendingMessageData.attachments[0].currency);
      setSentTipAmount(tipAmountFormatted);
      
      // Reset state
      setPendingMessageData(null);
      setSelectedAttachment(null);
      setTipAmount(5);
      setShowStripeSheet(false);
      
      // Show custom success animation instead of alert
      setShowMessageSentAnimation(true);
      
    } catch (error) {
      console.error('❌ Error sending message after payment:', error);
      Alert.alert('Error', `Payment was successful but failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle payment cancellation/failure
  const handlePaymentClose = () => {
    console.log('💳 Payment cancelled or failed');
    setShowStripeSheet(false);
    // Keep pending message data in case user wants to try again
  };

  // Custom upload function with progress animation
  const uploadWithAnimation = async (fileUri: string, fileName: string, mimeType: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Start upload animation
        setUploadFileName(fileName);
        setUploadProgress(0);
        setShowUploadAnimation(true);
        setShowAttachmentModal(false); // Close attachment modal during upload

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = Math.min(prev + Math.random() * 15 + 5, 95);
            return newProgress;
          });
        }, 200);

        // Start actual upload
        const uploadResult = await uploadFileToAppwrite(fileUri, fileName, mimeType);
        
        // Complete progress
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Wait a moment to show completion
        setTimeout(() => {
          setShowUploadAnimation(false);
          resolve(uploadResult);
        }, 800);

      } catch (error) {
        setShowUploadAnimation(false);
        reject(error);
      }
    });
  };

    const handleImagePicker = async () => {
    console.log('🖼️ Starting image picker...');
    try {
      // Request permissions
      console.log('🔐 Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📋 Permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Permission denied');
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }

      console.log('📱 Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      console.log('📋 Image picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0,
        assets: result.assets
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📄 Selected asset:', {
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height
        });
        
        const attachmentData = {
          uri: asset.uri,
          type: asset.type || 'image',
          fileName: asset.fileName || 'image',
          fileSize: asset.fileSize || 0,
        };
        
        console.log('💾 Setting selected attachment:', attachmentData);
        setSelectedAttachment(attachmentData);
        console.log('📱 Showing preview in same modal');
      } else {
        console.log('❌ No asset selected or picker canceled');
      }
    } catch (error) {
      console.error('❌ Error picking image/video:', error);
      Alert.alert('Error', 'Failed to pick image or video.');
    }
  };

    const handleDocumentPicker = async () => {
    console.log('📄 Starting document picker...');
    try {
      console.log('📱 Launching document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      console.log('📋 Document picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0,
        assets: result.assets
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📄 Selected document:', {
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType
        });
        
        // Copy file to permanent location to prevent it from being cleaned up
        const fileName = asset.name || `document_${Date.now()}`;
        const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
        
        console.log('📁 Copying file to permanent location...');
        console.log('📁 From:', asset.uri);
        console.log('📁 To:', permanentUri);
        
        try {
          await FileSystem.copyAsync({
            from: asset.uri,
            to: permanentUri
          });
          
          console.log('✅ File copied successfully to permanent location');
          
          const attachmentData = {
            uri: permanentUri, // Use permanent URI instead of temporary one
            type: 'document',
            fileName: fileName,
            fileSize: asset.size || 0,
            originalUri: asset.uri, // Keep original for reference
          };
          
          console.log('💾 Setting selected document with permanent URI:', attachmentData);
          setSelectedAttachment(attachmentData);
          console.log('📱 Showing preview in same modal');
        } catch (copyError) {
          console.error('❌ Failed to copy file to permanent location:', copyError);
          // Fallback to original URI if copy fails
          const attachmentData = {
            uri: asset.uri,
            type: 'document',
            fileName: asset.name || 'document',
            fileSize: asset.size || 0,
          };
          setSelectedAttachment(attachmentData);
        }
      } else {
        console.log('❌ No document selected or picker canceled');
      }
    } catch (error) {
      console.error('❌ Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

    const handleCamera = async () => {
    console.log('📷 Starting camera...');
    try {
      // Request permissions
      console.log('🔐 Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('📋 Camera permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Camera permission denied');
        Alert.alert('Permission needed', 'Please grant permission to access your camera.');
        return;
      }

      console.log('📱 Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.All,
      });

      console.log('📋 Camera result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0,
        assets: result.assets
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📄 Camera asset:', {
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height
        });
        
        const attachmentData = {
          uri: asset.uri,
          type: asset.type || 'image',
          fileName: asset.fileName || 'image',
          fileSize: asset.fileSize || 0,
        };
        
        console.log('💾 Setting camera attachment:', attachmentData);
        setSelectedAttachment(attachmentData);
        console.log('📱 Showing preview in same modal');
      } else {
        console.log('❌ No camera asset captured or canceled');
      }
    } catch (error) {
      console.error('❌ Error taking photo/video:', error);
      Alert.alert('Error', 'Failed to take photo or video.');
    }
  };

  // For group chats, show a message that encourages thread replies (unless it's a thread input)
  if (currentChatType === 'group' && !isThreadInput) {
    return (
      <View style={{
        backgroundColor: 'transparent',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 0,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
        flexDirection: 'row',
      }}>
        <Ionicons 
          name="arrow-up-circle-outline" 
          size={30} 
          color="#1A1A1A" 
          style={{ marginRight: 8, marginTop: -30 }} 
        />
        <Text style={{
          color: '#1A1A1A',
          fontSize: 25,
          fontFamily: 'MuseoModerno-Regular',
          textAlign: 'center',
          fontWeight: '600',
          marginTop: -30,
        }}>
          Tap to reply in a thread
        </Text>
      </View>
    );
  }
  
  // For thread input, use simple MessageInput
  if (isThreadInput || currentChatType === 'thread') {
    return (
      <MessageInput 
        additionalTextInputProps={{
          placeholder: 'Reply to thread...',
          placeholderTextColor: '#999999',
          style: {
            fontSize: 16,
            fontFamily: 'questrial',
            color: '#1A1A1A',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }
        }}
      />
    );
  }
  
  // For direct messages, use custom message input with attachment button
  return (
    <View style={{ backgroundColor: 'white', paddingBottom: 15 }}>
            <MessageInput 
        InputButtons={() => (
          <TouchableOpacity
            onPress={() => setShowAttachmentModal(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={36} color="#000000" />
          </TouchableOpacity>
        )}
      />
      
      {/* Attachment Modal with Preview */}
      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          // Only allow closing via close button, not back button
          return;
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
            }}
            activeOpacity={1}
            onPress={() => {
              // Do nothing - prevent closing on outside tap
            }}
          />
          <View
            style={{
      backgroundColor: '#1A1A1A',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingBottom: 40,
              paddingHorizontal: 20,
              maxHeight: selectedAttachment ? '80%' : 'auto',
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: '#666666',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />
            
            {!selectedAttachment ? (
              // Attachment selection view
              <>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 20,
                  fontFamily: 'questrial',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  marginBottom: 30,
                }}>
                  Send Attachment
                </Text>
                
                <View style={{ gap: 16 }}>
                  <TouchableOpacity
                    onPress={handleCamera}
            style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      backgroundColor: '#2A2A2A',
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="camera" size={24} color="" style={{ marginRight: 16 }} />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'questrial',
                      flex: 1,
                    }}>
                      Camera
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#666666" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleImagePicker}
              style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      backgroundColor: '#2A2A2A',
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="images" size={24} color="" style={{ marginRight: 16 }} />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'questrial',
                      flex: 1,
                    }}>
                      Photo & Video Library
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#666666" />
                  </TouchableOpacity>
                  
            <TouchableOpacity
                    onPress={handleDocumentPicker}
              style={{
                      flexDirection: 'row',
                alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      backgroundColor: '#2A2A2A',
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="document" size={24} color="" style={{ marginRight: 16 }} />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'questrial',
                      flex: 1,
                    }}>
                      Document
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#666666" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  onPress={() => setShowAttachmentModal(false)}
                  style={{
                    marginTop: 30,
                    paddingVertical: 16,
                    backgroundColor: '',
                    borderRadius: 12,
                alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontFamily: 'questrial',
                    fontWeight: 'bold',
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
                        ) : (
              // Preview and tip view
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                    <Text style={{
                      color: '#FFFFFF',
                  fontSize: 24,
                      fontFamily: 'questrial',
                  fontWeight: 'bold',
                  marginBottom: 20,
                  textAlign: 'center',
                    }}>
                  Preview & Tip
                    </Text>
          
                {/* Preview */}
            <View style={{
                  width: '100%',
                  height: 250,
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 15,
                  backgroundColor: '#1A1A1A',
                }}>
                  {selectedAttachment?.type === 'video' ? (
                    <Video
                      source={{ uri: selectedAttachment.uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.CONTAIN}
                      useNativeControls
                    />
                  ) : selectedAttachment?.type === 'document' ? (
                    <View style={{
                      flex: 1,
                      justifyContent: 'center',
              alignItems: 'center',
                      backgroundColor: '#1A1A1A',
            }}>
                      <Ionicons name="document" size={48} color="" />
              <Text style={{
                color: '#FFFFFF',
                        fontSize: 16,
                fontFamily: 'questrial',
                        marginTop: 8,
                        textAlign: 'center',
              }}>
                        {selectedAttachment?.fileName}
              </Text>
            </View>
                  ) : (
                    <Image
                      source={{ uri: selectedAttachment?.uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
          )}
        </View>

                
                
                {/* Tip Amount */}
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontFamily: 'questrial',
                  fontWeight: 'bold',
                  marginBottom: 10,
                }}>
                  Tip Amount: {formatPrice(tipAmount.toString(), creatorCurrency)}
                </Text>
                
                {/* Custom Tip Input */}
    <View style={{
                  width: '100%',
                  marginBottom: 15,
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontFamily: 'questrial',
                    marginBottom: 8,
                  }}>
                    Enter custom amount:
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
      backgroundColor: '#2A2A2A',
      borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}>
      <Text style={{
        color: '#FFFFFF',
                      fontSize: 18,
        fontFamily: 'questrial',
                      marginRight: 8,
      }}>
                      {getCurrencyInfo(creatorCurrency).symbol}
      </Text>
                    <TextInput
                      value={tipAmount.toString()}
                      onChangeText={(text: string) => {
                        const numValue = parseFloat(text) || 0;
                        if (numValue >= 0 && numValue <= 1000) {
                          setTipAmount(numValue);
                        }
                      }}
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        color: '#FFFFFF',
                        fontSize: 18,
                        fontFamily: 'questrial',
                      }}
                      placeholder="0.00"
                      placeholderTextColor="#666666"
                    />
                  </View>
                </View>
                
                {/* Recommended Tip Amounts */}
                <View style={{
                  width: '100%',
                  marginBottom: 15,
                }}>
        <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
          fontFamily: 'questrial',
                    marginBottom: 8,
        }}>
                    Or choose from recommended amounts:
        </Text>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}>
                    {[1, 3, 5, 10, 20].map((amount) => (
            <TouchableOpacity
                        key={amount}
                        onPress={() => setTipAmount(amount)}
              style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                borderRadius: 8,
                          backgroundColor: tipAmount === amount ? '' : '#1A1A1A',
                          borderWidth: 1,
                          borderColor: tipAmount === amount ? '' : '#666666',
                        }}
                      >
                        <Text style={{
                          color: '#FFFFFF',
                          fontSize: 14,
                          fontFamily: 'questrial',
                          fontWeight: tipAmount === amount ? 'bold' : 'normal',
                        }}>
                          {formatPrice(amount.toString(), creatorCurrency)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* Billing Policy Explanation */}
              <View style={{
                  backgroundColor: '#2A2A2A',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 8,
                  }}>
                    <Ionicons name="information-circle" size={20} color="" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'questrial',
                      fontWeight: 'bold',
                    flex: 1,
                  }}>
                      Billing Policy
                    </Text>
                  </View>
                  <Text style={{
                    color: '#CCCCCC',
                    fontSize: 13,
                    fontFamily: 'questrial',
                    lineHeight: 18,
                  }}>
                    Your tip will only be charged if the creator responds to your message. Higher tips increase your chances of getting a response.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={{
                  flexDirection: 'row',
                  gap: 12,
                  width: '100%',
                }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedAttachment(null);
                      setTipAmount(5);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      backgroundColor: '#666666',
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                  <Text style={{
                    color: '#FFFFFF',
                      fontSize: 16,
                    fontFamily: 'questrial',
                    fontWeight: 'bold',
                  }}>
                      Back
                  </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        console.log('💳 Preparing Stripe payment for tip...');
                        
                        if (!selectedAttachment) {
                          Alert.alert('No attachment', 'Please select an attachment to send with your tip.');
                          return;
                        }
                        
                        // Upload file with custom animation
                        const mimeType = selectedAttachment.type === 'video' ? 'video/mp4' : 
                                        selectedAttachment.type === 'document' ? (selectedAttachment.mimeType || 'application/octet-stream') : 'image/jpeg';
                        
                        console.log('⬆️ Uploading file to Appwrite storage with animation...');
                        const appwriteFileUrl = await uploadWithAnimation(
                          selectedAttachment.uri,
                          selectedAttachment.fileName || 'attachment',
                          mimeType
                        );
                        
                        console.log('✅ File uploaded, URL:', appwriteFileUrl);
                        
                        // Prepare message data but don't send yet - wait for payment
                        const messageData = {
                          text: `💝 Tip: ${formatPrice(tipAmount.toFixed(2), creatorCurrency)}`,
                          attachments: [
                            {
                              type: 'custom_attachment',
                              appwrite_url: appwriteFileUrl,
                              local_uri: selectedAttachment.uri,
                              file_size: selectedAttachment.fileSize || 0,
                              title: selectedAttachment.fileName || 'Attachment',
                              mime_type: mimeType,
                              attachment_type: selectedAttachment.type,
                              tip_amount: tipAmount,
                              currency: creatorCurrency,
                              timestamp: new Date().toISOString(),
                            },
                          ],
                        };

                        console.log('💾 Storing message data for after payment...');
                        
                        // Store message data for after successful payment
                        setPendingMessageData(messageData);
                        
                        // Open Stripe payment sheet (attachment modal already closed by uploadWithAnimation)
                        setShowStripeSheet(true);
                        
                      } catch (error) {
                        console.error('❌ Error preparing payment:', error);
                        Alert.alert('Error', `Failed to prepare payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      backgroundColor: '',
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'questrial',
                      fontWeight: 'bold',
                    }}>
                      Send with Tip
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
                  )}
                </View>
              </View>
      </Modal>

      {/* Upload Animation */}
      <UploadAnimation 
        visible={showUploadAnimation}
        fileName={uploadFileName}
        progress={uploadProgress}
      />

      {/* Message Sent Success Animation */}
      <MessageSentAnimation 
        visible={showMessageSentAnimation}
        tipAmount={sentTipAmount}
        currency={creatorCurrency}
        onComplete={() => setShowMessageSentAnimation(false)}
      />

      {/* Stripe Payment Sheet for Tips */}
      <StripePaymentSheet
        visible={showStripeSheet}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        amount={tipAmount}
        interval="month" // Not used for tips, but required by component
        creatorName={creatorName}
        currency={creatorCurrency}
                  createIntentFunc={createTipPaymentIntentWrapper}
        navigateOnSuccess={false} // Stay on chat screen
      />
    </View>
  );
};