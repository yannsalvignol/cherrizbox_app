import { getUserByAccountId, getUserProfile } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { client, connectUser } from '@/lib/stream-chat';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Channel {
  id: string;
  type: string;
  lastMessage?: string;
  lastMessageAt?: string;
  memberCount: number;
  members: string[];
  name?: string;
  image?: string;
  memberNames?: { [userId: string]: string };
  memberAvatars?: { [userId: string]: string };
}

interface Subscription {
    $id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'cancelled';
  billingCycleAnchor: string;
  createdAt: string;
  creatorAccountId: string;
  endsAt: string | null;
  planCurrency: string;
  planInterval: 'month' | 'year';
  renewalDate: string;
  cancelledAt: string | null;
  planAmount: number;
}

interface EarningsData {
  totalEarnings: number;
  perceivedEarnings: number;
  monthlyData: { month: string; earnings: number }[];
  activeSubscriptions: number;
  cancelledSubscriptions: number;
}

export default function Index() {
    const router = useRouter();
    const { user } = useGlobalContext();
  const [channels, setChannels] = useState<Channel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState('chats');
    const [earningsData, setEarningsData] = useState<EarningsData>({
      totalEarnings: 0,
      perceivedEarnings: 0,
      monthlyData: [],
      activeSubscriptions: 0,
      cancelledSubscriptions: 0
    });
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

    const tabs = [
      { id: 'chats', label: 'Chats' },
      { id: 'earnings', label: 'Earnings' },
      { id: 'insights', label: 'Insights' },
      { id: 'audience', label: 'Audience' },
      { id: 'other', label: 'Other' }
    ];

  const loadChannels = async () => {
    if (!user?.$id) return;

    try {
      setIsLoading(true);
      
      // Connect user to Stream Chat
      await connectUser(user.$id);
      
      // Query channels where the current user is a member
      const filter = { members: { $in: [user.$id] } };
      const sort = [{ last_message_at: -1 }];
      
      const response = await client.queryChannels(filter, sort, {
        limit: 50,
        offset: 0,
      });

      // Transform channels to our format
      const transformedChannels = response.map(channel => ({
        id: channel.id || '',
        type: channel.type,
        lastMessage: (channel.state as any).last_message?.text || '',
        lastMessageAt: channel.state.last_message_at?.toISOString() || '',
        memberCount: Object.keys(channel.state.members || {}).length,
        members: Object.keys(channel.state.members || {}),
        name: (channel.data as any)?.name || '',
        image: (channel.data as any)?.image || '',
        memberNames: (channel.data as any)?.memberNames || {},
        memberAvatars: (channel.data as any)?.memberAvatars || {},
      }));

      // Fetch user names for DM channels
      const channelsWithNames = await Promise.all(
        transformedChannels.map(async (channel) => {
          if (channel.id.startsWith('dm-')) {
            const memberNames: { [userId: string]: string } = {};
            const memberAvatars: { [userId: string]: string } = {};
            
            // For DM channels, we want to get the OTHER person's name, not the current user
            const otherMembers = channel.members.filter(memberId => memberId !== user?.$id);
            
            // Fetch names for the other members in the DM (not the current user)
            for (const memberId of otherMembers) {
              try {
                const userData = await getUserByAccountId(memberId);
                if (userData) {
                  memberNames[memberId] = userData.username || memberId;
                  memberAvatars[memberId] = userData.avatar || '';
                  console.log(`✅ Found user data for ${memberId}: ${userData.username} with avatar: ${userData.avatar}`);
            } else {
                  memberNames[memberId] = memberId; // Fallback to ID if user not found
                  memberAvatars[memberId] = ''; // No avatar
                  console.log(`❌ No user data found for ${memberId}`);
                }
              } catch (error) {
                console.error('Error fetching user name for:', memberId, error);
                memberNames[memberId] = memberId; // Fallback to ID
                memberAvatars[memberId] = ''; // No avatar
              }
            }
            
            return { ...channel, memberNames, memberAvatars };
          }
          return channel;
        })
      );

      // Sort channels: group chat first, then by last message time
      const sortedChannels = channelsWithNames.sort((a, b) => {
        // Group chat (creator channel) first
        if (a.id.startsWith('creator-') && !b.id.startsWith('creator-')) return -1;
        if (!a.id.startsWith('creator-') && b.id.startsWith('creator-')) return 1;
        
        // Then by last message time (newest first)
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        
        return 0;
      });

      // Deduplicate DM channels that have the same members
      const uniqueChannels = sortedChannels.filter((channel, index, array) => {
        if (!channel.id.startsWith('dm-')) return true; // Keep non-DM channels
        
        // For DM channels, check if we already have a channel with the same members
        const currentMembers = channel.members.sort();
        const hasDuplicate = array.slice(0, index).some(prevChannel => {
          if (!prevChannel.id.startsWith('dm-')) return false;
          const prevMembers = prevChannel.members.sort();
          return JSON.stringify(currentMembers) === JSON.stringify(prevMembers);
        });
        
        return !hasDuplicate;
      });

      // Separate group chats and DMs
      const groupChats = uniqueChannels.filter(channel => channel.id.startsWith('creator-'));
      const dmChannels = uniqueChannels.filter(channel => channel.id.startsWith('dm-'));

      setChannels(uniqueChannels);
      console.log(`📋 Loaded ${uniqueChannels.length} unique channels`);
      console.log(`👥 Group chats: ${groupChats.length}`);
      console.log(`💬 DM channels: ${dmChannels.length}`);
      uniqueChannels.forEach(channel => {
        console.log(`📝 Channel: ${channel.id} (${channel.memberCount} members)`);
      });
        } catch (error) {
      console.error('Error loading channels:', error);
        } finally {
            setIsLoading(false);
        }
    };

  const loadProfileImage = async () => {
    if (!user?.$id) return;

    try {
      const profile = await getUserProfile(user.$id);
      if (profile && profile.profileImageUri) {
        setProfileImage(profile.profileImageUri);
        console.log('✅ Loaded profile image:', profile.profileImageUri);
        } else {
        console.log('❌ No profile image found');
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const loadEarningsData = async () => {
    if (!user?.$id) return;

    try {
      setIsLoadingEarnings(true);
      
      // Import the databases and config from appwrite
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Fetch active subscriptions for this creator
      const activeSubscriptions = await databases.listDocuments(
        config.databaseId,
        config.activeSubscriptionsCollectionId,
        [Query.equal('creatorAccountId', user.$id)]
      );

      const subscriptions: Subscription[] = activeSubscriptions.documents.map(doc => ({
        $id: doc.$id,
        userId: doc.userId,
        stripeCustomerId: doc.stripeCustomerId,
        stripeSubscriptionId: doc.stripeSubscriptionId,
        status: doc.status,
        billingCycleAnchor: doc.billingCycleAnchor,
        createdAt: doc.createdAt,
        creatorAccountId: doc.creatorAccountId,
        endsAt: doc.endsAt,
        planCurrency: doc.planCurrency,
        planInterval: doc.planInterval,
        renewalDate: doc.renewalDate,
        cancelledAt: doc.cancelledAt,
        planAmount: doc.planAmount
      }));

      // Calculate earnings
      let totalEarnings = 0;
      let activeCount = 0;
      let cancelledCount = 0;
      const monthlyEarnings: { [key: string]: number } = {};

      subscriptions.forEach(sub => {
        if (sub.status === 'active') {
          totalEarnings += sub.planAmount;
          activeCount++;
        } else if (sub.status === 'cancelled' && sub.endsAt) {
          // For cancelled subscriptions, only count earnings until endsAt
          const endsAt = new Date(sub.endsAt);
          const now = new Date();
          if (endsAt > now) {
            totalEarnings += sub.planAmount;
          }
          cancelledCount++;
        }

        // Group by month for chart data
        const date = new Date(sub.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + sub.planAmount;
      });

      // Convert monthly data to array format for chart
      const monthlyData = Object.entries(monthlyEarnings)
        .map(([month, earnings]) => ({
          month,
          earnings
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Calculate perceived earnings (after 20% platform commission and 10% Stripe fee)
      const platformCommission = 0.20; // 20%
      const stripeFee = 0.10; // 10%
      const totalFees = platformCommission + stripeFee;
      const perceivedEarnings = totalEarnings * (1 - totalFees);

      setEarningsData({
        totalEarnings,
        perceivedEarnings,
        monthlyData,
        activeSubscriptions: activeCount,
        cancelledSubscriptions: cancelledCount
      });

      console.log('✅ Loaded earnings data:', {
        totalEarnings,
        perceivedEarnings,
        activeSubscriptions: activeCount,
        cancelledSubscriptions: cancelledCount
      });

        } catch (error) {  
      console.error('Error loading earnings data:', error);
        } finally {
      setIsLoadingEarnings(false);
    }
  };

  const getChannelDisplayName = (channel: Channel) => {
    if (channel.name) return channel.name;
    
    // For DM channels, show the other person's name
    if (channel.id.startsWith('dm-') && channel.members.length > 0) {
      const otherMembers = channel.members.filter(memberId => memberId !== user?.$id);
      if (otherMembers.length > 0) {
        const otherMemberId = otherMembers[0];
        const otherMemberName = channel.memberNames?.[otherMemberId];
        const displayName = otherMemberName ? `Chat with ${otherMemberName}` : `Chat with ${otherMemberId}`;
        console.log(`📱 Channel ${channel.id}: ${displayName}`);
        return displayName;
      }
    }
    
    // For creator channels
    if (channel.id.startsWith('creator-')) {
      return 'My Box';
    }
    
    return 'Unnamed Channel';
  };

  const getChannelAvatar = (channel: Channel) => {
    if (channel.image) return channel.image;
    
    // For DM channels, show the other person's avatar
    if (channel.id.startsWith('dm-') && channel.members.length > 0) {
      const otherMembers = channel.members.filter(memberId => memberId !== user?.$id);
      if (otherMembers.length > 0) {
        const otherMemberId = otherMembers[0];
        const otherMemberAvatar = channel.memberAvatars?.[otherMemberId];
        if (otherMemberAvatar) {
          return otherMemberAvatar; // Return the avatar URL
        }
        // Fallback to first letter of username or ID
        const otherMemberName = channel.memberNames?.[otherMemberId];
        return otherMemberName ? otherMemberName[0]?.toUpperCase() : otherMemberId[0]?.toUpperCase() || 'U';
      }
    }
    
    // For creator channels, show user's profile image or first letter
    if (channel.id.startsWith('creator-')) {
      return profileImage || user?.name?.[0]?.toUpperCase() || 'U';
    }
    
    return 'C';
  };

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const renderChannelItem = ({ item }: { item: Channel }) => {
    const displayName = getChannelDisplayName(item);
    const avatar = getChannelAvatar(item);
    const isDM = item.id.startsWith('dm-');
    const isGroupChat = item.id.startsWith('creator-');
    
    return (
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: isGroupChat ? 16 : 12,
          backgroundColor: isGroupChat ? '#2A1A2A' : '#1A1A1A',
          marginHorizontal: 16,
          marginVertical: isGroupChat ? 4 : 2,
          borderRadius: isGroupChat ? 16 : 8,
          borderWidth: isGroupChat ? 2 : 1,
          borderColor: isGroupChat ? '#FB2355' : '#333333',
          shadowColor: isGroupChat ? '#FB2355' : 'transparent',
          shadowOffset: isGroupChat ? { width: 0, height: 2 } : { width: 0, height: 0 },
          shadowOpacity: isGroupChat ? 0.3 : 0,
          shadowRadius: isGroupChat ? 8 : 0,
          elevation: isGroupChat ? 8 : 0,
        }}
        onPress={() => {
          router.push(`/chat/${item.id}` as any);
        }}
      >
        {/* Avatar */}
        <View style={{
          width: isGroupChat ? 48 : 40,
          height: isGroupChat ? 48 : 40,
          borderRadius: isGroupChat ? 24 : 20,
          backgroundColor: isGroupChat ? '#FB2355' : '#FB2355',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: isGroupChat ? 14 : 10,
          borderWidth: isGroupChat ? 2 : 0,
          borderColor: isGroupChat ? '#FFD700' : 'transparent',
        }}>
          {item.image || (avatar && avatar.startsWith('http')) ? (
            <Image
              source={{ uri: item.image || avatar }}
              style={{ 
                width: isGroupChat ? 48 : 40, 
                height: isGroupChat ? 48 : 40, 
                borderRadius: isGroupChat ? 24 : 20 
              }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ 
              color: 'white', 
              fontSize: isGroupChat ? 18 : 16, 
              fontWeight: 'bold',
              fontFamily: 'Urbanist-Bold'
            }}>
              {avatar}
            </Text>
          )}
        </View>

        {/* Channel Info */}
        <View style={{ flex: 1 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: isGroupChat ? 4 : 2 
          }}>
            <Text style={{ 
              color: 'white', 
              fontSize: isGroupChat ? 18 : 16, 
              fontWeight: 'bold',
              fontFamily: 'Urbanist-Bold',
              marginRight: isGroupChat ? 8 : 0,
            }}>
              {displayName}
            </Text>
          </View>
          
          <Text style={{ 
            color: isGroupChat ? '#CCCCCC' : '#888888', 
            fontSize: isGroupChat ? 14 : 13,
            fontFamily: 'Urbanist-Regular',
          }}>
            {item.lastMessage || 'No messages yet'}
          </Text>
          
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginTop: isGroupChat ? 4 : 2 
          }}>
            {!isDM && (
              <Text style={{ 
                color: isGroupChat ? '#FFD700' : '#666666', 
                fontSize: isGroupChat ? 12 : 11,
                fontFamily: 'Urbanist-Regular',
                fontWeight: isGroupChat ? 'bold' : 'normal',
              }}>
                {item.memberCount} member{item.memberCount !== 1 ? 's' : ''}
              </Text>
            )}
            
            {item.lastMessageAt && (
              <Text style={{ 
                color: isGroupChat ? '#FFD700' : '#666666', 
                fontSize: isGroupChat ? 12 : 11,
                fontFamily: 'Urbanist-Regular',
                marginLeft: isDM ? 0 : 8,
                fontWeight: isGroupChat ? 'bold' : 'normal',
              }}>
                {formatLastMessageTime(item.lastMessageAt)}
              </Text>
            )}
            
            {isGroupChat && (
              <View style={{
                width: 8,
                height: 8,
                backgroundColor: '#FFD700',
                borderRadius: 4,
                marginLeft: 8,
              }} />
            )}
          </View>
        </View>

        {/* Arrow */}
        <View style={{
          width: isGroupChat ? 24 : 20,
          height: isGroupChat ? 24 : 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ 
            color: isGroupChat ? '#FFD700' : '#666666', 
            fontSize: isGroupChat ? 16 : 14 
          }}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    loadChannels();
    loadProfileImage();
    loadEarningsData();
  }, [user]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 bg-black">
                <Image 
                    source={require('../../../assets/images/cherry-icon.png')}
                    className="w-14 h-14"
                    resizeMode="contain"
                />
                
                <View className="flex-row items-center">
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{
                            fontSize: 38,
                            fontWeight: 'bold',
                            color: 'white',
                            fontFamily: 'questrial',
                            textAlign: 'center',
                        }}>
                            Cherrizbox
                            <Text style={{
                                color: '#FB2355',
                                fontSize: 38,
                                fontWeight: 'bold',
                                fontFamily: 'questrial',
                            }}>
                                .
                            </Text>
                        </Text>
                        <Text style={{
                            color: '#FB2355',
                            fontSize: 18,
                            fontFamily: 'questrial',
                            textAlign: 'center',
                            marginTop: -5,
                            letterSpacing: 2,
                        }}>
                            creator
                        </Text>
                    </View>
                </View>
                
        <TouchableOpacity onPress={() => router.push('/edit-profile')}>
                    <View className="w-14 h-14 rounded-full bg-[#1A1A1A] items-center justify-center overflow-hidden">
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <Text className="text-xl text-white font-bold">
                                {user?.name?.[0] || 'U'}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

      {/* Toggle Picker */}
      <View style={{
        backgroundColor: 'black',
        paddingVertical: 8,
      }}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 12,
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 25,
                backgroundColor: selectedTab === item.id ? 'white' : '#1A1A1A',
                borderWidth: 1,
                borderColor: selectedTab === item.id ? 'white' : '#333333',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 80,
              }}
              onPress={() => setSelectedTab(item.id)}
            >
              <Text style={{
                color: selectedTab === item.id ? 'black' : '#888888',
                fontSize: 14,
                fontWeight: selectedTab === item.id ? 'bold' : 'normal',
                fontFamily: selectedTab === item.id ? 'Urbanist-Bold' : 'Urbanist-Regular',
              }}>
                {item.label}
                    </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
                    
      {/* Content based on selected tab */}
      {selectedTab === 'chats' && (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
                    {isLoading ? (
            <View style={{ 
              flex: 1, 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'black'
            }}>
              <Image 
                source={require('../../../assets/images/cherry-icon.png')} 
                style={{ width: 60, height: 60, marginBottom: 16 }} 
              />
              <Text style={{ 
                color: '#FB2355', 
                fontSize: 18, 
                marginBottom: 12,
                fontFamily: 'Urbanist-Bold'
              }}>
                Loading channels...
              </Text>
                            <ActivityIndicator size="large" color="#FB2355" />
                        </View>
          ) : channels.length > 0 ? (
            <FlatList
              data={channels}
              renderItem={({ item, index }) => {
                const isGroupChat = item.id.startsWith('creator-');
                const isFirstDM = !isGroupChat && index > 0 && channels[index - 1].id.startsWith('creator-');
                
                return (
                  <View>
                    {/* Section header for first DM */}
                    {isFirstDM && (
                                            <View style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        backgroundColor: 'black',
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
                    {isGroupChat && index === 0 && (
                                            <View style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        backgroundColor: 'black',
                      }}>
                        <Text style={{
                          color: '#FFD700',
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
                    
                    {renderChannelItem({ item })}
                                        </View>
                );
              }}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingVertical: 16,
                backgroundColor: 'black'
              }}
              style={{ backgroundColor: 'black' }}
            />
          ) : (
            <View style={{ 
              flex: 1, 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'black',
              paddingHorizontal: 32
            }}>
                            <Image 
                                source={require('../../../assets/images/cherry-icon.png')} 
                                style={{ width: 80, height: 80, marginBottom: 16 }} 
                            />
                            <Text style={{ 
                                color: 'white', 
                                fontSize: 24, 
                                fontFamily: 'Urbanist-Bold',
                                marginBottom: 16,
                                textAlign: 'center'
                            }}>
                No channels yet 😢
                            </Text>
                            <Text style={{ 
                                color: 'white', 
                                fontSize: 18, 
                                textAlign: 'center',
                fontFamily: 'Urbanist-Regular'
              }}>
                Start a conversation or create your group chat to get started!
                            </Text>
                        </View>
                    )}
        </View>
      )}

      {/* Other tab content placeholders */}
      {selectedTab === 'earnings' && (
        <ScrollView style={{ flex: 1, backgroundColor: 'black' }} showsVerticalScrollIndicator={false}>
          {isLoadingEarnings ? (
            <View style={{ 
              flex: 1, 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'black',
              paddingVertical: 100
            }}>
              <ActivityIndicator size="large" color="#FB2355" />
              <Text style={{ 
                color: '#FB2355', 
                fontSize: 16, 
                marginTop: 16,
                fontFamily: 'Urbanist-Regular'
              }}>
                Loading earnings data...
              </Text>
            </View>
          ) : (
            <View style={{ padding: 20 }}>
              {/* Header */}
              <Text style={{
                color: 'white',
                fontSize: 28,
                fontWeight: 'bold',
                fontFamily: 'Urbanist-Bold',
                marginBottom: 24,
                textAlign: 'center'
              }}>
                Earnings Dashboard
              </Text>

              {/* Total Earnings Card */}
              <View style={{
                backgroundColor: '#1A1A1A',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#333333'
              }}>
                <Text style={{
                  color: '#888888',
                  fontSize: 14,
                  fontFamily: 'Urbanist-Regular',
                  marginBottom: 8
                }}>
                  Total Earnings
                </Text>
                <Text style={{
                  color: '#FFD700',
                  fontSize: 32,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold'
                }}>
                  ${earningsData.totalEarnings.toFixed(2)}
                </Text>
              </View>

              {/* Perceived Earnings Card */}
              <View style={{
                backgroundColor: '#1A1A1A',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#333333'
              }}>
                <Text style={{
                  color: '#888888',
                  fontSize: 14,
                  fontFamily: 'Urbanist-Regular',
                  marginBottom: 8
                }}>
                  Your Take (After Fees)
                </Text>
                <Text style={{
                  color: '#FB2355',
                  fontSize: 32,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold'
                }}>
                  ${earningsData.perceivedEarnings.toFixed(2)}
                </Text>
                <Text style={{
                  color: '#666666',
                  fontSize: 12,
                  fontFamily: 'Urbanist-Regular',
                  marginTop: 4
                }}>
                  After 20% platform + 10% Stripe fees
                </Text>
              </View>

              {/* Subscription Stats */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 20
              }}>
                <View style={{
                  backgroundColor: '#1A1A1A',
                  borderRadius: 12,
                  padding: 16,
                  flex: 1,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: '#333333'
                }}>
                  <Text style={{
                    color: '#888888',
                    fontSize: 12,
                    fontFamily: 'Urbanist-Regular',
                    marginBottom: 4
                  }}>
                    Active
                  </Text>
                  <Text style={{
                    color: '#4CAF50',
                    fontSize: 24,
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold'
                  }}>
                    {earningsData.activeSubscriptions}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: '#1A1A1A',
                  borderRadius: 12,
                  padding: 16,
                  flex: 1,
                  marginLeft: 8,
                  borderWidth: 1,
                  borderColor: '#333333'
                }}>
                  <Text style={{
                    color: '#888888',
                    fontSize: 12,
                    fontFamily: 'Urbanist-Regular',
                    marginBottom: 4
                  }}>
                    Cancelled
                  </Text>
                  <Text style={{
                    color: '#FF9800',
                    fontSize: 24,
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold'
                  }}>
                    {earningsData.cancelledSubscriptions}
                  </Text>
                </View>
              </View>

              {/* Earnings Chart */}
              {earningsData.monthlyData.length > 0 && (
                <View style={{
                  backgroundColor: '#1A1A1A',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#333333'
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 18,
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 16
                  }}>
                    Earnings Over Time
                  </Text>
                  <LineChart
                    data={{
                      labels: earningsData.monthlyData.map(item => {
                        const [year, month] = item.month.split('-');
                        return `${month}/${year.slice(2)}`;
                      }),
                      datasets: [{
                        data: earningsData.monthlyData.map(item => item.earnings)
                      }]
                    }}
                    width={Dimensions.get('window').width - 80}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#1A1A1A',
                      backgroundGradientFrom: '#1A1A1A',
                      backgroundGradientTo: '#1A1A1A',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(251, 35, 85, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      propsForDots: {
                        r: '6',
                        strokeWidth: '2',
                        stroke: '#FB2355'
                      }
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 16
                    }}
                  />
                </View>
              )}

              {/* No Data State */}
              {earningsData.monthlyData.length === 0 && (
                <View style={{
                  backgroundColor: '#1A1A1A',
                  borderRadius: 16,
                  padding: 40,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#333333'
                }}>
                  <Text style={{
                    color: '#888888',
                    fontSize: 16,
                    fontFamily: 'Urbanist-Regular',
                    textAlign: 'center'
                  }}>
                    No earnings data yet. Start building your audience to see your earnings here!
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {selectedTab === 'insights' && (
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'black',
          paddingHorizontal: 32
        }}>
          <Text style={{ 
            color: 'white', 
            fontSize: 24, 
            fontFamily: 'Urbanist-Bold',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Insights
          </Text>
          <Text style={{ 
            color: '#888888', 
            fontSize: 16, 
            textAlign: 'center',
            fontFamily: 'Urbanist-Regular'
          }}>
            Analytics and insights will appear here
          </Text>
        </View>
      )}

      {selectedTab === 'audience' && (
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'black',
          paddingHorizontal: 32
        }}>
          <Text style={{ 
            color: 'white', 
            fontSize: 24, 
            fontFamily: 'Urbanist-Bold',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Audience
          </Text>
          <Text style={{ 
            color: '#888888', 
            fontSize: 16, 
            textAlign: 'center',
            fontFamily: 'Urbanist-Regular'
          }}>
            Your audience analytics will appear here
          </Text>
        </View>
      )}

      {selectedTab === 'other' && (
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'black',
          paddingHorizontal: 32
        }}>
          <Text style={{ 
            color: 'white', 
            fontSize: 24, 
            fontFamily: 'Urbanist-Bold',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            Other
          </Text>
          <Text style={{ 
            color: '#888888', 
            fontSize: 16, 
            textAlign: 'center',
            fontFamily: 'Urbanist-Regular'
          }}>
            Additional features will appear here
          </Text>
        </View>
      )}
        </SafeAreaView>
    );
} 