import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MessageInput } from 'stream-chat-react-native';

interface CustomMessageInputProps {
  showPollCreation: boolean;
  setShowPollCreation: (show: boolean) => void;
  handlePaidContentCreation: () => void;
  handleFileCreation: () => void;
  handlePaidVideoCreation: () => void;
  isFileUploading: boolean;
  isVideoUploading: boolean;
}

const CustomMessageInput = ({
  showPollCreation,
  setShowPollCreation,
  handlePaidContentCreation,
  handleFileCreation,
  handlePaidVideoCreation,
  isFileUploading,
  isVideoUploading
}: CustomMessageInputProps) => (
  <View style={{ backgroundColor: '#1A1A1A', paddingBottom: 20 }}>
    {/* Horizontally scrollable buttons */}
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
      }}
      style={{
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
      }}
    >
      <TouchableOpacity
        style={{
          backgroundColor: '#FB2355',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginRight: 8,
        }}
        onPress={() => setShowPollCreation(true)}
      >
        <Text style={{
          color: 'white',
          fontSize: 12,
          fontWeight: 'bold',
        }}>
          📊 Poll
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={{
          backgroundColor: '#FFD700',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginRight: 8,
        }}
        onPress={handlePaidContentCreation}
      >
        <Text style={{
          color: '#1A1A1A',
          fontSize: 12,
          fontWeight: 'bold',
        }}>
          📸 Paid Photos
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={{
          backgroundColor: isFileUploading ? '#2E7D32' : '#4CAF50',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginRight: 8,
          opacity: isFileUploading ? 0.7 : 1,
        }}
        onPress={handleFileCreation}
        disabled={isFileUploading}
      >
        {isFileUploading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="white" style={{ marginRight: 4 }} />
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
            }}>
              Uploading...
            </Text>
          </View>
        ) : (
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            📁 Paid Files
          </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={{
          backgroundColor: isVideoUploading ? '#7B1FA2' : '#9C27B0',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginRight: 8,
          opacity: isVideoUploading ? 0.7 : 1,
        }}
        onPress={handlePaidVideoCreation}
        disabled={isVideoUploading}
      >
        {isVideoUploading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="white" style={{ marginRight: 4 }} />
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
            }}>
              Uploading...
            </Text>
          </View>
        ) : (
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            🎥 Paid Videos
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    <MessageInput />
  </View>
);

export default CustomMessageInput;