import { useGlobalContext } from '@/lib/global-provider';
import { client } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Client, Databases, Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel, Chat, DeepPartial, MessageAvatar, MessageInput, MessageList, MessageSimple, OverlayProvider, ReactionData, Theme, Thread, useMessageContext, useMessagesContext, useThreadContext } from 'stream-chat-react-native';
import loadingIcon from '../../assets/icon/loading-icon.png';
import { checkPaidContentPurchase, config, createPaidContentPaymentIntent } from '../../lib/appwrite';

// Cache for profile images to avoid repeated database calls
const profileImageCache = new Map<string, string>();

// Custom Avatar component that fetches profile images
const CustomMessageAvatar = (props: any) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Get message from MessageContext instead of props
  const messageContext = useMessageContext();
  const message = messageContext?.message || props.message;
  const channel = messageContext?.channel;
  
  // Check if we're in a thread
  const threadContext = useThreadContext();
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  
  // Function to check if we should show avatar based on 5-minute logic (same as timestamp)
  const shouldShowAvatar = () => {
    if (!message?.created_at || !message?.user?.id) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel?.state.messages || {});
    
    // Find all messages from the same user
    const userMessages = messages
      .filter((msg: any) => msg.user?.id === currentUserId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentMessageIndex = userMessages.findIndex((msg: any) => msg.id === message.id);
    
    // If this is the last message from this user overall, show avatar
    if (currentMessageIndex === userMessages.length - 1) {
      return true;
    }
    
    // Get the next message from the same user
    const nextMessage = userMessages[currentMessageIndex + 1];
    if (!nextMessage?.created_at) {
      return true; // Show avatar if we can't find next message
    }
    
    const nextMessageTime = new Date(nextMessage.created_at);
    const timeDifference = nextMessageTime.getTime() - currentMessageTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show avatar if more than 5 minutes will pass before the next message
    return timeDifference >= fiveMinutesInMs;
  };
  
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!message || !message.user || !message.user.id) {
        return;
      }
      
      const userId = message.user.id;
      
      // Check cache first
      if (profileImageCache.has(userId)) {
        const cachedImage = profileImageCache.get(userId);
        if (cachedImage) {
          setProfileImage(cachedImage);
          return;
        }
      }
      
      try {
        if (!config.endpoint || !config.projectId || !config.databaseId || !config.profileCollectionId) {
          return;
        }

        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query profiles collection for the user's profile image
        const profiles = await databases.listDocuments(
          config.databaseId,
          config.profileCollectionId,
          [Query.equal('userId', userId)]
        );
        
        if (profiles.documents.length > 0) {
          const profileImageUri = profiles.documents[0].profileImageUri;
          if (profileImageUri) {
            // Cache the result
            profileImageCache.set(userId, profileImageUri);
            setProfileImage(profileImageUri);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile image:', error);
      }
    };
    
    fetchProfileImage();
  }, [message?.user?.id]);

  const showAvatar = shouldShowAvatar();

  // If we have a custom profile image, render it
  if (profileImage) {
    return (
      <View style={{
        width: props.size || 32,
        height: props.size || 32,
        borderRadius: (props.size || 32) / 2,
        marginRight: 8,
        overflow: 'hidden',
        backgroundColor: '#2A2A2A',
        opacity: showAvatar ? 1 : 0, // Make invisible but keep space
      }}>
        <Image
          source={{ uri: profileImage }}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fall back to default MessageAvatar if no custom image, also apply opacity
  return (
    <View style={{ opacity: showAvatar ? 1 : 0 }}>
      <MessageAvatar {...props} />
    </View>
  );
};

// Custom Message Input for Group Chat Restrictions
const CustomMessageInput = ({ currentChatType }: { currentChatType: string }) => {
  // For group chats, show a message that encourages thread replies
  if (currentChatType === 'group') {
    return (
      <View style={{
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
      }}>
        <View style={{
          backgroundColor: '#2A2A2A',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 16,
          alignItems: 'center',
          flexDirection: 'row',
        }}>
          <Ionicons 
            name="chatbubble-outline" 
            size={20} 
            color="#FB2355" 
            style={{ marginRight: 12 }}
          />
          <Text style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontFamily: 'questrial',
            flex: 1,
            textAlign: 'center',
          }}>
            Tap on any message to reply in a thread
          </Text>
          <Ionicons 
            name="arrow-up-circle-outline" 
            size={20} 
            color="#FB2355" 
            style={{ marginLeft: 12 }}
          />
        </View>
        <Text style={{
          color: '#666666',
          fontSize: 12,
          fontFamily: 'questrial',
          textAlign: 'center',
          marginTop: 8,
          fontStyle: 'italic',
        }}>
          Group chats are thread-only to keep conversations organized
        </Text>
      </View>
    );
  }
  
  // For direct messages, use normal message input
  return <MessageInput />;
};

// Custom theme for the chat - focused on timestamp visibility
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
    accent_blue: '#FB2355',
    accent_green: '#FB2355',
    accent_red: '#FB2355',
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
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: '#FB2355',
        borderWidth: 0,
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: '#FB2355',
      },
      markdown: {
        text: {
          color: '#FFFFFF', // White text in message bubbles
        },
        paragraph: {
          color: '#FFFFFF', // White text for paragraphs
        },
        strong: {
          color: '#FFFFFF', // White text for bold text
        },
        em: {
          color: '#FFFFFF', // White text for italic text
        },
      },
    },
  },
});

// Custom MessageStatus component that hides the default timestamp completely
const CustomMessageStatus = () => {
  return null; // Hide the default timestamp completely
};

// Custom Paid Content Attachment Component
const PaidContentAttachment = (props: any) => {
  const { attachment, onPressIn } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Get message context to access message sender info
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const messageSender = message?.user;

  // Return null if no attachment
  if (!attachment) {
    return null;
  }

  // Check if user has purchased this content
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user?.$id || !attachment?.paid_content_id) return;
      
      try {
        const hasPurchased = await checkPaidContentPurchase(user.$id, attachment.paid_content_id);
        setIsUnlocked(hasPurchased);
      } catch (error) {
        console.error('Error checking purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, user?.$id]);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    // Debug: Log essential data for payment modal
    console.log('Opening payment modal with data:', {
      contentId: attachment?.paid_content_id,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price
    });
    
    // Show Stripe payment modal
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('Payment successful for paid content');
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  if (attachment?.type === 'paid_content') {
    return (
      <>
        <View style={{
          width: 300,
          height: 200,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
          marginLeft: 0,
          marginRight: 5,
          position: 'relative',
        }}>
          {/* Background Image */}
          <Image
            source={{ uri: attachment?.image_url }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
            resizeMode="cover"
          />
          
          {/* Blur Overlay (only if not unlocked) */}
          {!isUnlocked && (
            <BlurView
              intensity={50}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          )}
          
          {/* Lock Icon and Price (only if not unlocked) */}
          {!isUnlocked && (
            <TouchableOpacity
              onPress={handleUnlock}
              disabled={isUnlocking}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              }}
              activeOpacity={0.8}
            >
              <View style={{
                backgroundColor: 'rgba(251, 35, 85, 0.9)',
                borderRadius: 50,
                width: 80,
                height: 80,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}>
                {isUnlocking ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 'bold',
                      marginTop: 4,
                      fontFamily: 'questrial',
                    }}>
                      ${attachment?.price || '5.00'}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          {/* Unlocked indicator */}
          {isUnlocked && (
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0, 200, 81, 0.9)',
              borderRadius: 16,
              paddingHorizontal: 8,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 'bold',
                marginLeft: 4,
                fontFamily: 'questrial',
              }}>
                Unlocked
              </Text>
            </View>
          )}
        </View>

        {/* Stripe Payment Modal */}
        <PaidContentPaymentModal
          visible={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          amount={parseFloat(attachment?.price || '5.00')}
          contentTitle="Exclusive Content"
          contentId={attachment?.paid_content_id}
          creatorId={messageSender?.id}
          creatorName={messageSender?.name}
          imageUrl={attachment?.image_url}
          contentType="image"
        />
      </>
    );
  }

  return null;
};

