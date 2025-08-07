import { useGlobalContext } from '@/lib/global-provider';
import { client, connectUser } from '@/lib/stream-chat';
import { Audio } from 'expo-av';

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Channel,
  Chat,
  MessageList,
  OverlayProvider
} from 'stream-chat-react-native';
import {
  getUserProfile
} from '../../lib/appwrite';
import BlurryFileAttachment from '../components/chat/attachments/BlurryFileAttachment';
import CustomAttachment from '../components/chat/attachments/CustomAttachment';
import CustomAudioAttachment from '../components/chat/attachments/CustomAudioAttachment';
import CustomPhotoAttachment from '../components/chat/attachments/CustomPhotoAttachment';
import PaidContentAttachment from '../components/chat/attachments/PaidContentAttachment';
import PaidVideoAttachment from '../components/chat/attachments/PaidVideoAttachment';
import AudioRecordingModal from '../components/chat/AudioRecordingModal';
import CustomInputButtons, { setGlobalRecordingModalHandler } from '../components/chat/CustomInputButtons';
import CustomMessageAvatar from '../components/chat/CustomMessageAvatar';
import CustomMessageInput from '../components/chat/CustomMessageInput';
import CustomMessageSimple from '../components/chat/CustomMessageSimple';
import CustomPollCreation from '../components/chat/CustomPollCreation';
import CustomReactionList from '../components/chat/CustomReactionList';
import CustomThread from '../components/chat/CustomThread';
import EmptyStateIndicator from '../components/chat/EmptyStateIndicator';
import CustomMessageModal from '../components/chat/modals/CustomMessageModal';
import FileUploadModal from '../components/chat/modals/FileUploadModal';
import PaidFilesPriceModal from '../components/chat/modals/PaidFilesPriceModal';
import PaidPhotosPriceModal from '../components/chat/modals/PaidPhotosPriceModal';
import PaidVideosPriceModal from '../components/chat/modals/PaidVideosPriceModal';
import PhotoUploadModal from '../components/chat/modals/PhotoUploadModal';
import VideoUploadModal from '../components/chat/modals/VideoUploadModal';


// Enhanced profile image caching using our data cache system
import {
  handleCreatePoll,
  handleLongPressMessage,
  handleSendAudio,
  handleThreadReply,
  preloadAllThreadMessages,
  preloadVisibleImages
} from '../../lib/chat-functions';
import { customReactions } from '../../lib/chat-reactions';
import { getChatTheme } from '../../lib/chat-theme';
import { formatPrice } from '../../lib/currency-utils';
import { chatDataCache } from '../../lib/data-cache';
import { useUploadManager } from '../../lib/hooks/useUploadManager';







// Custom MessageStatus component that hides the default timestamp completely
const CustomMessageStatus = () => {
  return null; // Hide the default timestamp completely
};










