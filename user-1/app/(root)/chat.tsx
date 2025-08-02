import { dataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { imageCache } from '@/lib/image-cache';
import { client } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Audio, ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, ImageBackground, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Client, Databases, Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel, Chat, DeepPartial, MessageAvatar, MessageInput, MessageList, MessageSimple, OverlayProvider, ReactionData, Theme, Thread, useMessageContext, useMessagesContext, useThreadContext } from 'stream-chat-react-native';
import loadingIcon from '../../assets/icon/loading-icon.png';
import { checkPaidContentPurchase, config, createPaidContentPaymentIntent, getCurrentUser } from '../../lib/appwrite';
import StripePaymentSheet from '../components/StripePaymentSheet';

// Declare global interface for chat screen handlers
declare global {
  var chatScreenHandlers: {
    handleLongPressMessage: (payload: any) => void;
    setSelectedMessage: (message: any) => void;
    setShowCustomModal: (show: boolean) => void;
  } | null;
}

// Cache for profile images to avoid repeated database calls
const profileImageCache = new Map<string, string>();

// Custom Avatar component that fetches profile images
const CustomMessageAvatar = (props: any) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Get message from MessageContext instead of props
  const messageContext = useMessageContext();
  const message = messageContext?.message || props.message;
  const channel = messageContext?.channel;
  
  // Check if we're in a thread
  const threadContext = useThreadContext();
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  
  // Function to check if we should show avatar based on 5-minute logic (same as timestamp)
  const shouldShowAvatar = () => {
    if (!message?.created_at || !message?.user?.id) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel?.state.messages || {});
    
    // Find all messages from the same user
    const userMessages = messages
      .filter((msg: any) => msg.user?.id === currentUserId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentMessageIndex = userMessages.findIndex((msg: any) => msg.id === message.id);
    
    // If this is the last message from this user overall, show avatar
    if (currentMessageIndex === userMessages.length - 1) {
      return true;
    }
    
    // Get the next message from the same user
    const nextMessage = userMessages[currentMessageIndex + 1];
    if (!nextMessage?.created_at) {
      return true; // Show avatar if we can't find next message
    }
    
    const nextMessageTime = new Date(nextMessage.created_at);
    const timeDifference = nextMessageTime.getTime() - currentMessageTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show avatar if more than 5 minutes will pass before the next message
    return timeDifference >= fiveMinutesInMs;
  };
  
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!message || !message.user || !message.user.id) {
        return;
      }
      
      const userId = message.user.id;
      
      console.log(`👤 [CustomMessageAvatar] Loading avatar for user: ${userId.substring(0, 8)}...`);
      
      // Check dataCache first
      const cachedProfileData = dataCache.get(`profile_${userId}`) as {profileImageUri: string} | null;
      if (cachedProfileData && cachedProfileData.profileImageUri) {
        console.log(`✅ [CustomMessageAvatar] Profile data cache HIT`);
        const cachedImageUri = await imageCache.getCachedImageUri(cachedProfileData.profileImageUri);
        setProfileImage(cachedImageUri);
        console.log(`✅ [CustomMessageAvatar] Avatar loaded from cache`);
          return;
      }
      
      console.log(`❌ [CustomMessageAvatar] Profile data cache MISS - querying database...`);
      
      try {
        if (!config.endpoint || !config.projectId || !config.databaseId || !config.profileCollectionId) {
          return;
        }

        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query profiles collection for the user's profile image
        const profiles = await databases.listDocuments(
          config.databaseId,
          config.profileCollectionId,
          [Query.equal('userId', userId)]
        );
        
        if (profiles.documents.length > 0) {
          const profileImageUri = profiles.documents[0].compressed_thumbnail;
          if (profileImageUri) {
            console.log(`📊 [CustomMessageAvatar] Database result: Found profile image`);
            
            // Cache the profile data
            dataCache.set(`profile_${userId}`, { profileImageUri }, 10 * 60 * 1000); // 10 minutes
            console.log(`💾 [CustomMessageAvatar] Cached profile data for 10 minutes`);
            
            // Get cached image URI and set it
            const cachedImageUri = await imageCache.getCachedImageUri(profileImageUri);
            setProfileImage(cachedImageUri);
            console.log(`✅ [CustomMessageAvatar] Avatar loaded from database and cached`);
          } else {
            console.log(`⚠️ [CustomMessageAvatar] No profile image found for user`);
          }
        } else {
          console.log(`⚠️ [CustomMessageAvatar] No profile document found for user`);
        }
      } catch (error) {
        console.error('Error fetching user profile image:', error);
      }
    };
    
    fetchProfileImage();
  }, [message?.user?.id]);

  const showAvatar = shouldShowAvatar();

  // If we have a custom profile image, render it
  if (profileImage) {
    return (
      <View style={{
        width: props.size || 32,
        height: props.size || 32,
        borderRadius: (props.size || 32) / 2,
        marginRight: 8,
        overflow: 'hidden',
        backgroundColor: '#2A2A2A',
        opacity: showAvatar ? 1 : 0, // Make invisible but keep space
      }}>
        <Image
          source={{ uri: profileImage }}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fall back to default MessageAvatar if no custom image, also apply opacity
  return (
    <View style={{ opacity: showAvatar ? 1 : 0 }}>
      <MessageAvatar {...props} />
    </View>
  );
};

// Custom Message Input for Group Chat Restrictions
const CustomMessageInput = ({ 
  currentChatType, 
  setSelectedAttachment,
  selectedAttachment,
  tipAmount,
  setTipAmount,
  currentChannel
}: { 
  currentChatType: string;
  setSelectedAttachment: (attachment: any) => void;
  selectedAttachment: any;
  tipAmount: number;
  setTipAmount: (amount: number) => void;
  currentChannel: any;
}) => {
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

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

  // For group chats, show a message that encourages thread replies
  if (currentChatType === 'group') {
    return (
      <View style={{
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
      }}>
        <View style={{
          backgroundColor: '#2A2A2A',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 16,
          alignItems: 'center',
          flexDirection: 'row',
        }}>
          <Ionicons 
            name="chatbubble-outline" 
            size={20} 
            color="#FB2355" 
            style={{ marginRight: 12 }}
          />
          <Text style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontFamily: 'questrial',
            flex: 1,
            textAlign: 'center',
          }}>
            Tap on any message to reply in a thread
          </Text>
          <Ionicons 
            name="arrow-up-circle-outline" 
            size={20} 
            color="#FB2355" 
            style={{ marginLeft: 12 }}
          />
        </View>
        <Text style={{
          color: '#666666',
          fontSize: 12,
          fontFamily: 'questrial',
          textAlign: 'center',
          marginTop: 8,
          fontStyle: 'italic',
        }}>
          Group chats are thread-only to keep conversations organized
        </Text>
      </View>
    );
  }
  
  // For direct messages, use custom message input with attachment button
  return (
    <View style={{ backgroundColor: '#1A1A1A' }}>
            <MessageInput 
        InputButtons={() => (
          <TouchableOpacity
            onPress={() => setShowAttachmentModal(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#FB2355',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
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
                    <Ionicons name="camera" size={24} color="#FB2355" style={{ marginRight: 16 }} />
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
                    <Ionicons name="images" size={24} color="#FB2355" style={{ marginRight: 16 }} />
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
                    <Ionicons name="document" size={24} color="#FB2355" style={{ marginRight: 16 }} />
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
                    backgroundColor: '#FB2355',
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
                      <Ionicons name="document" size={48} color="#FB2355" />
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
                  Tip Amount: ${tipAmount}
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
                      $
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
                          backgroundColor: tipAmount === amount ? '#FB2355' : '#1A1A1A',
                          borderWidth: 1,
                          borderColor: tipAmount === amount ? '#FB2355' : '#666666',
                        }}
                      >
                        <Text style={{
                          color: '#FFFFFF',
                          fontSize: 14,
                          fontFamily: 'questrial',
                          fontWeight: tipAmount === amount ? 'bold' : 'normal',
                        }}>
                          ${amount}
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
                    <Ionicons name="information-circle" size={20} color="#FB2355" style={{ marginRight: 8, marginTop: 2 }} />
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
                        console.log('📤 Sending custom attachment with tip...');
                        
                        // Create a custom message with tip and attachment data
                        const messageData = {
                          text: `💝 Tip: $${tipAmount.toFixed(2)}`,
                          attachments: [
                            {
                              type: 'custom_attachment',
                              local_uri: selectedAttachment.uri,
                              file_size: selectedAttachment.fileSize || 0,
                              title: selectedAttachment.fileName || 'Attachment',
                              mime_type: selectedAttachment.type === 'video' ? 'video/mp4' : 
                                        selectedAttachment.type === 'document' ? (selectedAttachment.mimeType || 'application/octet-stream') : 'image/jpeg',
                              attachment_type: selectedAttachment.type,
                              tip_amount: tipAmount,
                              timestamp: new Date().toISOString(),
                            },
                          ],
                        };

                        console.log('📤 Sending custom message with data:', JSON.stringify(messageData, null, 2));
                        
                        // Send message with custom attachment
                        await currentChannel?.sendMessage(messageData);

                        console.log('✅ Custom message sent successfully');
                        
                        // Close modal and reset state
                        setShowAttachmentModal(false);
                        setSelectedAttachment(null);
                        setTipAmount(5);
                        
                        // Success feedback
                        Alert.alert('Success', `Message sent with $${tipAmount.toFixed(2)} tip!`);
                        
                      } catch (error) {
                        console.error('❌ Error sending message:', error);
                        Alert.alert('Error', 'Failed to send message. Please try again.');
                      }
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      backgroundColor: '#FB2355',
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
    </View>
  );
};

// Custom theme for the chat - focused on timestamp visibility
const getTheme = (): DeepPartial<Theme> => ({
  colors: {
    black: '#1A1A1A',
    white: '#FFFFFF',
    primary: '#FB2355',
    grey: '#2A2A2A',
    grey_whisper: '#404040',
    grey_gainsboro: '#666666',
    grey_light: '#999999',
    grey_medium: '#CCCCCC',
    grey_dark: '#FFFFFF',
    accent_blue: '#FB2355',
    accent_green: '#FB2355',
    accent_red: '#FB2355',
  },
  messageInput: {
    container: {
      backgroundColor: '#1A1A1A',
    },
    inputBoxContainer: {
      backgroundColor: '#2A2A2A',
    },
    inputBox: {
      color: '#FFFFFF',
    },
  },
  messageList: {
    container: {
      backgroundColor: '#2A2A2A',
    },
  },
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: '#FB2355',
        borderWidth: 0,
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: '#FB2355',
      },
      markdown: {
        text: {
          color: '#FFFFFF', // White text in message bubbles
        },
        paragraph: {
          color: '#FFFFFF', // White text for paragraphs
        },
        strong: {
          color: '#FFFFFF', // White text for bold text
        },
        em: {
          color: '#FFFFFF', // White text for italic text
        },
      },
    },
  },
});

// Custom MessageStatus component that hides the default timestamp completely
const CustomMessageStatus = () => {
  return null; // Hide the default timestamp completely
};

// Custom Attachment Component for Tips
const CustomTipAttachment = (props: any) => {
  const { attachment } = props;
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  
  // Return null if no attachment or not a custom attachment
  if (!attachment || attachment.type !== 'custom_attachment') {
    return null;
  }

  const renderAttachmentContent = () => {
    const { attachment_type, local_uri, title, tip_amount } = attachment;
    
    if (attachment_type === 'video') {
      return (
        <Video
          source={{ uri: local_uri }}
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
          backgroundColor: '#2A2A2A',
          borderRadius: 8,
          padding: 20,
        }}>
          <Ionicons name="document" size={48} color="#FB2355" />
          <Text style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontFamily: 'questrial',
            marginTop: 8,
            textAlign: 'center',
          }}>
            {title}
          </Text>
        </View>
      );
    } else {
      // Image
      return (
        <Image
          source={{ uri: local_uri }}
          style={{ width: '100%', height: 200 }}
          resizeMode="cover"
        />
      );
    }
  };

  return (
    <>
      <View style={{
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 8,
        marginLeft: 12,
        marginRight: -2,
        borderWidth: 1,
        borderColor: '#FB2355',
        alignSelf: 'flex-end',
        maxWidth: '80%',
      }}>
        {/* Attachment Content */}
        <TouchableOpacity
          onPress={async () => {
            if (attachment.local_uri) {
              if (attachment.attachment_type === 'image') {
                // For images, show full screen modal
                setShowFullScreenImage(true);
              } else if (attachment.attachment_type === 'document') {
                // For documents (including PDFs), use expo-sharing
                const isSharingAvailable = await Sharing.isAvailableAsync();
                if (isSharingAvailable) {
                  try {
                    await Sharing.shareAsync(attachment.local_uri);
                  } catch (error) {
                    console.warn('Failed to share document:', error);
                    Alert.alert('Error', 'Unable to share this document.');
                  }
                } else {
                  Alert.alert('Error', 'Sharing is not available on this device.');
                }
              } else {
                // For other file types, try to open with default app
                Linking.openURL(attachment.local_uri);
              }
            }
          }}
          activeOpacity={0.8}
        >
          <View style={{ height: 200 }}>
            {renderAttachmentContent()}
          </View>
        </TouchableOpacity>
        
        {/* Tip Information */}
        <View style={{
          backgroundColor: '#FB2355',
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="heart" size={20} color="#FFFFFF" />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontFamily: 'questrial',
              fontWeight: 'bold',
              marginLeft: 8,
            }}>
              Tip: ${attachment.tip_amount?.toFixed(2) || '0.00'}
            </Text>
          </View>
          
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontFamily: 'questrial',
              fontWeight: 'bold',
            }}>
              💝
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
              source={{ uri: attachment.local_uri }}
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

