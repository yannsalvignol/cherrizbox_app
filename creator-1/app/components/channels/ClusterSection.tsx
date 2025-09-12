import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { ClusterCard, type Cluster } from './ClusterCard';

interface ClusterSectionProps {
  clusters: Cluster[];
  isLoading: boolean;
  onAnswerForAll: (cluster: Cluster) => void;
  onAnswerOneByOne: (cluster: Cluster) => void;
  onViewAll?: () => void;
  maxDisplay?: number;
}

export const ClusterSection: React.FC<ClusterSectionProps> = ({
  clusters,
  isLoading,
  onAnswerForAll,
  onAnswerOneByOne,
  onViewAll,
  maxDisplay = 3
}) => {
  const { theme } = useTheme();
  
  // Filter only pending clusters for display
  const pendingClusters = clusters.filter(c => c.status === 'pending');
  const displayClusters = pendingClusters.slice(0, maxDisplay);
  const hasMore = pendingClusters.length > maxDisplay;
  
  // Calculate total fan count across all pending clusters
  const totalFans = React.useMemo(() => {
    return pendingClusters.reduce((sum, cluster) => {
      if (cluster.fanCount !== undefined) {
        return sum + cluster.fanCount;
      }
      // Fallback to parsing affected chats
      try {
        const chats = JSON.parse(cluster.affectedChats);
        return sum + (Array.isArray(chats) ? chats.length : 0);
      } catch {
        return sum;
      }
    }, 0);
  }, [pendingClusters]);

  if (isLoading) {
    return (
      <View style={{
        paddingVertical: 20,
        alignItems: 'center',
      }}>
        <ActivityIndicator size="small" color={theme.text} />
        <Text style={{
          color: theme.textTertiary,
          fontSize: 14,
          fontFamily: 'Urbanist-Regular',
          marginTop: 8,
        }}>
          Loading message clusters...
        </Text>
      </View>
    );
  }

  if (pendingClusters.length === 0) {
    return null; // Don't show section if no pending clusters
  }

  return (
    <View style={{
      backgroundColor: theme.backgroundTertiary,
      paddingBottom: 4,
    }}>
      {/* Section Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#000000',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}>
            <Ionicons name="layers-outline" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={{
              color: '#000000',
              fontSize: 15,
              fontWeight: 'bold',
              fontFamily: 'MuseoModerno-Regular',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              AI GROUPED QUESTIONS
            </Text>
            <Text style={{
              color: '#666666',
              fontSize: 13,
              fontFamily: 'Urbanist-Regular',
              marginTop: 2,
            }}>
              {pendingClusters.length} group{pendingClusters.length !== 1 ? 's' : ''} • {totalFans} fan{totalFans !== 1 ? 's' : ''} waiting
            </Text>
          </View>
        </View>

        {onViewAll && hasMore && (
          <TouchableOpacity 
            onPress={onViewAll}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: '#000000',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontFamily: 'Urbanist-Bold',
              marginRight: 4,
            }}>
              See All
            </Text>
            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Cluster Cards - Vertical List */}
      <View>
        {displayClusters.map((cluster) => (
          <ClusterCard
            key={cluster.$id}
            cluster={cluster}
            onAnswerForAll={onAnswerForAll}
            onAnswerOneByOne={onAnswerOneByOne}
          />
        ))}
      </View>

      {/* View More Indicator */}
      {hasMore && (
        <TouchableOpacity
          onPress={onViewAll}
          style={{
            alignItems: 'center',
            paddingVertical: 14,
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 12,
            borderRadius: 14,
            backgroundColor: '#F8F8F8',
            borderWidth: 2,
            borderColor: '#000000',
            borderStyle: 'dashed',
          }}
        >
          <Text style={{
            color: '#000000',
            fontSize: 14,
            fontFamily: 'Urbanist-Bold',
          }}>
            View {pendingClusters.length - maxDisplay} More Grouped Questions
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
