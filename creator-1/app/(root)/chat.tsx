import { useGlobalContext } from '@/lib/global-provider';
import { client } from '@/lib/stream-chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel, Chat, DeepPartial, MessageInput, MessageList, OverlayProvider, Theme } from 'stream-chat-react-native';

// Custom theme configuration
const customTheme: DeepPartial<Theme> = {
  colors: {
    accent_blue: '#FB2355',
    accent_green: '#FB2355',
    accent_red: '#FB2355',
    black: '#FB2355',
    blue_alice: '#1A1A1A',
    border: '#FB2355',
    grey: '#666666',
    grey_gainsboro: '#1A1A1A',
    grey_whisper: '#1A1A1A',
    icon_background: '#1A1A1A',
    modal_background: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow_icon: '#000000',
    targetedMessageBackground: '#FB2355',
    transparent: 'transparent',
    white: '#FFFFFF',
    white_smoke: '#1A1A1A',
    white_snow: '#1A1A1A',
  },
  messageList: {
    dateSeparator: {
      container: {
        backgroundColor: '#1A1A1A',
      },
      text: {
        color: '#FB2355',
      },
    },
  },
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: '#FB2355',
        borderColor: '#FB2355',
        borderWidth: 1,
      },
      markdown: {
        text: {
          color: '#FFFFFF',
        },
      },
    },
    file: {
      container: {
        backgroundColor: '#FB2355',
        borderColor: '#FB2355',
        borderWidth: 1,
      },
    },
  },
  messageInput: {
    container: {
      backgroundColor: '#1A1A1A',
      borderTopWidth: 1,
      borderTopColor: '#333333',
      paddingBottom: 0,
      marginBottom: 0,
      height: 60,
    },
    inputBoxContainer: {
      backgroundColor: '#1A1A1A',
      marginBottom: 0,
      paddingBottom: 0,
    },
    inputBox: {
      color: '#FFFFFF',
      paddingBottom: 0,
    },
  },
  channelPreview: {
    container: {
      backgroundColor: '#1A1A1A',
    },
    title: {
      color: '#FFFFFF',
    },
  },
  message: {
    container: {
      backgroundColor: '#1A1A1A',
    },
    content: {
      containerInner: {
        backgroundColor: '#1A1A1A',
      },
    },
  },
  channel: {
    container: {
      backgroundColor: '#1A1A1A',
    },
  },
};

export default function ChatScreen() {
  const { channelId, creatorName, creatorImage } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const setupChannel = async () => {
      try {
        if (!channelId || !user) return;

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

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FB2355" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!channel) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg">Channel not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }} edges={['top']}>
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-0 pb-6" style={{ backgroundColor: '#121212', marginTop: -20 }}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="mr-4 mt-2"
          >
            <Image 
              source={require('../../assets/icon/back.png')}
              className="w-6 h-6"
              resizeMode="contain"
              style={{ tintColor: 'white' }}
            />
          </TouchableOpacity>
          <View className="flex-1 items-center flex-row justify-start mt-6">
            <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center overflow-hidden mr-3">
              {creatorImage ? (
                <Image
                  source={{ uri: creatorImage as string }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-4xl text-white font-bold">
                  {creatorName?.[0] || 'U'}
                </Text>
              )}
            </View>
            <Text className="text-xl" style={{ fontFamily: 'Urbanist-Bold', color: '#FFFFFF' }}>
              {creatorName}
            </Text>
          </View>
        </View>

        <OverlayProvider value={{ style: customTheme }}>
          <Chat client={client}>
            <Channel channel={channel}>
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, backgroundColor: '#1A1A1A' }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
              >
                <View style={{ 
                  flex: 1, 
                  marginBottom: 33, 
                  paddingBottom: 33, 
                  backgroundColor: '#1A1A1A',
                  marginTop: keyboardHeight > 0 ? -keyboardHeight/2 : 0 
                }}>
                  <MessageList />
                  <View style={{ 
                    marginBottom: keyboardHeight > 0 ? 0 : 15, 
                    paddingBottom: keyboardHeight > 0 ? 0 : 15, 
                    backgroundColor: '#1A1A1A',
                    ...(keyboardHeight > 0 ? {
                      borderTopWidth: 0,
                      marginTop: -20,
                      position: 'absolute',
                      bottom: -60,
                      left: 0,
                      right: 0
                    } : {})
                  }}>
                    <MessageInput />
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Channel>
          </Chat>
        </OverlayProvider>
      </View>
    </SafeAreaView>
  );
} 