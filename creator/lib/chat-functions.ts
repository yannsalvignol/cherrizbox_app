import { ID } from 'appwrite';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { config, storage } from './appwrite';
import { formatPrice } from './currency-utils';

/**
 * Chat utility functions extracted from the main chat component
 * These functions handle various chat operations like sending paid content,
 * file uploads, audio messages, and content creation.
 */

/**
 * Handles the creation of paid photo content
 */
export const handlePaidContentCreation = async () => {
  try {
    // Request permission to access media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to share paid content.');
      return null;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    
    return null;
  } catch (error) {
    console.error('Error selecting image:', error);
    Alert.alert('Error', 'Failed to select image. Please try again.');
    return null;
  }
};

/**
 * Sends paid photo content to the chat
 */
export const sendPaidContent = async (
  imageUri: string, 
  price: number, 
  channel: any, 
  user: any, 
  userCurrency: string,
  setUploadProgress: (progress: string) => void,
  setShowUploadModal: (show: boolean) => void,
  setIsPhotoUploading: (uploading: boolean) => void
) => {
  try {
    if (!channel) {
      console.error('No channel available');
      return;
    }

    if (!user?.$id) {
      console.error('No user ID available');
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    // Show custom upload modal
    setIsPhotoUploading(true);
    setUploadProgress('Uploading your content...');
    setShowUploadModal(true);

    // Create a unique ID for this paid content
    const paidContentId = `paid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Upload image to Appwrite storage
    let appwriteImageUrl = imageUri; // fallback to local URI
    
    try {
      console.log('Uploading image to Appwrite storage...');
      setUploadProgress('Processing image...');
      
      // Get file info to determine size
      const fileInfo = await fetch(imageUri);
      const fileBlob = await fileInfo.blob();
      
      setUploadProgress('Uploading to cloud storage...');
      
      // Create file object for upload
      const fileToUpload = {
        uri: imageUri,
        type: 'image/jpeg',
        name: `paid_content_${paidContentId}.jpg`,
        size: fileBlob.size,
      };

      // Upload to Appwrite storage
      const uploadedFile = await storage.createFile(
        config.storageStreamChatId,
        ID.unique(),
        fileToUpload
      );

      // Get the file URL from Appwrite
      appwriteImageUrl = storage.getFileView(config.storageStreamChatId, uploadedFile.$id).toString();
      
      console.log('Image uploaded successfully to Appwrite:', uploadedFile.$id);
      console.log('Appwrite image URL:', appwriteImageUrl);
      
      setUploadProgress('Finalizing...');
      
    } catch (uploadError) {
      console.error('Error uploading to Appwrite storage:', uploadError);
      // Continue with local URI as fallback
      console.log('Falling back to local URI for image');
      setUploadProgress('Preparing content...');
    }
    
    // Send message with paid content attachment (using Appwrite URL if available)
    await channel.sendMessage({
      attachments: [
        {
          type: 'paid_content',
          image_url: appwriteImageUrl,
          price: price.toFixed(2),
          paid_content_id: paidContentId,
          title: 'Paid Content',
          description: `Unlock this content for ${formatPrice(price, userCurrency)}`,
        },
      ],
    });

    console.log('Paid content sent successfully with image URL:', appwriteImageUrl);
    
    // Hide upload modal
    setIsPhotoUploading(false);
    setShowUploadModal(false);
    setUploadProgress('');

  } catch (error) {
    console.error('Error sending paid content:', error);
    setIsPhotoUploading(false);
    setShowUploadModal(false);
    setUploadProgress('');
    Alert.alert('Error', 'Failed to send paid content. Please try again.');
  }
};

/**
 * Handles file selection for paid content
 */
export const handleFileCreation = async () => {
  try {
    // Import DocumentPicker
    const DocumentPicker = await import('expo-document-picker');
    
    // Launch document picker for PDF files only (robust across platforms)
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'com.adobe.pdf', 'public.pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0] as any;
      const name: string = asset?.name || '';
      const mime: string = asset?.mimeType || '';
      const isPdf = (mime && mime.toLowerCase().includes('pdf')) || name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        Alert.alert('Invalid file type', 'Please select a PDF file (.pdf)');
        return null;
      }
      return asset;
    }
    
    return null;
  } catch (error) {
    console.error('Error picking file:', error);
    Alert.alert('Error', 'Failed to pick file. Please try again.');
    return null;
  }
};

/**
 * Handles video selection for paid content
 */
export const handlePaidVideoCreation = async () => {
  try {
    console.log('🔧 handlePaidVideoCreation called');
    
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need permission to access your video library');
      return null;
    }

    console.log('✅ Permission granted, opening video picker...');
    
    // Use ImagePicker specifically for videos
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8, // Compress video slightly
      videoMaxDuration: 300, // 5 minutes max
    });

    console.log('🎥 Video picker result:', result);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      console.log('✅ Video selected:', asset);
      return asset.uri;
    } else {
      console.log('❌ Video selection cancelled or failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Error in handlePaidVideoCreation:', error);
    Alert.alert('Error', `Failed to select video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

/**
 * Sends a blurry/paid file to the chat
 */
export const sendBlurryFile = async (
  fileUri: string,
  price: number,
  title: string,
  channel: any,
  user: any,
  userCurrency: string,
  setUploadProgress: (progress: string) => void,
  setShowUploadModal: (show: boolean) => void,
  setIsFileUploading: (uploading: boolean) => void
) => {
  try {
    console.log('🔧 sendBlurryFile called with:', { fileUri, price, title });
    setIsFileUploading(true);
    setShowUploadModal(true);
    setUploadProgress('Preparing file upload...');
    
    if (!channel) {
      console.error('❌ No channel available');
      Alert.alert('Error', 'No channel available');
      setUploadProgress('');
      setShowUploadModal(false);
      setIsFileUploading(false);
      return;
    }

    if (!user?.$id) {
      console.error('❌ No user ID available');
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      setUploadProgress('');
      setShowUploadModal(false);
      setIsFileUploading(false);
      return;
    }

    console.log('✅ Channel and user available, preparing file...');
    setUploadProgress('Preparing file for upload...');

    // Create a unique ID for this file
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Upload file to Appwrite storage
    let appwriteFileUrl = fileUri; // fallback to local URI
    
    try {
      console.log('📤 Uploading file to Appwrite storage...');
      setUploadProgress('Processing file...');
      
      // Get file info to determine size
      const fileInfo = await fetch(fileUri);
      const fileBlob = await fileInfo.blob();
      
      setUploadProgress('Uploading to cloud storage...');
      
      // Determine file extension and MIME type from URI or title
      let fileExtension = '.pdf'; // Default to PDF
      let mimeType = 'application/pdf';
      
      // Try to extract extension from URI
      if (fileUri.includes('.')) {
        const uriParts = fileUri.split('.');
        const ext = uriParts[uriParts.length - 1].toLowerCase();
        if (ext) {
          fileExtension = `.${ext}`;
          // Set appropriate MIME type based on extension
          switch(ext) {
            case 'pdf':
              mimeType = 'application/pdf';
              break;
            case 'doc':
            case 'docx':
              mimeType = 'application/msword';
              break;
            case 'txt':
              mimeType = 'text/plain';
              break;
            case 'jpg':
            case 'jpeg':
              mimeType = 'image/jpeg';
              break;
            case 'png':
              mimeType = 'image/png';
              break;
            default:
              mimeType = 'application/octet-stream';
          }
        }
      }
      
      // Also check title for file type hints
      if (title.toLowerCase().includes('.pdf')) {
        fileExtension = '.pdf';
        mimeType = 'application/pdf';
      }
      
      console.log(`📄 File type detected: ${fileExtension}, MIME: ${mimeType}`);
      
      // Create file object for upload with proper extension
      const fileToUpload = {
        uri: fileUri,
        type: mimeType,
        name: `paid_file_${fileId}${fileExtension}`, // Include file extension
        size: fileBlob.size,
      };

      // Upload to Appwrite storage
      const uploadedFile = await storage.createFile(
        config.storageStreamChatId,
        ID.unique(),
        fileToUpload
      );

      // Get the file URL from Appwrite
      appwriteFileUrl = storage.getFileView(config.storageStreamChatId, uploadedFile.$id).toString();
      
      console.log('📤 File uploaded successfully to Appwrite:', uploadedFile.$id);
      console.log('🔗 Appwrite file URL:', appwriteFileUrl);
      
      setUploadProgress('Finalizing...');
      
    } catch (uploadError) {
      console.error('❌ Error uploading file to Appwrite storage:', uploadError);
      // Continue with local URI as fallback
      console.log('⚠️ Falling back to local URI for file');
      setUploadProgress('Preparing content...');
    }

    setUploadProgress('Sending paid file...');

    // Send message with blurry file attachment
    await channel.sendMessage({
      text: `📎 ${title} - ${formatPrice(price, userCurrency)}`,
      attachments: [
        {
          type: 'blurry_file',
          file_url: appwriteFileUrl, // Appwrite URL for storage/backup
          local_file_uri: fileUri, // Original local URI for access
          price: price.toFixed(2),
          paid_content_id: fileId,
          title: title,
          description: `Unlock this file for ${formatPrice(price, userCurrency)}`,
          is_blurred: true, // Mark as blurred/locked
        },
      ],
    });

    console.log('✅ Blurry file sent successfully with URL:', appwriteFileUrl);
    setUploadProgress('File uploaded successfully!');
    
    // Success haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Hide upload modal after a brief delay to show success
    setTimeout(() => {
      setIsFileUploading(false);
      setShowUploadModal(false);
      setUploadProgress('');
    }, 2000);

  } catch (error) {
    console.error('❌ Error sending blurry file:', error);
    setUploadProgress('');
    setShowUploadModal(false);
    setIsFileUploading(false);
    Alert.alert('Error', `Failed to send file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Error haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Sends an audio message to the chat
 */
export const handleSendAudio = async (audioUri: string, duration: number, channel: any) => {
  try {
    if (channel) {
      // Format duration as MM:SS
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      console.log('🎤 Starting audio upload to Appwrite storage...');
      
      // Upload audio to Appwrite storage
      let appwriteAudioUrl = audioUri; // fallback to local URI
      let fileSize = Math.round(duration * 16000); // Default estimate
      
      try {
        // Get file info to determine size
        const fileInfo = await fetch(audioUri);
        const fileBlob = await fileInfo.blob();
        fileSize = fileBlob.size;
        
        console.log('📏 Audio file size:', fileSize, 'bytes');
        
        // Create unique filename
        const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create file object for upload with proper headers
        const fileToUpload = {
          uri: audioUri,
          type: 'audio/mp4', // Use audio/mp4 MIME type for better compatibility
          name: `voice_message_${audioId}.m4a`,
          size: fileSize,
        };

        console.log('📤 Uploading audio file:', fileToUpload);

        // Upload to Appwrite storage
        const uploadedFile = await storage.createFile(
          config.storageStreamChatId,
          ID.unique(),
          fileToUpload
        );

        // Get the file URL from Appwrite - try download URL for better media compatibility
        try {
          appwriteAudioUrl = storage.getFileDownload(config.storageStreamChatId, uploadedFile.$id).toString();
          console.log('🎤 Using download URL:', appwriteAudioUrl);
        } catch (downloadError) {
          // Fallback to view URL
          appwriteAudioUrl = storage.getFileView(config.storageStreamChatId, uploadedFile.$id).toString();
          console.log('🎤 Using view URL as fallback:', appwriteAudioUrl);
        }
        
        console.log('🎤 Audio uploaded successfully to Appwrite:', uploadedFile.$id);
        console.log('🎤 Appwrite audio URL:', appwriteAudioUrl);
        
      } catch (uploadError) {
        console.error('Error uploading audio to Appwrite storage:', uploadError);
        // Continue with local URI as fallback
        console.log('Falling back to local URI for audio');
      }
      
      await channel.sendMessage({
        text: '',
        attachments: [{
          type: 'custom_audio',
          asset_url: appwriteAudioUrl, // Use Appwrite URL if available, otherwise local
          file_size: fileSize,
          mime_type: 'audio/mp4', // Use audio/mp4 for better compatibility
          title: 'Voice Message',
          duration: formattedDuration,
          fallback: 'Voice Message',
        }],
      });
      console.log('✅ Voice message sent successfully with duration:', formattedDuration);
    }
  } catch (error) {
    console.error('Error sending voice message:', error);
    Alert.alert('Error', 'Failed to send voice message');
  }
};

/**
 * Sends a paid video to the chat
 */
export const sendPaidVideo = async (
  videoUri: string,
  price: number,
  title: string,
  channel: any,
  user: any,
  userCurrency: string,
  setUploadProgress: (progress: string) => void,
  setShowUploadModal: (show: boolean) => void,
  setIsVideoUploading: (uploading: boolean) => void
) => {
  try {
    console.log('🔧 sendPaidVideo called with:', { videoUri, price, title });
    setIsVideoUploading(true);
    setShowUploadModal(true);
    setUploadProgress('Preparing video upload...');

    if (!channel) {
      console.error('❌ No channel available');
      Alert.alert('Error', 'No channel available');
      setUploadProgress('');
      setShowUploadModal(false);
      setIsVideoUploading(false);
      return;
    }

    if (!user?.$id) {
      console.error('❌ No user ID available');
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      setUploadProgress('');
      setShowUploadModal(false);
      setIsVideoUploading(false);
      return;
    }

    console.log('✅ Channel and user available, preparing video...');
    setUploadProgress('Preparing video for upload...');

    // Create a unique content ID for payment tracking
    const contentId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Upload video to Appwrite storage
    let appwriteVideoUrl = videoUri; // fallback to local URI
    
    try {
      console.log('Uploading video to Appwrite storage...');
      setUploadProgress('Processing video...');
      
      // Get file info to determine size
      const fileInfo = await fetch(videoUri);
      const fileBlob = await fileInfo.blob();
      
      setUploadProgress('Uploading to cloud storage...');
      
      // Create file object for upload
      const fileToUpload = {
        uri: videoUri,
        type: 'video/mp4',
        name: `paid_video_${contentId}.mp4`,
        size: fileBlob.size,
      };

      // Upload to Appwrite storage
      const uploadedFile = await storage.createFile(
        config.storageStreamChatId,
        ID.unique(),
        fileToUpload
      );

      // Get the file URL from Appwrite
      appwriteVideoUrl = storage.getFileView(config.storageStreamChatId, uploadedFile.$id).toString();
      
      console.log('Video uploaded successfully to Appwrite:', uploadedFile.$id);
      console.log('Appwrite video URL:', appwriteVideoUrl);
      
      setUploadProgress('Finalizing...');
      
    } catch (uploadError) {
      console.error('Error uploading video to Appwrite storage:', uploadError);
      // Continue with local URI as fallback
      console.log('Falling back to local URI for video');
      setUploadProgress('Preparing content...');
    }

    setUploadProgress('Sending paid video...');
    
    const messageData = {
      text: `🎥 ${title} - ${formatPrice(price, userCurrency)}`,
      attachments: [
        {
          type: 'paid_video',
          video_url: appwriteVideoUrl, // Appwrite URL for storage/backup
          local_video_uri: videoUri, // Original local URI for playing
          price: price.toFixed(2),
          paid_content_id: contentId,
          title: title,
          description: `Unlock this premium video for ${formatPrice(price, userCurrency)}`,
          is_blurred: true, // Mark as blurred/locked
        },
      ],
    };

    console.log('📤 Sending video message with data:', JSON.stringify(messageData, null, 2));
    
    // Send message with paid video attachment
    const sentMessage = await channel.sendMessage(messageData);

    console.log('✅ Paid video sent successfully:', sentMessage);
    setUploadProgress('Video uploaded successfully!');
    
    // Success haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Hide upload modal after a brief delay to show success
    setTimeout(() => {
      setIsVideoUploading(false);
      setShowUploadModal(false);
      setUploadProgress('');
    }, 2000);

  } catch (error) {
    console.error('❌ Error sending paid video:', error);
    setUploadProgress('');
    setShowUploadModal(false);
    setIsVideoUploading(false);
    Alert.alert('Error', `Failed to send video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Error haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Handles poll creation
 */
export const handleCreatePoll = async (pollData: any, channel: any, client: any, setShowPollCreation: (show: boolean) => void) => {
  try {
    if (!channel || !client) {
      console.error('No channel or client available');
      return;
    }

    console.log('Creating poll with data:', pollData);

    // Step 1: Create the poll using Stream Chat API
    const pollConfig = {
      name: pollData.poll.name,
      options: pollData.poll.options,
      allow_user_suggested_options: pollData.poll.allow_user_suggested_options,
      max_votes_allowed: pollData.poll.max_votes_allowed,
      voting_visibility: pollData.poll.voting_visibility,
      enforce_unique_vote: pollData.poll.max_votes_allowed === 1
    };

    console.log('Creating poll with config:', JSON.stringify(pollConfig, null, 2));
    
    const createdPoll = await client.createPoll(pollConfig);
    console.log('Poll created successfully:', createdPoll);

    // Step 2: Send a message with the poll_id
    const messageData = {
      text: `📊 ${pollData.text}`,
      poll_id: createdPoll.poll.id
    };

    console.log('Sending message with poll_id:', messageData);

    await channel.sendMessage(messageData);
    console.log('Poll message sent successfully');
    
    setShowPollCreation(false);
  } catch (error) {
    console.error('Error creating poll:', error);
  }
};

/**
 * Handles long press on messages
 */
export const handleLongPressMessage = (payload: any, setSelectedMessage: (message: any) => void, setShowCustomModal: (show: boolean) => void) => {
  if (payload.message) {
    setSelectedMessage(payload.message);
    setShowCustomModal(true);
  }
};

/**
 * Handles thread reply
 */
export const handleThreadReply = (message: any, setThread: (thread: any) => void) => {
  setThread(message);
};

/**
 * Gets the appropriate channel title based on channel type
 */
export const getChannelTitle = (channel: any, channelId: string, userId: string) => {
  if (!channel) return 'Chat';
  
  // For creator channels
  if (channelId?.startsWith('creator-')) {
    return 'My Box';
  }
  
  // For DM channels
  if (channelId?.startsWith('dm-')) {
    const members = Object.keys(channel.state.members || {});
    const otherMembers = members.filter(memberId => memberId !== userId);
    if (otherMembers.length > 0) {
      return `Chat with ${otherMembers[0]}`;
    }
  }
  
  return channel.data?.name || 'Chat';
};

/**
 * Helper function to check if current user is the creator
 */
export const isCreator = (channelId: string, userId: string, channel: any) => {
  return channelId?.startsWith('creator-') && userId === channel?.data?.created_by_id;
};

/**
 * Helper function to get creator ID
 */
export const getCreatorId = (channel: any) => {
  return channel?.data?.created_by_id;
};

/**
 * Preloads visible images in the chat for better performance
 */
/**
 * Preload all thread messages for messages that have replies
 * This enables instant thread access without loading delays
 */
export const preloadAllThreadMessages = async (
  channel: any, 
  threadMessagesCache: React.MutableRefObject<Map<string, any[]>>
) => {
  if (!channel?.state?.messages) {
    console.log('📝 [ThreadPreload] No channel messages to scan');
    return;
  }

  console.log('🧵 [ThreadPreload] Starting thread discovery and preloading...');
  
  try {
    // Get all messages from the channel
    const allMessages = Object.values(channel.state.messages);
    
    // Find messages that have thread replies (reply_count > 0)
    const messagesWithThreads = allMessages.filter((message: any) => 
      message?.reply_count && message.reply_count > 0
    );
    
    console.log(`🔍 [ThreadPreload] Found ${messagesWithThreads.length} messages with threads`);
    
    if (messagesWithThreads.length === 0) {
      console.log('📝 [ThreadPreload] No threads found to preload');
      return;
    }
    
    // Batch load all thread messages in parallel
    const threadLoadPromises = messagesWithThreads.map(async (message: any) => {
      try {
        // Check if already cached
        if (threadMessagesCache.current.has(message.id)) {
          console.log(`⚡ [ThreadPreload] Thread ${message.id} already cached`);
          return { messageId: message.id, cached: true };
        }
        
        console.log(`🔄 [ThreadPreload] Loading thread for message: ${message.id}`);
        
        // Load thread replies
        const threadReplies = await channel.getReplies(message.id, {
          limit: 50,
        });
        
        // Cache the thread messages
        threadMessagesCache.current.set(message.id, threadReplies.messages);
        
        console.log(`✅ [ThreadPreload] Cached ${threadReplies.messages.length} messages for thread ${message.id}`);
        
        return {
          messageId: message.id,
          messageCount: threadReplies.messages.length,
          success: true
        };
        
      } catch (error) {
        console.error(`❌ [ThreadPreload] Failed to load thread ${message.id}:`, error);
        return {
          messageId: message.id,
          error: error,
          success: false
        };
      }
    });
    
    // Wait for all thread loading to complete
    const results = await Promise.allSettled(threadLoadPromises);
    
    // Log results
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const cached = results.filter(result => 
      result.status === 'fulfilled' && result.value.cached
    ).length;
    
    const failed = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && !result.value.success && !result.value.cached)
    ).length;
    
    console.log(`🎯 [ThreadPreload] Results: ${successful} loaded, ${cached} cached, ${failed} failed`);
    console.log(`💾 [ThreadPreload] Total threads in cache: ${threadMessagesCache.current.size}`);
    
  } catch (error) {
    console.error('❌ [ThreadPreload] Error during thread preloading:', error);
  }
};

export const preloadVisibleImages = async (channel: any) => {
  try {
    if (!channel?.state?.messages) {
      console.log('🚫 [ImagePreload] No messages available for preloading');
      return;
    }

    const messages = Object.values(channel.state.messages);
    console.log(`🔍 [ImagePreload] Scanning ${messages.length} messages for images...`);
    
    // Extract image URLs from messages
    const imageUrls: string[] = [];
    
    messages.forEach((message: any) => {
      if (message?.attachments) {
        message.attachments.forEach((attachment: any) => {
          if (attachment?.image_url) {
            imageUrls.push(attachment.image_url);
          }
          if (attachment?.asset_url && attachment?.type === 'custom_attachment' && attachment?.asset_url.includes('image')) {
            imageUrls.push(attachment.asset_url);
          }
        });
      }
    });
    
    // Remove duplicates
    const uniqueImageUrls = [...new Set(imageUrls)];
    console.log(`🖼️ [ImagePreload] Found ${uniqueImageUrls.length} unique images to preload`);
    
    if (uniqueImageUrls.length > 0) {
      console.log(`🚀 [ImagePreload] Starting preload of ${uniqueImageUrls.length} images...`);
      
             // Import and use the image cache for preloading
       const { chatImageCache } = await import('./image-cache');
      await chatImageCache.preloadImages(uniqueImageUrls);
      
      console.log(`✅ [ImagePreload] Completed preloading ${uniqueImageUrls.length} images`);
    }
  } catch (error) {
    console.error('⚠️ [ImagePreload] Failed to preload images:', error);
  }
};