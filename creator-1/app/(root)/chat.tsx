import { useGlobalContext } from '@/lib/global-provider';
import { client } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel, Chat, DeepPartial, MessageInput, MessageList, OverlayProvider, Theme } from 'stream-chat-react-native';

// Custom theme for the chat
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
  channel: {
  },
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: '#FB2355',
      },
    },
  },
});

export default function ChatScreen() {
  const { channelId, creatorName } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(getTheme());
  const router = useRouter();

  useEffect(() => {
    setTheme(getTheme());
  }, [colorScheme]);

  useEffect(() => {
    const setupChannel = async () => {
      try {
        if (!channelId || !user) return;

        // Wait for Stream Chat connection if not connected yet
        if (!true) {
          console.log('Waiting for Stream Chat connection...');
          setLoading(true);
          return;
        }

        // User is already created and connected, proceed with channel setup
        const channel = client.channel('messaging', channelId as string);
        
        try {
          await channel.watch();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FB2355" />
          <Text style={{ color: 'white', marginTop: 10 }}>Loading channel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!channel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>Channel not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <OverlayProvider value={{ style: theme }}>
        <Chat client={client}>
          <Channel channel={channel} keyboardVerticalOffset={0}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: '#1A1A1A',
              borderBottomWidth: 1,
              borderBottomColor: '#2A2A2A'
            }}>
              <TouchableOpacity 
                onPress={() => router.back()}
                style={{
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  marginTop: 2
                }}
              >
                <Ionicons 
                  name="chevron-back-outline" 
                  size={28} 
                  color="white" 
                />
              </TouchableOpacity>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FB2355',
                marginRight: 12,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20,
                  fontFamily: 'questrial'
                }}>
                  {(creatorName as string)?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={{ 
                color: 'white', 
                fontSize: 18,
                fontFamily: 'questrial'
              }}>
                {creatorName}
              </Text>
            </View>
            <MessageList />
            <MessageInput />
          </Channel>
        </Chat>
      </OverlayProvider>
    </SafeAreaView>
  );
} 