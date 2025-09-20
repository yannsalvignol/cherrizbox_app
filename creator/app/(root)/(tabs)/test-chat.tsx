import { useGlobalContext } from '@/lib/global-provider';
import { connectUser, createCreatorChannel, disconnectUser } from '@/lib/stream-chat';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestChat() {
  const { user } = useGlobalContext();
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const [error, setError] = useState<string | null>(null);
  const [channelInfo, setChannelInfo] = useState<string>('');

  const testConnection = async () => {
    if (!user) {
      setError('User not logged in');
      return;
    }

    try {
      setConnectionStatus('Connecting...');
      setError(null);
      
      // First connect the user
      const client = await connectUser(user.$id);
      
      // Then create their channel
      const channel = await createCreatorChannel(user.$id, user.name);
      
      setConnectionStatus('Connected successfully!');
      setChannelInfo(`Channel created: ${channel.id}`);
      console.log('Stream Chat client:', client);
      console.log('Creator channel:', channel);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setConnectionStatus('Connection failed');
      console.error('Stream Chat test error:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectUser();
      setConnectionStatus('Disconnected');
      setChannelInfo('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl font-['Urbanist-Bold'] mb-4">
          Stream Chat Test
        </Text>
        
        <Text className="text-lg mb-2">
          Status: {connectionStatus}
        </Text>
        
        {channelInfo && (
          <Text className="text-green-600 mb-2">
            {channelInfo}
          </Text>
        )}
        
        {error && (
          <Text className="text-red-500 mb-4">
            Error: {error}
          </Text>
        )}
        
        <View className="flex-row space-x-4">
          <TouchableOpacity
            className="bg-[#FD6F3E] px-6 py-3 rounded-full"
            onPress={testConnection}
          >
            <Text className="text-white font-['Urbanist-Bold']">
              Test Connection
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="bg-gray-500 px-6 py-3 rounded-full"
            onPress={handleDisconnect}
          >
            <Text className="text-white font-['Urbanist-Bold']">
              Disconnect
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 