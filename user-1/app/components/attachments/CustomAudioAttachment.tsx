import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Text, TouchableOpacity, View } from 'react-native';
import { useMessageContext } from 'stream-chat-react-native';

interface AudioAttachment {
  type: string;
  asset_url?: string;
  duration?: string;
}

interface CustomAudioAttachmentProps {
  attachment: AudioAttachment;
}

export const CustomAudioAttachment: React.FC<CustomAudioAttachmentProps> = ({ attachment }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Refs for managing intervals and timeouts
  const statusCheckRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get message context to access message actions
  const messageContext = useMessageContext();
  const message = messageContext?.message;

  // Animation values for sound bars
  const animValues = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.5),
    new Animated.Value(0.8),
    new Animated.Value(0.4),
    new Animated.Value(0.7),
    new Animated.Value(0.2),
    new Animated.Value(0.6),
    new Animated.Value(0.9),
    new Animated.Value(0.3),
    new Animated.Value(0.5),
  ]).current;
  
  if (attachment?.type !== 'custom_audio') return null;

  // Audio status checking
  const startStatusCheck = (audioSound: Audio.Sound) => {
    if (statusCheckRef.current) {
      clearInterval(statusCheckRef.current);
    }
    
    // Add a small delay before starting to check, to let audio start properly
    setTimeout(() => {
      statusCheckRef.current = setInterval(async () => {
        try {
          const status = await audioSound.getStatusAsync();
          if (status.isLoaded) {
            setCurrentTime(status.positionMillis || 0);
            // Force component re-render for color updates
            setForceUpdate(prev => prev + 1);
            
            // Update sound bar progress in real-time
            updateSoundBarProgress();
            
            // Log less frequently to avoid console spam
            if (status.positionMillis && status.durationMillis && Math.floor(status.positionMillis / 1000) % 2 === 0) {
              console.log('📊 Audio progress:', {
                progress: `${Math.floor(status.positionMillis / 1000)}s / ${Math.floor(status.durationMillis / 1000)}s`,
                percentage: `${Math.round((status.positionMillis / status.durationMillis) * 100)}%`
              });
            }
            
            // Check if audio has finished - be more careful about false positives
            const hasFinished = status.didJustFinish || 
                               (status.positionMillis && status.durationMillis && 
                                status.positionMillis >= status.durationMillis - 100); // 100ms buffer
            
            // Don't use !status.isPlaying as it can be false during loading
            // Only reset if we're sure it's actually finished
            if (hasFinished && isPlaying) {
              console.log('🎵 Audio finished, resetting UI completely');
              resetAudioState(audioSound);
            } else if (!status.isPlaying && status.positionMillis > 1000 && isPlaying) {
              // Only consider it stopped if it was playing for more than 1 second
              console.log('🎵 Audio stopped after playing, resetting UI');
              resetAudioState(audioSound);
            }
          }
        } catch (error) {
          console.error('Status check error:', error);
          stopStatusCheck();
        }
      }, 100); // Check more frequently - every 100ms
    }, 300); // Wait 300ms before starting status checks
  };

  const resetAudioState = async (audioSound: Audio.Sound) => {
    console.log('🔄 Resetting all audio state and UI');
    setIsPlaying(false);
    setCurrentTime(0);
    stopSoundBarAnimation();
    stopStatusCheck();
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    try {
      await audioSound.setPositionAsync(0);
    } catch (error) {
      console.error('Error resetting position:', error);
    }
  };

  const stopStatusCheck = () => {
    if (statusCheckRef.current) {
      clearInterval(statusCheckRef.current);
      statusCheckRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Progress-based sound bar animation
  const updateSoundBarProgress = () => {
    if (!isPlaying || totalDuration === 0) return;
    
    const progress = currentTime / totalDuration; // 0 to 1
    const totalBars = animValues.length;
    const activeBars = Math.floor(progress * totalBars);
    
    // Debug logging (less frequent)
    if (Math.floor(currentTime / 1000) % 3 === 0) {
      console.log('🔍 Progress debug:', {
        currentTime: Math.round(currentTime / 1000),
        totalDuration: Math.round(totalDuration / 1000),
        progress: Math.round(progress * 100) + '%',
        totalBars,
        activeBars
      });
    }
    
    animValues.forEach((animValue, index) => {
      let targetHeight;
      
      if (index < activeBars) {
        // Bars that represent played audio - keep them active
        targetHeight = 0.7 + Math.sin(Date.now() / 200 + index) * 0.2; // Subtle animation
      } else if (index === activeBars && progress > 0) {
        // Current playing bar - make it most prominent
        targetHeight = 0.9 + Math.sin(Date.now() / 100) * 0.1; // More animation
      } else {
        // Future bars - keep them low
        targetHeight = 0.2 + Math.sin(Date.now() / 300 + index) * 0.1; // Very subtle
      }
      
      Animated.timing(animValue, {
        toValue: targetHeight,
        duration: 150,
        useNativeDriver: false,
      }).start();
    });
  };

  const startSoundBarAnimation = () => {
    console.log('🎵 Starting progress-based sound bar animation');
    // The animation will be driven by updateSoundBarProgress
    // which is called from the status check interval
  };

  const stopSoundBarAnimation = () => {
    console.log('🎵 Stopping sound bar animation');
    animValues.forEach((animValue, index) => {
      animValue.stopAnimation();
      // Reset to varied original heights for a more natural look
      const originalHeight = [0.3, 0.5, 0.8, 0.4, 0.7, 0.2, 0.6, 0.9, 0.3, 0.5][index];
      Animated.timing(animValue, {
        toValue: originalHeight,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  };

  const playAudio = async () => {
    try {
      if (sound) {
        // If audio is already loaded, check its status
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            stopSoundBarAnimation();
            stopStatusCheck();
          } else {
            // If audio finished, restart from beginning
            if (status.didJustFinish) {
              await sound.setPositionAsync(0);
            }
            await sound.playAsync();
            setIsPlaying(true);
            startSoundBarAnimation();
            startStatusCheck(sound);
          }
          return;
        }
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load and play new audio
      console.log('🎵 Loading audio:', attachment.asset_url);
      
      // Try to load audio with headers if it's from Appwrite
      const audioSource = attachment.asset_url?.includes('appwrite') 
        ? {
            uri: attachment.asset_url,
            headers: {
              'Accept': 'audio/mp4,audio/m4a,audio/*',
              'Content-Type': 'audio/mp4'
            }
          }
        : { uri: attachment.asset_url };
          
      console.log('🎵 Audio source:', audioSource);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        audioSource as any,
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setTotalDuration(status.durationMillis || 0);
            
            // Also check for finish in the callback as backup
            if (status.didJustFinish) {
              console.log('🎵 Audio finished (callback), resetting UI');
              resetAudioState(newSound);
            }
          }
        }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      startSoundBarAnimation();
      startStatusCheck(newSound);
      
      // Set a timeout as final fallback based on duration
      if (totalDuration > 0) {
        timeoutRef.current = setTimeout(() => {
          console.log('🎵 Audio timeout reached, forcing reset');
          resetAudioState(newSound);
        }, totalDuration + 1000); // Add 1 second buffer
      }
      
      console.log('🎵 Audio playing');
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Could not play voice message');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setCurrentTime(0);
      stopSoundBarAnimation();
      stopStatusCheck();
    }
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      stopSoundBarAnimation();
      stopStatusCheck();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sound]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePress = (event: any) => {
    // Prevent event bubbling to avoid opening thread
    event.stopPropagation();
    playAudio();
  };

  const handleLongPress = (event: any) => {
    console.log('🎵 [CustomAudioAttachment] Long press detected on audio');
    event.stopPropagation();
    
    if (message) {
      console.log('✅ [CustomAudioAttachment] Setting selected message for modal');
      
      // Use a more direct approach - find the ChatScreen's state setters
      // We'll use the message context's client to access the app state
      try {
        // Access the global app state through a custom event system
        // Since we can't easily pass props down, we'll use a global reference
        if ((global as any).chatScreenHandlers?.handleLongPressMessage) {
          (global as any).chatScreenHandlers.handleLongPressMessage({ message });
          console.log('✅ [CustomAudioAttachment] Called global handler');
        } else {
          console.log('⚠️ [CustomAudioAttachment] Global handlers not available');
        }
      } catch (error) {
        console.log('⚠️ [CustomAudioAttachment] Error calling global handler:', error);
      }
    }
  };

  // Sound Bars Component with Progress
  const SoundBars = () => {
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
    const totalBars = animValues.length;
    const activeBars = Math.floor(progress * totalBars);

    // Debug the actual values being used for colors (less frequent)
    if (Math.floor(currentTime / 1000) % 3 === 0) {
      console.log('🎨 Color debug:', {
        isPlaying,
        progress: Math.round(progress * 100) + '%',
        activeBars,
        currentTime: Math.round(currentTime / 1000),
        totalDuration: Math.round(totalDuration / 1000)
      });
    }

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 40,
        justifyContent: 'space-between',
        flex: 1,
        paddingHorizontal: 4,
      }}>
        {animValues.map((animValue, index) => {
          let barColor;
          
          if (!isPlaying) {
            // Not playing - all bars light gray
            barColor = '#E9ECEF';
          } else {
            // During playback, use progress to determine colors
            if (index < activeBars) {
              // Played section - bright pink
              barColor = '#FD6F3E';
            } else if (index === activeBars && activeBars < totalBars) {
              // Currently playing bar - lighter pink
              barColor = '#FF6B8A';
            } else {
              // Unplayed section - light gray
              barColor = '#F8F9FA';
            }
          }
          
          return (
            <Animated.View
              key={index}
              style={{
                flex: 1,
                backgroundColor: barColor,
                marginHorizontal: 1,
                borderRadius: 2,
                height: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 32],
                }),
              }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={{
        backgroundColor: 'transparent',
        margin: -8,
        padding: 0,
        borderRadius: 0,
        overflow: 'visible',
      }}
    >
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        width: 320,
        minHeight: 72,
        marginLeft: 11,  // Move the entire audio attachment to the right
        // Remove border and shadow for a more minimal look
      }}>
        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            playAudio();
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
            borderWidth: 1.5,
            borderColor: '#E5E5EA', // Apple-like thin border
          }}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={22} 
            color="#000000"
            style={{ marginLeft: isPlaying ? 0 : 2 }} // Center play icon
          />
        </TouchableOpacity>

        {/* Content Area */}
        <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          {/* Duration - positioned absolutely in corner */}
          <View style={{
            position: 'absolute',
            bottom: -20,
            right: 0,
            zIndex: 1,
          }}>
            <Text style={{
              color: '#A1A1AA',
              fontSize: 11,
              fontFamily: 'questrial',
              fontWeight: '400',
            }}>
              {isPlaying && totalDuration > 0 
                ? `${formatTime(currentTime)} / ${formatTime(totalDuration)}`
                : attachment.duration || '0:00'
              }
            </Text>
          </View>

          {/* Sound Bars */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 24,
            justifyContent: 'space-between',
            paddingHorizontal: 2,
          }}>
            {Array.from({ length: 40 }, (_, index) => {
              const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
              const totalBars = 40;
              const activeBars = Math.floor(progress * totalBars);
              
              let barColor;
              let barHeight;
              
              // Generate varied heights for 40 bars with more variation
              const heights = [3, 8, 5, 12, 7, 16, 4, 20, 9, 24, 6, 22, 11, 18, 5, 14, 8, 10, 13, 6, 4, 9, 7, 15, 12, 19, 6, 21, 10, 23, 8, 17, 5, 13, 11, 16, 7, 9, 4, 8];
              
              if (!isPlaying) {
                // Not playing - all bars light gray with varied heights
                barColor = '#E5E5EA';
                barHeight = heights[index];
              } else {
                if (index < activeBars) {
                  // Played section - black
                  barColor = '#000000';
                  barHeight = heights[index];
                } else if (index === activeBars && activeBars < totalBars) {
                  // Currently playing bar - black and slightly taller
                  barColor = '#000000';
                  barHeight = heights[index] + 2;
                } else {
                  // Unplayed section - light gray
                  barColor = '#F2F2F7';
                  barHeight = heights[index];
                }
              }
              
              return (
                <View
                  key={index}
                  style={{
                    width: 2,
                    height: barHeight,
                    backgroundColor: barColor,
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </View>
        </View>
        {/* Stop Button when playing */}
        {isPlaying && (
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              stopAudio();
            }}
            style={{ 
              marginLeft: 10,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#F2F2F7',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="stop" size={14} color="#000000" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};