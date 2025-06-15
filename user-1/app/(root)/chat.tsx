import { useGlobalContext } from '@/lib/global-provider';
import { client, connectUser } from '@/lib/stream-chat';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel, Chat, MessageInput, MessageList, OverlayProvider } from 'stream-chat-react-native';

export default function ChatScreen() {
  const { channelId, creatorName } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const setupChannel = async () => {
      try {
        if (!channelId || !user) return;

        // Connect user to Stream Chat
        await connectUser(user.$id);

        // Get the channel
        const channel = client.channel('messaging', channelId as string);
        
        // Try to join and watch the channel
        try {
          await channel.watch();
          // Add the current user as a member if they're not already
          if (!channel.state.members[user.$id]) {
            await channel.addMembers([user.$id]);
          }
          setChannel(channel);
          setError(null);
        } catch (watchError) {
          console.error('Error watching channel:', watchError);
          setError('You do not have permission to access this channel');
        }
      } catch (error) {
        console.error('Error setting up channel:', error);
        setError('Failed to set up channel');
      } finally {
        setLoading(false);
      }
    };

    setupChannel();
  }, [channelId, user]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen 
          options={{
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            animation: 'slide_from_right',
          }} 
        />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FB2355" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen 
          options={{
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            animation: 'slide_from_right',
          }} 
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!channel) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen 
          options={{
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            animation: 'slide_from_right',
          }} 
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg">Channel not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen 
        options={{
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
        }} 
      />
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
    </SafeAreaView>
  );
} 