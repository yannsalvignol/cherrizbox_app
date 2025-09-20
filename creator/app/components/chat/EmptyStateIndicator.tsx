import React from 'react';
import { Image, Text, View } from 'react-native';

interface EmptyStateIndicatorProps {
  channelId?: string;
}

const EmptyStateIndicator = ({ channelId }: EmptyStateIndicatorProps) => {
  const isDMChannel = channelId?.startsWith('dm-');
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#DCDEDF', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 32 
    }}>
      <Image
        source={
          isDMChannel
            ? require('../../../assets/icon/loading-icon.png')
            : require('../../../assets/icon/loading-icon.png')
        }
        style={{ 
          width: 72, 
          height: 72, 
          marginBottom: 18, 
          opacity: 0.8 
        }}
        resizeMode="contain"
      />
      <Text style={{ 
        color: '#FFFFFF', 
        fontSize: 18, 
        fontFamily: 'questrial', 
        textAlign: 'center', 
        opacity: 0.7 
      }}>
        {isDMChannel 
          ? "Start your private conversation!" 
          : "No messages yet. Start the conversation!"
        }
      </Text>
      
      {/* Subtle hint text */}
      <Text style={{
        color: '#888',
        fontSize: 14,
        fontFamily: 'questrial',
        textAlign: 'center',
        marginTop: 12,
        opacity: 0.6
      }}>
        {isDMChannel 
          ? "Send photos, files, or start chatting"
          : "Share content and engage with your community"
        }
      </Text>
    </View>
  );
};

export default EmptyStateIndicator;