import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import type { Cluster } from '../channels/ClusterCard';

interface OneByOneModalProps {
  visible: boolean;
  cluster: Cluster | null;
  onClose: () => void;
  onChatAnswered?: () => void; // Callback to refresh clusters after answering
  currentUserId?: string;
  userProfileCache?: React.MutableRefObject<Map<string, { 
    name: string; 
    avatar: string; 
    documentId: string; 
    timestamp: number 
  }>>;
}

interface AffectedChat {
  chatId: string;
  fanId: string;
  fanName?: string;
  fanAvatar?: string;
}

export const OneByOneModal: React.FC<OneByOneModalProps> = ({
  visible,
  cluster,
  onClose,
  onChatAnswered,
  currentUserId,
  userProfileCache
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [affectedChats, setAffectedChats] = useState<AffectedChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cluster && visible) {
      loadAffectedChats();
    }
  }, [cluster, visible]);

  const loadAffectedChats = async () => {
    if (!cluster) return;
    
    setIsLoading(true);
    try {
      // Parse affected chats from cluster
      const chatIds = JSON.parse(cluster.affectedChats) as string[];
      console.log('📋 [OneByOne] Loading affected chats:', chatIds);
      
      // Parse fan IDs from cluster (comma-separated if aggregated)
      const fanIds = cluster.fanId.split(',').map(id => id.trim());
      
      // Create chat objects
      const chats: AffectedChat[] = chatIds.map((chatId, index) => {
        // Extract fan ID from chat ID (format: dm-proId-fanId)
        const parts = chatId.split('-');
        const fanIdFromChat = parts[2] || fanIds[index] || '';
        
        // Get cached user info if available
        const cachedInfo = userProfileCache?.current.get(fanIdFromChat);
        
        return {
          chatId,
          fanId: fanIdFromChat,
          fanName: cachedInfo?.name || `Fan ${index + 1}`,
          fanAvatar: cachedInfo?.avatar || ''
        };
      });
      
      setAffectedChats(chats);
      
      // If we don't have cached info, fetch it
      if (chats.some(chat => !chat.fanName || chat.fanName.startsWith('Fan '))) {
        await fetchFanProfiles(chats);
      }
      
    } catch (error) {
      console.error('❌ [OneByOne] Error loading affected chats:', error);
      setAffectedChats([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFanProfiles = async (chats: AffectedChat[]) => {
    try {
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Get unique fan IDs that need fetching
      const fanIdsToFetch = [...new Set(chats.map(c => c.fanId))].filter(id => id);
      
      if (fanIdsToFetch.length === 0) return;
      
      console.log('🔍 [OneByOne] Fetching fan profiles for:', fanIdsToFetch);
      
      const userResponse = await databases.listDocuments(
        config.databaseId,
        process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
        [Query.equal('accountId', fanIdsToFetch), Query.limit(100)]
      );
      
      // Create a map for quick lookup
      const userMap = new Map<string, any>();
      userResponse.documents.forEach(doc => {
        userMap.set(doc.accountId, doc);
      });
      
      // Update chats with fetched info
      const updatedChats = chats.map(chat => {
        const userData = userMap.get(chat.fanId);
        if (userData) {
          // Update cache if we have it
          if (userProfileCache?.current) {
            userProfileCache.current.set(chat.fanId, {
              name: userData.username || userData.accountId,
              avatar: userData.profileImageUri || userData.avatar || '',
              documentId: userData.$id,
              timestamp: Date.now()
            });
          }
          
          return {
            ...chat,
            fanName: userData.username || userData.accountId,
            fanAvatar: userData.profileImageUri || userData.avatar || ''
          };
        }
        return chat;
      });
      
      setAffectedChats(updatedChats);
      console.log('✅ [OneByOne] Updated chats with fan profiles');
      
    } catch (error) {
      console.error('❌ [OneByOne] Error fetching fan profiles:', error);
    }
  };

  const handleChatPress = async (chat: AffectedChat) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Update cluster status to answered
    await updateClusterStatus(chat.fanId);
    
    onClose();
    // Navigate to the chat
    router.push(`/chat/${chat.chatId}` as any);
  };

  const updateClusterStatus = async (fanId: string) => {
    if (!cluster) return;
    
    try {
      console.log('🔄 [OneByOne] Updating cluster status for fan:', fanId);
      
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Find the specific cluster document for this fan
      const clusterDocs = await databases.listDocuments(
        config.databaseId,
        'clusters',
        [
          Query.equal('clusterId', cluster.clusterId),
          Query.equal('fanId', fanId),
          Query.limit(1)
        ]
      );
      
      if (clusterDocs.documents.length > 0) {
        const clusterDoc = clusterDocs.documents[0];
        
        // Update the status to answered
        await databases.updateDocument(
          config.databaseId,
          'clusters',
          clusterDoc.$id,
          {
            status: 'answered',
            answeredAt: new Date().toISOString()
          }
        );
        
        console.log('✅ [OneByOne] Cluster status updated to answered');
        
        // Call the callback to refresh clusters in the parent
        onChatAnswered?.();
      } else {
        console.warn('⚠️ [OneByOne] No cluster document found for fan:', fanId);
      }
    } catch (error) {
      console.error('❌ [OneByOne] Error updating cluster status:', error);
      // Don't block navigation even if update fails
    }
  };

  const renderChatItem = ({ item }: { item: AffectedChat }) => (
    <TouchableOpacity
      onPress={() => handleChatPress(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.cardBackground,
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Avatar */}
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        {item.fanAvatar ? (
          <Image
            source={{ uri: item.fanAvatar }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{
            color: theme.textSecondary,
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold',
          }}>
            {item.fanName?.[0]?.toUpperCase() || 'F'}
          </Text>
        )}
      </View>

      {/* Fan Info */}
      <View style={{ flex: 1 }}>
        <Text style={{
          color: theme.text,
          fontSize: 16,
          fontWeight: 'bold',
          fontFamily: 'Urbanist-Bold',
          marginBottom: 4,
        }}>
          {item.fanName}
        </Text>
        <Text style={{
          color: theme.textSecondary,
          fontSize: 13,
          fontFamily: 'Urbanist-Regular',
        }}>
          Tap to answer this fan's question
        </Text>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  if (!cluster) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
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
            onPress={onClose}
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
              ANSWER ONE BY ONE
            </Text>
            <Text style={{
              color: theme.textSecondary,
              fontSize: 13,
              fontFamily: 'Urbanist-Regular',
              textAlign: 'center',
              marginTop: 2,
            }}>
              {affectedChats.length} {affectedChats.length === 1 ? 'fan' : 'fans'} to respond to
            </Text>
          </View>

          <View style={{ width: 24 }} />
        </View>

        {/* Question Title */}
        <View style={{
          backgroundColor: theme.cardBackground,
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 8,
          padding: 16,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: theme.text,
        }}>
          <Text style={{
            color: theme.textTertiary,
            fontSize: 11,
            fontFamily: 'Urbanist-Bold',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
            Question Being Asked
          </Text>
          <Text style={{
            color: theme.text,
            fontSize: 16,
            fontFamily: 'Urbanist-Bold',
            lineHeight: 22,
          }}>
            {cluster.title}
          </Text>
        </View>

        {/* Chat List */}
        {isLoading ? (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ActivityIndicator size="large" color={theme.text} />
            <Text style={{
              color: theme.textSecondary,
              fontSize: 14,
              fontFamily: 'Urbanist-Regular',
              marginTop: 12,
            }}>
              Loading fans...
            </Text>
          </View>
        ) : (
          <FlatList
            data={affectedChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.chatId}
            contentContainerStyle={{
              paddingVertical: 12,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 100,
              }}>
                <Ionicons name="people-outline" size={60} color={theme.textTertiary} />
                <Text style={{
                  color: theme.textSecondary,
                  fontSize: 16,
                  fontFamily: 'Urbanist-Regular',
                  marginTop: 16,
                }}>
                  No fans found
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};
