import { config } from '@/lib/appwrite';
import { chatDataCache } from '@/lib/data-cache';
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Client, Databases, Query } from 'react-native-appwrite';
import { MessageAvatar, useMessageContext, useThreadContext } from 'stream-chat-react-native';

interface CustomMessageAvatarProps {
  size?: number;
  message?: any;
  [key: string]: any; // For additional props
}

const CustomMessageAvatar = (props: CustomMessageAvatarProps) => {
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
      
      try {
        // Use enhanced data cache for profile images
        const profileImageUrl = await chatDataCache.getOrFetchProfileImage(
          userId,
          async () => {
            console.log(`   [MessageAvatar] Fetching profile for user: ${userId}`);
            
        if (!config.endpoint || !config.projectId || !config.databaseId || !config.profileCollectionId) {
              return '';
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
          const profileImageUri = profiles.documents[0].profileImageUri;
              return profileImageUri || '';
            }
            
            return '';
          }
        );

        if (profileImageUrl) {
          setProfileImage(profileImageUrl);
          console.log(` [MessageAvatar] Profile image loaded (cached) for user: ${userId}`);
        }
      } catch (error) {
        console.error('   [MessageAvatar] Error fetching user profile image:', error);
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

export default CustomMessageAvatar;