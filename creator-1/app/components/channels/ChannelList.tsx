import { type Channel } from '@/lib/index-utils';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  View
} from 'react-native';
import { ChannelItem } from './ChannelItem';

interface ChannelListProps {
  channels: Channel[];
  filteredChannels: Channel[];
  searchQuery: string;
  isLoading: boolean;
  refreshing: boolean;
  isLoadingMore: boolean;
  hasMoreChannels: boolean;
  channelsPerPage: number;
  currentUserId?: string;
  profileImage?: string | null;
  userName?: string;
  userCurrency: string;
  userProfileCache: React.MutableRefObject<Map<string, { 
    name: string; 
    avatar: string; 
    uncashedTipAmount: number; 
    documentId: string; 
    timestamp: number 
  }>>;
  onRefresh: () => void;
  onLoadMore: () => void;
  onChannelPress?: (channelId: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  filteredChannels,
  searchQuery,
  isLoading,
  refreshing,
  isLoadingMore,
  hasMoreChannels,
  channelsPerPage,
  currentUserId,
  profileImage,
  userName,
  userCurrency,
  userProfileCache,
  onRefresh,
  onLoadMore,
  onChannelPress
}) => {
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#DCDEDF'
      }}>
        <Image 
          source={require('../../../assets/icon/loading-icon.png')} 
          style={{ width: 80, height: 80, marginBottom: 16 }} 
        />
        <Text style={{ 
          color: 'black', 
          fontSize: 18, 
          marginTop: 12,
          fontFamily: 'Urbanist-Bold'
        }}>
          Loading channels...
        </Text>
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DCDEDF',
        paddingHorizontal: 32
      }}>
        <Ionicons name="chatbubbles-outline" size={80} color="#333333" style={{ marginBottom: 24 }} />
        <Text style={{ 
          color: '#888888', 
          fontSize: 20, 
          fontFamily: 'Urbanist-Bold',
          marginBottom: 8,
          textAlign: 'center'
        }}>
          No chats yet
        </Text>
        <Text style={{ 
          color: '#666666', 
          fontSize: 16, 
          fontFamily: 'Urbanist-Regular',
          textAlign: 'center',
          lineHeight: 24
        }}>
          Start chatting with your fans and subscribers to build your community
        </Text>
      </View>
    );
  }

  const data = searchQuery ? filteredChannels : channels;

  return (
    <FlatList
      data={data}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FB2355"
          colors={["#FB2355"]}
          progressBackgroundColor="#DCDEDF"
        />
      }
      renderItem={({ item, index }) => {
        const isGroupChat = item.id.startsWith('creator-');
        const isFirstDM = !isGroupChat && index > 0 && data[index - 1].id.startsWith('creator-');
        
        return (
          <View>
            {/* Section header for first DM */}
            {isFirstDM && !searchQuery && (
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 20,
                backgroundColor: '#DCDEDF',
                marginTop: 16,
              }}>
                <Text style={{
                  color: '#888888',
                  fontSize: 14,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  One-on-One Chats
                </Text>
              </View>
            )}
            
            {/* Group chat section header */}
            {isGroupChat && index === 0 && !searchQuery && (
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                backgroundColor: '#DCDEDF',
                marginBottom: 8,
              }}>
                <Text style={{
                  color: 'black',
                  fontSize: 14,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  My Box
                </Text>
              </View>
            )}
            
            <ChannelItem
              channel={item}
              currentUserId={currentUserId}
              profileImage={profileImage}
              userName={userName}
              userCurrency={userCurrency}
              userProfileCache={userProfileCache}
              onChannelPress={onChannelPress}
            />
          </View>
        );
      }}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ 
        paddingVertical: 6,
        backgroundColor: '#DCDEDF'
      }}
      style={{ backgroundColor: '#DCDEDF' }}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={10}
      initialNumToRender={15}
      getItemLayout={(data, index) => ({
        length: 80, // Approximate height of each item
        offset: 80 * index,
        index
      })}
      // Load more functionality
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={() => {
        if (isLoadingMore) {
          return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="black" />
              <Text style={{ color: '#888888', fontFamily: 'Urbanist-Regular', fontSize: 14, marginTop: 8 }}>
                Loading more chats...
              </Text>
            </View>
          );
        }
        if (!hasMoreChannels && channels.length >= channelsPerPage && !searchQuery) {
          return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#888888', fontFamily: 'Urbanist-Regular', fontSize: 14 }}>
                All chats loaded
              </Text>
            </View>
          );
        }
        return null;
      }}
      ListEmptyComponent={() => {
        if (searchQuery) {
          return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
              <Ionicons name="search" size={60} color="#333333" style={{ marginBottom: 16 }} />
              <Text style={{ color: '#888888', fontSize: 18, fontFamily: 'Urbanist-Bold', marginBottom: 8 }}>
                No results found
              </Text>
              <Text style={{ color: '#666666', fontSize: 14, fontFamily: 'Urbanist-Regular' }}>
                Try searching with a different term
              </Text>
            </View>
          );
        }
        return null;
      }}
    />
  );
};