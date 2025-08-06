import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface CustomPollCreationProps {
  visible: boolean;
  onClose: () => void;
  onCreatePoll: (pollData: any) => void;
}

const CustomPollCreation = ({ visible, onClose, onCreatePoll }: CustomPollCreationProps) => {
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [allowUserSuggestedOptions, setAllowUserSuggestedOptions] = useState(false);
  const [maxVotesPerUser, setMaxVotesPerUser] = useState(1);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const addOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removeOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim()) return;
    
    const validOptions = pollOptions.filter(option => option.trim());
    if (validOptions.length < 2) return;

    // Create poll options with proper structure
    const pollOptionsData = validOptions.map((option, index) => ({
      text: option.trim()
    }));

    console.log('Valid options:', validOptions);
    console.log('Poll options data:', pollOptionsData);

    const pollData = {
      text: pollQuestion.trim(),
      poll: {
        name: pollQuestion.trim(),
        options: pollOptionsData,
        allow_answers: allowUserSuggestedOptions,
        allow_user_suggested_options: allowUserSuggestedOptions,
        max_votes_allowed: allowMultipleAnswers ? maxVotesPerUser : 1,
        voting_visibility: 'public',
      },
    };

    console.log('Final poll data:', JSON.stringify(pollData, null, 2));

    onCreatePoll(pollData);
    
    // Reset form
    setPollQuestion('');
    setPollOptions(['', '']);
    setAllowMultipleAnswers(false);
    setAllowUserSuggestedOptions(false);
    setMaxVotesPerUser(1);
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <TouchableOpacity 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={onClose}
        activeOpacity={1}
      />
      
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
      }}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: '#1A1A1A',
          borderRadius: 20,
          marginHorizontal: 20,
          maxHeight: '90%',
          width: '90%',
          borderWidth: 2,
          borderColor: '#FB2355',
          flex: 1,
          maxWidth: 400,
        }}>
          {/* Header - Fixed */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2A2A',
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: 'bold',
              fontFamily: 'Urbanist-Bold',
            }}>
              Create Poll
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 20,
                width: 36,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Poll Question */}
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 8,
              fontFamily: 'questrial',
            }}>
              Poll Question
            </Text>
            <View style={{
              backgroundColor: '#2A2A2A',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#404040',
              marginBottom: 20,
            }}>
              <TextInput
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontFamily: 'questrial',
                  minHeight: 44,
                }}
                placeholder="What's your question?"
                placeholderTextColor="#666666"
                value={pollQuestion}
                onChangeText={setPollQuestion}
                multiline
                maxLength={200}
              />
            </View>

            {/* Poll Options */}
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 8,
              fontFamily: 'questrial',
            }}>
              Options
            </Text>
            
            {pollOptions.map((option, index) => (
              <View key={index} style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <View style={{
                  flex: 1,
                  backgroundColor: '#2A2A2A',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#404040',
                  marginRight: 8,
                }}>
                  <TextInput
                    style={{
                      color: '#FFFFFF',
                      fontSize: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontFamily: 'questrial',
                      minHeight: 44,
                    }}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#666666"
                    value={option}
                    onChangeText={(text: string) => updateOption(index, text)}
                    maxLength={80}
                  />
                </View>
                {pollOptions.length > 2 && (
                  <TouchableOpacity
                    onPress={() => removeOption(index)}
                    style={{
                      backgroundColor: '#FF4444',
                      borderRadius: 20,
                      width: 36,
                      height: 36,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="remove" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            {pollOptions.length < 10 && (
              <TouchableOpacity
                onPress={addOption}
                style={{
                  backgroundColor: '#FB2355',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                }}>
                  + Add Option
                </Text>
              </TouchableOpacity>
            )}

            {/* Poll Settings */}
            <View style={{
              backgroundColor: '#2A2A2A',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 12,
                fontFamily: 'questrial',
              }}>
                Settings
              </Text>
              
              <TouchableOpacity
                onPress={() => setAllowMultipleAnswers(!allowMultipleAnswers)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  paddingVertical: 4,
                }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: allowMultipleAnswers ? '#FB2355' : '#666666',
                  backgroundColor: allowMultipleAnswers ? '#FB2355' : 'transparent',
                  marginRight: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {allowMultipleAnswers && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontFamily: 'questrial',
                }}>
                  Allow multiple answers
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setAllowUserSuggestedOptions(!allowUserSuggestedOptions)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 4,
                }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: allowUserSuggestedOptions ? '#FB2355' : '#666666',
                  backgroundColor: allowUserSuggestedOptions ? '#FB2355' : 'transparent',
                  marginRight: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {allowUserSuggestedOptions && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontFamily: 'questrial',
                }}>
                  Allow users to add options
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Action Buttons - Fixed at bottom */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            padding: 20,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: '#2A2A2A',
          }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: '#404040',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                fontFamily: 'questrial',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleCreatePoll}
              disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
              style={{
                flex: 1,
                backgroundColor: (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) 
                  ? '#666666' : '#FB2355',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                fontFamily: 'questrial',
              }}>
                Create Poll
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CustomPollCreation;