// Custom Poll Component with voting functionality
const CustomPollComponent = ({ message, poll }: { message: any; poll: any }) => {
  const { user } = useGlobalContext();
  const [isVoting, setIsVoting] = useState(false);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [localVoteCounts, setLocalVoteCounts] = useState<{[key: string]: number}>({});
  const [localTotalVotes, setLocalTotalVotes] = useState(0);

  useEffect(() => {
    // Get user's current votes from the poll data
    if (poll?.own_votes) {
      const currentVotes = poll.own_votes.map((vote: any) => vote.option_id);
      setUserVotes(currentVotes);
    }
    
    // Initialize local vote counts with server data
    if (poll?.vote_counts_by_option) {
      setLocalVoteCounts(poll.vote_counts_by_option);
    }
    
    // Initialize local total votes
    if (poll?.vote_count !== undefined) {
      setLocalTotalVotes(poll.vote_count);
    }
  }, [poll]);

  const handleVote = async (optionId: string) => {
    if (!client || !message?.id || !poll?.id || isVoting) {
      console.log('Cannot vote: missing client, message ID, poll ID, or already voting');
      return;
    }

    try {
      setIsVoting(true);
      console.log('Casting vote for option:', optionId);

      // Check if user already voted for this option
      const hasVotedForOption = userVotes.includes(optionId);

      // Update UI immediately (optimistic updates)
      if (hasVotedForOption) {
        // Remove vote - update UI immediately
        setUserVotes(prev => prev.filter(id => id !== optionId));
        setLocalVoteCounts(prev => ({
          ...prev,
          [optionId]: Math.max(0, (prev[optionId] || 0) - 1)
        }));
        setLocalTotalVotes(prev => Math.max(0, prev - 1));
      } else {
        // Add vote - update UI immediately
        if (poll.max_votes_allowed === 1) {
          // Single choice poll - remove previous vote and add new one
          const previousVote = userVotes[0];
          if (previousVote) {
            setLocalVoteCounts(prev => ({
              ...prev,
              [previousVote]: Math.max(0, (prev[previousVote] || 0) - 1),
              [optionId]: (prev[optionId] || 0) + 1
            }));
          } else {
            setLocalVoteCounts(prev => ({
              ...prev,
              [optionId]: (prev[optionId] || 0) + 1
            }));
            setLocalTotalVotes(prev => prev + 1);
          }
          setUserVotes([optionId]);
        } else {
          // Multiple choice poll - add to existing votes
          setUserVotes(prev => [...prev, optionId]);
          setLocalVoteCounts(prev => ({
            ...prev,
            [optionId]: (prev[optionId] || 0) + 1
          }));
          setLocalTotalVotes(prev => prev + 1);
        }
      }

      // Now make the API call
      if (hasVotedForOption) {
        // Remove vote
        const voteToRemove = poll.own_votes?.find((vote: any) => vote.option_id === optionId);
        if (voteToRemove) {
          await client.removePollVote(message.id, poll.id, voteToRemove.id);
        }
      } else {
        // Add vote
        await client.castPollVote(message.id, poll.id, { option_id: optionId });
      }

      console.log('Vote cast successfully');
    } catch (error) {
      console.error('Error voting on poll:', error);
      
      // Revert optimistic updates on error
      if (poll?.vote_counts_by_option) {
        setLocalVoteCounts(poll.vote_counts_by_option);
      }
      if (poll?.vote_count !== undefined) {
        setLocalTotalVotes(poll.vote_count);
      }
      if (poll?.own_votes) {
        const currentVotes = poll.own_votes.map((vote: any) => vote.option_id);
        setUserVotes(currentVotes);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const getTotalVotes = () => {
    return localTotalVotes;
  };

  const getOptionVotes = (optionId: string) => {
    return localVoteCounts[optionId] || 0;
  };

  const getVotePercentage = (optionId: string) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    const optionVotes = getOptionVotes(optionId);
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const isVotedOption = (optionId: string) => {
    return userVotes.includes(optionId);
  };

  return (
    <View style={{
      backgroundColor: '#2A2A2A',
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      marginHorizontal: 12,
      borderWidth: 1,
      borderColor: '#404040',
    }}>
      {/* Poll Title */}
      <Text style={{
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'questrial',
        marginBottom: 4,
      }}>
        {poll?.name || 'Poll'}
      </Text>

      {/* Poll Description */}
      {poll?.description && (
        <Text style={{
          color: '#CCCCCC',
          fontSize: 14,
          fontFamily: 'questrial',
          marginBottom: 12,
        }}>
          {poll.description}
        </Text>
      )}

      {/* Poll Options */}
      <View style={{ marginBottom: 12 }}>
        {poll?.options?.map((option: any, index: number) => {
          const isVoted = isVotedOption(option.id);
          const votes = getOptionVotes(option.id);
          const percentage = getVotePercentage(option.id);
          const totalVotes = getTotalVotes();

          return (
            <TouchableOpacity
              key={option.id || index}
              style={{
                backgroundColor: isVoted ? '#FB2355' : '#404040',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                borderWidth: isVoted ? 2 : 1,
                borderColor: isVoted ? '#FB2355' : '#666666',
                opacity: isVoting ? 0.7 : 1,
              }}
              onPress={() => handleVote(option.id)}
              disabled={isVoting}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  {/* Vote indicator */}
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: isVoted ? '#FFFFFF' : 'transparent',
                    borderWidth: 2,
                    borderColor: isVoted ? '#FFFFFF' : '#CCCCCC',
                    marginRight: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isVoted && (
                      <Ionicons name="checkmark" size={12} color="#FB2355" />
                    )}
                  </View>

                  {/* Option text */}
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'questrial',
                    flex: 1,
                  }}>
                    {option.text}
                  </Text>
                </View>

                {/* Vote count and percentage */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontFamily: 'questrial',
                    fontWeight: 'bold',
                  }}>
                    {votes} vote{votes !== 1 ? 's' : ''}
                  </Text>
                  {totalVotes > 0 && (
                    <Text style={{
                      color: '#CCCCCC',
                      fontSize: 11,
                      fontFamily: 'questrial',
                    }}>
                      {percentage}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Progress bar */}
              {totalVotes > 0 && (
                <View style={{
                  height: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  marginTop: 8,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 2,
                  }} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Poll Footer */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#404040',
      }}>
        <Text style={{
          color: '#CCCCCC',
          fontSize: 12,
          fontFamily: 'questrial',
        }}>
          Total votes: {getTotalVotes()}
        </Text>

        <Text style={{
          color: '#CCCCCC',
          fontSize: 12,
          fontFamily: 'questrial',
        }}>
          {poll?.max_votes_allowed === 1 ? 'Single choice' : 'Multiple choice'}
        </Text>
      </View>

      {/* Poll status */}
      {poll?.is_closed && (
        <View style={{
          backgroundColor: '#666666',
          borderRadius: 6,
          padding: 6,
          marginTop: 8,
          alignItems: 'center',
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: 11,
            fontFamily: 'questrial',
            fontWeight: 'bold',
          }}>
            Poll Closed
          </Text>
        </View>
      )}
    </View>
  );
};

// Custom MessageSimple component that includes visible timestamps with 5-minute logic
const CustomMessageSimple = (props: any) => {
  // Get message from useMessageContext hook
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const channel = messageContext?.channel;
  const { user } = useGlobalContext();
  
  // Check if this message contains a poll (check for poll_id)
  const hasPoll = message?.poll_id || message?.poll;
  
  console.log('Message data:', {
    id: message?.id,
    text: message?.text,
    hasPoll: !!hasPoll,
    poll_id: message?.poll_id,
    poll: message?.poll,
    type: message?.type,
    attachments: message?.attachments
  });
  
  // If message has a poll, render our custom poll component
  if (hasPoll && message?.poll) {
    console.log('Rendering custom poll component');
    return (
      <View>
        {/* Show the message text if any */}
        {message.text && message.text !== `📊 ${message.poll.name}` && (
          <View style={{ marginBottom: 8 }}>
            <MessageSimple {...props} />
          </View>
        )}
        {/* Render our custom poll */}
        <CustomPollComponent message={message} poll={message.poll} />
      </View>
    );
  }
  
  // If poll_id exists but no poll data, use default MessageSimple
  if (hasPoll) {
    console.log('Rendering poll message with default MessageSimple');
    return <MessageSimple {...props} />;
  }
  
  // Check if we're in a thread
  const threadContext = useThreadContext();
  const isInThread = !!threadContext?.thread;
  const threadMessages = threadContext?.threadMessages || [];
  
  // Check if we're in a DM channel (channel ID starts with 'dm-')
  const isDMChannel = channel?.id?.startsWith('dm-');
  
  // Check if this is my message
  const isMyMessage = message?.user?.id === user?.$id;
  
  // Function to check if this is the last message in the channel
  const isLastMessage = () => {
    if (!message?.created_at || !channel) return false;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel.state.messages || {});
    
    // Sort all messages by creation time
    const sortedMessages = messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Check if this message is the last one
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    return lastMessage?.id === message.id;
  };

  // Function to check if we should show timestamp based on 5-minute logic
  const shouldShowTimestamp = () => {
    if (!message?.created_at || !message?.user?.id) return false;
    
    const currentMessageTime = new Date(message.created_at);
    const currentUserId = message.user.id;
    
    // Use thread messages if we're in a thread, otherwise use channel messages
    const messages = isInThread ? threadMessages : Object.values(channel?.state.messages || {});
    
    // Find all messages from the same user
    const userMessages = messages
      .filter((msg: any) => msg.user?.id === currentUserId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const currentMessageIndex = userMessages.findIndex((msg: any) => msg.id === message.id);
    
    // If this is the last message from this user overall, show timestamp
    if (currentMessageIndex === userMessages.length - 1) {
      return true;
    }
    
    // Get the next message from the same user
    const nextMessage = userMessages[currentMessageIndex + 1];
    if (!nextMessage?.created_at) {
      return true; // Show timestamp if we can't find next message
    }
    
    const nextMessageTime = new Date(nextMessage.created_at);
    const timeDifference = nextMessageTime.getTime() - currentMessageTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show timestamp if more than 5 minutes will pass before the next message
    return timeDifference >= fiveMinutesInMs;
  };

  // Check if message has paid content attachments
  const hasPaidContent = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_content');
  
  // Check if message has paid video attachments
  const hasPaidVideo = message?.attachments?.some((attachment: any) => attachment?.type === 'paid_video');

  // Check if message has blurry file attachments
  const hasBlurryFile = message?.attachments?.some((attachment: any) => attachment?.type === 'blurry_file');

  if (hasPaidVideo) {
    console.log('Rendering message with paid video attachment');
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'paid_video' ? (
              <PaidVideoAttachment 
                key={`paid-video-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for paid video messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
                }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (hasBlurryFile) {
    console.log('Rendering message with blurry file attachment');
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'blurry_file' ? (
              <BlurryFileAttachment 
                key={`blurry-file-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for blurry file messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
                }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  if (hasPaidContent) {
    console.log('Rendering message with paid content attachment');
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 5,
      }}>
        {/* Avatar */}
        <View style={{ marginRight: 2, marginLeft: -6 }}>
          <CustomMessageAvatar size={32} />
        </View>
        
        {/* Message content */}
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: 1,
          maxWidth: '80%',
          marginLeft: -4,
        }}>
          {/* Render paid content attachments only (no text message) */}
          {message.attachments?.map((attachment: any, index: number) => (
            attachment?.type === 'paid_content' ? (
              <PaidContentAttachment 
                key={`paid-content-${index}`}
                attachment={attachment} 
              />
            ) : null
          ))}
          
          {/* Add timestamp for paid content messages */}
          {shouldShowTimestamp() && (
            <View style={{ 
              paddingTop: 0,
              paddingHorizontal: 2,
              alignItems: 'flex-start',
              marginLeft: -4,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              }}>
                <Ionicons 
                  name="checkmark" 
                  size={13}
                  color="#00C851"
                  style={{ opacity: 0.9 }}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  opacity: 0.8,
                  letterSpacing: 0.3,
                }}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  return (
    <View>
      {/* Render the default MessageSimple */}
      <MessageSimple {...props} />
      
      {/* Add our custom timestamp below */}
      {shouldShowTimestamp() && (
        <View style={{ 
          paddingTop: isInThread 
            ? (isLastMessage() ? 2 : 1) // Threads - tightest spacing
            : isDMChannel 
              ? (isLastMessage() ? 6 : 3) // DM channels - medium spacing
              : (isLastMessage() ? 8 : 4), // Group channels - most spacing
          paddingBottom: isInThread 
            ? (isLastMessage() ? 6 : 3) // Threads
            : isDMChannel 
              ? (isLastMessage() ? 10 : 5) // DM channels
              : (isLastMessage() ? 12 : 6), // Group channels
          paddingHorizontal: 12, // Consistent horizontal padding
          marginTop: isInThread 
            ? (isLastMessage() ? -22 : 4) // Threads - very tight to bubble
            : isDMChannel 
              ? (isLastMessage() ? -30 : -1) // DM channels - moderate spacing
              : (isLastMessage() ? -16 : -2), // Group channels - original spacing
          marginBottom: isInThread 
            ? (isLastMessage() ? 1 : 0) // Threads
            : isDMChannel 
              ? (isLastMessage() ? 3 : 1) // DM channels
              : (isLastMessage() ? 4 : 2), // Group channels
          alignItems: isMyMessage ? 'flex-end' : 'flex-start', // Align right for our messages, left for others
          backgroundColor: 'transparent',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6, // Slightly more space between checkmark and time
            paddingHorizontal: 8, // Internal padding for the timestamp container
            paddingVertical: 3, // Vertical padding for better touch target
            borderRadius: 8, // Rounded background for timestamp
            backgroundColor: 'rgba(0, 0, 0, 0.1)', // Subtle background
          }}>
            <Ionicons 
              name="checkmark" 
              size={13} // Slightly larger checkmark
              color="#00C851" // Green color
              style={{ opacity: 0.9 }}
            />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12, // Slightly larger timestamp text
              fontWeight: '600', // Medium weight for better readability
              fontFamily: 'questrial',
              opacity: 0.8, // Slightly more visible
              letterSpacing: 0.3, // Better letter spacing
            }}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Create a custom modal component for message actions
const CustomMessageModal = ({ visible, onClose, message, onThreadReply }: {
  visible: boolean;
  onClose: () => void;
  message: any;
  onThreadReply: (message: any) => void;
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const { supportedReactions } = useMessagesContext();
  const { user } = useGlobalContext();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(50);
      rotateAnim.setValue(0);
      
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Cool exit animations with rotation and scale down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.3,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, slideAnim, rotateAnim]);

  // Handle closing with animation
  const handleClose = () => {
    // Trigger exit animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.3,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Call onClose after animation completes
      onClose();
      setShowReactions(false);
    });
  };

  // Handle thread reply
  const handleThreadReply = () => {
    handleClose();
    if (message) {
      setTimeout(() => {
        onThreadReply(message);
      }, 50);
    }
  };

  // Handle reaction selection
  const handleReaction = async (reactionType: string) => {
    handleClose();
    
    try {
      if (message && user) {
        // Extract channel ID from message.cid (remove the "messaging:" prefix)
        const channelId = message.cid.replace('messaging:', '');
        const channel = client.channel('messaging', channelId);
        
        // Check if user already reacted with this type
        const existingReaction = message.own_reactions?.find((reaction: any) => 
          reaction.type === reactionType && reaction.user?.id === user.$id
        );
        
        if (existingReaction) {
          // Remove the reaction if it already exists
          await channel.deleteReaction(message.id, reactionType);
        } else {
          // Add the reaction if it doesn't exist
          await channel.sendReaction(message.id, { type: reactionType });
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const renderReactionItem = ({ item }: { item: ReactionData }) => {
    return (
      <TouchableOpacity
        key={item.type}
        style={{
          backgroundColor: '#2A2A2A',
          borderRadius: 25,
          width: 50,
          height: 50,
          justifyContent: 'center',
          alignItems: 'center',
          marginHorizontal: 8,
          marginVertical: 8,
          borderWidth: 2,
          borderColor: '#404040',
          shadowColor: '#FB2355',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}
        onPress={() => handleReaction(item.type)}
        activeOpacity={0.7}
      >
        {item.Icon ? <item.Icon /> : null}
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <>
      <StatusBar style="light" />
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: 'transparent',
      }}>
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 26, 26, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
        }}>
          {/* Backdrop - tap to dismiss */}
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={handleClose}
            activeOpacity={1}
          />

          {/* Custom Modal Content */}
          <Animated.View style={{
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
              { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '15deg']
                })
              }
            ],
            alignSelf: 'center',
          }}>
            <View style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 16,
              marginHorizontal: 24,
              borderWidth: 1,
              borderColor: '#666666',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
              width: 280,
              alignSelf: 'center',
            }}>
              {/* Thread Reply Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  marginBottom: 12,
                  backgroundColor: '#2A2A2A',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#404040',
                }}
                onPress={handleThreadReply}
                activeOpacity={0.8}
              >
                <View style={{
                  backgroundColor: '#FB2355',
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                </View>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  fontFamily: 'questrial',
                  flex: 1,
                }}>
                  Reply in Thread
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#666666" />
              </TouchableOpacity>

              {/* Reactions Grid */}
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 8,
                marginBottom: 8,
              }}>
                {supportedReactions?.map((item) => {
                  // Check if user has already reacted with this type
                  const hasUserReacted = message?.own_reactions?.some((reaction: any) => 
                    reaction.type === item.type && reaction.user?.id === user?.$id
                  );
                  
                  return (
                    <TouchableOpacity
                      key={item.type}
                      style={{
                        backgroundColor: '#2A2A2A',
                        borderRadius: 18,
                        width: 36,
                        height: 36,
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: 4,
                        borderWidth: 1,
                        borderColor: hasUserReacted ? '#666666' : '#404040',
                        position: 'relative',
                      }}
                      onPress={() => handleReaction(item.type)}
                      activeOpacity={0.7}
                    >
                      {item.Icon ? <item.Icon /> : null}
                      {hasUserReacted && (
                        <View style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#00C851',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Text style={{
                            color: '#FFFFFF',
                            fontSize: 8,
                            fontWeight: 'bold',
                          }}>
                            ✓
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#404040',
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  alignSelf: 'center',
                  borderWidth: 1,
                  borderColor: '#666666',
                }}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: '500',
                  fontFamily: 'questrial',
                  textAlign: 'center',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </>
  );
};

