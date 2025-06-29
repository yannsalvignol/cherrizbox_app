import { useGlobalContext } from '@/lib/global-provider';
import { client, connectUser } from '@/lib/stream-chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Channel,
  Chat,
  MessageInput,
  MessageList,
  OverlayProvider
} from 'stream-chat-react-native';

export default function ChatScreen() {
  const router = useRouter();
  const { id: channelId } = useLocalSearchParams<{ id: string }>();
  const { user } = useGlobalContext();
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  const getChannelTitle = () => {
    if (!channel) return 'Chat';
    
    // For creator channels
    if (channelId?.startsWith('creator-')) {
      return 'My Group Chat';
    }
    
    // For DM channels
    if (channelId?.startsWith('dm-')) {
      const members = Object.keys(channel.state.members || {});
      const otherMembers = members.filter(memberId => memberId !== user?.$id);
      if (otherMembers.length > 0) {
        return `Chat with ${otherMembers[0]}`;
      }
    }
    
    return channel.data?.name || 'Chat';
  };

  // Helper function to check if current user is the creator
  const isCreator = () => {
    return channelId?.startsWith('creator-') && user?.$id === channel?.data?.created_by_id;
  };

  // Helper function to get creator ID
  const getCreatorId = () => {
    return channel?.data?.created_by_id;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Image 
            source={require('../../assets/images/cherry-icon.png')} 
            style={{ width: 60, height: 60, marginBottom: 16 }} 
          />
          <Text style={{ color: '#FB2355', fontSize: 18, marginBottom: 12 }}>
            Loading chat...
          </Text>
          <ActivityIndicator size="large" color="#FB2355" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Image 
            source={require('../../assets/images/cherry-icon.png')} 
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
            marginBottom: 24
          }}>
            {error}
          </Text>
          <TouchableOpacity 
            className="bg-[#FB2355] px-6 py-3 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-white font-['Urbanist-Bold']">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!channel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Image 
            source={require('../../assets/images/cherry-icon.png')} 
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
            marginBottom: 24
          }}>
            The chat you're looking for doesn't exist or you don't have access to it.
          </Text>
          <TouchableOpacity 
            className="bg-[#FB2355] px-6 py-3 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-white font-['Urbanist-Bold']">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-2 bg-black border-b border-[#333333]">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Image 
            source={require('../../assets/icon/back.png')}
            className="w-8 h-8"
            resizeMode="contain"
            style={{ tintColor: 'white' }}
          />
        </TouchableOpacity>
        
        <View className="flex-1">
          <Text className="text-white text-lg font-['Urbanist-Bold']">
            {getChannelTitle()}
          </Text>
          <Text className="text-gray-400 text-sm">
            {Object.keys(channel.state.members || {}).length} member{Object.keys(channel.state.members || {}).length !== 1 ? 's' : ''}
            {/* TODO: Add thread restrictions here when people join */}
            {/* Creator ID: {getCreatorId()} */}
            {/* Is Creator: {isCreator() ? 'Yes' : 'No'} */}
          </Text>
        </View>
      </View>

      {/* Chat Interface */}
      <View className="flex-1">
        <OverlayProvider>
          <Chat client={client}>
            <Channel channel={channel}>
              <View className="flex-1">
                <MessageList />
                <MessageInput />
              </View>
            </Channel>
          </Chat>
        </OverlayProvider>
      </View>
    </SafeAreaView>
  );
} 