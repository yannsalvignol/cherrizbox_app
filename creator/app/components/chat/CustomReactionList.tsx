import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useMessageContext } from 'stream-chat-react-native';

interface CustomReactionListProps {
  [key: string]: any;
}

const CustomReactionList: React.FC<CustomReactionListProps> = (props) => {
  const { message, handleReaction } = useMessageContext();
  const [showAllReactions, setShowAllReactions] = useState(false);
  
  if (!message?.latest_reactions || message.latest_reactions.length === 0) {
    return null;
  }

  // Group reactions by type
  const reactionCounts: Record<string, number> = {};
  const reactionEmojis: Record<string, string> = {
    love: '❤️',
    like: '👍',
    haha: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😡',
    fire: '🔥',
    '100': '💯',
    party: ' ',
    skull: '💀',
  };

  message.latest_reactions.forEach((reaction: any) => {
    if (reaction.type) {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] || 0) + 1;
    }
  });

  const reactionEntries = Object.entries(reactionCounts);
  const totalReactionTypes = reactionEntries.length;
  const shouldShowMore = totalReactionTypes > 4 && !showAllReactions;
  const visibleReactions = shouldShowMore ? reactionEntries.slice(0, 3) : reactionEntries;
  const hiddenCount = totalReactionTypes - 3;

  return (
    <View style={{
      position: 'absolute',
      top: -15,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      zIndex: 1000,
    }}>
      {visibleReactions.map(([type, count]) => (
        <TouchableOpacity
          key={type}
          onPress={() => handleReaction && handleReaction(type)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <Text style={{ fontSize: 14 }}>{reactionEmojis[type] || type}</Text>
          {count > 1 && (
            <Text style={{ 
              fontSize: 12, 
              marginLeft: 2,
              color: '#666',
              fontWeight: '600',
            }}>
              {count}
            </Text>
          )}
        </TouchableOpacity>
      ))}
      
      {shouldShowMore && (
        <TouchableOpacity
          onPress={() => setShowAllReactions(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <Text style={{ 
            fontSize: 14, 
            color: '#666',
            fontWeight: '600',
          }}>
            +{hiddenCount}
          </Text>
        </TouchableOpacity>
      )}
      
      {totalReactionTypes > 4 && showAllReactions && (
        <TouchableOpacity
          onPress={() => setShowAllReactions(false)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <Text style={{ 
            fontSize: 14, 
            color: '#666',
            fontWeight: '600',
          }}>
            −
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CustomReactionList;