// Custom reactions for our chat
const customReactions: ReactionData[] = [
  { type: "love", Icon: () => <Text style={{ fontSize: 18 }}>❤️</Text> },
  { type: "like", Icon: () => <Text style={{ fontSize: 18 }}>👍</Text> },
  { type: "haha", Icon: () => <Text style={{ fontSize: 18 }}>😂</Text> },
  { type: "wow", Icon: () => <Text style={{ fontSize: 18 }}>😮</Text> },
  { type: "sad", Icon: () => <Text style={{ fontSize: 18 }}>😢</Text> },
  { type: "angry", Icon: () => <Text style={{ fontSize: 18 }}>😡</Text> },
  { type: "fire", Icon: () => <Text style={{ fontSize: 18 }}>🔥</Text> },
  { type: "100", Icon: () => <Text style={{ fontSize: 18 }}>💯</Text> },
  { type: "party", Icon: () => <Text style={{ fontSize: 18 }}>🎉</Text> },
  { type: "skull", Icon: () => <Text style={{ fontSize: 18 }}>💀</Text> },
];

// Stripe Payment Modal for Paid Content
interface PaidContentPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  contentTitle: string;
  contentId?: string;
  creatorId?: string;
  creatorName?: string;
  imageUrl?: string;
  contentType?: string;
}

