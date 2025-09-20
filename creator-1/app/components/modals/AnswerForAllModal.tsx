import { functions } from '@/lib/appwrite';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import type { Cluster } from '../channels/ClusterCard';

interface AnswerForAllModalProps {
  visible: boolean;
  cluster: Cluster | null;
  onClose: () => void;
  onAnswerSent?: () => void;
  currentUserId?: string;
}

export const AnswerForAllModal: React.FC<AnswerForAllModalProps> = ({
  visible,
  cluster,
  onClose,
  onAnswerSent,
  currentUserId
}) => {
  const { theme } = useTheme();
  const [canonicalAnswer, setCanonicalAnswer] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0 });
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAIInfo, setShowAIInfo] = useState(false);
  const progressInterval = React.useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Handle modal close with state cleanup
  const handleClose = () => {
    // Clear any running interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    // Reset all states
    setCanonicalAnswer('');
    setIsSending(false);
    setIsSuccess(false);
    setFakeProgress(0);
    setSendingProgress({ current: 0, total: 0 });
    
    // Call the original onClose
    onClose();
  };

  // Parse affected chats
  const affectedChats = React.useMemo(() => {
    if (!cluster) return [];
    try {
      return JSON.parse(cluster.affectedChats) as string[];
    } catch {
      return [];
    }
  }, [cluster]);

  // Parse representative questions
  const questions = React.useMemo(() => {
    if (!cluster) return [];
    try {
      const parsed = JSON.parse(cluster.representativeQuestions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [cluster]);

  const handleSendToAll = async () => {
    // Prevent multiple triggers
    if (isSending || isSuccess) {
      console.log('⚠️ [AnswerForAll] Send already in progress or completed');
      return;
    }
    
    if (!cluster || !currentUserId || !canonicalAnswer.trim()) {
      Alert.alert('Error', 'Please write an answer before sending.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsSending(true);
    setIsSuccess(false);
    setFakeProgress(0);
    setSendingProgress({ current: 0, total: affectedChats.length });
    
    // Start fake progress bar animation
    progressInterval.current = setInterval(() => {
      setFakeProgress(prev => {
        if (prev >= 90) {
          if (progressInterval.current) clearInterval(progressInterval.current);
          return 90; // Stop at 90% until real response
        }
        return prev + Math.random() * 15 + 5; // Increment by 5-20%
      });
    }, 500);

    try {
      console.log('🚀 [AnswerForAll] Calling backend function...');
      
      // Call the Appwrite function to handle everything
      const { ExecutionMethod } = await import('react-native-appwrite');
      
      const response = await functions.createExecution(
        process.env.EXPO_PUBLIC_ANSWER_FOR_ALL_FUNCTION_ID || 'answer-for-all',
        JSON.stringify({
          clusterId: cluster.clusterId,
          canonicalAnswer: canonicalAnswer,
          creatorId: currentUserId,
          affectedChats: affectedChats,
          fullMessage: cluster.fullMessage,
          questionTitle: cluster.title
        }),
        false,
        '/answer-for-all',
        ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
      );
      
      const result = JSON.parse(response.responseBody);
      console.log('📦 [AnswerForAll] Backend response:', result);
      
      if (result.success) {
        // Complete the progress bar
        if (progressInterval.current) clearInterval(progressInterval.current);
        setFakeProgress(100);
        
        // Show success state
        setIsSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Clear the answer
        setCanonicalAnswer('');
        
        // Call callback and close after delay
        setTimeout(() => {
          onAnswerSent?.();
          // Reset states before closing
          setIsSuccess(false);
          setIsSending(false);
          setFakeProgress(0);
          setSendingProgress({ current: 0, total: 0 });
          handleClose();
        }, 1500);
        
        // Log partial success if any failed
        if (result.failedCount > 0) {
          console.log('⚠️ [AnswerForAll] Partial success:', result.message);
        }
      } else {
        throw new Error(result.message || 'Failed to send messages');
      }
      
    } catch (error) {
      console.error('❌ [AnswerForAll] Error:', error);
      if (progressInterval.current) clearInterval(progressInterval.current);
      setFakeProgress(0);
      Alert.alert('Error', 'Failed to send messages. Please try again.');
      setIsSending(false);
      setSendingProgress({ current: 0, total: 0 });
    }
  };

  // Reset states when modal opens
  React.useEffect(() => {
    if (visible) {
      // Reset all states when modal opens
      setCanonicalAnswer('');
      setIsSending(false);
      setIsSuccess(false);
      setFakeProgress(0);
      setSendingProgress({ current: 0, total: 0 });
      
      // Clear any existing interval
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    }
  }, [visible]);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Note: All database operations and message sending are now handled by the backend function

  if (!cluster) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.cardBackground }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 16,
            backgroundColor: theme.cardBackground,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
            <TouchableOpacity 
              onPress={handleClose}
              style={{
                padding: 8,
                marginLeft: -8,
              }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 16 }}>
            <Text style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'MuseoModerno-Regular',
              textAlign: 'center',
            }}>
              ANSWER FOR ALL
              </Text>
            <Text style={{
              color: theme.textSecondary,
              fontSize: 13,
              fontFamily: 'Urbanist-Regular',
              textAlign: 'center',
              marginTop: 2,
            }}>
              {affectedChats.length} {affectedChats.length === 1 ? 'fan' : 'fans'} will receive this answer
              </Text>
            </View>

            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Question Section */}
            <View style={{
              backgroundColor: theme.backgroundSecondary,
              marginHorizontal: 16,
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
            }}>
              <Text style={{
                color: theme.textTertiary,
                fontSize: 11,
                fontFamily: 'Urbanist-Bold',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}>
                Question Being Answered
              </Text>
              <Text style={{
                color: theme.text,
                fontSize: 16,
                fontFamily: 'Urbanist-Bold',
                lineHeight: 22,
                marginBottom: 12,
              }}>
                {cluster.title}
              </Text>
              
              {questions.length > 0 && (
                <>
                  <Text style={{
                    color: theme.textTertiary,
                    fontSize: 11,
                    fontFamily: 'Urbanist-Bold',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 8,
                    marginTop: 12,
                  }}>
                    Similar Questions From Fans
                  </Text>
                  {questions.slice(0, 3).map((question, index) => (
                    <View key={index} style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{
                        color: theme.textTertiary,
                        fontSize: 13,
                        marginRight: 8,
                      }}>
                        •
                      </Text>
                      <Text style={{
                        color: theme.textSecondary,
                        fontSize: 14,
                        fontFamily: 'Urbanist-Regular',
                        flex: 1,
                      }}>
                        {question}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* Answer Input */}
            <View style={{
              marginHorizontal: 16,
              marginTop: 20,
              flex: 1,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 15,
                  fontFamily: 'Urbanist-Bold',
                  flex: 1,
                }}>
                  Your Answer (AI will slightly adapt your answer to the context of each users text)
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAIInfo(true)}
                  style={{
                    padding: 4,
                    marginLeft: 8,
                  }}
                >
                  <Ionicons name="help-circle-outline" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <TextInput
                value={canonicalAnswer}
                onChangeText={setCanonicalAnswer}
                placeholder="Write your answer here..."
                placeholderTextColor={theme.textTertiary}
                multiline
                textAlignVertical="top"
                style={{
                  backgroundColor: theme.inputBackground,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 15,
                  fontFamily: 'Urbanist-Regular',
                  color: theme.inputText,
                  minHeight: 200,
                  maxHeight: 300,
                }}
                editable={!isSending}
              />
            </View>
          </ScrollView>

          {/* Send Button */}
          <View style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: theme.cardBackground,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}>
            {/* Progress Bar */}
            {isSending && !isSuccess && (
              <View style={{
                marginBottom: 12,
              }}>
                <View style={{
                  height: 4,
                  backgroundColor: theme.backgroundSecondary,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    backgroundColor: theme.text,
                    borderRadius: 2,
                    width: `${fakeProgress}%`,
                  }} />
                </View>
                <Text style={{
                  color: theme.textSecondary,
                  fontSize: 12,
                  fontFamily: 'Urbanist-Regular',
                  textAlign: 'center',
                  marginTop: 6,
                }}>
                  Processing {affectedChats.length} {affectedChats.length === 1 ? 'fan' : 'fans'}...
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              onPress={handleSendToAll}
              disabled={!canonicalAnswer.trim() || isSending || isSuccess}
              style={{
                backgroundColor: isSuccess ? theme.success : (canonicalAnswer.trim() && !isSending ? theme.text : theme.textTertiary),
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                shadowColor: isSuccess ? theme.success : theme.text,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              {isSuccess ? (
                <>
                  <Ionicons name="checkmark-outline" size={24} color={theme.textInverse} style={{ marginRight: 8 }} />
                  <Text style={{
                    color: theme.textInverse,
                    fontSize: 16,
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    Sent Successfully!
                  </Text>
                </>
              ) : isSending ? (
                <>
                  <ActivityIndicator size="small" color={theme.textInverse} style={{ marginRight: 8 }} />
                  <Text style={{
                    color: theme.textInverse,
                    fontSize: 16,
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    Sending to All Fans...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="flash" size={20} color={theme.textInverse} style={{ marginRight: 8 }} />
                  <Text style={{
                    color: theme.textInverse,
                    fontSize: 16,
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    Send to All Fans
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* AI Info Modal */}
      <Modal
        visible={showAIInfo}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAIInfo(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: theme.modalBackground,
            borderRadius: 16,
            padding: 24,
            maxHeight: '80%',
            width: '100%',
            maxWidth: 400,
          }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="sparkles" size={18} color={theme.textInverse} />
                </View>
                <Text style={{
                  color: theme.text,
                  fontSize: 18,
                  fontWeight: 'bold',
                  fontFamily: 'MuseoModerno-Regular',
                  flex: 1,
                }}>
                  AI ADAPTATION
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAIInfo(false)}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {/* Content */}
              <Text style={{
                color: theme.text,
                fontSize: 16,
                fontFamily: 'Urbanist-Bold',
                marginBottom: 12,
              }}>
                How Your Answer Gets Adapted
              </Text>
              
              <Text style={{
                color: theme.text,
                fontSize: 14,
                fontFamily: 'Urbanist-Regular',
                lineHeight: 20,
                marginBottom: 16,
              }}>
                GPT-4o-mini analyzes each fan's original question and makes minimal adjustments to your canonical answer while preserving your tone and style.
              </Text>
              
              {/* Key Points */}
              <View style={{
                backgroundColor: theme.backgroundSecondary,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 14,
                  fontFamily: 'Urbanist-Bold',
                  marginBottom: 12,
                }}>
                  What the AI Does:
                </Text>
                
                {[
                  'Maintains your exact tone (formal, casual, technical)',
                  'Addresses specific context from fan\'s message',
                  'Slightly expands on relevant points',
                  'Preserves 75%+ of your original structure',
                  'NO greetings or names added',
                  'NO major restructuring'
                ].map((point, index) => (
                  <View key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
                    <Text style={{
                      color: theme.success,
                      fontSize: 14,
                      marginRight: 8,
                    }}>
                      ✓
                    </Text>
                    <Text style={{
                      color: theme.text,
                      fontSize: 13,
                      fontFamily: 'Urbanist-Regular',
                      flex: 1,
                      lineHeight: 18,
                    }}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
              
              {/* Example */}
              <Text style={{
                color: theme.text,
                fontSize: 14,
                fontFamily: 'Urbanist-Bold',
                marginBottom: 8,
              }}>
                Example:
              </Text>
              
              <View style={{
                backgroundColor: '#FFF9E6',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}>
                <Text style={{
                  color: 'black',
                  fontSize: 11,
                  fontFamily: 'Urbanist-Bold',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  Fan's Context:
                </Text>
                <Text style={{
                  color: 'black',
                  fontSize: 13,
                  fontFamily: 'Urbanist-Regular',
                  fontStyle: 'italic',
                }}>
                  "I'm a beginner and overwhelmed by all the workout options"
                </Text>
              </View>
              
              <View style={{
                backgroundColor: '#E8F5E8',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}>
                <Text style={{
                  color: 'black',
                  fontSize: 11,
                  fontFamily: 'Urbanist-Bold',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  Your Answer:
                </Text>
                <Text style={{
                  color: 'black',
                  fontSize: 13,
                  fontFamily: 'Urbanist-Regular',
                }}>
                  "Just pick any routine and stick with it for 4 weeks."
                </Text>
              </View>
              
              <View style={{
                backgroundColor: '#F0F8FF',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}>
                <Text style={{
                  color: 'black',
                  fontSize: 11,
                  fontFamily: 'Urbanist-Bold',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  AI Adapted:
                </Text>
                <Text style={{
                  color: 'black',
                  fontSize: 13,
                  fontFamily: 'Urbanist-Regular',
                }}>
                  "Since you're feeling overwhelmed, just pick any routine and stick with it for 4 weeks. Starting is more important than finding the perfect plan."
                </Text>
              </View>
              
              <Text style={{
                color: theme.textSecondary,
                fontSize: 12,
                fontFamily: 'Urbanist-Regular',
                textAlign: 'center',
                lineHeight: 16,
              }}>
                Your voice and style remain consistent while addressing each fan's specific needs.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
