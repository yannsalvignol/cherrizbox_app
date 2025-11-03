//this is the file with the paid buttons
import { useTheme } from '@/lib/useTheme';
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
  showPaidButtons: boolean;
}

const CustomMessageInput = ({
  showPollCreation,
  setShowPollCreation,
  handlePaidContentCreation,
  handleFileCreation,
  handlePaidVideoCreation,
  isFileUploading,
  isVideoUploading,
  showPaidButtons
}: CustomMessageInputProps) => {
  const { theme } = useTheme();

  return (
    <View style={{ backgroundColor: theme.background, paddingBottom: 20 }}>
      {/* Paid content buttons - only show when toggled */}
      {showPaidButtons && (
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
            borderTopColor: '#FFFFFF',
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginRight: 8,
            }}
            onPress={() => setShowPollCreation(true)}
          >
            <Text style={{
              color: theme.textInverse,
              fontSize: 12,
              fontWeight: 'bold',
            }}>
                Poll
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginRight: 8,
            }}
            onPress={handlePaidContentCreation}
          >
            <Text style={{
              color: theme.textInverse,
              fontSize: 12,
              fontWeight: 'bold',
            }}>
              📸 Paid Photos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              backgroundColor: isFileUploading ? theme.backgroundSecondary : theme.primary,
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
                <ActivityIndicator size="small" color={theme.textInverse} style={{ marginRight: 4 }} />
                <Text style={{
                  color: theme.textInverse,
                  fontSize: 12,
                  fontWeight: 'bold',
                }}>
                  Uploading...
                </Text>
              </View>
            ) : (
              <Text style={{
                color: theme.textInverse,
                fontSize: 12,
                fontWeight: 'bold',
              }}>
                📁 Paid Files
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              backgroundColor: isVideoUploading ? theme.backgroundSecondary : theme.primary,
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
                <ActivityIndicator size="small" color={theme.textInverse} style={{ marginRight: 4 }} />
                <Text style={{
                  color: theme.textInverse,
                  fontSize: 12,
                  fontWeight: 'bold',
                }}>
                  Uploading...
                </Text>
              </View>
            ) : (
              <Text style={{
                color: theme.textInverse,
                fontSize: 12,
                fontWeight: 'bold',
              }}>
                🎥 Paid Videos
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
      
      {/* Message Input */}
      <MessageInput 
        additionalTextInputProps={{
          placeholder: "Send a message...",
          placeholderTextColor: theme.inputPlaceholder,
          style: {
            flex: 1,
            minHeight: 32,
            textAlignVertical: 'center',
            paddingTop: 6,
            paddingBottom: 6,
            fontSize: 16,
            color: theme.inputText,
          }
        }}
      />
    </View>
  );
};

export default CustomMessageInput;