const PaidContentPaymentForm: React.FC<{
  onSuccess: () => void;
  onClose: () => void;
  amount: number;
  contentTitle: string;
  contentId?: string;
  creatorId?: string;
  creatorName?: string;
  imageUrl?: string;
  contentType?: string;
}> = ({ onSuccess, onClose, amount, contentTitle, contentId, creatorId, creatorName, imageUrl, contentType }) => {
  const stripe = useStripe();
  const { user } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !cardComplete) {
      console.log('Payment blocked - Stripe not ready or card incomplete:', {
        hasStripe: !!stripe,
        cardComplete
      });
      return;
    }

    // Debug: Check what values we have for validation
    console.log('Payment validation check:', {
      userId: user?.$id,
      contentId,
      creatorId,
      creatorName,
      amount
    });

    if (!user?.$id) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    if (!contentId) {
      setError('Content ID is missing. Please try again.');
      return;
    }

    if (!creatorId) {
      setError('Creator ID is missing. Please try again.');
      return;
    }

    if (!creatorName) {
      setError('Creator name is missing. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Creating payment intent...');
      
      // Create payment intent on the backend
      const paymentData = await createPaidContentPaymentIntent(amount, 'usd', {
        userId: user.$id,
        creatorId,
        creatorName,
        contentId,
        contentType: contentType || 'image',
        imageUrl: imageUrl || ''
      });

      console.log('Payment intent created, confirming payment...');

      // Confirm the payment with Stripe
      const { error: confirmError } = await stripe.confirmPayment(paymentData.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (confirmError) {
        console.error('Payment confirmation error:', confirmError);
        setError(confirmError.message || 'Payment failed');
        return;
      }

      console.log('Payment confirmed! Recording purchase...');

      // The purchase will be automatically recorded by the backend webhook
      // when it receives the payment_intent.succeeded event
      console.log('Purchase will be recorded by backend webhook');
      
      // Haptic feedback on success
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Call success callback
      onSuccess();
      
    } catch (err) {
      console.error('Payment processing error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={paidContentStyles.sheetContent}>
      <TouchableOpacity onPress={onClose} style={paidContentStyles.closeButton}>
        <Text style={paidContentStyles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      
      <View style={paidContentStyles.headerSection}>
        <Text style={paidContentStyles.title}>Unlock Content</Text>
        <Text style={paidContentStyles.subtitle}>{contentTitle}</Text>
      </View>
      
      <View style={paidContentStyles.cardInputSection}>
        <Text style={paidContentStyles.cardLabel}>Payment Method</Text>
        <CardField
          postalCodeEnabled={false}
          placeholders={{ number: '1234 1234 1234 1234' }}
          cardStyle={{
            ...paidContentStyles.cardField,
            textColor: '#18181b',
          }}
          style={paidContentStyles.cardFieldContainer}
          onCardChange={(cardDetails: any) => {
            setCardComplete(cardDetails.complete);
          }}
        />
      </View>
      
      {error && (
        <View style={paidContentStyles.errorContainer}>
          <Text style={paidContentStyles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={paidContentStyles.amountSection}>
        <View style={paidContentStyles.amountRow}>
          <Text style={paidContentStyles.amountLabel}>Content Price</Text>
          <Text style={paidContentStyles.amountValue}>${amount}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          paidContentStyles.payButton,
          (!cardComplete || loading) && paidContentStyles.payButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!cardComplete || loading}
        activeOpacity={0.85}
      >
        <Text style={paidContentStyles.payButtonText}>
          {loading ? 'Processing...' : `Pay $${amount}`}
        </Text>
      </TouchableOpacity>
      
      <Text style={paidContentStyles.securityText}>
        Your payment is secured by Stripe
      </Text>
    </View>
  );
};

const PaidContentPaymentModal: React.FC<PaidContentPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  amount,
  contentTitle,
  contentId,
  creatorId,
  creatorName,
  imageUrl,
  contentType,
}) => {
  const screenHeight = Dimensions.get('window').height;
  const sheetHeight = Math.round(screenHeight * 0.6);
  const slideAnim = React.useRef(new Animated.Value(sheetHeight)).current;

  // Debug: Log what props the payment modal receives
  React.useEffect(() => {
    if (visible) {
      console.log('Payment modal props:', {
        contentId,
        creatorId,
        creatorName,
        amount,
        imageUrl
      });
    }
  }, [visible, contentId, creatorId, creatorName, amount, imageUrl]);

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(sheetHeight);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={paidContentStyles.overlay}>
        <Animated.View 
          style={[
            paidContentStyles.bottomSheet, 
            { height: sheetHeight, transform: [{ translateY: slideAnim }] }
          ]}
        > 
          <View style={paidContentStyles.sheetHandle} />
          <ScrollView 
            style={paidContentStyles.scrollView}
            contentContainerStyle={paidContentStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <PaidContentPaymentForm
              onSuccess={onSuccess}
              onClose={onClose}
              amount={amount}
              contentTitle={contentTitle}
              contentId={contentId}
              creatorId={creatorId}
              creatorName={creatorName}
              imageUrl={imageUrl}
              contentType={contentType}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Styles for the payment modal
const paidContentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#191A1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
    opacity: 0.25,
  },
  sheetContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#888',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'questrial',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#B9B9B9',
    fontSize: 15,
    fontFamily: 'questrial',
    fontWeight: '500',
    textAlign: 'center',
  },
  amountSection: {
    width: '100%',
    backgroundColor: '#232326',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  amountRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    color: '#B9B9B9',
    fontSize: 15,
    fontFamily: 'questrial',
    fontWeight: '500',
  },
  amountValue: {
    color: '#FB2355',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
  cardInputSection: {
    width: '100%',
    backgroundColor: '#232326',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  cardLabel: {
    color: '#B9B9B9',
    fontSize: 14,
    fontFamily: 'questrial',
    marginBottom: 8,
    fontWeight: '500',
  },
  cardFieldContainer: {
    height: 50,
    marginVertical: 8,
  },
  cardField: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  errorContainer: {
    backgroundColor: '#FF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'questrial',
    textAlign: 'center',
  },
  payButton: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#FB2355',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#FB2355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
  securityText: {
    color: '#B9B9B9',
    fontSize: 12,
    fontFamily: 'questrial',
    textAlign: 'center',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

// Attachment styles for blurry files
const attachmentStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  image: {
    width: 250,
    height: 200,
  },
  blurOverlay: {
    position: 'relative',
  },
  overlayContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FB2355',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockText: {
    fontSize: 24,
    color: 'white',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FB2355',
    marginBottom: 8,
    fontFamily: 'questrial',
  },
  titleText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'questrial',
  },
  unlockButton: {
    backgroundColor: '#FB2355',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  unlockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
});

// Paid Video Attachment Component
const PaidVideoAttachment = (props: any) => {
  const { attachment, onPressIn } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<Video>(null);

  // Get message context to access message sender info
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const messageSender = message?.user;

  // Return null if no attachment
  if (!attachment) {
    return null;
  }

  // Check if user has purchased this content
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user?.$id || !attachment?.paid_content_id) return;
      
      try {
        const hasPurchased = await checkPaidContentPurchase(user.$id, attachment.paid_content_id);
        setIsUnlocked(hasPurchased);
      } catch (error) {
        console.error('Error checking video purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, user?.$id]);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    console.log('Opening payment modal for video with data:', {
      contentId: attachment?.paid_content_id,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price
    });
    
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('Payment successful for paid video');
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  const handlePlayPress = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (attachment?.type === 'paid_video') {
    return (
      <>
        <View style={{
          width: 320,
          height: 240,
          borderRadius: 12,
          overflow: 'hidden',
          marginVertical: 8,
          marginLeft: 0,
          marginRight: 5,
          position: 'relative',
          backgroundColor: '#000',
        }}>
          {isUnlocked ? (
            // Unlocked video player
            <>
              <Video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                source={{ uri: attachment?.local_video_uri || attachment?.video_url }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded) {
                    setIsPlaying(status.isPlaying);
                  }
                }}
              />
              
              {/* Unlocked indicator */}
              <View style={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: 'rgba(0, 200, 81, 0.9)',
                borderRadius: 16,
                paddingHorizontal: 8,
                paddingVertical: 4,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 'bold',
                  marginLeft: 4,
                  fontFamily: 'questrial',
                }}>
                  Unlocked
                </Text>
              </View>
            </>
          ) : (
            // Locked video preview
            <>
              {/* Video thumbnail or placeholder */}
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#1A1A1A',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="videocam" size={64} color="#666666" />
              </View>
              
              {/* Blur overlay */}
              <BlurView
                intensity={50}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              
              {/* Lock overlay */}
              <TouchableOpacity
                onPress={handleUnlock}
                disabled={isUnlocking}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  backgroundColor: 'rgba(251, 35, 85, 0.9)',
                  borderRadius: 50,
                  width: 80,
                  height: 80,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}>
                  {isUnlocking ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="play" size={28} color="#FFFFFF" />
                      <Ionicons 
                        name="lock-closed" 
                        size={16} 
                        color="#FFFFFF" 
                        style={{ position: 'absolute', bottom: 8, right: 8 }}
                      />
                    </>
                  )}
                </View>
                
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginTop: 16,
                  fontFamily: 'questrial',
                  textAlign: 'center',
                }}>
                  {attachment?.title || 'Premium Video'}
                </Text>
                
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginTop: 8,
                  fontFamily: 'questrial',
                }}>
                  ${attachment?.price || '9.99'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Payment Modal */}
        <PaidContentPaymentModal
          visible={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          amount={parseFloat(attachment?.price || '9.99')}
          contentTitle={attachment?.title || 'Premium Video'}
          contentId={attachment?.paid_content_id}
          creatorId={messageSender?.id}
          creatorName={messageSender?.name}
          imageUrl={attachment?.video_url}
          contentType="video"
        />
      </>
    );
  }

  return null;
};

