import { ClusterCard, type Cluster } from '@/app/components/channels/ClusterCard';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface AllClustersModalProps {
  visible: boolean;
  clusters: Cluster[];
  isLoading: boolean;
  onClose: () => void;
  onAnswerForAll: (cluster: Cluster) => void;
  onAnswerOneByOne: (cluster: Cluster) => void;
}

export const AllClustersModal: React.FC<AllClustersModalProps> = ({
  visible,
  clusters,
  isLoading,
  onClose,
  onAnswerForAll,
  onAnswerOneByOne
}) => {
  const { theme } = useTheme();
  
  // Cache for parsed JSON to avoid repeated parsing
  const parsedCache = useRef<Map<string, string[]>>(new Map());
  
  // Helper function to get parsed chats with caching
  const getParsedChats = (cluster: Cluster): string[] => {
    const cacheKey = cluster.$id;
    if (parsedCache.current.has(cacheKey)) {
      return parsedCache.current.get(cacheKey)!;
    }
    
    try {
      const parsed = JSON.parse(cluster.affectedChats);
      const result = Array.isArray(parsed) ? parsed : [];
      parsedCache.current.set(cacheKey, result);
      return result;
    } catch {
      parsedCache.current.set(cacheKey, []);
      return [];
    }
  };
  
  // Filter and sort pending clusters by fan count (highest first)
  const pendingClusters = useMemo(() => {
    return clusters
      .filter(c => c.status === 'pending')
      .sort((a, b) => {
        // Use pre-calculated fanCount if available, otherwise calculate once
        const aCount = a.fanCount !== undefined ? a.fanCount : getParsedChats(a).length;
        const bCount = b.fanCount !== undefined ? b.fanCount : getParsedChats(b).length;
        
        // Sort in descending order (highest fan count first)
        return bCount - aCount;
      });
  }, [clusters]);
  
  // Calculate total fan count across all pending clusters
  const totalFans = useMemo(() => {
    return pendingClusters.reduce((sum, cluster) => {
      // Use pre-calculated fanCount or cached parsed value
      const count = cluster.fanCount !== undefined 
        ? cluster.fanCount 
        : getParsedChats(cluster).length;
      return sum + count;
    }, 0);
  }, [pendingClusters]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: theme.backgroundTertiary,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity 
              onPress={onClose}
              style={{
                padding: 8,
                marginRight: 8,
              }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.text,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="layers-outline" size={20} color={theme.textInverse} />
            </View>
            
            <View style={{ flex: 1 }}>
              <Text style={{
                color: theme.text,
                fontSize: 18,
                fontFamily: 'MuseoModerno-Regular',
                textTransform: 'uppercase',
              }}>
                All Grouped Questions
              </Text>
              <Text style={{
                color: theme.textSecondary,
                fontSize: 13,
                fontFamily: 'Urbanist-Regular',
                marginTop: 2,
              }}>
                {pendingClusters.length} group{pendingClusters.length !== 1 ? 's' : ''} • {totalFans} fan{totalFans !== 1 ? 's' : ''} waiting
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ActivityIndicator size="large" color={theme.text} />
            <Text style={{
              color: theme.textTertiary,
              fontSize: 14,
              fontFamily: 'Urbanist-Regular',
              marginTop: 12,
            }}>
              Loading clusters...
            </Text>
          </View>
        ) : pendingClusters.length === 0 ? (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.backgroundSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.textTertiary} />
            </View>
            <Text style={{
              color: theme.text,
              fontSize: 20,
              fontFamily: 'Urbanist-Bold',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              All Caught Up!
            </Text>
            <Text style={{
              color: theme.textSecondary,
              fontSize: 14,
              fontFamily: 'Urbanist-Regular',
              textAlign: 'center',
              lineHeight: 20,
            }}>
              You've answered all grouped questions. New questions will appear here when fans ask similar things.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pendingClusters}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
              <ClusterCard
                cluster={item}
                onAnswerForAll={(cluster) => {
                  onAnswerForAll(cluster);
                  onClose(); // Close this modal when action is taken
                }}
                onAnswerOneByOne={(cluster) => {
                  onAnswerOneByOne(cluster);
                  onClose(); // Close this modal when action is taken
                }}
              />
            )}
            contentContainerStyle={{
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
            refreshing={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};