export default function ChatScreen() {
  const router = useRouter();
  const { id: channelId } = useLocalSearchParams<{ id: string }>();
  const { user, userCurrency } = useGlobalContext();
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPollCreation, setShowPollCreation] = useState(false);
  const [thread, setThread] = useState<any>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(getChatTheme());
  // Upload management using custom hooks
  const uploadManager = useUploadManager({
    channel,
    user,
    userCurrency
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  
  // Thread message caching system
  const threadMessagesCache = useRef<Map<string, any[]>>(new Map());
  


  useEffect(() => {
    setTheme(getChatTheme());
  }, [colorScheme]);

  // Register global handlers for CustomInputButtons and message actions
  useEffect(() => {
    // Set up recording modal handler
    setGlobalRecordingModalHandler(setShowRecordingModal);
    
    // Set up message action handlers
    (global as any).chatScreenHandlers = {
      handleLongPressMessage: ({ message }: { message: any }) => {
        setSelectedMessage(message);
        setShowCustomModal(true);
      }
    };
    
    // Cleanup on unmount
    return () => {
      setGlobalRecordingModalHandler(() => {});
      (global as any).chatScreenHandlers = null;
    };
  }, []);

  useEffect(() => {
    const initializeChat = async () => {
      if (!user?.$id || !channelId) {
        setError('Missing user or channel ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Connect user to Stream Chat
        await connectUser(user.$id);

        // Get the channel
        const channelInstance = client.channel('messaging', channelId);
        await channelInstance.watch();

        setChannel(channelInstance);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [user, channelId]);

  // Load profile image with caching
  useEffect(() => {
    const loadProfileImage = async () => {
      if (!user?.$id) return;

      try {
        // Use cached profile image or fetch if not available
        const profileImageUrl = await chatDataCache.getOrFetchProfileImage(
          user.$id,
          async () => {
            console.log(`🔄 [ProfileImage] Fetching profile for user: ${user.$id}`);
        const profile = await getUserProfile(user.$id);
            return profile?.profileImageUri || '';
          }
        );

        if (profileImageUrl) {
          setProfileImage(profileImageUrl);
          console.log('✅ [ProfileImage] Loaded profile image (cached):', profileImageUrl.substring(0, 60) + '...');
        } else {
          console.log('❌ [ProfileImage] No profile image found');
        }
      } catch (error) {
        console.error('❌ [ProfileImage] Error loading profile image:', error);
      }
    };

    loadProfileImage();
  }, [user]);



  // Preload images and thread messages from visible messages for better performance
  useEffect(() => {
      if (!channel) return;

    // Preload with a delay to not block initial render
    const preloadTimer = setTimeout(() => {
      // Preload visible images
      preloadVisibleImages(channel);
      
      // Preload all thread messages for instant thread access
      preloadAllThreadMessages(channel, threadMessagesCache);
    }, 1000); // Reduced delay for faster thread preloading
    
    return () => clearTimeout(preloadTimer);
  }, [channel]);






  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Image 
            source={require('../../assets/icon/loading-icon.png')} 
            style={{ width: 60, height: 60, marginBottom: 16 }} 
          />
          <Text style={{ 
            color: '#FB2355', 
            fontSize: 18, 
            marginBottom: 12,
            fontFamily: 'questrial'
          }}>
            Loading chat...
          </Text>
          <ActivityIndicator size="large" color="#FB2355" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }} edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Image 
            source={require('../../assets/icon/loading-icon.png')} 
            style={{ width: 80, height: 80, marginBottom: 16 }} 
          />
          <Text style={{ 
            color: 'white', 
            fontSize: 24, 
            fontFamily: 'Urbanist-Bold',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Error Loading Chat 😢
          </Text>
          <Text style={{ 
            color: 'white', 
            fontSize: 18, 
            textAlign: 'center',
            marginBottom: 24,
            fontFamily: 'questrial'
          }}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 25,
            }}
            onPress={() => router.back()}
          >
            <Text style={{
              color: 'white',
              fontFamily: 'Urbanist-Bold',
              fontSize: 16,
            }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!channel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }} edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Image 
            source={require('../../assets/icon/loading-icon.png')} 
            style={{ width: 80, height: 80, marginBottom: 16 }} 
          />
          <Text style={{ 
            color: 'white', 
            fontSize: 24, 
            fontFamily: 'Urbanist-Bold',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Channel Not Found 😢
          </Text>
          <Text style={{ 
            color: 'white', 
            fontSize: 18, 
            textAlign: 'center',
            marginBottom: 24,
            fontFamily: 'questrial'
          }}>
            The chat you're looking for doesn't exist or you don't have access to it.
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: '#FB2355',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 25,
            }}
            onPress={() => router.back()}
          >
            <Text style={{
              color: 'white',
              fontFamily: 'Urbanist-Bold',
              fontSize: 16,
            }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }







    return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#DCDEDF' }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-black" style={{ minHeight: 85 }}>
        {/* Cherrizbox Logo */}
        <TouchableOpacity onPress={() => router.back()}>
          <Image 
            source={require('../../assets/images/cherry-icon.png')}
            className="w-16 h-16 rounded-lg"
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        {/* Cherrizbox Logo and Text */}
        <View className="flex-row items-center">
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{
              fontSize: 42,
              fontWeight: 'bold',
              color: 'black',
              fontFamily: 'MuseoModerno-Regular',
              textAlign: 'center',
            }}>
              cherrizbox
              </Text>

          </View>
        </View>
        
        {/* Profile Picture */}
        <TouchableOpacity onPress={() => router.push('/edit-profile')}>
          <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center overflow-hidden">
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-xl text-white font-bold">
                {user?.name?.[0] || 'U'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Chat Interface with Keyboard Avoiding */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <OverlayProvider value={{ style: theme }}>
          <Chat client={client} style={theme}>
            <Channel 
              channel={channel} 
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
              thread={thread}
              threadList={!!thread}
              hasCommands={false}
              audioRecordingEnabled={false}
              InputButtons={CustomInputButtons}
              onPressMessage={({ message }) => {
                // Open thread when clicking on any message
                setThread(message);
              }}
              onLongPressMessage={(payload) => handleLongPressMessage(payload, setSelectedMessage, setShowCustomModal)}
              MessageSimple={CustomMessageSimple}
              MessageAvatar={CustomMessageAvatar}
              MessageStatus={CustomMessageStatus}
              MessageTimestamp={() => null} // Remove default timestamps
              MessageFooter={() => null} // Remove footer timestamps
              ShowThreadMessageInChannelButton={() => null}
              supportedReactions={customReactions}
              messageActions={() => []} // Disable default message actions
              ReactionListTop={CustomReactionList} // Custom reaction list without dark background
              ReactionListBottom={CustomReactionList}
              Card={(props: any) => {
                
                // The props ARE the attachment, not nested under 'attachment'
                if (props?.type === 'custom_attachment') {
                          console.log('✅ Rendering CustomAttachment for custom_attachment');
        return <CustomAttachment attachment={props} />;
                }
                
                if (props?.type === 'custom_photo') {
                  console.log('✅ Rendering CustomPhotoAttachment');
                  return <CustomPhotoAttachment attachment={props} />;
                }
                
                if (props?.type === 'custom_audio') {
                  console.log('✅ Rendering CustomAudioAttachment');
                  return <CustomAudioAttachment attachment={props} />;
                }
                
                if (props?.type === 'blurry_file') {
                  console.log('✅ Rendering BlurryFileAttachment');
                  return <BlurryFileAttachment {...props} userCurrency={userCurrency} formatPrice={formatPrice} />;
                }
                
                if (props?.type === 'paid_video') {
                  console.log('✅ Rendering PaidVideoAttachment');
                  return <PaidVideoAttachment {...props} userCurrency={userCurrency} formatPrice={formatPrice} />;
                }
                
                if (props?.type === 'paid_content') {
                  console.log('✅ Rendering PaidContentAttachment for paid_content');
                  return <PaidContentAttachment {...props} userCurrency={userCurrency} formatPrice={formatPrice} />;
                }
                
                console.log('🔄 Rendering PaidContentAttachment as fallback');
                return <PaidContentAttachment {...props} userCurrency={userCurrency} formatPrice={formatPrice} />;
              }} // Add custom attachment component
            >
              {/* Conditional rendering based on thread state */}
              {thread ? (
                <CustomThread 
                  channel={channel}
                  client={client}
                  threadMessagesCache={threadMessagesCache}
                  user={user}
                  userCurrency={userCurrency}
                  showPollCreation={showPollCreation}
                  setShowPollCreation={setShowPollCreation}
                  uploadManager={uploadManager}
                  onCloseThread={() => setThread(null)}
                />
              ) : (
                <View style={{ flex: 1 }}>
                  <MessageList 
                    EmptyStateIndicator={() => (
                      <EmptyStateIndicator channelId={channelId} />
                    )}
                    onThreadSelect={setThread}
                  />
                  <CustomMessageInput 
                    showPollCreation={showPollCreation}
                    setShowPollCreation={setShowPollCreation}
                    handlePaidContentCreation={uploadManager.photo.handlePhotoCreation}
                    handleFileCreation={uploadManager.file.handleFileCreation}
                    handlePaidVideoCreation={uploadManager.video.handleVideoCreation}
                    isFileUploading={uploadManager.file.isUploading}
                    isVideoUploading={uploadManager.video.isUploading}
                  />
                  
                  {/* Poll Creation Modal */}
                  <CustomPollCreation
                    visible={showPollCreation}
                    onClose={() => setShowPollCreation(false)}
                    onCreatePoll={(pollData) => handleCreatePoll(pollData, channel, client, setShowPollCreation)}
                  />
                </View>
              )}

              {/* Custom Message Modal */}
              <CustomMessageModal
                visible={showCustomModal}
                onClose={() => setShowCustomModal(false)}
                message={selectedMessage}
                onThreadReply={(message) => handleThreadReply(message, setThread)}
              />
              
              {/* Price Input Modal */}
              <PaidPhotosPriceModal
                visible={uploadManager.photo.showPriceModal}
                onClose={uploadManager.photo.closePriceModal}
                onSubmit={uploadManager.photo.handlePhotoSubmit}
                imageUri={uploadManager.photo.selectedImageUri}
                userCurrency={userCurrency}
                formatPrice={formatPrice}
              />
              
              {/* File Price Input Modal */}
              <PaidFilesPriceModal
                visible={uploadManager.file.showPriceModal}
                onClose={uploadManager.file.closePriceModal}
                onSubmit={uploadManager.file.handleFileSubmit}
                fileUri={uploadManager.file.selectedFileUri}
                userCurrency={userCurrency}
              />
              
              {/* Video Price Input Modal */}
              <PaidVideosPriceModal
                visible={uploadManager.video.showPriceModal}
                onClose={uploadManager.video.closePriceModal}
                onSubmit={uploadManager.video.handleVideoSubmit}
                videoUri={uploadManager.video.selectedVideoUri}
                userCurrency={userCurrency}
              />
              
              {/* Upload Progress Modals - Specialized for each type */}
              {uploadManager.video.isUploading && (
                <VideoUploadModal
                visible={uploadManager.video.showUploadModal}
                progress={uploadManager.video.uploadProgress}
                />
              )}
              
              {uploadManager.photo.isUploading && (
                <PhotoUploadModal
                  visible={uploadManager.photo.showUploadModal}
                  progress={uploadManager.photo.uploadProgress}
                />
              )}
              
              {uploadManager.file.isUploading && (
                <FileUploadModal
                  visible={uploadManager.file.showUploadModal}
                  progress={uploadManager.file.uploadProgress}
                />
              )}
              

              
              {/* Audio Recording Modal */}
              <AudioRecordingModal
                visible={showRecordingModal}
                onClose={() => setShowRecordingModal(false)}
                onSend={(audioUri, duration) => handleSendAudio(audioUri, duration, channel)}
              />
            </Channel>
          </Chat>
        </OverlayProvider>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}