const BlurryFileAttachment = (props: any) => {
  const { attachment } = props;
  const { user } = useGlobalContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileDimensions, setFileDimensions] = useState({ width: 300, height: 200 });
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Get message context to access message sender info
  const messageContext = useMessageContext();
  const message = messageContext?.message;
  const messageSender = message?.user;

  // Return null if no attachment
  if (!attachment) {
    return null;
  }

  // Check if user has purchased this content
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      // Check multiple possible field names for the content ID
      const contentId = attachment?.paid_content_id || attachment?.file_id || attachment?.content_id;
      if (!user?.$id || !contentId) return;
      
      try {
        const hasPurchased = await checkPaidContentPurchase(user.$id, contentId);
        setIsUnlocked(hasPurchased);
      } catch (error) {
        console.error('Error checking file purchase status:', error);
        setIsUnlocked(false);
      }
    };

    checkPurchaseStatus();
  }, [attachment?.paid_content_id, attachment?.file_id, attachment?.content_id, user?.$id]);

  // Try to guess file format from URL or attachment data
  useEffect(() => {
    if (attachment?.title && attachment.title.toLowerCase().includes('vertical')) {
      setFileDimensions({ width: 225, height: 400 }); // Portrait format
      setIsPortraitMode(true);
    } else if (attachment?.title && attachment.title.toLowerCase().includes('portrait')) {
      setFileDimensions({ width: 225, height: 400 }); // Portrait format
      setIsPortraitMode(true);
    }
  }, [attachment]);

  const toggleFileFormat = () => {
    if (isPortraitMode) {
      setFileDimensions({ width: 300, height: 200 }); // Landscape
      setIsPortraitMode(false);
    } else {
      setFileDimensions({ width: 225, height: 400 }); // Portrait
      setIsPortraitMode(true);
    }
  };

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    // Check multiple possible field names for the content ID
    const contentId = attachment?.paid_content_id || attachment?.file_id || attachment?.content_id;
    
    console.log('Opening payment modal for file with data:', {
      contentId: contentId,
      creatorId: messageSender?.id,
      creatorName: messageSender?.name,
      price: attachment?.price,
      attachment: attachment // Debug: log full attachment
    });
    
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('Payment successful for paid file');
    setIsUnlocked(true);
    setShowPaymentModal(false);
    
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      
      const fileUri = attachment?.local_file_uri || attachment?.image_url;
      if (!fileUri) {
        Alert.alert('Error', 'File not available for download');
        return;
      }
      
      // Use sharing to save/share the file
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: 'Save or share file',
          UTI: attachment?.mime_type || 'public.item',
        });
        
        // Success feedback
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Download not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Could not download file');
    } finally {
      setIsDownloading(false);
    }
  };

  const BlurredFileContent = ({ onUnlock, price, title }: { 
    onUnlock: () => void; 
    price: number; 
    title: string; 
  }) => (
    <View style={{
      width: fileDimensions.width,
      height: fileDimensions.height,
      borderRadius: 12,
      marginVertical: 8,
      marginLeft: 0,
      marginRight: 12,
      position: 'relative',
      borderWidth: 1,
      borderColor: '#1976D2',
      overflow: 'hidden',
      shadowColor: '#1976D2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }}>
      {/* Blue gradient background */}
      <LinearGradient
        colors={['#1976D2', '#2196F3', '#1565C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      
      {/* Subtle overlay for better text readability */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }} />
      
      {/* Content */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}>
        {/* File icon with lock */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 40,
          width: 70,
          height: 70,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 1)',
          position: 'relative',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}>
          <Ionicons name="document-text" size={32} color="#1976D2" />
          <View style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            backgroundColor: '#1565C0',
            borderRadius: 12,
            width: 26,
            height: 26,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}>
            <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
          </View>
        </View>
        
        {/* File title */}
        <Text style={{
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 4,
          fontFamily: 'questrial',
          textShadowColor: 'rgba(0, 0, 0, 0.4)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}>
          {title}
        </Text>
        
        <Text style={{
          color: '#FFFFFF',
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 16,
          fontFamily: 'questrial',
          opacity: 0.9,
          textShadowColor: 'rgba(0, 0, 0, 0.4)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}>
          Premium File Content
        </Text>
        
        <TouchableOpacity
          onPress={onUnlock}
          style={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 25,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 2,
            borderColor: '#1976D2',
          }}
        >          
          <Text style={{
            color: '#1565C0',
            fontSize: 16,
            fontWeight: '700',
            fontFamily: 'questrial',
          }}>
            Unlock for ${price.toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Format toggle button */}
      <TouchableOpacity
        onPress={toggleFileFormat}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Ionicons 
          name={isPortraitMode ? "phone-portrait" : "phone-landscape"} 
          size={20} 
          color="#1976D2" 
        />
      </TouchableOpacity>
    </View>
  );

  const UnlockedFileContent = ({ title, fileUri }: { title: string; fileUri: string }) => {
    const fileExtension = fileUri.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension);
    const isPDF = fileExtension === 'pdf';
    const isText = ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'xml', 'csv'].includes(fileExtension);
    const isAudio = ['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(fileExtension);
    
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Load file content for text files
    useEffect(() => {
      if (isText && fileUri) {
        setIsLoading(true);
        fetch(fileUri)
          .then(response => response.text())
          .then(text => {
            setFileContent(text);
            setIsLoading(false);
          })
          .catch(error => {
            console.error('Error loading text file:', error);
            setIsLoading(false);
          });
      }
    }, [fileUri, isText]);
    
    return (
      <View style={{
        width: fileDimensions.width,
        height: fileDimensions.height,
        borderRadius: 12,
        backgroundColor: '#1A1A1A',
        marginVertical: 8,
        marginLeft: 0,
        marginRight: 12,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#4CAF50',
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}>
        {/* File content preview */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#2A2A2A',
        }}>
          {isImage ? (
            <Image 
              source={{ uri: fileUri }}
              style={{
                width: '100%',
                height: '100%',
                resizeMode: 'cover',
              }}
            />
                     ) : isPDF ? (
            <View style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#F8F9FA',
              position: 'relative',
            }}>
              {/* PDF Preview Container */}
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}>
                {/* PDF Icon and Info */}
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 20,
                }}>
                  <View style={{
                    backgroundColor: '#FF6B6B',
                    borderRadius: 20,
                    width: 60,
                    height: 60,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16,
                    shadowColor: '#FF6B6B',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}>
                    <Ionicons name="document-text" size={32} color="#FFFFFF" />
                  </View>
                  
                  <Text style={{
                    color: '#2C3E50',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: 8,
                    fontFamily: 'questrial',
                  }}>
                    PDF Document
                  </Text>
                  
                  <Text style={{
                    color: '#7F8C8D',
                    fontSize: 14,
                    textAlign: 'center',
                    marginBottom: 20,
                    fontFamily: 'questrial',
                  }}>
                    {title}
                  </Text>
                  
                  {/* PDF Action Buttons */}
                  <View style={{
                    flexDirection: 'row',
                    gap: 12,
                  }}>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          console.log('Opening PDF with system viewer:', fileUri);
                          const isAvailable = await Sharing.isAvailableAsync();
                          if (isAvailable) {
                            await Sharing.shareAsync(fileUri, {
                              dialogTitle: 'Open PDF with...',
                              UTI: 'com.adobe.pdf',
                            });
                          }
                        } catch (error) {
                          console.error('Error opening PDF:', error);
                        }
                      }}
                      style={{
                        backgroundColor: '#3498DB',
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        shadowColor: '#3498DB',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      <Ionicons name="eye" size={18} color="#FFFFFF" />
                      <Text style={{
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 'bold',
                        marginLeft: 8,
                        fontFamily: 'questrial',
                      }}>
                        View PDF
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={handleDownload}
                      disabled={isDownloading}
                      style={{
                        backgroundColor: '#2ECC71',
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        opacity: isDownloading ? 0.7 : 1,
                        shadowColor: '#2ECC71',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="download" size={18} color="#FFFFFF" />
                      )}
                      <Text style={{
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 'bold',
                        marginLeft: 8,
                        fontFamily: 'questrial',
                      }}>
                        {isDownloading ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  
                </View>
              </View>
            </View>
          ) : isText ? (
            <ScrollView 
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FFFFFF',
              }}
              contentContainerStyle={{
                padding: 12,
              }}
            >
              {isLoading ? (
                <View style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 100,
                }}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={{
                    color: '#666666',
                    fontSize: 12,
                    marginTop: 8,
                    fontFamily: 'questrial',
                  }}>
                    Loading text...
                  </Text>
                </View>
              ) : (
                <Text style={{
                  color: '#000000',
                  fontSize: 12,
                  fontFamily: 'questrial',
                  lineHeight: 16,
                }}>
                  {fileContent || 'Unable to load file content'}
                </Text>
              )}
            </ScrollView>
          ) : isAudio ? (
            <View style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#2A2A2A',
            }}>
              <Ionicons name="musical-notes" size={48} color="#4CAF50" />
              <Text style={{
                color: '#4CAF50',
                fontSize: 12,
                fontWeight: 'bold',
                marginTop: 8,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                Audio File
              </Text>
              <Text style={{
                color: '#CCCCCC',
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                {fileExtension.toUpperCase()}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    console.log('Attempting to play audio:', fileUri);
                    
                    // First try sharing for audio files
                    const isAvailable = await Sharing.isAvailableAsync();
                    if (isAvailable) {
                      await Sharing.shareAsync(fileUri, {
                        dialogTitle: 'Play audio with...',
                        UTI: attachment?.mime_type || 'public.audio',
                      });
                    } else {
                      const supported = await Linking.canOpenURL(fileUri);
                      if (supported) {
                        await Linking.openURL(fileUri);
                      } else {
                        Alert.alert('Cannot play audio', 'No app available to play this audio file.');
                      }
                    }
                  } catch (error) {
                    console.error('Error playing audio:', error);
                    Alert.alert('Error', 'Could not play audio file.');
                  }
                }}
                style={{
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 'bold',
                  marginLeft: 4,
                  fontFamily: 'questrial',
                }}>
                  Play Audio
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Ionicons 
                name="document" 
                size={48} 
                color="#4CAF50" 
              />
              <Text style={{
                color: '#4CAF50',
                fontSize: 12,
                fontWeight: 'bold',
                marginTop: 8,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                {fileExtension.toUpperCase()} File
              </Text>
              <Text style={{
                color: '#CCCCCC',
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'questrial',
              }}>
                Tap "Open File" to view
              </Text>
            </>
          )}
        </View>
        
        {/* Unlocked indicator */}
        <View style={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: '#4CAF50',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 'bold',
            marginLeft: 4,
            fontFamily: 'questrial',
          }}>
            Unlocked
          </Text>
        </View>
        
        {/* Download button */}
        <TouchableOpacity
          onPress={handleDownload}
          disabled={isDownloading}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 20,
            width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#1A1A1A" />
          ) : (
            <Ionicons name="download" size={18} color="#1A1A1A" />
          )}
        </TouchableOpacity>
        
        {/* File info overlay - only show for non-PDF files */}
        {!isPDF && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
          }}>
            <Text style={{
              color: 'white',
              fontSize: 14,
              fontWeight: '600',
              fontFamily: 'questrial',
            }}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  console.log('Attempting to open file:', fileUri);
                  
                  // First try sharing which is more reliable for local files
                  const isAvailable = await Sharing.isAvailableAsync();
                  if (isAvailable) {
                    await Sharing.shareAsync(fileUri, {
                      dialogTitle: 'Open file with...',
                      UTI: attachment?.mime_type || 'public.item',
                    });
                  } else {
                    // Fallback to Linking
                    const supported = await Linking.canOpenURL(fileUri);
                    if (supported) {
                      await Linking.openURL(fileUri);
                    } else {
                      Alert.alert(
                        'Cannot open file', 
                        'No app available to open this file type. Try downloading it instead.',
                        [
                          { text: 'OK', style: 'default' },
                          { 
                            text: 'Download', 
                            style: 'default',
                            onPress: () => handleDownload()
                          }
                        ]
                      );
                    }
                  }
                } catch (error) {
                  console.error('Error opening file:', error);
                  Alert.alert(
                    'Error opening file', 
                    'Could not open this file. Try downloading it instead.',
                    [
                      { text: 'OK', style: 'default' },
                      { 
                        text: 'Download', 
                        style: 'default',
                        onPress: () => handleDownload()
                      }
                    ]
                  );
                }
              }}
              style={{
                backgroundColor: '#4CAF50',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
                marginTop: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'questrial',
              }}>
                Open File
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Format toggle button */}
        <TouchableOpacity
          onPress={toggleFileFormat}
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 20,
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons 
            name={isPortraitMode ? "phone-portrait" : "phone-landscape"} 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={attachmentStyles.container}>
      {attachment.is_blurred && !isUnlocked ? (
        <BlurredFileContent 
          onUnlock={handleUnlock}
          price={parseFloat(attachment.price || '0')}
          title={attachment.title || 'Paid File'}
        />
      ) : (
        <UnlockedFileContent 
          title={attachment.title || 'Paid File'}
          fileUri={attachment.local_file_uri || attachment.image_url || ''}
        />
      )}

      {/* Payment Modal */}
      <PaidContentPaymentModal
        visible={showPaymentModal}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        amount={parseFloat(attachment?.price || '5.99')}
        contentTitle={attachment?.title || 'Premium File'}
        contentId={attachment?.paid_content_id || attachment?.file_id || attachment?.content_id}
        creatorId={messageSender?.id}
        creatorName={messageSender?.name}
        imageUrl={attachment?.image_url}
        contentType="file"
      />
    </View>
  );
};