// Custom Audio Attachment Component for playing audio messages
const CustomAudioAttachment = (props: any) => {
  const { attachment } = props;
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Refs for managing intervals and timeouts
  const statusCheckRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  // Get message context to access message actions
  const messageContext = useMessageContext();
  const message = messageContext?.message;

  // Animation values for sound bars
  const animValues = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.5),
    new Animated.Value(0.8),
    new Animated.Value(0.4),
    new Animated.Value(0.7),
    new Animated.Value(0.2),
    new Animated.Value(0.6),
    new Animated.Value(0.9),
    new Animated.Value(0.3),
    new Animated.Value(0.5),
  ]).current;
  
  if (attachment?.type !== 'custom_audio') return null;

  // Audio status checking
  const startStatusCheck = (audioSound: Audio.Sound) => {
    if (statusCheckRef.current) {
      clearInterval(statusCheckRef.current);
    }
    
    // Add a small delay before starting to check, to let audio start properly
    setTimeout(() => {
      statusCheckRef.current = setInterval(async () => {
        try {
          const status = await audioSound.getStatusAsync();
          if (status.isLoaded) {
            setCurrentTime(status.positionMillis || 0);
            // Force component re-render for color updates
            setForceUpdate(prev => prev + 1);
            
            // Update sound bar progress in real-time
            updateSoundBarProgress();
            
            // Log less frequently to avoid console spam
            if (status.positionMillis && status.durationMillis && Math.floor(status.positionMillis / 1000) % 2 === 0) {
              console.log('📊 Audio progress:', {
                progress: `${Math.floor(status.positionMillis / 1000)}s / ${Math.floor(status.durationMillis / 1000)}s`,
                percentage: `${Math.round((status.positionMillis / status.durationMillis) * 100)}%`
              });
            }
            
            // Check if audio has finished - be more careful about false positives
            const hasFinished = status.didJustFinish || 
                               (status.positionMillis && status.durationMillis && 
                                status.positionMillis >= status.durationMillis - 100); // 100ms buffer
            
            // Don't use !status.isPlaying as it can be false during loading
            // Only reset if we're sure it's actually finished
            if (hasFinished && isPlaying) {
              console.log('🎵 Audio finished, resetting UI completely');
              resetAudioState(audioSound);
            } else if (!status.isPlaying && status.positionMillis > 1000 && isPlaying) {
              // Only consider it stopped if it was playing for more than 1 second
              console.log('🎵 Audio stopped after playing, resetting UI');
              resetAudioState(audioSound);
            }
          }
        } catch (error) {
          console.error('Status check error:', error);
          stopStatusCheck();
        }
              }, 100) as any; // Check more frequently - every 100ms
      }, 300); // Wait 300ms before starting status checks
  };

  const resetAudioState = async (audioSound: Audio.Sound) => {
    console.log('🔄 Resetting all audio state and UI');
    setIsPlaying(false);
    setCurrentTime(0);
    stopSoundBarAnimation();
    stopStatusCheck();
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    try {
      await audioSound.setPositionAsync(0);
    } catch (error) {
      console.error('Error resetting position:', error);
    }
  };

  const stopStatusCheck = () => {
    if (statusCheckRef.current) {
      clearInterval(statusCheckRef.current);
      statusCheckRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Progress-based sound bar animation
  const updateSoundBarProgress = () => {
    if (!isPlaying || totalDuration === 0) return;
    
    const progress = currentTime / totalDuration; // 0 to 1
    const totalBars = animValues.length;
    const activeBars = Math.floor(progress * totalBars);
    
    // Debug logging (less frequent)
    if (Math.floor(currentTime / 1000) % 3 === 0) {
      console.log('🔍 Progress debug:', {
        currentTime: Math.round(currentTime / 1000),
        totalDuration: Math.round(totalDuration / 1000),
        progress: Math.round(progress * 100) + '%',
        totalBars,
        activeBars
      });
    }
    
    animValues.forEach((animValue, index) => {
      let targetHeight;
      
      if (index < activeBars) {
        // Bars that represent played audio - keep them active
        targetHeight = 0.7 + Math.sin(Date.now() / 200 + index) * 0.2; // Subtle animation
      } else if (index === activeBars && progress > 0) {
        // Current playing bar - make it most prominent
        targetHeight = 0.9 + Math.sin(Date.now() / 100) * 0.1; // More animation
      } else {
        // Future bars - keep them low
        targetHeight = 0.2 + Math.sin(Date.now() / 300 + index) * 0.1; // Very subtle
      }
      
      Animated.timing(animValue, {
        toValue: targetHeight,
        duration: 150,
        useNativeDriver: false,
      }).start();
    });
  };

  const startSoundBarAnimation = () => {
    console.log('🎵 Starting progress-based sound bar animation');
    // The animation will be driven by updateSoundBarProgress
    // which is called from the status check interval
  };

  const stopSoundBarAnimation = () => {
    console.log('🎵 Stopping sound bar animation');
    animValues.forEach((animValue, index) => {
      animValue.stopAnimation();
      // Reset to varied original heights for a more natural look
      const originalHeight = [0.3, 0.5, 0.8, 0.4, 0.7, 0.2, 0.6, 0.9, 0.3, 0.5][index];
      Animated.timing(animValue, {
        toValue: originalHeight,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  };

  const playAudio = async () => {
    try {
      if (sound) {
        // If audio is already loaded, check its status
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            stopSoundBarAnimation();
            stopStatusCheck();
          } else {
            // If audio finished, restart from beginning
            if (status.didJustFinish) {
              await sound.setPositionAsync(0);
            }
            await sound.playAsync();
            setIsPlaying(true);
            startSoundBarAnimation();
            startStatusCheck(sound);
          }
          return;
        }
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load and play new audio
      console.log('🎵 Loading audio:', attachment.asset_url);
      
      // Try to load audio with headers if it's from Appwrite
      const audioSource = attachment.asset_url?.includes('appwrite') 
        ? {
            uri: attachment.asset_url,
            headers: {
              'Accept': 'audio/mp4,audio/m4a,audio/*',
              'Content-Type': 'audio/mp4'
            }
          }
        : { uri: attachment.asset_url };
          
      console.log('🎵 Audio source:', audioSource);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setTotalDuration(status.durationMillis || 0);
            
            // Also check for finish in the callback as backup
            if (status.didJustFinish) {
              console.log('🎵 Audio finished (callback), resetting UI');
              resetAudioState(newSound);
            }
          }
        }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      startSoundBarAnimation();
      startStatusCheck(newSound);
      
      // Set a timeout as final fallback based on duration
      if (totalDuration > 0) {
        timeoutRef.current = setTimeout(() => {
          console.log('🎵 Audio timeout reached, forcing reset');
          resetAudioState(newSound);
        }, totalDuration + 1000) as any; // Add 1 second buffer
      }
      
      console.log('🎵 Audio playing');
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Could not play voice message');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setCurrentTime(0);
      stopSoundBarAnimation();
      stopStatusCheck();
    }
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      stopSoundBarAnimation();
      stopStatusCheck();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sound]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePress = (event: any) => {
    // Prevent event bubbling to avoid opening thread
    event.stopPropagation();
    playAudio();
  };

  const handleLongPress = (event: any) => {
    console.log('🎵 [CustomAudioAttachment] Long press detected on audio');
    event.stopPropagation();
    
    if (message) {
      console.log('✅ [CustomAudioAttachment] Setting selected message for modal');
      
      // Use a more direct approach - find the ChatScreen's state setters
      // We'll use the message context's client to access the app state
      try {
        // Access the global app state through a custom event system
        // Since we can't easily pass props down, we'll use a global reference
        if (global.chatScreenHandlers && global.chatScreenHandlers.handleLongPressMessage) {
          global.chatScreenHandlers.handleLongPressMessage({ message });
          console.log('✅ [CustomAudioAttachment] Called global handler');
        } else {
          console.log('⚠️ [CustomAudioAttachment] Global handlers not available');
        }
      } catch (error) {
        console.log('⚠️ [CustomAudioAttachment] Error calling global handler:', error);
      }
    }
  };

  // Sound Bars Component with Progress
  const SoundBars = () => {
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
    const totalBars = animValues.length;
    const activeBars = Math.floor(progress * totalBars);

    // Debug the actual values being used for colors (less frequent)
    if (Math.floor(currentTime / 1000) % 3 === 0) {
      console.log('🎨 Color debug:', {
        isPlaying,
        progress: Math.round(progress * 100) + '%',
        activeBars,
        currentTime: Math.round(currentTime / 1000),
        totalDuration: Math.round(totalDuration / 1000)
      });
    }

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 40,
        justifyContent: 'space-between',
        flex: 1,
        paddingHorizontal: 4,
      }}>
        {animValues.map((animValue, index) => {
          let barColor;
          
          if (!isPlaying) {
            // Not playing - all bars gray
            barColor = '#666';
          } else {
            // During playback, use progress to determine colors
            if (index < activeBars) {
              // Played section - bright pink
              barColor = '#FB2355';
            } else if (index === activeBars && activeBars < totalBars) {
              // Currently playing bar - lighter pink
              barColor = '#FF6B8A';
            } else {
              // Unplayed section - darker gray
              barColor = '#444';
            }
          }
          
          return (
            <Animated.View
              key={index}
              style={{
                flex: 1,
                backgroundColor: barColor,
                marginHorizontal: 1,
                borderRadius: 2,
                height: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 32],
                }),
              }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={{
        backgroundColor: 'transparent',
        margin: -8,
        padding: 0,
        borderRadius: 0,
        overflow: 'visible',
      }}
    >
      <View style={{
        backgroundColor: '#2A2A2A',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        width: 320,
        minHeight: 80,
      }}>
        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            playAudio();
          }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#FB2355',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
          }}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={24} 
            color="white"
            style={{ marginLeft: isPlaying ? 0 : 2 }} // Center play icon
          />
        </TouchableOpacity>

        {/* Content Area */}
        <View style={{ flex: 1, flexDirection: 'column' }}>
          {/* Title and Duration */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 8 
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontFamily: 'questrial',
              fontWeight: '600',
            }}>
              Voice Message
            </Text>
            
            <Text style={{
              color: '#FB2355',
              fontSize: 14,
              fontFamily: 'questrial',
              fontWeight: '500',
            }}>
              {isPlaying && totalDuration > 0 
                ? `${formatTime(currentTime)} / ${formatTime(totalDuration)}`
                : attachment.duration || '0:00'
              }
            </Text>
          </View>

          {/* Sound Bars */}
          <SoundBars />
        </View>
        
        {/* Stop Button when playing */}
        {isPlaying && (
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              stopAudio();
            }}
            style={{ 
              marginLeft: 12,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#444',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name="stop" size={16} color="#FB2355" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Custom Photo Attachment Component
const CustomPhotoAttachment = (props: any) => {
  const { attachment } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string>(attachment.image_url);
  
  // Get message context to access message actions
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  
  if (attachment?.type !== 'custom_photo') return null;

  const isUploading = attachment?.uploading === true;

  // Load cached image on mount
  useEffect(() => {
    const loadCachedImage = async () => {
      try {
        if (attachment.image_url) {
          console.log(`📷 [CustomPhotoAttachment] Loading image for attachment: ${attachment.image_url.substring(0, 50)}...`);
          const cached = await imageCache.getCachedImageUri(attachment.image_url);
          setCachedImageUri(cached);
          console.log(`✅ [CustomPhotoAttachment] Image loaded successfully`);
        }
      } catch (error) {
        console.error('❌ [CustomPhotoAttachment] Failed to load cached image:', error);
      }
    };

    loadCachedImage();
  }, [attachment.image_url]);

  const handlePress = (event: any) => {
    // Prevent event bubbling to avoid opening thread
    event.stopPropagation();
    // TODO: Add full-screen image view functionality
    console.log('Photo pressed:', attachment.image_url);
  };

  const handleLongPress = (event: any) => {
    console.log('📷 [CustomPhotoAttachment] Long press detected on photo');
    event.stopPropagation();
    
    if (message) {
      console.log('✅ [CustomPhotoAttachment] Setting selected message for modal');
      
      // Use the global handlers approach
      try {
        if (global.chatScreenHandlers && global.chatScreenHandlers.handleLongPressMessage) {
          global.chatScreenHandlers.handleLongPressMessage({ message });
          console.log('✅ [CustomPhotoAttachment] Called global handler');
        } else {
          console.log('⚠️ [CustomPhotoAttachment] Global handlers not available');
        }
      } catch (error) {
        console.log('⚠️ [CustomPhotoAttachment] Error calling global handler:', error);
      }
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={{
        backgroundColor: 'transparent',
        marginVertical: 4,
        marginHorizontal: 8,
      }}
    >
      <View style={{
        width: 250,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Loading indicator while image loads */}
        {isLoading && !hasError && (
          <View style={{
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            borderRadius: 12,
            zIndex: 2,
          }}>
            <ActivityIndicator size="large" color="#FB2355" />
          </View>
        )}
        
        {/* Error indicator if image fails to load */}
        {hasError && (
          <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#1A1A1A',
          }}>
            <Ionicons name="image-outline" size={40} color="#666" />
          </View>
        )}

        {/* The actual image */}
        <Image
          source={{ uri: cachedImageUri }}
          style={{
            width: 250,
            height: 200,
            borderRadius: 12,
            backgroundColor: 'transparent',
            opacity: isUploading ? 0.7 : 1,
          }}
          resizeMode="cover"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />

        {/* Caption if available */}
        {attachment.caption && attachment.caption.trim() !== '' && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontFamily: 'questrial',
              lineHeight: 18,
            }}>
              {attachment.caption}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Custom Paid Content Attachment Component
const PaidContentAttachment = (props: any) => {
  const { attachment, onPressIn } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Get message context to access message sender info
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const messageSender = message?.user;

  // Return null if no attachment
  if (!attachment) {
    return null;
  }

  // Check if user has purchased this content
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user?.$id || !attachment?.paid_content_id) return;
      
      try {
        const hasPurchased = await checkPaidContentPurchase(user.$id, attachment.paid_content_id);
        setIsUnlocked(hasPurchased);
      } catch (error) {
        console.error('Error checking purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, user?.$id]);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    // Debug: Log essential data for payment modal
    console.log('Opening payment modal with data:', {
      contentId: attachment?.paid_content_id,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price
    });
    
    // Show Stripe payment modal
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('💳 [PaidContent] Payment successful for paid content');
    console.log('💳 [PaidContent] Invalidating cache for contentId:', attachment?.paid_content_id);
    
    // Clear the purchase status from cache to force refresh
    if (user?.$id && attachment?.paid_content_id) {
      dataCache.delete(`purchase_${user.$id}_${attachment.paid_content_id}`);
      console.log('✅ [PaidContent] Cache invalidated - next check will query database');
    }
    
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  const openImageViewer = () => {
    if (isUnlocked) {
      setShowImageViewer(true);
    }
  };

  const closeImageViewer = () => {
    setShowImageViewer(false);
  };

  if (attachment?.type === 'paid_content') {
    return (
      <>
        <TouchableOpacity
          onPress={openImageViewer}
          style={{
          width: 300,
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
          marginLeft: 0,
          marginRight: 5,
          position: 'relative',
          }}
          activeOpacity={isUnlocked ? 0.8 : 1}
          disabled={!isUnlocked}
        >
          {/* Background Image */}
          <Image
            source={{ uri: attachment?.image_url }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
            resizeMode="cover"
          />
          
          {/* Blur Overlay (only if not unlocked) */}
          {!isUnlocked && (
            <BlurView
              intensity={50}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          )}
          
          {/* Lock Icon and Price (only if not unlocked) */}
          {!isUnlocked && (
            <TouchableOpacity
              onPress={handleUnlock}
              disabled={isUnlocking}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              }}
              activeOpacity={0.8}
            >
              <View style={{
                backgroundColor: 'rgba(251, 35, 85, 0.9)',
                borderRadius: 50,
                width: 80,
                height: 80,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}>
                {isUnlocking ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 'bold',
                      marginTop: 4,
                      fontFamily: 'questrial',
                    }}>
                      ${attachment?.price || '5.00'}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          {/* Unlocked indicator */}
          {isUnlocked && (
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0, 200, 81, 0.9)',
              borderRadius: 16,
              paddingHorizontal: 8,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 'bold',
                marginLeft: 4,
                fontFamily: 'questrial',
              }}>
                Unlocked
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Stripe Payment Modal */}
        <PaidContentPaymentModal
          visible={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          amount={parseFloat(attachment?.price || '5.00')}
          contentTitle="Exclusive Content"
          contentId={attachment?.paid_content_id}
          creatorId={messageSender?.id}
          creatorName={messageSender?.name}
          imageUrl={attachment?.image_url}
          contentType="image"
        />

        {/* Image Viewer Modal */}
        <Modal
          visible={showImageViewer}
          transparent={true}
          animationType="fade"
          onRequestClose={closeImageViewer}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.95)', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <View style={{ 
              width: '95%', 
              maxHeight: '90%', 
              backgroundColor: '#1A1A1A',
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Close Button */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10
                }}
                onPress={closeImageViewer}
              >
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>

              {/* Image Display */}
              <View style={{ alignItems: 'center', padding: 16, paddingTop: 60 }}>
                <Image
                  source={{ uri: attachment?.image_url }}
                  style={{
                    width: '100%',
                    height: 400,
                    borderRadius: 8,
                    backgroundColor: '#2A2A2A'
                  }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return null;
};

// Custom Poll Component with voting functionality
const CustomPollComponent = ({ message, poll }: { message: any; poll: any }) => {
  const { user } = useGlobalContext();
  const [isVoting, setIsVoting] = useState(false);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [localVoteCounts, setLocalVoteCounts] = useState<{[key: string]: number}>({});
  const [localTotalVotes, setLocalTotalVotes] = useState(0);

  useEffect(() => {
    // Get user's current votes from the poll data
    if (poll?.own_votes) {
      const currentVotes = poll.own_votes.map((vote: any) => vote.option_id);
      setUserVotes(currentVotes);
    }
    
    // Initialize local vote counts with server data
    if (poll?.vote_counts_by_option) {
      setLocalVoteCounts(poll.vote_counts_by_option);
    }
    
    // Initialize local total votes
    if (poll?.vote_count !== undefined) {
      setLocalTotalVotes(poll.vote_count);
    }
  }, [poll]);

  const handleVote = async (optionId: string) => {
    if (!client || !message?.id || !poll?.id || isVoting) {
      console.log('Cannot vote: missing client, message ID, poll ID, or already voting');
      return;
    }

    try {
      setIsVoting(true);
      console.log('Casting vote for option:', optionId);

      // Check if user already voted for this option
      const hasVotedForOption = userVotes.includes(optionId);

      // Update UI immediately (optimistic updates)
      if (hasVotedForOption) {
        // Remove vote - update UI immediately
        setUserVotes(prev => prev.filter(id => id !== optionId));
        setLocalVoteCounts(prev => ({
          ...prev,
          [optionId]: Math.max(0, (prev[optionId] || 0) - 1)
        }));
        setLocalTotalVotes(prev => Math.max(0, prev - 1));
      } else {
        // Add vote - update UI immediately
        if (poll.max_votes_allowed === 1) {
          // Single choice poll - remove previous vote and add new one
          const previousVote = userVotes[0];
          if (previousVote) {
            setLocalVoteCounts(prev => ({
              ...prev,
              [previousVote]: Math.max(0, (prev[previousVote] || 0) - 1),
              [optionId]: (prev[optionId] || 0) + 1
            }));
          } else {
            setLocalVoteCounts(prev => ({
              ...prev,
              [optionId]: (prev[optionId] || 0) + 1
            }));
            setLocalTotalVotes(prev => prev + 1);
          }
          setUserVotes([optionId]);
        } else {
          // Multiple choice poll - add to existing votes
          setUserVotes(prev => [...prev, optionId]);
          setLocalVoteCounts(prev => ({
            ...prev,
            [optionId]: (prev[optionId] || 0) + 1
          }));
          setLocalTotalVotes(prev => prev + 1);
        }
      }

      // Now make the API call
      if (hasVotedForOption) {
        // Remove vote
        const voteToRemove = poll.own_votes?.find((vote: any) => vote.option_id === optionId);
        if (voteToRemove) {
          await client.removePollVote(message.id, poll.id, voteToRemove.id);
        }
      } else {
        // Add vote
        await client.castPollVote(message.id, poll.id, { option_id: optionId });
      }

      console.log('Vote cast successfully');
    } catch (error) {
      console.error('Error voting on poll:', error);
      
      // Revert optimistic updates on error
      if (poll?.vote_counts_by_option) {
        setLocalVoteCounts(poll.vote_counts_by_option);
      }
      if (poll?.vote_count !== undefined) {
        setLocalTotalVotes(poll.vote_count);
      }
      if (poll?.own_votes) {
        const currentVotes = poll.own_votes.map((vote: any) => vote.option_id);
        setUserVotes(currentVotes);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const getTotalVotes = () => {
    return localTotalVotes;
  };

  const getOptionVotes = (optionId: string) => {
    return localVoteCounts[optionId] || 0;
  };

  const getVotePercentage = (optionId: string) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    const optionVotes = getOptionVotes(optionId);
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const isVotedOption = (optionId: string) => {
    return userVotes.includes(optionId);
  };

  return (
    <View style={{
      backgroundColor: '#2A2A2A',
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      marginHorizontal: 12,
      borderWidth: 1,
      borderColor: '#404040',
    }}>
      {/* Poll Title */}
      <Text style={{
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'questrial',
        marginBottom: 4,
      }}>
        {poll?.name || 'Poll'}
      </Text>

      {/* Poll Description */}
      {poll?.description && (
        <Text style={{
          color: '#CCCCCC',
          fontSize: 14,
          fontFamily: 'questrial',
          marginBottom: 12,
        }}>
          {poll.description}
        </Text>
      )}

      {/* Poll Options */}
      <View style={{ marginBottom: 12 }}>
        {poll?.options?.map((option: any, index: number) => {
          const isVoted = isVotedOption(option.id);
          const votes = getOptionVotes(option.id);
          const percentage = getVotePercentage(option.id);
          const totalVotes = getTotalVotes();

          return (
            <TouchableOpacity
              key={option.id || index}
              style={{
                backgroundColor: isVoted ? '#FB2355' : '#404040',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                borderWidth: isVoted ? 2 : 1,
                borderColor: isVoted ? '#FB2355' : '#666666',
                opacity: isVoting ? 0.7 : 1,
              }}
              onPress={() => handleVote(option.id)}
              disabled={isVoting}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  {/* Vote indicator */}
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: isVoted ? '#FFFFFF' : 'transparent',
                    borderWidth: 2,
                    borderColor: isVoted ? '#FFFFFF' : '#CCCCCC',
                    marginRight: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isVoted && (
                      <Ionicons name="checkmark" size={12} color="#FB2355" />
                    )}
                  </View>

                  {/* Option text */}
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'questrial',
                    flex: 1,
                  }}>
                    {option.text}
                  </Text>
                </View>

                {/* Vote count and percentage */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontFamily: 'questrial',
                    fontWeight: 'bold',
                  }}>
                    {votes} vote{votes !== 1 ? 's' : ''}
                  </Text>
                  {totalVotes > 0 && (
                    <Text style={{
                      color: '#CCCCCC',
                      fontSize: 11,
                      fontFamily: 'questrial',
                    }}>
                      {percentage}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Progress bar */}
              {totalVotes > 0 && (
                <View style={{
                  height: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  marginTop: 8,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 2,
                  }} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Poll Footer */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#404040',
      }}>
        <Text style={{
          color: '#CCCCCC',
          fontSize: 12,
          fontFamily: 'questrial',
        }}>
          Total votes: {getTotalVotes()}
        </Text>

        <Text style={{
          color: '#CCCCCC',
          fontSize: 12,
          fontFamily: 'questrial',
        }}>
          {poll?.max_votes_allowed === 1 ? 'Single choice' : 'Multiple choice'}
        </Text>
      </View>

      {/* Poll status */}
      {poll?.is_closed && (
        <View style={{
          backgroundColor: '#666666',
          borderRadius: 6,
          padding: 6,
          marginTop: 8,
          alignItems: 'center',
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: 11,
            fontFamily: 'questrial',
            fontWeight: 'bold',
          }}>
            Poll Closed
          </Text>
        </View>
      )}
    </View>
  );
};

// Custom MessageSimple component that includes visible timestamps with 5-minute logic
const CustomMessageSimple = (props: any) => {
  // Get message from useMessageContext hook
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const channel = messageContext?.channel;
  const { user } = useGlobalContext();
  
  // Check if this message contains a poll (check for poll_id)
  const hasPoll = message?.poll_id || message?.poll;
  

  
  // If message has a poll, render our custom poll component
  if (hasPoll && message?.poll) {
    return (
      <View>
        {/* Show the message text if any */}
        {message.text && message.text !== `📊 ${message.poll.name}` && (
          <View style={{ marginBottom: 8 }}>
            <MessageSimple {...props} />
          </View>
        )}
        {/* Render our custom poll */}
        <CustomPollComponent message={message} poll={message.poll} />
      </View>
    );
  }
  
  // If poll_id exists but no poll data, use default MessageSimple
  if (hasPoll) {
    return <MessageSimple {...props} />;
  }
  
  // Check if we're in a thread
  const threadContext = useThreadContext();
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  
  // Check if we're in a DM channel (channel ID starts with 'dm-')
  const isDMChannel = channel?.id?.startsWith('dm-');
  
  // Check if this is my message
  const isMyMessage = message?.user?.id === user?.$id;
  
  // Function to check if this is the last message in the channel
  const isLastMessage = () => {
    if (!message?.created_at || !channel) return false;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel.state.messages || {});
    
    // Sort all messages by creation time
    const sortedMessages = messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Check if this message is the last one
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    return lastMessage?.id === message.id;
  };

  // Function to check if we should show timestamp based on 5-minute logic
  const shouldShowTimestamp = () => {
    if (!message?.created_at || !message?.user?.id) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel?.state.messages || {});
    
    // Find all messages from the same user
    const userMessages = messages
      .filter((msg: any) => msg.user?.id === currentUserId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentMessageIndex = userMessages.findIndex((msg: any) => msg.id === message.id);
    
    // If this is the last message from this user overall, show timestamp
    if (currentMessageIndex === userMessages.length - 1) {
      return true;
    }
    
    // Get the next message from the same user
    const nextMessage = userMessages[currentMessageIndex + 1];
    if (!nextMessage?.created_at) {
      return true; // Show timestamp if we can't find next message
    }
    
    const nextMessageTime = new Date(nextMessage.created_at);
    const timeDifference = nextMessageTime.getTime() - currentMessageTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show timestamp if more than 5 minutes will pass before the next message
    return timeDifference >= fiveMinutesInMs;
  };

  // Check if message has custom tip attachments
  const hasCustomTipAttachment = message?.attachments?.some((attachment: any) => attachment?.type === 'custom_attachment');

  // Check if message has paid content attachments
  const hasPaidContent = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_content');
  
  // Check if message has paid video attachments
  const hasPaidVideo = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_video');

  // Check if message has blurry file attachments
  const hasBlurryFile = message?.attachments?.some((attachment: any) => attachment?.type === 'blurry_file');

      // Check if message has custom audio or photo attachments
    const hasCustomAudio = message?.attachments?.some((attachment: any) => attachment?.type === 'custom_audio');
    const hasCustomPhoto = message?.attachments?.some((attachment: any) => attachment?.type === 'custom_photo');

    if (hasCustomAudio || hasCustomPhoto) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => {
            if (attachment?.type === 'custom_audio') {
              return (
                <CustomAudioAttachment 
                  key={`custom-audio-${index}`}
                  attachment={attachment}
                />
              );
            } else if (attachment?.type === 'custom_photo') {
              return (
                <CustomPhotoAttachment 
                  key={`custom-photo-${index}`}
                  attachment={attachment}
                />
              );
            }
            return null;
          })}
          
          {/* Add timestamp for custom audio and photo messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
                }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (hasCustomTipAttachment) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-end',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'custom_attachment' ? (
              <CustomTipAttachment 
                key={`custom-tip-${index}`}
                attachment={attachment}
              />
            ) : null
          ))}
          
          {/* Add timestamp for custom tip messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
                }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (hasPaidVideo) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'paid_video' ? (
              <PaidVideoAttachment 
                key={`paid-video-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for paid video messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
                }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (hasBlurryFile) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'blurry_file' ? (
              <BlurryFileAttachment 
                key={`blurry-file-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for blurry file messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
                }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  if (hasPaidContent) {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {/* Render paid content attachments only (no text message) */}
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'paid_content' ? (
              <PaidContentAttachment 
                key={`paid-content-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for paid content messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
                }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  return (
    <View>
      {/* Render the default MessageSimple */}
      <MessageSimple {...props} />
      
      {/* Add our custom timestamp below */}
      {shouldShowTimestamp() && (
        <View style={{ 
          paddingTop: isInThread 
            ? (isLastMessage() ? 2 : 1) // Threads - tightest spacing
            : isDMChannel 
              ? (isLastMessage() ? 6 : 3) // DM channels - medium spacing
              : (isLastMessage() ? 8 : 4), // Group channels - most spacing
          paddingBottom: isInThread 
            ? (isLastMessage() ? 6 : 3) // Threads
            : isDMChannel 
              ? (isLastMessage() ? 10 : 5) // DM channels
              : (isLastMessage() ? 12 : 6), // Group channels
          paddingHorizontal: 12, // Consistent horizontal padding
          marginTop: isInThread 
            ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
            : isDMChannel 
              ? (isLastMessage() ? -30 : -1) // DM channels - moderate spacing
              : (isLastMessage() ? -16 : -2), // Group channels - original spacing
          marginBottom: isInThread 
            ? (isLastMessage() ? 1 : 0) // Threads
            : isDMChannel 
              ? (isLastMessage() ? 3 : 1) // DM channels
              : (isLastMessage() ? 4 : 2), // Group channels
          alignItems: isMyMessage ? 'flex-end' : 'flex-start', // Align right for our messages, left for others
          backgroundColor: 'transparent',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6, // Slightly more space between checkmark and time
            paddingHorizontal: 8, // Internal padding for the timestamp container
            paddingVertical: 3, // Vertical padding for better touch target
            borderRadius: 8, // Rounded background for timestamp
            backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle background
          }}>
            <Ionicons 
              name="checkmark" 
              size={13} // Slightly larger checkmark
              color="#00C851" // Green color
              style={{ opacity: 0.9 }}
            />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12, // Slightly larger timestamp text
              fontWeight: '600', // Medium weight for better readability
              fontFamily: 'questrial',
              opacity: 0.8, // Slightly more visible
              letterSpacing: 0.3, // Better letter spacing
            }}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Create a custom modal component for message actions
const CustomMessageModal = ({ visible, onClose, message, onThreadReply }: {
  visible: boolean;
  onClose: () => void;
  message: any;
  onThreadReply: (message: any) => void;
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const { supportedReactions } = useMessagesContext();
  const { user } = useGlobalContext();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(50);
      rotateAnim.setValue(0);
      
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
      ]).start();
    } else {
      // Cool exit animations with rotation and scale down
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
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, slideAnim, rotateAnim]);

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
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Call onClose after animation completes
      onClose();
      setShowReactions(false);
    });
  };

  // Handle thread reply
  const handleThreadReply = () => {
    handleClose();
    if (message) {
      setTimeout(() => {
        onThreadReply(message);
      }, 50);
    }
  };

  // Handle reaction selection
  const handleReaction = async (reactionType: string) => {
    handleClose();
    
    try {
      if (message && user) {
        // Extract channel ID from message.cid (remove the "messaging:" prefix)
        const channelId = message.cid.replace('messaging:', '');
        const channel = client.channel('messaging', channelId);
        
        // Check if user already reacted with this type
        const existingReaction = message.own_reactions?.find((reaction: any) => 
          reaction.type === reactionType && reaction.user?.id === user.$id
        );
        
        if (existingReaction) {
          // Remove the reaction if it already exists
          await channel.deleteReaction(message.id, reactionType);
        } else {
          // Add the reaction if it doesn't exist
          await channel.sendReaction(message.id, { type: reactionType });
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const renderReactionItem = ({ item }: { item: ReactionData }) => {
    return (
      <TouchableOpacity
        key={item.type}
        style={{
          backgroundColor: '#2A2A2A',
          borderRadius: 25,
          width: 50,
          height: 50,
          justifyContent: 'center',
          alignItems: 'center',
          marginHorizontal: 8,
          marginVertical: 8,
          borderWidth: 2,
          borderColor: '#404040',
          shadowColor: '#FB2355',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}
        onPress={() => handleReaction(item.type)}
        activeOpacity={0.7}
      >
        {item.Icon ? <item.Icon /> : null}
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <>
      <StatusBar style="light" />
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: 'transparent',
      }}>
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

          {/* Custom Modal Content */}
          <Animated.View style={{
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
              { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '15deg']
                })
              }
            ],
            alignSelf: 'center',
          }}>
            <View style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 16,
              marginHorizontal: 24,
              borderWidth: 1,
              borderColor: '#666666',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
              width: 280,
              alignSelf: 'center',
            }}>
              {/* Thread Reply Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  marginBottom: 12,
                  backgroundColor: '#2A2A2A',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#404040',
                }}
                onPress={handleThreadReply}
                activeOpacity={0.8}
              >
                <View style={{
                  backgroundColor: '#FB2355',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                </View>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  flex: 1,
                }}>
                  Reply in Thread
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#666666" />
              </TouchableOpacity>

              {/* Reactions Grid */}
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 8,
                marginBottom: 8,
              }}>
                {supportedReactions?.map((item) => {
                  // Check if user has already reacted with this type
                  const hasUserReacted = message?.own_reactions?.some((reaction: any) => 
                    reaction.type === item.type && reaction.user?.id === user?.$id
                  );
                  
                  return (
                    <TouchableOpacity
                      key={item.type}
                      style={{
                        backgroundColor: '#2A2A2A',
                        borderRadius: 18,
                        width: 36,
                        height: 36,
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: 4,
                        borderWidth: 1,
                        borderColor: hasUserReacted ? '#666666' : '#404040',
                        position: 'relative',
                      }}
                      onPress={() => handleReaction(item.type)}
                      activeOpacity={0.7}
                    >
                      {item.Icon ? <item.Icon /> : null}
                      {hasUserReacted && (
                        <View style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#00C851',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Text style={{
                            color: '#FFFFFF',
                            fontSize: 8,
                            fontWeight: 'bold',
                          }}>
                            ✓
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#404040',
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  alignSelf: 'center',
                  borderWidth: 1,
                  borderColor: '#666666',
                }}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: '500',
                  fontFamily: 'questrial',
                  textAlign: 'center',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </>
  );
};

// Custom reactions for our chat
const customReactions: ReactionData[] = [
  { type: "love", Icon: () => <Text style={{ fontSize: 18 }}>❤️</Text> },
  { type: "like", Icon: () => <Text style={{ fontSize: 18 }}>👍</Text> },
  { type: "haha", Icon: () => <Text style={{ fontSize: 18 }}>😂</Text> },
  { type: "wow", Icon: () => <Text style={{ fontSize: 18 }}>😮</Text> },
  { type: "sad", Icon: () => <Text style={{ fontSize: 18 }}>😢</Text> },
  { type: "angry", Icon: () => <Text style={{ fontSize: 18 }}>😡</Text> },
  { type: "fire", Icon: () => <Text style={{ fontSize: 18 }}>🔥</Text> },
  { type: "100", Icon: () => <Text style={{ fontSize: 18 }}>💯</Text> },
  { type: "party", Icon: () => <Text style={{ fontSize: 18 }}>🎉</Text> },
  { type: "skull", Icon: () => <Text style={{ fontSize: 18 }}>💀</Text> },
];

// Creator Preview Modal Component
const CreatorPreviewModal = ({ 
  visible, 
  onClose, 
  creatorName, 
  creatorThumbnail, 
  channelId 
}: {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  creatorThumbnail: string | null;
  channelId: string;
}) => {
  const { posts, user } = useGlobalContext();
  const [creatorPost, setCreatorPost] = useState<any>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasedContent, setPurchasedContent] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<string>('Videos');
  const [selectedContentItem, setSelectedContentItem] = useState<any | null>(null);
  const [isContentViewerVisible, setIsContentViewerVisible] = useState(false);
  const [isDownloadComplete, setIsDownloadComplete] = useState(false);

  // Get creator ID from channel ID
  const getCreatorId = () => {
    if (channelId?.startsWith('creator-')) {
      return channelId.replace('creator-', '');
    } else if (channelId?.startsWith('dm-')) {
      return channelId.replace('dm-', '').split('-')[0];
    }
    return '';
  };

  // Temporary function definitions to work around import issues
  const getPurchasedContent = async (
    userId: string, 
    contentType?: string, 
    creatorId?: string
  ) => {
    try {
      const { Query } = await import('react-native-appwrite');
      const { config, databases } = await import('../../lib/appwrite');
      
      const queries = [Query.equal('userId', userId)];
      
      // Add content type filter if specified
      if (contentType) {
        queries.push(Query.equal('contentType', contentType));
      }
      
      // Add creator filter if specified
      if (creatorId) {
        queries.push(Query.equal('creatorId', creatorId));
      }
      
      console.log(`[Query] Filtering purchased content with:`, { userId, contentType, creatorId });

      const response = await databases.listDocuments(
        config.databaseId || '',
        '686a99d3002ec49567b3', // Paid content purchases collection ID
        queries
      );
      
      console.log(`[Query Result] Found ${response.documents.length} documents.`);
      response.documents.forEach((doc, index) => {
        console.log(` -> Doc ${index + 1}: ID=${doc.$id}, Type=${doc.contentType}, Title=${doc.title || 'N/A'}`);
      });

      return response.documents;
    } catch (error) {
      console.error('Error fetching purchased content:', error);
      return [];
    }
  };

  // Find creator's post data and location
  useEffect(() => {
    const fetchCreatorData = async () => {
      if (visible && posts.length > 0) {
        const creatorId = getCreatorId();
        const found = posts.find((p: any) => p.$id === creatorId);
        setCreatorPost(found);
        
        // Fetch location from photos collection
        try {
          const { config, databases } = await import('../../lib/appwrite');
          const { Query } = await import('react-native-appwrite');
          
          // Query photos collection for the creator's location
          const photos = await databases.listDocuments(
            config.databaseId!,
            config.photoCollectionId!,
            [Query.equal('IdCreator', creatorId)]
          );
          
          if (photos.documents.length > 0) {
            // Update the creator post with location data
            setCreatorPost((prev: any) => ({
              ...prev,
              PhotosLocation: photos.documents[0].PhotosLocation
            }));
          }
        } catch (error) {
          console.error('Error fetching creator location:', error);
        }
        
        setLoading(false);
      }
    };
    
    fetchCreatorData();
  }, [visible, posts, channelId]);

  // Get follower count and purchased content
  useEffect(() => {
    const fetchData = async () => {
      if (creatorName && user) {
        try {
          // Get follower count
          const { getSubscriptionCount } = await import('../../lib/appwrite');
          const count = await getSubscriptionCount(creatorName);
          setFollowerCount(count);

          // Get purchased content
          setIsLoadingContent(true);
          const { getPurchasedContent } = await import('../../lib/appwrite');
          
          // Map content type from picker to database values
          let dbContentType: string | undefined;
          switch (selectedContentType) {
            case 'Videos':
              dbContentType = 'video';
              break;
            case 'Photos':
              dbContentType = 'image';
              break;
            case 'Files':
              dbContentType = 'file';
              break;
          }
          
          // Get creator ID from channel ID
          const creatorId = getCreatorId();
          
          const content = await getPurchasedContent(user.$id, dbContentType, creatorId);
          setPurchasedContent(content);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setIsLoadingContent(false);
        }
      }
    };
    
    if (visible && creatorName && user) {
      fetchData();
    }
  }, [visible, creatorName, user, selectedContentType]);

  // Preload image
  useEffect(() => {
    if (creatorPost && creatorThumbnail) {
      Image.prefetch(creatorThumbnail)
        .then(() => setImageLoaded(true))
        .catch(() => setImageLoaded(true));
    } else {
      setImageLoaded(true);
    }
  }, [creatorPost, creatorThumbnail]);

  // Content viewer functions
  const openContentItem = (item: any) => {
    setSelectedContentItem(item);
    setIsContentViewerVisible(true);
    setIsDownloadComplete(false); // Reset download state for new item
  };

  const closeContentViewer = () => {
    setIsContentViewerVisible(false);
    setSelectedContentItem(null);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const shareContent = async () => {
    if (!selectedContentItem) return;

    setIsProcessing(true);
    try {
      // Check if imageUri exists
      if (!selectedContentItem.imageUri) {
        Alert.alert('Error', 'Content URL is not available');
        return;
      }

      // Convert Appwrite view URL to download URL
      const downloadUrl = selectedContentItem.imageUri.includes('/view?')
        ? selectedContentItem.imageUri.replace('/view?', '/download?').concat('&output=attachment')
        : selectedContentItem.imageUri;

      // Generate filename based on content type
      const getFileExtension = (type: string) => {
        switch (type) {
          case 'image': return 'jpg';
          case 'video': return 'mp4';
          case 'file': return 'pdf';
          default: return 'file';
        }
      };
      
      const fileName = selectedContentItem.title || `content_${selectedContentItem.$id}.${getFileExtension(selectedContentItem.contentType || '')}`;
      const localFileUri = FileSystem.documentDirectory + fileName;

      // Download the file
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localFileUri
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        Alert.alert('Error', 'Failed to download content');
        return;
      }

      // Check if it's an image or video
      const contentType = selectedContentItem.contentType || '';
      const isImageOrVideo = contentType === 'image' || contentType === 'video';

      if (isImageOrVideo) {
        // For photos/videos: Save to device gallery
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please grant permission to save to your photo library');
          return;
        }

        await MediaLibrary.saveToLibraryAsync(result.uri);
        setIsDownloadComplete(true);
      } else {
        // For files: Share using sharing API
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            dialogTitle: `Share ${selectedContentItem.title || 'Content'}`,
          });
          setIsDownloadComplete(true);
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      }

      // Clean up the temporary file
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    } catch (error) {
      console.error('Error processing content:', error);
      Alert.alert(
        'Error',
        'Failed to process content. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionText = () => {
    if (!selectedContentItem) return 'Download';
    
    const contentType = selectedContentItem.contentType || '';
    const isImageOrVideo = contentType === 'image' || contentType === 'video';
    
    if (isDownloadComplete) {
      return 'Done';
    }
    
    if (isProcessing) {
      return isImageOrVideo ? 'Downloading...' : 'Sharing...';
    }
    
    return isImageOrVideo ? 'Download' : 'Share';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.9)', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <View style={{ 
          width: '95%', 
          maxWidth: 400,
          backgroundColor: '#1A1A1A',
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.5,
          shadowRadius: 30,
          elevation: 20
        }}>
          {/* Header with close button */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#333'
          }}>
            <Text style={{ 
              color: 'white', 
              fontSize: 18, 
              fontWeight: 'bold', 
              fontFamily: 'questrial'
            }}>
              Creator Profile
            </Text>
            <TouchableOpacity 
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#333',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 700 }}
          >
            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FB2355" />
                <Text style={{ color: 'white', marginTop: 16, fontFamily: 'questrial' }}>
                  Loading profile...
                </Text>
              </View>
            ) : (
              <>
                {/* Creator Image */}
                <View style={{
                  width: '100%',
                  height: 200,
                  backgroundColor: '#2A2A2A',
                  position: 'relative'
                }}>
                  {creatorThumbnail ? (
                    <Image
                      source={{ uri: creatorThumbnail }}
                      style={{
                        width: '100%',
                        height: '100%',
                        opacity: imageLoaded ? 1 : 0
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: '100%',
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#2A2A2A'
                    }}>
                      <Text style={{ 
                        fontSize: 48,
                        fontWeight: 'bold',
                        color: 'white', 
                        fontFamily: 'questrial'
                      }}>
                        {creatorName?.charAt(0)?.toUpperCase() || 'C'}
                      </Text>
                    </View>
                  )}
                  
                  {/* Gradient overlay */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 80
                    }}
                  />
                  
                  {/* Creator name overlay */}
                  <View style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    right: 16
                  }}>
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 24, 
                      fontWeight: 'bold', 
                      fontFamily: 'questrial',
                      textShadowColor: 'rgba(0,0,0,0.8)',
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 4
                    }}>
                      {creatorName || 'Creator'}
                    </Text>
                  </View>
                </View>

                {/* Stats and Info */}
                <View style={{ padding: 20 }}>
                  {/* Stats Row */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-around',
                    marginBottom: 20,
                    paddingVertical: 16,
                    backgroundColor: '#2A2A2A',
                    borderRadius: 12
                  }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                        fontFamily: 'questrial'
                      }}>
                        {followerCount}
                      </Text>
                      <Text style={{
                        color: '#B9B9B9',
                        fontSize: 14,
                        fontFamily: 'questrial'
                      }}>
                        Followers
                      </Text>
                    </View>
                    
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                        fontFamily: 'questrial'
                      }}>
                        {creatorPost?.PhotosLocation || 'N/A'}
                      </Text>
                      <Text style={{
                        color: '#B9B9B9',
                        fontSize: 14,
                        fontFamily: 'questrial'
                      }}>
                        Location
                      </Text>
                    </View>
                  </View>

                  {/* Bio Section */}
                  {creatorPost?.Bio && (
                    <View style={{
                      backgroundColor: '#2A2A2A',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 20
                    }}>
                      <Text style={{
                        color: '#B9B9B9',
                        fontSize: 14,
                        fontFamily: 'questrial',
                        marginBottom: 8
                      }}>
                        About
                      </Text>
                      <Text style={{ 
                        color: 'white', 
                        fontSize: 16, 
                        lineHeight: 24, 
                        fontFamily: 'questrial'
                      }}>
                        {creatorPost.Bio}
                      </Text>
                    </View>
                  )}

                  {/* Purchased Content Section */}
                  <View style={{
                    backgroundColor: '#2A2A2A',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20
                  }}>
                    <Text style={{
                      color: '#B9B9B9',
                      fontSize: 14,
                      fontFamily: 'questrial',
                      marginBottom: 12
                    }}>
                      Your Purchased Content
                    </Text>
                    
                    {/* Content Type Filter */}
                    <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between',
                      marginBottom: 12
                    }}>
                      {['Videos', 'Photos', 'Files'].map((contentType) => (
                        <TouchableOpacity 
                          key={contentType}
                          onPress={() => setSelectedContentType(contentType)}
                          style={{
                            backgroundColor: selectedContentType === contentType ? '#FB2355' : '#404040',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            flex: 1,
                            marginHorizontal: 2,
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{ 
                            color: 'white', 
                            fontFamily: 'questrial', 
                            fontSize: 12,
                            fontWeight: selectedContentType === contentType ? 'bold' : 'normal'
                          }}>
                            {contentType}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Content Display */}
                    {isLoadingContent ? (
                      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                        <ActivityIndicator size="small" color="#FB2355" />
                        <Text style={{ 
                          color: '#B9B9B9', 
                          fontSize: 12, 
                          fontFamily: 'questrial',
                          marginTop: 8
                        }}>
                          Loading content...
                        </Text>
                      </View>
                    ) : purchasedContent.length > 0 ? (
                      <View>
                        <Text style={{ 
                          color: '#B9B9B9', 
                          fontSize: 12, 
                          fontFamily: 'questrial',
                          marginBottom: 8,
                          textAlign: 'center'
                        }}>
                          {purchasedContent.length} {selectedContentType.toLowerCase()} purchased
                        </Text>
                        
                        <View style={{ 
                          flexDirection: 'row', 
                          flexWrap: 'wrap', 
                          justifyContent: 'space-between' 
                        }}>
                          {purchasedContent.slice(0, 6).map((item, index) => (
                            <TouchableOpacity
                              key={item.$id}
                              onPress={() => openContentItem(item)}
                              style={{
                                width: '48%',
                                marginBottom: 8,
                                backgroundColor: '#404040',
                                borderRadius: 8,
                                overflow: 'hidden'
                              }}
                              activeOpacity={0.7}
                            >
                              <Image
                                source={{ uri: item.imageUri }}
                                style={{
                                  width: '100%',
                                  height: 60,
                                  backgroundColor: '#2A2A2A'
                                }}
                                resizeMode="cover"
                              />
                              {item.contentType === 'video' && (
                                <View style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  borderRadius: 8,
                                  padding: 2
                                }}>
                                  <Text style={{ color: 'white', fontSize: 8, fontFamily: 'questrial' }}>VIDEO</Text>
                                </View>
                              )}
                              <View style={{ padding: 4 }}>
                                <Text style={{ 
                                  color: 'white', 
                                  fontSize: 10, 
                                  fontFamily: 'questrial' 
                                }} numberOfLines={1}>
                                  {item.title || `${item.contentType} content`}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                        
                        {purchasedContent.length > 6 && (
                          <Text style={{ 
                            color: '#FB2355', 
                            fontSize: 12, 
                            fontFamily: 'questrial',
                            textAlign: 'center',
                            marginTop: 8
                          }}>
                            +{purchasedContent.length - 6} more items
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                        <Ionicons name="folder-open" size={32} color="#666666" />
                        <Text style={{ 
                          color: '#666666', 
                          fontSize: 14, 
                          fontFamily: 'questrial',
                          textAlign: 'center',
                          marginTop: 8
                        }}>
                          No {selectedContentType.toLowerCase()} purchased yet
                        </Text>
                        <Text style={{ 
                          color: '#888888', 
                          fontSize: 12, 
                          fontFamily: 'questrial',
                          textAlign: 'center',
                          marginTop: 4
                        }}>
                          Visit their profile to purchase content
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: '#333'
          }}>
            <TouchableOpacity 
              style={{
                backgroundColor: '#FB2355',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center'
              }}
              onPress={onClose}
            >
              <Text style={{ 
                color: 'white', 
                fontSize: 16, 
                fontWeight: 'bold', 
                fontFamily: 'questrial'
              }}>
                Close 
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content Viewer Modal */}
      <Modal
        visible={isContentViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeContentViewer}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.95)', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <View style={{ 
            width: '95%', 
            maxHeight: '90%', 
            backgroundColor: '#1A1A1A',
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Close Button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10
              }}
              onPress={closeContentViewer}
            >
              <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>

            {selectedContentItem && (
              <View>
                {/* Content Header */}
                <View style={{ padding: 16, paddingTop: 60 }}>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 18, 
                    fontFamily: 'questrial', 
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {selectedContentItem.title || `${selectedContentItem.contentType} Content`}
                  </Text>
                  <Text style={{ 
                    color: '#888', 
                    fontSize: 14, 
                    fontFamily: 'questrial',
                    textAlign: 'center',
                    marginTop: 4
                  }}>
                    {selectedContentItem.contentType}
                  </Text>
                </View>

                {/* Content Display */}
                <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 }}>
                  {selectedContentItem.contentType === 'image' || selectedContentItem.contentType === 'video' ? (
                    <Image
                      source={{ uri: selectedContentItem.imageUri }}
                      style={{
                        width: '100%',
                        height: 400,
                        borderRadius: 8,
                        backgroundColor: '#2A2A2A'
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{
                      backgroundColor: '#2A2A2A',
                      padding: 32,
                      borderRadius: 8,
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <Ionicons name="document" size={48} color="#888" />
                      <Text style={{ 
                        color: 'white', 
                        fontSize: 16, 
                        fontFamily: 'questrial',
                        textAlign: 'center',
                        marginTop: 16
                      }}>
                        File Content
                      </Text>
                      <Text style={{ 
                        color: '#888', 
                        fontSize: 14, 
                        fontFamily: 'questrial',
                        textAlign: 'center',
                        marginTop: 8
                      }}>
                        {selectedContentItem.title || 'Document'}
                      </Text>
                    </View>
                  )}

                  {selectedContentItem.contentType === 'video' && (
                    <View style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: [{ translateX: -30 }, { translateY: -30 }],
                      backgroundColor: 'rgba(251, 35, 85, 0.9)',
                      borderRadius: 30,
                      width: 60,
                      height: 60,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Text style={{ color: 'white', fontSize: 24 }}>▶</Text>
                    </View>
                  )}
                </View>

                {/* Download Button */}
                <View style={{ padding: 16 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: isDownloadComplete ? '#4CAF50' : (isProcessing ? '#999' : '#FB2355'),
                      padding: 16,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center'
                    }}
                    onPress={shareContent}
                    disabled={isProcessing || isDownloadComplete}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    ) : isDownloadComplete ? (
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color="white" 
                        style={{ marginRight: 8 }} 
                      />
                    ) : (
                      <Ionicons 
                        name={selectedContentItem?.contentType === 'image' || selectedContentItem?.contentType === 'video' ? "download" : "share"} 
                        size={20} 
                        color="white" 
                        style={{ marginRight: 8 }} 
                      />
                    )}
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 16, 
                      fontFamily: 'questrial', 
                      fontWeight: 'bold' 
                    }}>
                      {getActionText()}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

// Stripe Payment Modal for Paid Content
interface PaidContentPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  contentTitle: string;
  contentId?: string;
  creatorId?: string;
  creatorName?: string;
  imageUrl?: string;
  contentType?: string;
}

const PaidContentPaymentForm: React.FC<{
  onSuccess: () => void;
  onClose: () => void;
  amount: number;
  contentTitle: string;
  contentId?: string;
  creatorId?: string;
  creatorName?: string;
  imageUrl?: string;
  contentType?: string;
  clientSecret: string;
  stripeAccountId: string;
}> = ({ onSuccess, onClose, amount, contentTitle, contentId, creatorId, creatorName, imageUrl, contentType, clientSecret, stripeAccountId }) => {
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async () => {
    if (!confirmPayment || !clientSecret) {
      setError('Payment system not ready');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Confirming paid content payment within new Stripe context...');
      const result = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (result.error) {
        console.error('Payment confirmation error:', result.error);
        setError(result.error.message || 'Payment failed');
      } else {
        console.log('Paid content payment confirmed successfully!');
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onSuccess();
      }
    } catch (err) {
      console.error('Payment confirmation exception:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={paidContentStyles.sheetContent}>
      <TouchableOpacity onPress={onClose} style={paidContentStyles.closeButton}>
        <Text style={paidContentStyles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      
      <View style={paidContentStyles.headerSection}>
        <Text style={paidContentStyles.title}>Unlock Content</Text>
        <Text style={paidContentStyles.subtitle}>{contentTitle}</Text>
      </View>
      
      <View style={paidContentStyles.cardInputSection}>
        <Text style={paidContentStyles.cardLabel}>Payment Method</Text>
        <CardField
          postalCodeEnabled={false}
          placeholders={{ number: '1234 1234 1234 1234' }}
          cardStyle={{
            ...paidContentStyles.cardField,
            textColor: '#18181b',
          }}
          style={paidContentStyles.cardFieldContainer}
          onCardChange={(cardDetails: any) => {
            setCardComplete(cardDetails.complete);
          }}
        />
      </View>
      
      {error && (
        <View style={paidContentStyles.errorContainer}>
          <Text style={paidContentStyles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={paidContentStyles.amountSection}>
        <View style={paidContentStyles.amountRow}>
          <Text style={paidContentStyles.amountLabel}>Content Price</Text>
          <Text style={paidContentStyles.amountValue}>${amount}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          paidContentStyles.payButton,
          (!cardComplete || loading) && paidContentStyles.payButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!cardComplete || loading}
        activeOpacity={0.85}
      >
        <Text style={paidContentStyles.payButtonText}>
          {loading ? 'Processing...' : `Pay $${amount}`}
        </Text>
      </TouchableOpacity>
      
      <Text style={paidContentStyles.securityText}>
        Your payment is secured by Stripe
      </Text>
    </View>
  );
};

const PaidContentPaymentModal: React.FC<PaidContentPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  amount,
  contentTitle,
  contentId,
  creatorId,
  creatorName,
  imageUrl,
  contentType,
}) => {
  // wrap StripePaymentSheet with custom intent function
  const intentFunc = async () => {
    const user = await getCurrentUser();
    const metadata:any = {
      userId: user?.$id || 'anonymous',
        creatorId,
        creatorName,
      contentId,
      contentType,
      imageUrl,
      paymentType: 'paid_content',
    };
    return await createPaidContentPaymentIntent(amount, 'usd', metadata);
  };

  return (
    <StripePaymentSheet
      visible={visible}
              onClose={onClose}
      onSuccess={onSuccess}
              amount={amount}
      interval={'month'}
      creatorName={creatorName || ''}
      navigateOnSuccess={false}
      createIntentFunc={async () => intentFunc()}
    />
  );
};

// Styles for the payment modal
const paidContentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#191A1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
    opacity: 0.25,
  },
  sheetContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#888',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'questrial',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#B9B9B9',
    fontSize: 15,
    fontFamily: 'questrial',
    fontWeight: '500',
    textAlign: 'center',
  },
  amountSection: {
    width: '100%',
    backgroundColor: '#232326',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  amountRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    color: '#B9B9B9',
    fontSize: 15,
    fontFamily: 'questrial',
    fontWeight: '500',
  },
  amountValue: {
    color: '#FB2355',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
  cardInputSection: {
    width: '100%',
    backgroundColor: '#232326',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  cardLabel: {
    color: '#B9B9B9',
    fontSize: 14,
    fontFamily: 'questrial',
    marginBottom: 8,
    fontWeight: '500',
  },
  cardFieldContainer: {
    height: 50,
    marginVertical: 8,
  },
  cardField: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  errorContainer: {
    backgroundColor: '#FF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'questrial',
    textAlign: 'center',
  },
  payButton: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#FB2355',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#FB2355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
  securityText: {
    color: '#B9B9B9',
    fontSize: 12,
    fontFamily: 'questrial',
    textAlign: 'center',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loaderText: {
    color: '#B9B9B9',
    fontSize: 16,
    fontFamily: 'questrial',
    marginTop: 16,
    textAlign: 'center',
  },
});

// Attachment styles for blurry files
const attachmentStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  image: {
    width: 250,
    height: 200,
  },
  blurOverlay: {
    position: 'relative',
  },
  overlayContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FB2355',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockText: {
    fontSize: 24,
    color: 'white',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FB2355',
    marginBottom: 8,
    fontFamily: 'questrial',
  },
  titleText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'questrial',
  },
  unlockButton: {
    backgroundColor: '#FB2355',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  unlockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
});

// Paid Video Attachment Component
const PaidVideoAttachment = (props: any) => {
  const { attachment, onPressIn } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<Video>(null);

  // Get message context to access message sender info
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const messageSender = message?.user;

  // Return null if no attachment
  if (!attachment) {
    return null;
  }

  // Check if user has purchased this content
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user?.$id || !attachment?.paid_content_id) return;
      
      try {
        const hasPurchased = await checkPaidContentPurchase(user.$id, attachment.paid_content_id);
        setIsUnlocked(hasPurchased);
      } catch (error) {
        console.error('Error checking video purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, user?.$id]);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    console.log('Opening payment modal for video with data:', {
      contentId: attachment?.paid_content_id,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price
    });
    
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('💳 [PaidVideo] Payment successful for paid video');
    console.log('💳 [PaidVideo] Invalidating cache for contentId:', attachment?.paid_content_id);
    
    // Clear the purchase status from cache to force refresh
    if (user?.$id && attachment?.paid_content_id) {
      dataCache.delete(`purchase_${user.$id}_${attachment.paid_content_id}`);
      console.log('✅ [PaidVideo] Cache invalidated - next check will query database');
    }
    
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  const handlePlayPress = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (attachment?.type === 'paid_video') {
    return (
      <>
        <View style={{
          width: 320,
          height: 240,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
          marginLeft: 0,
          marginRight: 5,
          position: 'relative',
          backgroundColor: '#000',
        }}>
          {isUnlocked ? (
            // Unlocked video player
            <>
              <Video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                source={{ uri: attachment?.local_video_uri || attachment?.video_url }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded) {
                    setIsPlaying(status.isPlaying);
                  }
                }}
              />
              
              {/* Unlocked indicator */}
              <View style={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: 'rgba(0, 200, 81, 0.9)',
                borderRadius: 16,
                paddingHorizontal: 8,
                paddingVertical: 4,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 'bold',
                  marginLeft: 4,
                  fontFamily: 'questrial',
                }}>
                  Unlocked
                </Text>
              </View>
            </>
          ) : (
            // Locked video preview
            <>
              {/* Video thumbnail or placeholder */}
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#1A1A1A',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="videocam" size={64} color="#666666" />
              </View>
              
              {/* Blur overlay */}
              <BlurView
                intensity={50}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              
              {/* Lock overlay */}
              <TouchableOpacity
                onPress={handleUnlock}
                disabled={isUnlocking}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  backgroundColor: 'rgba(251, 35, 85, 0.9)',
                  borderRadius: 50,
                  width: 80,
                  height: 80,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}>
                  {isUnlocking ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="play" size={28} color="#FFFFFF" />
                      <Ionicons 
                        name="lock-closed" 
                        size={16} 
                        color="#FFFFFF" 
                        style={{ position: 'absolute', bottom: 8, right: 8 }}
                      />
                    </>
                  )}
                </View>
                
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginTop: 16,
                  fontFamily: 'questrial',
                  textAlign: 'center',
                }}>
                  {attachment?.title || 'Premium Video'}
                </Text>
                
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginTop: 8,
                  fontFamily: 'questrial',
                }}>
                  ${attachment?.price || '9.99'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Payment Modal */}
        <PaidContentPaymentModal
          visible={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          amount={parseFloat(attachment?.price || '9.99')}
          contentTitle={attachment?.title || 'Premium Video'}
          contentId={attachment?.paid_content_id}
          creatorId={messageSender?.id}
          creatorName={messageSender?.name}
          imageUrl={attachment?.video_url}
          contentType="video"
        />
      </>
    );
  }

  return null;
};

const BlurryFileAttachment = (props: any) => {
  const { attachment } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileDimensions, setFileDimensions] = useState({ width: 300, height: 200 });
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Get message context to access message sender info
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const messageSender = message?.user;

  // Return null if no attachment
  if (!attachment) {
    return null;
  }

  // Check if user has purchased this content
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      // Check multiple possible field names for the content ID
      const contentId = attachment?.paid_content_id || attachment?.file_id || attachment?.content_id;
      if (!user?.$id || !contentId) return;
      
      try {
        const hasPurchased = await checkPaidContentPurchase(user.$id, contentId);
        setIsUnlocked(hasPurchased);
      } catch (error) {
        console.error('Error checking file purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, attachment?.file_id, attachment?.content_id, user?.$id]);

  // Try to guess file format from URL or attachment data
  useEffect(() => {
    if (attachment?.title && attachment.title.toLowerCase().includes('vertical')) {
      setFileDimensions({ width: 225, height: 400 }); // Portrait format
      setIsPortraitMode(true);
    } else if (attachment?.title && attachment.title.toLowerCase().includes('portrait')) {
      setFileDimensions({ width: 225, height: 400 }); // Portrait format
      setIsPortraitMode(true);
    }
  }, [attachment]);

  const toggleFileFormat = () => {
    if (isPortraitMode) {
      setFileDimensions({ width: 300, height: 200 }); // Landscape
      setIsPortraitMode(false);
    } else {
      setFileDimensions({ width: 225, height: 400 }); // Portrait
      setIsPortraitMode(true);
    }
  };

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    // Check multiple possible field names for the content ID
    const contentId = attachment?.paid_content_id || attachment?.file_id || attachment?.content_id;
    
    console.log('Opening payment modal for file with data:', {
      contentId: contentId,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price,
      attachment: attachment // Debug: log full attachment
    });
    
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('💳 [PaidFile] Payment successful for paid file');
    
    // Check multiple possible field names for the content ID
    const contentId = attachment?.paid_content_id || attachment?.file_id || attachment?.content_id;
    console.log('💳 [PaidFile] Invalidating cache for contentId:', contentId);
    
    // Clear the purchase status from cache to force refresh
    if (user?.$id && contentId) {
      dataCache.delete(`purchase_${user.$id}_${contentId}`);
      console.log('✅ [PaidFile] Cache invalidated - next check will query database');
    }
    
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      
      const fileUri = attachment?.local_file_uri || attachment?.image_url;
      if (!fileUri) {
        Alert.alert('Error', 'File not available for download');
        return;
      }
      
      // Use sharing to save/share the file
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: 'Save or share file',
          UTI: attachment?.mime_type || 'public.item',
        });
        
        // Success feedback
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Download not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Could not download file');
    } finally {
      setIsDownloading(false);
    }
  };

  const BlurredFileContent = ({ onUnlock, price, title }: { 
    onUnlock: () => void; 
    price: number; 
    title: string; 
  }) => (
    <View style={{
      width: fileDimensions.width,
      height: fileDimensions.height,
      borderRadius: 12,
      marginVertical: 8,
      marginLeft: 0,
      marginRight: 12,
      position: 'relative',
      borderWidth: 1,
      borderColor: '#1976D2',
      overflow: 'hidden',
      shadowColor: '#1976D2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }}>
      {/* Blue gradient background */}
      <LinearGradient
        colors={['#1976D2', '#2196F3', '#1565C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      
      {/* Subtle overlay for better text readability */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }} />
      
      {/* Content */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}>
        {/* File icon with lock */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 40,
          width: 70,
          height: 70,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 1)',
          position: 'relative',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}>
          <Ionicons name="document-text" size={32} color="#1976D2" />
          <View style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            backgroundColor: '#1565C0',
            borderRadius: 12,
            width: 26,
            height: 26,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}>
            <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
          </View>
        </View>
        
        {/* File title */}
        <Text style={{
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 4,
          fontFamily: 'questrial',
          textShadowColor: 'rgba(0, 0, 0, 0.4)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}>
          {title}
        </Text>
        
        <Text style={{
          color: '#FFFFFF',
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 16,
          fontFamily: 'questrial',
          opacity: 0.9,
          textShadowColor: 'rgba(0, 0, 0, 0.4)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}>
          Premium File Content
        </Text>
        
        <TouchableOpacity
          onPress={onUnlock}
          style={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 25,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 2,
            borderColor: '#1976D2',
          }}
        >          
          <Text style={{
            color: '#1565C0',
            fontSize: 16,
            fontWeight: '700',
            fontFamily: 'questrial',
          }}>
            Unlock for ${price.toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Format toggle button */}
      <TouchableOpacity
        onPress={toggleFileFormat}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Ionicons 
          name={isPortraitMode ? "phone-portrait" : "phone-landscape"} 
          size={20} 
          color="#1976D2" 
        />
      </TouchableOpacity>
    </View>
  );

  const UnlockedFileContent = ({ title, fileUri }: { title: string; fileUri: string }) => {
    const fileExtension = fileUri.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension);
    const isPDF = fileExtension === 'pdf';
    const isText = ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'xml', 'csv'].includes(fileExtension);
    const isAudio = ['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(fileExtension);
    
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Load file content for text files
    useEffect(() => {
      if (isText && fileUri) {
        setIsLoading(true);
        fetch(fileUri)
          .then(response => response.text())
          .then(text => {
            setFileContent(text);
            setIsLoading(false);
          })
          .catch(error => {
            console.error('Error loading text file:', error);
            setIsLoading(false);
          });
      }
    }, [fileUri, isText]);
    
    return (
      <View style={{
        width: fileDimensions.width,
        height: fileDimensions.height,
        borderRadius: 12,
        backgroundColor: '#1A1A1A',
        marginVertical: 8,
        marginLeft: 0,
        marginRight: 12,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#4CAF50',
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}>
        {/* File content preview */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#2A2A2A',
        }}>
          {isImage ? (
            <Image 
              source={{ uri: fileUri }}
              style={{
                width: '100%',
                height: '100%',
                resizeMode: 'cover',
              }}
            />
                     ) : isPDF ? (
            <View style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#F8F9FA',
              position: 'relative',
            }}>
              {/* PDF Preview Container */}
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}>
                {/* PDF Icon and Info */}
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 20,
                }}>
                  <Text style={{
                    color: '#2C3E50',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 20,
                    fontFamily: 'questrial',
                  }}>
                    {title}
                  </Text>
                  
                  {/* PDF Access Information */}
                  <View style={{
                    backgroundColor: 'rgba(251, 35, 85, 0.1)',
                        borderRadius: 8,
                    padding: 12,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(251, 35, 85, 0.2)',
                    maxWidth: '100%',
                    alignSelf: 'stretch',
                  }}>
                    <View style={{
                        flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginBottom: 6,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        marginRight: 6,
                      }}>
                        💡
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: '#2C3E50',
                          fontSize: 13,
                          fontWeight: '600',
                        fontFamily: 'questrial',
                          marginBottom: 4,
                      }}>
                          Hey! Your file is safely stored 📁
                      </Text>
                        
                      <Text style={{
                          color: '#4A5568',
                          fontSize: 12,
                          lineHeight: 16,
                        fontFamily: 'questrial',
                      }}>
                          Check out your{' '}
                          <Text style={{ fontWeight: '600', color: '#FB2355' }}>
                            Profile → Paid Content
                      </Text>
                          {' '}to find this PDF and all your other purchased files! 😊
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  
                </View>
              </View>
            </View>
          ) : isText ? (
            <ScrollView 
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FFFFFF',
              }}
              contentContainerStyle={{
                padding: 12,
              }}
            >
              {isLoading ? (
                <View style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 100,
                }}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={{
                    color: '#666666',
                    fontSize: 12,
                    marginTop: 8,
                    fontFamily: 'questrial',
                  }}>
                    Loading text...
                  </Text>
                </View>
              ) : (
                <Text style={{
                  color: '#000000',
                  fontSize: 12,
                  fontFamily: 'questrial',
                  lineHeight: 16,
                }}>
                  {fileContent || 'Unable to load file content'}
                </Text>
              )}
            </ScrollView>
          ) : isAudio ? (
            <View style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#2A2A2A',
            }}>
              <Ionicons name="musical-notes" size={48} color="#4CAF50" />
              <Text style={{
                color: '#4CAF50',
                fontSize: 12,
                fontWeight: 'bold',
                marginTop: 8,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                Audio File
              </Text>
              <Text style={{
                color: '#CCCCCC',
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                {fileExtension.toUpperCase()}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    console.log('Attempting to play audio:', fileUri);
                    
                    // First try sharing for audio files
                    const isAvailable = await Sharing.isAvailableAsync();
                    if (isAvailable) {
                      await Sharing.shareAsync(fileUri, {
                        dialogTitle: 'Play audio with...',
                        UTI: attachment?.mime_type || 'public.audio',
                      });
                    } else {
                      const supported = await Linking.canOpenURL(fileUri);
                      if (supported) {
                        await Linking.openURL(fileUri);
                      } else {
                        Alert.alert('Cannot play audio', 'No app available to play this audio file.');
                      }
                    }
                  } catch (error) {
                    console.error('Error playing audio:', error);
                    Alert.alert('Error', 'Could not play audio file.');
                  }
                }}
                style={{
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 'bold',
                  marginLeft: 4,
                  fontFamily: 'questrial',
                }}>
                  Play Audio
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Ionicons 
                name="document" 
                size={48} 
                color="#4CAF50" 
              />
              <Text style={{
                color: '#4CAF50',
                fontSize: 12,
                fontWeight: 'bold',
                marginTop: 8,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                {fileExtension.toUpperCase()} File
              </Text>
              <Text style={{
                color: '#CCCCCC',
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                Tap "Open File" to view
              </Text>
            </>
          )}
        </View>
        
        {/* Unlocked indicator */}
        <View style={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: '#4CAF50',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 'bold',
            marginLeft: 4,
            fontFamily: 'questrial',
          }}>
            Unlocked
          </Text>
        </View>
        
        {/* Download button */}
        <TouchableOpacity
          onPress={handleDownload}
          disabled={isDownloading}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 20,
            width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#1A1A1A" />
          ) : (
            <Ionicons name="download" size={18} color="#1A1A1A" />
          )}
        </TouchableOpacity>
        
        {/* File info overlay - only show for non-PDF files */}
        {!isPDF && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
          }}>
            <Text style={{
              color: 'white',
              fontSize: 14,
              fontWeight: '600',
              fontFamily: 'questrial',
            }}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  console.log('Attempting to open file:', fileUri);
                  
                  // First try sharing which is more reliable for local files
                  const isAvailable = await Sharing.isAvailableAsync();
                  if (isAvailable) {
                    await Sharing.shareAsync(fileUri, {
                      dialogTitle: 'Open file with...',
                      UTI: attachment?.mime_type || 'public.item',
                    });
                  } else {
                    // Fallback to Linking
                    const supported = await Linking.canOpenURL(fileUri);
                    if (supported) {
                      await Linking.openURL(fileUri);
                    } else {
                      Alert.alert(
                        'Cannot open file', 
                        'No app available to open this file type. Try downloading it instead.',
                        [
                          { text: 'OK', style: 'default' },
                          { 
                            text: 'Download', 
                            style: 'default',
                            onPress: () => handleDownload()
                          }
                        ]
                      );
                    }
                  }
                } catch (error) {
                  console.error('Error opening file:', error);
                  Alert.alert(
                    'Error opening file', 
                    'Could not open this file. Try downloading it instead.',
                    [
                      { text: 'OK', style: 'default' },
                      { 
                        text: 'Download', 
                        style: 'default',
                        onPress: () => handleDownload()
                      }
                    ]
                  );
                }
              }}
              style={{
                backgroundColor: '#4CAF50',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
                marginTop: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'questrial',
              }}>
                Open File
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Format toggle button */}
        <TouchableOpacity
          onPress={toggleFileFormat}
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 20,
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons 
            name={isPortraitMode ? "phone-portrait" : "phone-landscape"} 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={attachmentStyles.container}>
      {attachment.is_blurred && !isUnlocked ? (
        <BlurredFileContent 
          onUnlock={handleUnlock}
          price={parseFloat(attachment.price || '0')}
          title={attachment.title || 'Paid File'}
        />
      ) : (
        <UnlockedFileContent 
          title={attachment.title || 'Paid File'}
          fileUri={attachment.local_file_uri || attachment.image_url || ''}
        />
      )}

      {/* Payment Modal */}
      <PaidContentPaymentModal
        visible={showPaymentModal}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        amount={parseFloat(attachment?.price || '5.99')}
        contentTitle={attachment?.title || 'Premium File'}
        contentId={attachment?.paid_content_id || attachment?.file_id || attachment?.content_id}
        creatorId={messageSender?.id}
        creatorName={messageSender?.name}
        imageUrl={attachment?.image_url}
        contentType="file"
      />
    </View>
  );
};

// Full Screen Profile Picture Modal
const FullScreenProfileModal = ({ 
  visible, 
  onClose, 
  imageUrl, 
  creatorName 
}: {
  visible: boolean;
  onClose: () => void;
  imageUrl: string | null;
  creatorName: string;
}) => {
  const { getCachedImageUrl, user } = useGlobalContext();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [purchasedContent, setPurchasedContent] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState<any | null>(null);
  const [isContentViewerVisible, setIsContentViewerVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map());
  const [videoThumbnails, setVideoThumbnails] = useState<Map<string, string>>(new Map());

  // Animation values
  const backgroundScale = useRef(new Animated.Value(0.95)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  // Temporary function to get purchased content (same as profile.tsx)
  const getPurchasedContent = async (
    userId: string, 
    contentType?: string, 
    creatorId?: string
  ) => {
    try {
      const queries = [Query.equal('userId', userId)];
      
      if (contentType) {
        queries.push(Query.equal('contentType', contentType));
      }
      
      if (creatorId) {
        queries.push(Query.equal('creatorId', creatorId));
      }

      const appwriteClient = new Client()
        .setEndpoint(config.endpoint || '')
        .setProject(config.projectId || '');
      
      const databases = new Databases(appwriteClient);

      const response = await databases.listDocuments(
        config.databaseId || '',
        '686a99d3002ec49567b3', // Paid content purchases collection ID
        queries
      );

      return response.documents;
    } catch (error) {
      console.error('Error fetching purchased content:', error);
      return [];
    }
  };

  // Load purchased content for this creator
  const loadPurchasedContent = async () => {
    if (!user || !creatorName) return;
    
    setIsLoadingContent(true);
    try {
      // Get creator ID from name
      const { getCreatorIdByName } = await import('../../lib/appwrite');
      const creatorId = await getCreatorIdByName(creatorName);
      
      if (creatorId) {
        const content = await getPurchasedContent(user.$id, undefined, creatorId);
        setPurchasedContent(content);
      } else {
        setPurchasedContent([]);
      }
    } catch (error) {
      console.error('Error loading purchased content:', error);
      setPurchasedContent([]);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Fetch creator data when modal becomes visible
  useEffect(() => {
    const fetchCreatorData = async () => {
      if (!visible || !creatorName) return;
      
      try {
        // Get follower count from subscriptions
        const { getSubscriptionCount } = await import('../../lib/appwrite');
        const followerCount = await getSubscriptionCount(creatorName);
        
        // Get creator post data (including location) from photos collection
        if (!config.endpoint || !config.projectId || !config.databaseId || !config.photoCollectionId) {
          return;
        }

        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query photos collection for the creator's data
        const photos = await databases.listDocuments(
          config.databaseId,
          config.photoCollectionId,
          [Query.equal('title', creatorName)]
        );
        
        if (photos.documents.length > 0) {
          const postData = photos.documents[0];
          setCreatorData({
            followers: followerCount,
            location: postData.PhotosLocation || null
          });
        } else {
          // If no post found, still set follower count
          setCreatorData({
            followers: followerCount,
            location: null
          });
        }

        // Load purchased content for this creator
        await loadPurchasedContent();
      } catch (error) {
        console.error('Error fetching creator data:', error);
        // Set default data even if there's an error
        setCreatorData({
          followers: 0,
          location: null
        });
      }
    };
    
    fetchCreatorData();
  }, [visible, creatorName, user]);

  // Generate video thumbnail with caching
  const generateVideoThumbnail = async (item: any): Promise<string | null> => {
    try {
      if (item.contentType !== 'video') return null;
      
      console.log(`🎬 [VideoThumbnail] Generating thumbnail for video: ${item.$id}`);
      
      const thumbnailKey = `thumbnail_${item.$id}`;
      
      // Check memory cache first
      if (videoThumbnails.has(thumbnailKey)) {
        console.log(`✅ [VideoThumbnail] Memory cache HIT`);
        return videoThumbnails.get(thumbnailKey) || null;
      }

      // Check persistent cache
      const cachedThumbnail = dataCache.get(`video_thumbnail_${item.$id}`) as string | null;
      if (cachedThumbnail) {
        console.log(`✅ [VideoThumbnail] Persistent cache HIT - loading to memory`);
        setVideoThumbnails(prev => new Map(prev.set(thumbnailKey, cachedThumbnail)));
        return cachedThumbnail;
      }

      console.log(`❌ [VideoThumbnail] Cache MISS - generating new thumbnail...`);
      
      const { uri } = await VideoThumbnails.getThumbnailAsync(item.imageUri, {
        time: 1000,
        quality: 0.8,
      });

      // Cache in memory and persistent storage
      setVideoThumbnails(prev => new Map(prev.set(thumbnailKey, uri)));
      dataCache.set(`video_thumbnail_${item.$id}`, uri, 24 * 60 * 60 * 1000); // 24 hours
      
      console.log(`✅ [VideoThumbnail] Generated and cached thumbnail (24h TTL)`);
      
      return uri;
    } catch (error) {
      console.warn('❌ [VideoThumbnail] Failed to generate video thumbnail:', error);
      return null;
    }
  };

  // Lazy loading for video thumbnails - only generate when visible
  const generateThumbnailOnDemand = async (item: any) => {
    if (item.contentType === 'video') {
      const thumbnailKey = `thumbnail_${item.$id}`;
      if (!videoThumbnails.has(thumbnailKey)) {
        try {
          await generateVideoThumbnail(item);
        } catch (error) {
          console.warn(`Failed to generate thumbnail for video ${item.$id}:`, error);
        }
      }
    }
  };

  // Get display URL (thumbnail for videos, regular URL for images)
  const getDisplayUrl = (item: any): string => {
    if (item.contentType === 'video') {
      const thumbnailKey = `thumbnail_${item.$id}`;
      const thumbnail = videoThumbnails.get(thumbnailKey);
      return thumbnail || item.imageUri;
    }
    return item.imageUri;
  };

  // Check if video thumbnail is being generated
  const isGeneratingThumbnail = (item: any): boolean => {
    if (item.contentType !== 'video') return false;
    const thumbnailKey = `thumbnail_${item.$id}`;
    return !videoThumbnails.has(thumbnailKey);
  };

  const openContentItem = (item: any) => {
    setSelectedContentItem(item);
    setIsContentViewerVisible(true);
  };

  const closeContentViewer = () => {
    setIsContentViewerVisible(false);
    setSelectedContentItem(null);
  };

  const getActionText = () => {
    if (!selectedContentItem) return 'Process';
    
    const contentType = selectedContentItem.contentType || '';
    const isImageOrVideo = contentType === 'image' || contentType === 'video';
    
    if (isProcessing) {
      return isImageOrVideo ? 'Downloading...' : 'Sharing...';
    }
    
    return isImageOrVideo ? 'Download' : 'Share';
  };

  const shareContent = async () => {
    if (!selectedContentItem) return;

    setIsProcessing(true);
    try {
      if (!selectedContentItem.imageUri) {
        Alert.alert('Error', 'Content URL is not available');
        return;
      }

      const downloadUrl = selectedContentItem.imageUri.includes('/view?')
        ? selectedContentItem.imageUri.replace('/view?', '/download?').concat('&output=attachment')
        : selectedContentItem.imageUri;

      const getFileExtension = (type: string) => {
        switch (type) {
          case 'image': return 'jpg';
          case 'video': return 'mp4';
          case 'file': return 'pdf';
          default: return 'file';
        }
      };
      
      const fileName = selectedContentItem.title || `content_${selectedContentItem.$id}.${getFileExtension(selectedContentItem.contentType || '')}`;
      const localFileUri = FileSystem.documentDirectory + fileName;

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localFileUri
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        Alert.alert('Error', 'Failed to download content');
        return;
      }

      const contentType = selectedContentItem.contentType || '';
      const isImageOrVideo = contentType === 'image' || contentType === 'video';

      if (isImageOrVideo) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please grant permission to save to your photo library');
          return;
        }

        await MediaLibrary.saveToLibraryAsync(result.uri);
        Alert.alert('Success', `${contentType === 'image' ? 'Photo' : 'Video'} saved to your gallery!`);
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            dialogTitle: `Share ${selectedContentItem.title || 'Content'}`,
          });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      }

      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    } catch (error) {
      console.error('Error processing content:', error);
      Alert.alert(
        'Error',
        'Failed to process content. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Preload image using cached URL
  useEffect(() => {
    if (visible && imageUrl) {
      const cachedUrl = getCachedImageUrl(imageUrl);
      if (cachedUrl) {
        Image.prefetch(cachedUrl)
          .then(() => setImageLoaded(true))
          .catch(() => setImageLoaded(true));
      } else {
        setImageLoaded(true);
      }
    }
  }, [visible, imageUrl, getCachedImageUrl]);

  // Animate when visible
  useEffect(() => {
    if (visible) {
      // Animate background
      Animated.parallel([
        Animated.spring(backgroundScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const cachedImageUrl = getCachedImageUrl(imageUrl || '');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 9999,
        elevation: 9999
      }}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          {
            opacity: backgroundOpacity,
            transform: [{ scale: backgroundScale }],
            zIndex: 10000,
            elevation: 10000
          }
        ]}>
          {/* Fallback background for instant display */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A1A1A' }]} />
          
          <ImageBackground
            source={{ uri: cachedImageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            blurRadius={0}
            imageStyle={{ opacity: imageLoaded ? 1 : 0 }}
            onLoad={() => {
              console.log('FullScreenProfile ImageBackground loaded');
              setImageLoaded(true);
            }}
            onLoadStart={() => console.log('FullScreenProfile ImageBackground loading started')}
            onError={(error: any) => console.log('FullScreenProfile ImageBackground error:', error)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
              {/* Top section with back button, creator name, and logo */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: 50, 
                marginHorizontal: 20 
              }}>
                {/* Back button in top left */}
                <TouchableOpacity onPress={onClose} style={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: 24,
                  paddingHorizontal: 12,
                  paddingVertical: 12
                }}>
                  <Image 
                    source={require('../../assets/icon/back.png')} 
                    style={{ width: 20, height: 20, tintColor: 'white', resizeMode: 'contain' }} 
                  />
                </TouchableOpacity>
                
                {/* Creator name in top middle */}
                <BlurView intensity={80} style={{
                  borderRadius: 40,
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 12,
                  overflow: 'hidden'
                }}>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 22, 
                    fontWeight: '600', 
                    fontFamily: 'Questrial-Regular',
                    textAlign: 'center'
                  }}>
                    {creatorName || 'Creator'}
                  </Text>
                </BlurView>
                
                {/* Cherrizbox logo in top right */}
                <Image 
                  source={require('../../assets/images/cherry-icon.png')} 
                  style={{ 
                    width: 56, 
                    height: 56, 
                    resizeMode: 'contain',
                    borderRadius: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8
                  }} 
                />
              </View>

              {/* Horizontal info section below */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginTop: 20, 
                marginHorizontal: 20,
                gap: 12
              }}>
                {/* Location with neutral card */}
                {creatorData?.location && (
                  <BlurView intensity={80} style={{
                    borderRadius: 36,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                    overflow: 'hidden'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
                      <Text style={{ 
                        color: 'rgba(255, 255, 255, 0.9)', 
                        fontSize: 15, 
                        fontFamily: 'Questrial-Regular',
                        fontWeight: '500'
                      }}>
                        {creatorData.location}
                      </Text>
                    </View>
                  </BlurView>
                )}
                
                {/* Followers with neutral card */}
                {creatorData?.followers && (
                  <BlurView intensity={80} style={{
                    borderRadius: 36,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                    overflow: 'hidden'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="people-outline" size={16} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
                      <Text style={{ 
                        color: 'rgba(255, 255, 255, 0.9)', 
                        fontSize: 15, 
                        fontFamily: 'Questrial-Regular',
                        fontWeight: '500'
                      }}>
                        {creatorData.followers} followers
                      </Text>
                    </View>
                  </BlurView>
                )}
              </View>

              {/* Scrollable Paid Content Section - Positioned to show first bubble at bottom */}
              <ScrollView 
                style={{ 
                  flex: 1,
                  marginTop: 20
                }}
                contentContainerStyle={{ 
                  paddingHorizontal: 20,
                  paddingTop: Dimensions.get('window').height - 400, // Push content to bottom of screen
                  paddingBottom: 40
                }}
                showsVerticalScrollIndicator={false}
              >
                {/* Content Header */}
                <BlurView intensity={80} style={{ 
                  marginHorizontal: 20, 
                  borderRadius: 40, 
                  padding: 24, 
                  marginBottom: 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 12,
                  overflow: 'hidden'
                }}>
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#FB2355',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12
                    }}>
                      <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>📱</Text>
                    </View>
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 22, 
                      fontWeight: 'bold', 
                      fontFamily: 'Questrial-Regular',
                      textAlign: 'center',
                      marginBottom: 6
                    }}>
                      Scroll for your paid content
                    </Text>
                    <Text style={{ 
                      color: '#B9B9B9', 
                      fontSize: 15, 
                      fontFamily: 'Questrial-Regular',
                      textAlign: 'center'
                    }}>
                      {purchasedContent.length} items from {creatorName}
                    </Text>
                  </View>
                </BlurView>

                {/* Content Grid */}
                {isLoadingContent ? (
                  <BlurView intensity={80} style={{ 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    paddingVertical: 60,
                    marginHorizontal: 20,
                    borderRadius: 36,
                    padding: 40,
                    overflow: 'hidden'
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#FB2355',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 16
                    }}>
                      <Text style={{ color: 'white', fontSize: 16 }}>⏳</Text>
                    </View>
                    <Text style={{ 
                      color: '#888', 
                      fontSize: 16, 
                      fontFamily: 'Questrial-Regular', 
                      textAlign: 'center' 
                    }}>
                      Loading content...
                    </Text>
                  </BlurView>
                ) : purchasedContent.length > 0 ? (
                  <View style={{ 
                    flexDirection: 'row', 
                    flexWrap: 'wrap', 
                    justifyContent: 'space-between',
                    paddingHorizontal: 20
                  }}>
                    {purchasedContent.map((item, index) => (
                      <TouchableOpacity
                        key={item.$id}
                        onPress={() => openContentItem(item)}
                        style={{
                          width: '48%',
                          marginBottom: 16,
                          backgroundColor: '#1A1A1A',
                          borderRadius: 16,
                          overflow: 'hidden',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 6
                        }}
                      >
                        <Image
                          source={{ uri: getDisplayUrl(item) }}
                          style={{
                            width: '100%',
                            height: 140,
                            backgroundColor: '#2A2A2A'
                          }}
                          resizeMode="cover"
                        />
                        {item.contentType === 'video' && (
                          <>
                            {/* Play Button Overlay */}
                            <View style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: [{ translateX: -22 }, { translateY: -22 }],
                              backgroundColor: 'rgba(251, 35, 85, 0.95)',
                              borderRadius: 22,
                              width: 44,
                              height: 44,
                              justifyContent: 'center',
                              alignItems: 'center',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.3,
                              shadowRadius: 8,
                              elevation: 6
                            }}>
                              <Text style={{ color: 'white', fontSize: 18, marginLeft: 2 }}>▶</Text>
                            </View>
                            
                            {/* Video Badge */}
                            <View style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4
                            }}>
                              <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Questrial-Regular', fontWeight: 'bold' }}>VIDEO</Text>
                            </View>
                          </>
                        )}
                        
                        <View style={{ padding: 12 }}>
                          <Text style={{ 
                            color: 'white', 
                            fontSize: 13, 
                            fontFamily: 'Questrial-Regular',
                            fontWeight: '500'
                          }} numberOfLines={1}>
                            {item.contentType === 'video' ? 'Video Content' : 
                             item.contentType === 'image' ? 'Photo Content' : 'File Content'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <BlurView intensity={80} style={{ 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    paddingVertical: 60,
                    marginHorizontal: 20,
                    borderRadius: 36,
                    padding: 40,
                    overflow: 'hidden'
                  }}>
                    <View style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: '#FB2355',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 16
                    }}>
                      <Text style={{ color: 'white', fontSize: 24 }}>📱</Text>
                    </View>
                    <Text style={{ 
                      color: '#888', 
                      fontSize: 18, 
                      fontFamily: 'Questrial-Regular', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      marginBottom: 8
                    }}>
                      No purchased content yet
                    </Text>
                    <Text style={{ 
                      color: '#666', 
                      fontSize: 14, 
                      fontFamily: 'Questrial-Regular', 
                      textAlign: 'center'
                    }}>
                      Content you purchase will appear here
                    </Text>
                  </BlurView>
                )}
              </ScrollView>
            </View>
          </ImageBackground>
        </Animated.View>
      </View>

      {/* Content Viewer Modal */}
      <Modal
        visible={isContentViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeContentViewer}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{ 
            backgroundColor: '#000', 
            width: '95%', 
            maxHeight: '90%', 
            borderRadius: 12, 
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Close Button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10
              }}
              onPress={closeContentViewer}
            >
              <Image 
                source={require('../../assets/icon/close.png')}
                style={{ width: 20, height: 20, tintColor: 'white' }}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {selectedContentItem && (
              <View>
                {/* Content Header */}
                <View style={{ padding: 16, paddingTop: 60 }}>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 18, 
                    fontFamily: 'Questrial-Regular', 
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {selectedContentItem.contentType === 'video' ? 'Video Content' : 
                     selectedContentItem.contentType === 'image' ? 'Photo Content' : 'File Content'}
                  </Text>
                  <Text style={{ 
                    color: '#888', 
                    fontSize: 14, 
                    fontFamily: 'Questrial-Regular',
                    textAlign: 'center',
                    marginTop: 4
                  }}>
                    {selectedContentItem.contentType}
                  </Text>
                </View>

                {/* Content Display */}
                <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 }}>
                  {selectedContentItem.contentType === 'image' || selectedContentItem.contentType === 'video' ? (
                    <Image
                      source={{ uri: selectedContentItem.imageUri }}
                      style={{
                        width: '100%',
                        height: 400,
                        borderRadius: 8,
                        backgroundColor: '#1A1A1A'
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{
                      backgroundColor: '#1A1A1A',
                      padding: 32,
                      borderRadius: 8,
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <Image 
                        source={require('../../assets/icon/edit.png')}
                        style={{ width: 48, height: 48, tintColor: '#888', marginBottom: 16 }}
                        resizeMode="contain"
                      />
                      <Text style={{ 
                        color: 'white', 
                        fontSize: 16, 
                        fontFamily: 'Questrial-Regular',
                        textAlign: 'center'
                      }}>
                        File Content
                      </Text>
                      <Text style={{ 
                        color: '#888', 
                        fontSize: 14, 
                        fontFamily: 'Questrial-Regular',
                        textAlign: 'center',
                        marginTop: 8
                      }}>
                        Tap to download or view
                      </Text>
                    </View>
                  )}

                  {selectedContentItem.contentType === 'video' && (
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: [{ translateX: -30 }, { translateY: -30 }],
                        backgroundColor: 'rgba(251, 35, 85, 0.9)',
                        borderRadius: 30,
                        width: 60,
                        height: 60,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                      onPress={shareContent}
                    >
                      <Text style={{ color: 'white', fontSize: 24 }}>▶</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Action Button */}
                <View style={{ padding: 16 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: isProcessing ? '#999' : '#FB2355',
                      padding: 16,
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                    onPress={shareContent}
                    disabled={isProcessing}
                  >
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 16, 
                      fontFamily: 'Questrial-Regular', 
                      fontWeight: 'bold' 
                    }}>
                      {getActionText()}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default function ChatScreen() {
  const { channelId, creatorName, chatType } = useLocalSearchParams();
  const { user, isStreamConnected } = useGlobalContext();
  const [groupChannel, setGroupChannel] = useState<any>(null);
  const [dmChannel, setDmChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChatType, setCurrentChatType] = useState(chatType || 'group');
  const [creatorThumbnail, setCreatorThumbnail] = useState<string | null>(null);
  const [creatorFullThumbnail, setCreatorFullThumbnail] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  // Full-screen profile picture state
  const [showFullScreenProfile, setShowFullScreenProfile] = useState(false);
  
  // Attachment preview modal state
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const [tipAmount, setTipAmount] = useState(5);
  
  // Full-screen image modal state
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImageUri, setFullScreenImageUri] = useState<string | null>(null);

  const colorScheme = useColorScheme();

  // Cleanup function for memory management
  useEffect(() => {
    return () => {
      console.log(`🧹 [ChatScreen] Cleaning up on unmount...`);
      
      // Clean up data cache periodically when leaving chat
      dataCache.cleanup();
      
      // Preload images for better performance on return
      if (creatorThumbnail) {
        console.log(`🚀 [ChatScreen] Preloading creator thumbnail for next visit`);
        imageCache.getCachedImageUri(creatorThumbnail).catch(() => {
          // Silently fail, not critical
        });
      }
      
      console.log(`✅ [ChatScreen] Cleanup completed`);
    };
  }, [creatorThumbnail]);
  const [theme, setTheme] = useState(getTheme());
  const router = useRouter();
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Get the current active channel based on chat type
  const currentChannel = currentChatType === 'group' ? groupChannel : dmChannel;

  // Handle long press on message
  const handleLongPressMessage = (payload: any) => {
    if (payload.message) {
      setSelectedMessage(payload.message);
      setShowCustomModal(true);
    }
  };

  // Expose handlers globally for custom attachments
  useEffect(() => {
    global.chatScreenHandlers = {
      handleLongPressMessage,
      setSelectedMessage,
      setShowCustomModal
    };
    
    return () => {
      global.chatScreenHandlers = null;
    };
  }, []);

  // Handle thread reply
  const handleThreadReply = (message: any) => {
    setThread(message);
  };

  useEffect(() => {
    setTheme(getTheme());
  }, [colorScheme]);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      bounceAnim.stopAnimation();
      bounceAnim.setValue(0);
    }
  }, [loading]);

  // Function to fetch creator's thumbnail
  const fetchCreatorThumbnail = async () => {
    try {
      if (!creatorName) return;
      
      // Get creator ID from channel ID
      let creatorId = '';
      if (channelId?.toString().startsWith('creator-')) {
        creatorId = channelId.toString().replace('creator-', '');
      } else if (channelId?.toString().startsWith('dm-')) {
        creatorId = channelId.toString().replace('dm-', '').split('-')[0];
      }
      
      if (creatorId && config.endpoint && config.projectId && config.databaseId && config.photoCollectionId) {
        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query photos collection for the creator's thumbnail
        const photos = await databases.listDocuments(
          config.databaseId,
          config.photoCollectionId,
          [Query.equal('IdCreator', creatorId)]
        );
        
        if (photos.documents.length > 0) {
          const compressedThumbnail = photos.documents[0].compressed_thumbnail;
          const fullThumbnail = photos.documents[0].thumbnail;
          
          if (compressedThumbnail) {
            setCreatorThumbnail(compressedThumbnail);
          }
          
          if (fullThumbnail) {
            setCreatorFullThumbnail(fullThumbnail);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching creator thumbnail:', error);
    }
  };

  useEffect(() => {
    fetchCreatorThumbnail();
  }, [creatorName, channelId]);

  // Setup both channels once
  useEffect(() => {
    const setupChannels = async () => {
      try {
        if (!channelId || !user) return;

        // Wait for Stream Chat connection if not connected yet
        if (!isStreamConnected) {
          console.log('Waiting for Stream Chat connection...');
          setLoading(true);
          return;
        }

        // Get creator ID from channel ID
        let creatorId = '';
        if (channelId?.toString().startsWith('creator-')) {
          creatorId = channelId.toString().replace('creator-', '');
        } else if (channelId?.toString().startsWith('dm-')) {
          creatorId = channelId.toString().replace('dm-', '').split('-')[0];
        }

        if (!creatorId) {
          setError('Invalid channel ID');
          setLoading(false);
          return;
        }

        console.log('💬 Loading pre-setup channels for creator:', creatorId);

        // Use pre-setup group channel
        const groupChannelId = `creator-${creatorId}`;
        const groupChannel = client.channel('messaging', groupChannelId);
        
        try {
          // Check if channel is already watched (pre-setup)
          if (!groupChannel.state.isUpToDate) {
            console.log('📡 Watching group channel (not pre-setup)...');
          await groupChannel.watch();
          } else {
            console.log('✅ Group channel already watched (pre-setup)');
          }
          setGroupChannel(groupChannel);
          console.log('✅ Group channel loaded successfully:', {
            channelId: groupChannel.id,
            memberCount: Object.keys(groupChannel.state.members).length,
            messageCount: groupChannel.state.messages ? Object.keys(groupChannel.state.messages).length : 0
          });
        } catch (groupError) {
          console.error('Error loading group channel:', groupError);
        }

        // Use pre-setup DM channel
        const dmChannelId = `dm-${creatorId}-${user.$id}`;
        const dmChannel = client.channel('messaging', dmChannelId);
        
        try {
          // Check if channel is already watched (pre-setup)
          if (!dmChannel.state.isUpToDate) {
            console.log('📡 Watching DM channel (not pre-setup)...');
          await dmChannel.watch();
          } else {
            console.log('✅ DM channel already watched (pre-setup)');
          }
          setDmChannel(dmChannel);
          console.log('✅ DM channel loaded successfully:', {
            channelId: dmChannel.id,
            memberCount: Object.keys(dmChannel.state.members).length,
            members: Object.keys(dmChannel.state.members)
          });
        } catch (dmError) {
          console.error('Error loading DM channel:', dmError);
        }

        setError(null);
      } catch (error) {
        console.error('Error loading channels:', error);
        setError('Failed to load channels');
      } finally {
        setLoading(false);
      }
    };

    setupChannels();
  }, [channelId, user, isStreamConnected]);

  // Function to open image in full screen
  const openImageInFullScreen = (imageUri: string) => {
    setFullScreenImageUri(imageUri);
    setShowFullScreenImage(true);
  };

  // Function to switch between chat types - no navigation needed
  const switchChatType = () => {
    const newChatType = currentChatType === 'group' ? 'direct' : 'group';
    setCurrentChatType(newChatType);
    console.log('🔄 Switched to:', newChatType, 'chat');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.Image
            source={loadingIcon}
            style={{ width: 60, height: 60, marginBottom: 16, transform: [{ translateY: bounceAnim }] }}
            resizeMode="contain"
          />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'questrial' }}>
            Loading chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentChannel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: 'questrial', textAlign: 'center', marginBottom: 16 }}>
            {error || 'Channel not found'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: '#FB2355',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'questrial' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
        

      <OverlayProvider>
        <Chat client={client} style={theme}>
          <Channel
            channel={currentChannel}
            keyboardVerticalOffset={0}
            thread={thread}
            threadList={!!thread}

                          onLongPressMessage={handleLongPressMessage}
              onPressMessage={({ message }) => {
                // Only open thread for non-poll messages
                // For poll messages, let the poll handle its own interactions
                if (message && !message.poll) {
                  setThread(message);
                }
              }}
              MessageSimple={CustomMessageSimple}
            MessageAvatar={CustomMessageAvatar}
            MessageStatus={CustomMessageStatus}
            ShowThreadMessageInChannelButton={() => null}
            supportedReactions={customReactions}
            messageActions={() => []} // Disable default message actions
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: '#1A1A1A',
              position: 'relative'
            }}>
              {/* Thread back button */}
              {thread && (
              <TouchableOpacity 
                  onPress={() => setThread(null)}
                style={{
                    position: 'absolute', 
                    left: 16,
                    zIndex: 10,
                    padding: 8
                }}
              >
                  <Ionicons name="chevron-back-outline" size={24} color="white" />
              </TouchableOpacity>
              )}
              
              {/* Cherrizbox Icon - Positioned absolutely on the left */}
              {!thread && (
                <TouchableOpacity 
                  onPress={() => router.back()}
                  style={{
                  position: 'absolute',
                  left: 16,
                  flexDirection: 'row',
                  alignItems: 'center'
                  }}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={require('../../assets/images/cherry-icon.png')}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      backgroundColor: 'white',
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
              
              {/* Centered Text */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Text style={{ 
                  fontSize: thread ? 18 : 40,
                  fontWeight: 'bold',
                  color: 'white', 
                  fontFamily: 'MuseoModerno-Regular'
                }}>
                  {thread ? 'Thread Reply' : 'cherrizbox'}
                </Text>
              </View>
              
              {/* Creator's photo - Positioned absolutely on the right */}
              {!thread && (
                <TouchableOpacity 
                  onPress={() => setShowFullScreenProfile(true)}
                  style={{
                  position: 'absolute',
                  right: 16,
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#2A2A2A',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                  }}
                  activeOpacity={0.7}
                >
                  {creatorThumbnail ? (
                    <Image
                      source={{ uri: creatorThumbnail }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
              <Text style={{ 
                      fontSize: 24,
                      fontWeight: 'bold',
                color: 'white', 
                fontFamily: 'questrial'
              }}>
                      {(creatorName as string)?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
                  )}
            </TouchableOpacity>
              )}
            </View>
            
            {/* Chat Type Toggle - Only show when not in thread */}
            {!thread && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                paddingVertical: 16,
                backgroundColor: '#1A1A1A',
                borderBottomWidth: 1,
                borderBottomColor: '#2A2A2A'
              }}>
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: '#1A1A1A',
                  borderRadius: 25,
                  borderWidth: 1,
                  borderColor: '#fff',
                  width: '100%',
                  height: 40,
                  overflow: 'hidden',
                }}>
                  {/* Group Chat Button */}
                  <TouchableOpacity
                    onPress={() => currentChatType !== 'group' && switchChatType()}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      backgroundColor: currentChatType === 'group' ? '#fff' : 'transparent',
                      borderRadius: 25,
                      height: '100%',
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons 
                      name="people" 
                      size={16} 
                      color={currentChatType === 'group' ? '#18181b' : '#888'} 
                    />
                    <Text style={{
                      color: currentChatType === 'group' ? '#18181b' : '#888',
                      fontSize: 13,
                      fontFamily: 'questrial',
                      fontWeight: currentChatType === 'group' ? 'bold' : '500'
                    }}>
                      {creatorName}'s Box
                    </Text>
                  </TouchableOpacity>
                  {/* Direct Message Button */}
                  <TouchableOpacity
                    onPress={() => currentChatType !== 'direct' && switchChatType()}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      backgroundColor: currentChatType === 'direct' ? '#fff' : 'transparent',
                      borderRadius: 25,
                      height: '100%',
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons 
                      name="chatbubble-ellipses" 
                      size={16} 
                      color={currentChatType === 'direct' ? '#18181b' : '#888'} 
                    />
                    <Text style={{
                      color: currentChatType === 'direct' ? '#18181b' : '#888',
                      fontSize: 13,
                      fontFamily: 'questrial',
                      fontWeight: currentChatType === 'direct' ? 'bold' : '500'
                    }}>
                      One on One
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Conditional rendering based on thread state */}
            {thread ? (
              <Thread />
            ) : (
              <>
                <MessageList 
                  EmptyStateIndicator={() => (
                    <View style={{ flex: 1, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                      <Image
                        source={loadingIcon}
                        style={{ width: 60, height: 60, marginBottom: 18, opacity: 0.8 }}
                        resizeMode="contain"
                      />
                      <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'questrial', textAlign: 'center', opacity: 0.7 }}>
                        No messages yet. Start the conversation!
                      </Text>
                    </View>
                  )}
                  onThreadSelect={setThread}
                />
                <CustomMessageInput 
                  currentChatType={currentChatType as string}
                  setSelectedAttachment={setSelectedAttachment}
                  selectedAttachment={selectedAttachment}
                  tipAmount={tipAmount}
                  setTipAmount={setTipAmount}
                  currentChannel={currentChannel}
                />
              </>
            )}

            {/* Custom Message Modal */}
            <CustomMessageModal
              visible={showCustomModal}
              onClose={() => setShowCustomModal(false)}
              message={selectedMessage}
              onThreadReply={handleThreadReply}
            />

          </Channel>
        </Chat>
      </OverlayProvider>
      
      {/* Full Screen Profile Picture Modal - At highest level */}
      <FullScreenProfileModal
        visible={showFullScreenProfile}
        onClose={() => setShowFullScreenProfile(false)}
        imageUrl={creatorFullThumbnail || creatorThumbnail}
        creatorName={creatorName as string}
      />
            
    </SafeAreaView>
  );
} 