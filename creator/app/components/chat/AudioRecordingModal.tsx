import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useRef, useState } from 'react';
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native';

interface AudioRecordingModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (audioUri: string, duration: number) => void;
}

const AudioRecordingModal = ({ visible, onClose, onSend }: AudioRecordingModalProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need microphone access to record voice messages.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with custom options for better compatibility
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const status = await recordingRef.current.getStatusAsync();
      
      // Clean up
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const finalDuration = recordingTime;
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);
      
      if (uri) {
        // Pass both URI and duration
        onSend(uri, finalDuration);
      }
      onClose();
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      
      // Clean up
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);
      onClose();
    } catch (error) {
      console.error('Error cancelling recording:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ 
          backgroundColor: '#2A2A2A', 
          padding: 30, 
          borderRadius: 20, 
          alignItems: 'center',
          width: 280
        }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
            Voice Message
          </Text>
          
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isRecording ? '#FF4444' : '#1A1A1A',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Ionicons name="mic" size={30} color="white" />
          </View>
          
          <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 30 }}>
            {formatTime(recordingTime)}
          </Text>
          
          {!isRecording ? (
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <TouchableOpacity
                onPress={cancelRecording}
                style={{
                  backgroundColor: '#666',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 25
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={startRecording}
                style={{
                  backgroundColor: 'white',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 25
                }}
              >
                <Text style={{ color: 'black', fontWeight: 'bold' }}>Start Recording</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={stopRecording}
              style={{
                backgroundColor: '#4CAF50',
                paddingHorizontal: 30,
                paddingVertical: 12,
                borderRadius: 25
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Stop & Send</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default AudioRecordingModal;