export default function ChatScreen() {
  const { channelId, creatorName, chatType } = useLocalSearchParams();
  const { user, isStreamConnected } = useGlobalContext();
  const [groupChannel, setGroupChannel] = useState<any>(null);
  const [dmChannel, setDmChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChatType, setCurrentChatType] = useState(chatType || 'group');
  const [creatorThumbnail, setCreatorThumbnail] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(getTheme());
  const router = useRouter();
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Get the current active channel based on chat type
  const currentChannel = currentChatType === 'group' ? groupChannel : dmChannel;

  // Handle long press on message
  const handleLongPressMessage = (payload: any) => {
    if (payload.message) {
      setSelectedMessage(payload.message);
      setShowCustomModal(true);
    }
  };

  // Handle thread reply
  const handleThreadReply = (message: any) => {
    setThread(message);
  };

  useEffect(() => {
    setTheme(getTheme());
  }, [colorScheme]);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      bounceAnim.stopAnimation();
      bounceAnim.setValue(0);
    }
  }, [loading]);

  // Function to fetch creator's thumbnail
  const fetchCreatorThumbnail = async () => {
    try {
      if (!creatorName) return;
      
      // Get creator ID from channel ID
      let creatorId = '';
      if (channelId?.toString().startsWith('creator-')) {
        creatorId = channelId.toString().replace('creator-', '');
      } else if (channelId?.toString().startsWith('dm-')) {
        creatorId = channelId.toString().replace('dm-', '').split('-')[0];
      }
      
      if (creatorId && config.endpoint && config.projectId && config.databaseId && config.photoCollectionId) {
        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query photos collection for the creator's thumbnail
        const photos = await databases.listDocuments(
          config.databaseId,
          config.photoCollectionId,
          [Query.equal('IdCreator', creatorId)]
        );
        
        if (photos.documents.length > 0) {
          const thumbnail = photos.documents[0].thumbnail;
          if (thumbnail) {
            setCreatorThumbnail(thumbnail);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching creator thumbnail:', error);
    }
  };

  useEffect(() => {
    fetchCreatorThumbnail();
  }, [creatorName, channelId]);

  // Setup both channels once
  useEffect(() => {
    const setupChannels = async () => {
      try {
        if (!channelId || !user) return;

        // Wait for Stream Chat connection if not connected yet
        if (!isStreamConnected) {
          console.log('Waiting for Stream Chat connection...');
          setLoading(true);
          return;
        }

        // Get creator ID from channel ID
        let creatorId = '';
        if (channelId?.toString().startsWith('creator-')) {
          creatorId = channelId.toString().replace('creator-', '');
        } else if (channelId?.toString().startsWith('dm-')) {
          creatorId = channelId.toString().replace('dm-', '').split('-')[0];
        }

        if (!creatorId) {
          setError('Invalid channel ID');
          setLoading(false);
          return;
        }

        console.log('💬 Setting up both channels for creator:', creatorId);

        // Setup group channel
        const groupChannelId = `creator-${creatorId}`;
        const groupChannel = client.channel('messaging', groupChannelId);
        
        try {
          await groupChannel.watch();
          if (!groupChannel.state.members[user.$id]) {
            await groupChannel.addMembers([user.$id]);
          }
          setGroupChannel(groupChannel);
          console.log('✅ Group channel setup successful:', {
            channelId: groupChannel.id,
            memberCount: Object.keys(groupChannel.state.members).length,
            members: Object.keys(groupChannel.state.members),
            messageCount: groupChannel.state.messages ? Object.keys(groupChannel.state.messages).length : 0
          });
        } catch (groupError) {
          console.error('Error setting up group channel:', groupError);
        }

        // Setup DM channel
        const dmChannelId = `dm-${creatorId}-${user.$id}`;
        const dmChannel = client.channel('messaging', dmChannelId);
        
        try {
          await dmChannel.watch();
          // Add both creator and user to DM channel
          const membersToAdd = [];
          if (!dmChannel.state.members[creatorId]) {
            membersToAdd.push(creatorId);
          }
          if (!dmChannel.state.members[user.$id]) {
            membersToAdd.push(user.$id);
          }
          
          if (membersToAdd.length > 0) {
            await dmChannel.addMembers(membersToAdd);
          }
          
          setDmChannel(dmChannel);
          console.log('✅ DM channel setup successful:', {
            channelId: dmChannel.id,
            memberCount: Object.keys(dmChannel.state.members).length,
            members: Object.keys(dmChannel.state.members)
          });
        } catch (dmError) {
          console.error('Error setting up DM channel:', dmError);
        }

        setError(null);
      } catch (error) {
        console.error('Error setting up channels:', error);
        setError('Failed to set up channels');
      } finally {
        setLoading(false);
      }
    };

    setupChannels();
  }, [channelId, user, isStreamConnected]);

  // Function to switch between chat types - no navigation needed
  const switchChatType = () => {
    const newChatType = currentChatType === 'group' ? 'direct' : 'group';
    setCurrentChatType(newChatType);
    console.log('🔄 Switched to:', newChatType, 'chat');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.Image
            source={loadingIcon}
            style={{ width: 60, height: 60, marginBottom: 16, transform: [{ translateY: bounceAnim }] }}
            resizeMode="contain"
          />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'questrial' }}>
            Loading chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentChannel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: 'questrial', textAlign: 'center', marginBottom: 16 }}>
            {error || 'Channel not found'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: '#FB2355',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'questrial' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <OverlayProvider>
        <Chat client={client} style={theme}>
          <Channel
            channel={currentChannel}
            keyboardVerticalOffset={0}
            thread={thread}
            threadList={!!thread}

                          onLongPressMessage={handleLongPressMessage}
              onPressMessage={({ message }) => {
                // Only open thread for non-poll messages
                // For poll messages, let the poll handle its own interactions
                if (message && !message.poll) {
                  setThread(message);
                }
              }}
              MessageSimple={CustomMessageSimple}
            MessageAvatar={CustomMessageAvatar}
            MessageStatus={CustomMessageStatus}
            ShowThreadMessageInChannelButton={() => null}
            supportedReactions={customReactions}
            messageActions={() => []} // Disable default message actions
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: '#1A1A1A',
              position: 'relative'
            }}>
              {/* Thread back button */}
              {thread && (
              <TouchableOpacity 
                  onPress={() => setThread(null)}
                style={{
                    position: 'absolute', 
                    left: 16,
                    zIndex: 10,
                    padding: 8
                }}
              >
                  <Ionicons name="chevron-back-outline" size={24} color="white" />
              </TouchableOpacity>
              )}
              
              {/* Cherrizbox Icon - Positioned absolutely on the left */}
              {!thread && (
              <View style={{
                  position: 'absolute',
                  left: 16,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Image 
                    source={require('../../assets/images/cherry-icon.png')}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      backgroundColor: 'white',
                    }}
                    resizeMode="contain"
                  />
                </View>
              )}
              
              {/* Centered Text */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Text style={{ 
                  fontSize: thread ? 18 : 40,
                  fontWeight: 'bold',
                  color: 'white', 
                  fontFamily: 'questrial'
                }}>
                  {thread ? 'Thread Reply' : 'Cherrizbox'}
                </Text>
                {!thread && (
                  <Text style={{ 
                    fontSize: 40,
                    fontWeight: 'bold',
                    color: '#FB2355',
                    fontFamily: 'questrial'
                  }}>
                    .
                  </Text>
                )}
              </View>
              
              {/* Creator's photo - Positioned absolutely on the right */}
              {!thread && (
                <View style={{
                  position: 'absolute',
                  right: 16,
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#2A2A2A',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {creatorThumbnail ? (
                    <Image
                      source={{ uri: creatorThumbnail }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
              <Text style={{ 
                      fontSize: 24,
                      fontWeight: 'bold',
                color: 'white', 
                fontFamily: 'questrial'
              }}>
                      {(creatorName as string)?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
                  )}
            </View>
              )}
            </View>
            
            {/* Chat Type Toggle - Only show when not in thread */}
            {!thread && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                paddingVertical: 16,
                backgroundColor: '#1A1A1A',
                borderBottomWidth: 1,
                borderBottomColor: '#2A2A2A'
              }}>
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: '#1A1A1A',
                  borderRadius: 25,
                  borderWidth: 1,
                  borderColor: '#fff',
                  width: '100%',
                  height: 40,
                  overflow: 'hidden',
                }}>
                  {/* Group Chat Button */}
                  <TouchableOpacity
                    onPress={() => currentChatType !== 'group' && switchChatType()}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      backgroundColor: currentChatType === 'group' ? '#fff' : 'transparent',
                      borderRadius: 25,
                      height: '100%',
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons 
                      name="people" 
                      size={16} 
                      color={currentChatType === 'group' ? '#18181b' : '#888'} 
                    />
                    <Text style={{
                      color: currentChatType === 'group' ? '#18181b' : '#888',
                      fontSize: 13,
                      fontFamily: 'questrial',
                      fontWeight: currentChatType === 'group' ? 'bold' : '500'
                    }}>
                      {creatorName}'s Box
                    </Text>
                  </TouchableOpacity>
                  {/* Direct Message Button */}
                  <TouchableOpacity
                    onPress={() => currentChatType !== 'direct' && switchChatType()}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      backgroundColor: currentChatType === 'direct' ? '#fff' : 'transparent',
                      borderRadius: 25,
                      height: '100%',
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons 
                      name="chatbubble-ellipses" 
                      size={16} 
                      color={currentChatType === 'direct' ? '#18181b' : '#888'} 
                    />
                    <Text style={{
                      color: currentChatType === 'direct' ? '#18181b' : '#888',
                      fontSize: 13,
                      fontFamily: 'questrial',
                      fontWeight: currentChatType === 'direct' ? 'bold' : '500'
                    }}>
                      One on One
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Conditional rendering based on thread state */}
            {thread ? (
              <Thread />
            ) : (
              <>
                <MessageList 
                  EmptyStateIndicator={() => (
                    <View style={{ flex: 1, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                      <Image
                        source={loadingIcon}
                        style={{ width: 60, height: 60, marginBottom: 18, opacity: 0.8 }}
                        resizeMode="contain"
                      />
                      <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'questrial', textAlign: 'center', opacity: 0.7 }}>
                        No messages yet. Start the conversation!
                      </Text>
                    </View>
                  )}
                  onThreadSelect={setThread}
                />
                <CustomMessageInput currentChatType={currentChatType as string} />
              </>
            )}

            {/* Custom Message Modal */}
            <CustomMessageModal
              visible={showCustomModal}
              onClose={() => setShowCustomModal(false)}
              message={selectedMessage}
              onThreadReply={handleThreadReply}
            />
          </Channel>
        </Chat>
      </OverlayProvider>
    </SafeAreaView>
  );
} 