import { useGlobalContext } from '@/lib/global-provider';
import { useTheme } from '@/lib/themes/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  id: string;
  name?: string;
  description?: string;
  options?: PollOption[];
  max_votes_allowed?: number;
  vote_counts_by_option?: Record<string, number>;
  vote_count?: number;
  own_votes?: Array<{ option_id?: string; id: string }>;
  is_closed?: boolean;
}

interface CustomPollComponentProps {
  message: any;
  poll: Poll;
  client: any;
}

export const CustomPollComponent: React.FC<CustomPollComponentProps> = ({ message, poll, client }) => {
  const { theme } = useTheme();
  const { user } = useGlobalContext();
  const [isVoting, setIsVoting] = useState(false);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [localVoteCounts, setLocalVoteCounts] = useState<Record<string, number>>({});
  const [localTotalVotes, setLocalTotalVotes] = useState(0);

  useEffect(() => {
    // Get user's current votes from the poll data
    if (poll?.own_votes) {
      const currentVotes = poll.own_votes
        .filter((vote) => vote.option_id !== undefined)
        .map((vote) => vote.option_id as string);
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
        const voteToRemove = poll.own_votes?.find((vote) => vote.option_id === optionId);
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
        const currentVotes = poll.own_votes
          .filter((vote) => vote.option_id !== undefined)
          .map((vote) => vote.option_id as string);
        setUserVotes(currentVotes);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const getTotalVotes = () => localTotalVotes;
  const getOptionVotes = (optionId: string) => localVoteCounts[optionId] || 0;
  const getVotePercentage = (optionId: string) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    const optionVotes = getOptionVotes(optionId);
    return Math.round((optionVotes / totalVotes) * 100);
  };
  const isVotedOption = (optionId: string) => userVotes.includes(optionId);

  return (
    <View style={{
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginVertical: 10,
      marginHorizontal: 50,
      marginLeft: 2,  // Move the entire poll component to the right
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.border,
    }}>
      {/* Poll Header */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={{
            backgroundColor: theme.primary,
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}>
            <Ionicons name="stats-chart" size={16} color={theme.textInverse} />
          </View>
          <Text style={{
            color: theme.text,
            fontSize: 18,
            fontWeight: '700',
            fontFamily: 'questrial',
            flex: 1,
          }}>
            {poll?.name || 'Quick Poll'}
          </Text>
        </View>
        
        {poll?.description && (
          <Text style={{
            color: theme.textSecondary,
            fontSize: 14,
            fontFamily: 'questrial',
            lineHeight: 20,
            marginLeft: 42,
          }}>
            {poll.description}
          </Text>
        )}
      </View>

      {/* Poll Options */}
      <View style={{ marginBottom: 16 }}>
        {poll?.options?.map((option, index) => {
          const isVoted = isVotedOption(option.id);
          const votes = getOptionVotes(option.id);
          const percentage = getVotePercentage(option.id);
          const totalVotes = getTotalVotes();

          return (
            <TouchableOpacity
              key={option.id || index}
              style={{
                backgroundColor: isVoted ? theme.backgroundSecondary : theme.background,
                borderRadius: 12,
                marginBottom: 10,
                overflow: 'hidden',
                borderWidth: isVoted ? 2 : 1,
                borderColor: isVoted ? theme.primary : theme.border,
                opacity: isVoting ? 0.6 : 1,
              }}
              onPress={() => handleVote(option.id)}
              disabled={isVoting || poll.is_closed}
              activeOpacity={0.7}
            >
              {/* Progress bar background */}
              {totalVotes > 0 && (
                <View style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${percentage}%`,
                  backgroundColor: isVoted ? theme.primary + '40' : theme.backgroundSecondary,
                }} />
              )}
              
              <View style={{
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {/* Radio/Checkbox indicator */}
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: poll.max_votes_allowed === 1 ? 11 : 4,
                    backgroundColor: isVoted ? theme.primary : 'transparent',
                    borderWidth: 2,
                    borderColor: isVoted ? theme.primary : theme.textSecondary,
                    marginRight: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isVoted && (
                      <Ionicons name="checkmark" size={14} color={theme.textInverse} />
                    )}
                  </View>

                  {/* Option text */}
                  <Text style={{
                    color: theme.text,
                    fontSize: 15,
                    fontFamily: 'questrial',
                    flex: 1,
                    fontWeight: isVoted ? '600' : '400',
                  }}>
                    {option.text}
                  </Text>
                </View>

                {/* Vote stats */}
                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={{
                    color: isVoted ? theme.text : theme.textSecondary,
                    fontSize: 14,
                    fontFamily: 'questrial',
                    fontWeight: '600',
                  }}>
                    {percentage}%
                  </Text>
                  <Text style={{
                    color: theme.textTertiary,
                    fontSize: 11,
                    fontFamily: 'questrial',
                    marginTop: 2,
                  }}>
                    {votes} {votes === 1 ? 'vote' : 'votes'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Poll Footer */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="people-outline" size={14} color={theme.textTertiary} />
          <Text style={{
            color: theme.textTertiary,
            fontSize: 12,
            fontFamily: 'questrial',
            marginLeft: 6,
          }}>
            {getTotalVotes()} total {getTotalVotes() === 1 ? 'vote' : 'votes'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            color: theme.textTertiary,
            fontSize: 12,
            fontFamily: 'questrial',
          }}>
            {message?.created_at ? new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }) : ''}
          </Text>
        </View>
      </View>

      {/* Poll status badge */}
      {poll.is_closed && (
        <View style={{
          backgroundColor: theme.backgroundSecondary,
          borderRadius: 8,
          padding: 8,
          marginTop: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.border,
        }}>
          <Ionicons name="lock-closed" size={12} color={theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={{
            color: theme.textSecondary,
            fontSize: 12,
            fontFamily: 'questrial',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            Poll Closed
          </Text>
        </View>
      )}
    </View>
  );
};