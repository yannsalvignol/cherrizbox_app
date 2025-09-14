import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export interface Cluster {
  $id: string;
  clusterId: string;
  proId: string;
  fanId: string;
  title: string;
  topic: string;
  representativeQuestions: string;
  affectedChats: string;
  status: 'pending' | 'answered' | 'processing';
  canonicalAnswer: string;
  fullMessage: string;
  $createdAt: string;
  $updatedAt: string;
  fanCount?: number; // Optional: aggregated count of unique fans
}

interface ClusterCardProps {
  cluster: Cluster;
  onAnswerForAll: (cluster: Cluster) => void;
  onAnswerOneByOne: (cluster: Cluster) => void;
}

export const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  onAnswerForAll,
  onAnswerOneByOne
}) => {
  const { theme } = useTheme();
  
  // Get fan count - use aggregated fanCount if available, otherwise parse affected chats
  const affectedChatsCount = React.useMemo(() => {
    // If we have an aggregated fanCount, use that
    if (cluster.fanCount !== undefined) {
      return cluster.fanCount;
    }
    // Otherwise fall back to parsing affected chats
    try {
      const chats = JSON.parse(cluster.affectedChats);
      return Array.isArray(chats) ? chats.length : 0;
    } catch {
      return 0;
    }
  }, [cluster.affectedChats, cluster.fanCount]);

  // Parse representative questions
  const questions = React.useMemo(() => {
    try {
      const parsed = JSON.parse(cluster.representativeQuestions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [cluster.representativeQuestions]);

  // Parse fan IDs to check if this is an aggregated cluster
  const isAggregated = React.useMemo(() => {
    return cluster.fanId && cluster.fanId.includes(',');
  }, [cluster.fanId]);

  const handleAnswerForAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAnswerForAll(cluster);
  };

  const handleAnswerOneByOne = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAnswerOneByOne(cluster);
  };

  return (
    <View style={{
      backgroundColor: theme.cardBackground,
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 16,
      padding: 20,
      borderWidth: 0,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    }}>
      {/* Header */}
      <View style={{
        marginBottom: 16,
      }}>
        {/* BOX AI Title */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <Text style={{
            color: theme.text,
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'MuseoModerno-Regular',
            letterSpacing: 1,
          }}>
            BOX AI
          </Text>
          {cluster.status === 'pending' && (
            <View style={{
              marginLeft: 8,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#FF4444',
              shadowColor: '#FF0000',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
            }} />
          )}
        </View>
        
        {/* Question Title */}
        <Text style={{
          color: theme.text,
          fontSize: 17,
          fontWeight: 'bold',
          fontFamily: 'Urbanist-Bold',
          marginBottom: 6,
          lineHeight: 22,
        }}>
          {cluster.title}
        </Text>
        
        {/* Fan Count */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            backgroundColor: theme.text,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            marginRight: 8,
          }}>
            <Text style={{
              color: theme.textInverse,
              fontSize: 12,
              fontWeight: 'bold',
              fontFamily: 'Urbanist-Bold',
            }}>
              {affectedChatsCount} {affectedChatsCount === 1 ? 'FAN' : 'FANS'}
            </Text>
          </View>
          <Text style={{
            color: theme.textSecondary,
            fontSize: 13,
            fontFamily: 'Urbanist-Regular',
          }}>
            asking{isAggregated ? ' similar questions' : ''}
          </Text>
        </View>
      </View>

      {/* Sample Questions */}
      {questions.length > 0 && (
        <View style={{
          backgroundColor: theme.backgroundSecondary,
          borderRadius: 12,
          padding: 14,
          marginBottom: 18,
        }}>
          <Text style={{
            color: theme.textTertiary,
            fontSize: 11,
            fontFamily: 'Urbanist-Bold',
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            Sample Questions
          </Text>
          {questions.slice(0, 2).map((question, index) => (
            <View key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
              <Text style={{
                color: theme.textTertiary,
                fontSize: 13,
                fontFamily: 'Urbanist-Regular',
                marginRight: 8,
              }}>
                •
              </Text>
              <Text style={{
                color: theme.text,
                fontSize: 14,
                fontFamily: 'Urbanist-Regular',
                flex: 1,
                lineHeight: 18,
              }}>
                {question}
              </Text>
            </View>
          ))}
          {questions.length > 2 && (
            <Text style={{
              color: theme.textTertiary,
              fontSize: 12,
              fontFamily: 'Urbanist-Regular',
              fontStyle: 'italic',
              marginTop: 6,
            }}>
              +{questions.length - 2} more questions...
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{
        flexDirection: 'row',
        gap: 12,
      }}>
        <TouchableOpacity
          onPress={handleAnswerForAll}
          style={{
            flex: 1,
            backgroundColor: theme.text,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            // Black aura effect
            shadowColor: theme.text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="flash-outline" size={20} color={theme.textInverse} style={{ marginRight: 8 }} />
          <Text style={{
            color: theme.textInverse,
            fontSize: 15,
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold',
          }}>
            Answer for All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAnswerOneByOne}
          style={{
            flex: 1,
            backgroundColor: theme.cardBackground,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            borderWidth: 0,
            // Black aura effect
            shadowColor: theme.text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="chatbox-outline" size={20} color={theme.text} style={{ marginRight: 8 }} />
          <Text style={{
            color: theme.text,
            fontSize: 15,
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold',
          }}>
            One by One
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};
