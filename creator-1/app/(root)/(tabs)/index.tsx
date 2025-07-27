import { getUserProfile } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { client, connectUser } from '@/lib/stream-chat';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

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
  unreadCount: number;
}

interface StripeConnectProfile {
  stripeConnectAccountId?: string;
  stripeConnectEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  stripeConnectVerified?: boolean;
  stripeConnectSetupComplete?: boolean;
  stripeConnectSetupDate?: string;
  // Financial data from the creator collection
  lifetimeVolume?: number;
  stripeBalanceAvailable?: number;
  stripeBalancePending?: number;
  payoutsInTransitAmount?: number;
  payoutsPendingAmount?: number;
  stripeLastBalanceUpdate?: string;
  number_of_photos?: number;
  number_of_videos?: number;
  number_of_files?: number;
  number_of_monthly_subscribers?: number;
  number_of_yearly_subscriptions?: number;
  number_of_cancelled_monthly_sub?: number;
  number_of_cancelled_yearly_sub?: number;
}

export default function Index() {
    const router = useRouter();
    const { user } = useGlobalContext();
  const [channels, setChannels] = useState<Channel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState('chats');
    const [refreshing, setRefreshing] = useState(false);
    const [isLoadingStripeConnect, setIsLoadingStripeConnect] = useState(false);
    const [showStripeConnect, setShowStripeConnect] = useState(false);
    const [stripeConnectUrl, setStripeConnectUrl] = useState<string>('');
    const [creatorFinancials, setCreatorFinancials] = useState<StripeConnectProfile | null>(null);
    const [isLoadingFinancials, setIsLoadingFinancials] = useState(false);
    const [payoutTab, setPayoutTab] = useState('history');
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [openInfoBubble, setOpenInfoBubble] = useState<null | 'lifetime' | 'available' | 'pending'>(null);
    const [audience, setAudience] = useState<any[]>([]);
    const [isLoadingAudience, setIsLoadingAudience] = useState(false);
    const [audienceSearch, setAudienceSearch] = useState('');
    const [audienceFilter, setAudienceFilter] = useState<'recent' | 'income_high' | 'income_low'>('recent');
    const [filteredAudience, setFilteredAudience] = useState<any[]>([]);
    const [selectedSubscriber, setSelectedSubscriber] = useState<any | null>(null);
    const [showSubscriberModal, setShowSubscriberModal] = useState(false);
    const [channelsLoaded, setChannelsLoaded] = useState(false);

    const tabs = [
      { id: 'chats', label: 'Chats' },
      { id: 'other', label: 'Earnings' },
      { id: 'insights', label: 'Insights' },
      { id: 'audience', label: 'Audience' }
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
        unreadCount: channel.countUnread(),
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
                // Import the databases and config from appwrite
                const { databases, config } = await import('@/lib/appwrite');
                const { Query } = await import('react-native-appwrite');
                
                // Fetch user data from the user collection using accountId
                const userResponse = await databases.listDocuments(
                  config.databaseId,
                  process.env.EXPO_PUBLIC_APPWRITE_USER_USER_COLLECTION_ID!,
                  [Query.equal('accountId', memberId)]
                );
                
                if (userResponse.documents.length > 0) {
                  const userData = userResponse.documents[0];
                  memberNames[memberId] = userData.username || memberId;
                  memberAvatars[memberId] = userData.profileImageUri || userData.avatar || ''; // Prefer uploaded pic
                  console.log(`✅ Found user data for ${memberId}: ${userData.username} with avatar: ${userData.profileImageUri || userData.avatar}`);
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

  const loadCreatorFinancials = async () => {
    if (!user?.$id) return;

    setIsLoadingFinancials(true);
    try {
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      const creatorResponse = await databases.listDocuments(
        config.databaseId,
        process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
        [Query.equal('creatoraccountid', user.$id)]
      );

      if (creatorResponse.documents.length > 0) {
        const creatorData = creatorResponse.documents[0];
        setCreatorFinancials(creatorData as StripeConnectProfile);
        console.log('✅ Loaded creator financial data.');
        return creatorData;
      } else {
        console.log('❌ No creator document found for this user.');
        setCreatorFinancials(null);
        return null;
      }
        } catch (error) {  
      console.error('Error loading creator financials:', error);
      setCreatorFinancials(null);
      return null;
        } finally {
      setIsLoadingFinancials(false);
    }
  };

  const handleUpdateStripeData = async () => {
    if (!creatorFinancials?.stripeConnectAccountId) {
        Alert.alert("Error", "Stripe account not connected.");
        return;
    }
    
    setIsLoadingFinancials(true);
    try {
        const { functions } = await import('@/lib/appwrite');
        const { ExecutionMethod } = await import('react-native-appwrite');

        // Trigger the backend to update the DB
        await functions.createExecution(
            process.env.EXPO_PUBLIC_STRIPE_BALANCE_FUNCTION_ID!,
            JSON.stringify({ stripeConnectAccountId: creatorFinancials.stripeConnectAccountId }),
            false, '/get-balance', ExecutionMethod.POST,
            { 'Content-Type': 'application/json' }
        );

        // Refetch the data from our DB
        await loadCreatorFinancials();

    } catch (error) {
        console.error('Error updating Stripe data:', error);
        Alert.alert("Error", "Could not update your financial data. Please try again.");
    } finally {
        setIsLoadingFinancials(false);
    }
  };

  const handleOnboarding = async () => {
    if (isLoadingStripeConnect || creatorFinancials?.stripeConnectSetupComplete) return;

    setIsLoadingStripeConnect(true);
    console.log('🚀 Starting Stripe Onboarding...');
    
    try {
      const { functions } = await import('@/lib/appwrite');
      const { ExecutionMethod } = await import('react-native-appwrite');
      
      const result = await functions.createExecution(
        process.env.EXPO_PUBLIC_STRIPE_CONNECT_FUNCTION_ID!,
        JSON.stringify({
          userEmail: user?.email,
          userName: user?.name,
          returnUrl: 'https://cherrybox.app/connect-return'
        }),
        false,
        '/create-connect-account',
        ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
      );

      const response = JSON.parse(result.responseBody);
      if (response.success && response.accountLinkUrl) {
        console.log('✅ Got account link URL:', response.accountLinkUrl);
        setStripeConnectUrl(response.accountLinkUrl);
        setShowStripeConnect(true);
        // Refresh data after onboarding attempt
        await loadCreatorFinancials();
      } else {
        throw new Error(response.error || 'Failed to create Stripe Connect account.');
      }
    } catch (error) {
      console.error('❌ Error during Stripe onboarding:', error);
      Alert.alert("Error", (error as Error).message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoadingStripeConnect(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (isLoadingStripeConnect || !creatorFinancials?.stripeConnectAccountId) return;
    
    setIsLoadingStripeConnect(true);
    console.log('🚀 Opening Stripe Dashboard...');

    try {
      const { functions } = await import('@/lib/appwrite');
      const { ExecutionMethod } = await import('react-native-appwrite');

      const result = await functions.createExecution(
        process.env.EXPO_PUBLIC_STRIPE_CONNECT_FUNCTION_ID!,
        JSON.stringify({ accountId: creatorFinancials.stripeConnectAccountId }),
        false,
        '/create-dashboard-link',
        ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
      );

      const response = JSON.parse(result.responseBody);
      if (response.success && response.url) {
        console.log('✅ Got dashboard link URL:', response.url);
        setStripeConnectUrl(response.url);
        setShowStripeConnect(true);
      } else {
        throw new Error(response.error || 'Failed to create dashboard link.');
      }
        } catch (error) {  
      console.error('❌ Error opening Stripe dashboard:', error);
      Alert.alert("Error", (error as Error).message || "An unexpected error occurred. Please try again.");
        } finally {
      setIsLoadingStripeConnect(false);
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
    const hasUnread = item.unreadCount > 0;
    
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
          backgroundColor: isGroupChat ? '#FB2355' : 'transparent',
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
            color: hasUnread ? 'white' : (isGroupChat ? '#CCCCCC' : '#888888'), 
            fontSize: isGroupChat ? 14 : 13,
            fontFamily: hasUnread ? 'Urbanist-Bold' : 'Urbanist-Regular',
          }}>
            {item.lastMessage || (hasUnread ? `${item.unreadCount} new message${item.unreadCount > 1 ? 's' : ''}` : (isGroupChat ? 'Share updates with your fans' : 'No messages yet'))}
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

        {/* Arrow or Unread Count Badge */}
        {item.unreadCount > 0 ? (
          <View style={{
            backgroundColor: '#FB2355',
            borderRadius: 12,
            minWidth: 24,
            height: 24,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 8,
          }}>
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
              fontFamily: 'Urbanist-Bold',
            }}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        ) : (
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
        )}
      </TouchableOpacity>
    );
  };

  const loadAudience = async () => {
    if (!user?.$id) return;
    setIsLoadingAudience(true);
    try {
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      // Use the index on creatorAccountId to fetch all active subscriptions for this creator
      const response = await databases.listDocuments(
        config.databaseId,
        config.activeSubscriptionsCollectionId,
        [
          Query.equal('creatorAccountId', user.$id),
          Query.equal('status', 'active')
        ]
      );
      console.log('[Audience] Subscriptions fetched:', response.documents);
      setAudience(response.documents);
    } catch (error) {
      console.error('[Audience] Error loading audience:', error);
      setAudience([]);
    } finally {
      setIsLoadingAudience(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (selectedTab === 'chats') {
        await loadChannels();
        await loadProfileImage();
      } else if (selectedTab === 'other') {
        await loadCreatorFinancials();
      } else if (selectedTab === 'audience') {
        await loadAudience();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!channelsLoaded) {
        loadChannels().then(() => setChannelsLoaded(true));
    }
    loadProfileImage();
    if (user?.$id) {
        loadCreatorFinancials();
    }
  }, [user, channelsLoaded]);

  useEffect(() => {
    if (selectedTab === 'audience') {
      loadAudience();
    }
  }, [selectedTab, user]);

  // Update filteredAudience when audience, search, or filter changes
  useEffect(() => {
    let filtered = audience;
    // Search filter
    if (audienceSearch.trim()) {
      const search = audienceSearch.trim().toLowerCase();
      filtered = filtered.filter(sub =>
        (sub.customerEmail && sub.customerEmail.toLowerCase().includes(search)) ||
        (sub.userName && sub.userName.toLowerCase().includes(search))
      );
    }
    // Sorting
    if (audienceFilter === 'recent') {
      filtered = filtered.slice().sort((a, b) => new Date(b.createdAt || b.$createdAt).getTime() - new Date(a.createdAt || a.$createdAt).getTime());
    } else if (audienceFilter === 'income_high') {
      filtered = filtered.slice().sort((a, b) => (b.planAmount || 0) - (a.planAmount || 0));
    } else if (audienceFilter === 'income_low') {
      filtered = filtered.slice().sort((a, b) => (a.planAmount || 0) - (b.planAmount || 0));
    }
    setFilteredAudience(filtered);
  }, [audience, audienceSearch, audienceFilter]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 bg-black">
                <Image 
                    source={require('../../../assets/images/cherry-icon.png')}
                    className="w-16 h-16 rounded-lg"
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
                    <View className="w-[61px] h-[61px] rounded-full bg-[#1A1A1A] items-center justify-center overflow-hidden">
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <Text className="text-2xl text-white font-bold">
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
                source={require('../../../assets/icon/loading-icon.png')} 
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
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#FB2355"
                  colors={["#FB2355"]}
                  progressBackgroundColor="black"
                />
              }
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
            <ScrollView
              contentContainerStyle={{ 
              flex: 1, 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'black',
              paddingHorizontal: 32
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#FB2355"
                  colors={["#FB2355"]}
                  progressBackgroundColor="black"
                />
              }
            >
                            <Image 
                                source={require('../../../assets/icon/loading-icon.png')} 
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
                        </ScrollView>
                    )}
        </View>
      )}

      {selectedTab === 'insights' && (
        <ScrollView 
          style={{ 
              flex: 1, 
          backgroundColor: 'black',
          paddingHorizontal: 4
          }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center', 
            justifyContent: 'flex-start',
            paddingTop: 24
          }}
        >
          {/* Subscriptions Section */}
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#23232B', marginRight: 8 }} />
            <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 18, letterSpacing: 1, textAlign: 'center' }}>Subscriptions</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#23232B', marginLeft: 8 }} />
          </View>
          {/* Big Total Subscribers Card with gradient border */}
          <LinearGradient
            colors={["#fff", "#FB2355"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              padding: 2,
              marginBottom: 18,
              width: '100%',
            }}
          >
            <View style={{
              backgroundColor: '#18181B',
              borderRadius: 18,
              minHeight: 110,
              paddingVertical: 18,
              alignItems: 'center', 
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            }}>
              <View style={{ alignItems: 'center', marginBottom: 6 }}>
                <View style={{ backgroundColor: '#fff2', borderRadius: 24, padding: 10, marginBottom: 8 }}>
                  <Ionicons name="star" size={32} color="#fff" />
                </View>
                <Text style={{ color: '#fff', fontFamily: 'Urbanist-Bold', fontSize: 16, letterSpacing: 0.5 }}>Total Subscribers</Text>
              </View>
              <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 40, marginBottom: 0, textAlign: 'center' }}>
                {(typeof creatorFinancials?.number_of_monthly_subscribers === 'number' || typeof creatorFinancials?.number_of_yearly_subscriptions === 'number')
                  ? ((creatorFinancials?.number_of_monthly_subscribers || 0) + (creatorFinancials?.number_of_yearly_subscriptions || 0))
                  : '—'}
              </Text>
            </View>
          </LinearGradient>
          {/* Monthly/Yearly Row */}
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* Monthly */}
            <View style={{
              backgroundColor: '#18181B',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#fff',
              width: '48%',
              minHeight: 80,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            }}>
              <View style={{ backgroundColor: '#FFD70022', borderRadius: 20, padding: 8, marginBottom: 6 }}>
                <Ionicons name="people" size={22} color="#fff" />
              </View>
              <Text style={{ color: '#fff', fontFamily: 'Urbanist-Bold', fontSize: 14, marginBottom: 2 }}>Monthly</Text>
              <Text style={{ color: '#fff', fontFamily: 'Urbanist-Bold', fontSize: 26 }}>{creatorFinancials?.number_of_monthly_subscribers ?? '—'}</Text>
            </View>
            {/* Yearly */}
            <View style={{
              backgroundColor: '#18181B',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#fff',
              width: '48%',
              minHeight: 80,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            }}>
              <View style={{ backgroundColor: '#4CAF5022', borderRadius: 20, padding: 8, marginBottom: 6 }}>
                <MaterialCommunityIcons name="calendar-star" size={22} color="#fff" />
              </View>
              <Text style={{ color: '#fff', fontFamily: 'Urbanist-Bold', fontSize: 14, marginBottom: 2 }}>Yearly</Text>
              <Text style={{ color: '#fff', fontFamily: 'Urbanist-Bold', fontSize: 26 }}>{creatorFinancials?.number_of_yearly_subscriptions ?? '—'}</Text>
            </View>
          </View>
          {/* Cancelled Row */}
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
            {/* Cancelled Monthly */}
            <View style={{
              backgroundColor: '#18181B',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#FB2355',
              width: '48%',
              minHeight: 80,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            }}>
              <View style={{ backgroundColor: '#FF980022', borderRadius: 20, padding: 8, marginBottom: 6 }}>
                <Ionicons name="close-circle" size={22} color="#FB2355" />
              </View>
              <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 14, marginBottom: 2 }}>Cancelled Monthly</Text>
              <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 26 }}>{creatorFinancials?.number_of_cancelled_monthly_sub ?? '—'}</Text>
            </View>
            {/* Cancelled Yearly */}
            <View style={{
              backgroundColor: '#18181B',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#FB2355',
              width: '48%',
              minHeight: 80,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            }}>
              <View style={{ backgroundColor: '#F4433622', borderRadius: 20, padding: 8, marginBottom: 6 }}>
                <Ionicons name="close-circle-outline" size={22} color="#FB2355" />
              </View>
              <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 14, marginBottom: 2 }}>Cancelled Yearly</Text>
              <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 26 }}>{creatorFinancials?.number_of_cancelled_yearly_sub ?? '—'}</Text>
            </View>
          </View>

          {/* Purchases Section */}
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#23232B', marginRight: 8 }} />
            <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 18, letterSpacing: 1, textAlign: 'center' }}>Purchases</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#23232B', marginLeft: 8 }} />
          </View>
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
            {/* Photos */}
              <View style={{
              backgroundColor: '#18181B',
                borderRadius: 16,
                borderWidth: 1,
              borderColor: '#23232B',
              width: '32%',
              minHeight: 80,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            }}>
                <View style={{ backgroundColor: '#fff2', borderRadius: 20, padding: 8, marginBottom: 6 }}>
                  <Ionicons name="image" size={22} color="#fff" />
                </View>
                <Text style={{ color: '#fff', fontFamily: 'Urbanist-Bold', fontSize: 14, marginBottom: 2 }}>Photos</Text>
                <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 26 }}>{creatorFinancials?.number_of_photos ?? '—'}</Text>
              </View>
              {/* Videos */}
              <View style={{
                backgroundColor: '#18181B',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#23232B',
                width: '32%',
                minHeight: 80,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 3,
              }}>
                <View style={{ backgroundColor: '#fff2', borderRadius: 20, padding: 8, marginBottom: 6 }}>
                  <Ionicons name="videocam" size={22} color="#fff" />
                </View>
                <Text style={{ color: '#fff', fontFamily: 'Urbanist-Bold', fontSize: 14, marginBottom: 2 }}>Videos</Text>
                <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 26 }}>{creatorFinancials?.number_of_videos ?? '—'}</Text>
              </View>
              {/* Files */}
              <View style={{
                backgroundColor: '#18181B',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#23232B',
                width: '32%',
                minHeight: 80,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 3,
              }}>
                <View style={{ backgroundColor: '#fff2', borderRadius: 20, padding: 8, marginBottom: 6 }}>
                  <Ionicons name="document" size={22} color="#fff" />
                </View>
                <Text style={{ color: '#fff', fontFamily: 'Urbanist-Bold', fontSize: 14, marginBottom: 2 }}>Files</Text>
                <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 26 }}>{creatorFinancials?.number_of_files ?? '—'}</Text>
              </View>
          </View>

          {/* Update Insights Button */}
          <TouchableOpacity
            onPress={async () => {
              setIsLoadingInsights(true);
              await loadCreatorFinancials();
              setIsLoadingInsights(false);
            }}
            disabled={isLoadingInsights}
            style={{
              backgroundColor: '#333',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoadingInsights ? 0.5 : 1,
              width: '100%',
              marginBottom: 32
            }}
          >
            <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 18 }}>
              {isLoadingInsights ? 'Updating...' : 'Update Insights'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {selectedTab === 'audience' && (
        <ScrollView 
          style={{ 
            flex: 1, 
            backgroundColor: 'black',
            paddingHorizontal: 0
          }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'stretch',
            justifyContent: filteredAudience.length === 0 && !isLoadingAudience ? 'center' : 'flex-start',
            paddingTop: 24
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isLoadingAudience}
              onRefresh={onRefresh}
              tintColor="#FB2355"
              colors={["#FB2355"]}
              progressBackgroundColor="black"
            />
          }
        >
          {/* Search Bar */}
          <View style={{ width: '100%', marginBottom: 12 }}>
              <View style={{
              backgroundColor: '#23232B',
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}>
              <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
              <TextInput
                style={{
                  flex: 1,
                  color: 'white',
                  fontFamily: 'Urbanist-Regular',
                  fontSize: 16,
                  backgroundColor: 'transparent',
                  padding: 0,
                }}
                placeholder="Search by email or username..."
                placeholderTextColor="#888"
                value={audienceSearch}
                onChangeText={setAudienceSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {audienceSearch.length > 0 && (
                <TouchableOpacity onPress={() => setAudienceSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Filter Tags */}
          <View style={{ flexDirection: 'row', marginBottom: 16, width: '100%', justifyContent: 'center', gap: 8 }}>
            {[
              { key: 'recent', label: 'Most Recent' },
              { key: 'income_high', label: 'Highest Income' },
              { key: 'income_low', label: 'Lowest Income' },
            ].map(tag => (
              <TouchableOpacity
                key={tag.key}
                onPress={() => setAudienceFilter(tag.key as 'recent' | 'income_high' | 'income_low')}
                style={{
                  backgroundColor: audienceFilter === tag.key ? '#FB2355' : '#23232B',
                  borderRadius: 20,
                  paddingVertical: 7,
                  paddingHorizontal: 16,
                  marginHorizontal: 2,
                  borderWidth: audienceFilter === tag.key ? 1.5 : 1,
                  borderColor: audienceFilter === tag.key ? '#FB2355' : '#333',
                }}
              >
                <Text style={{
                  color: audienceFilter === tag.key ? 'white' : '#888',
                  fontFamily: audienceFilter === tag.key ? 'Urbanist-Bold' : 'Urbanist-Regular',
                  fontSize: 14,
                }}>{tag.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isLoadingAudience ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 32 }}>
              <ActivityIndicator size="large" color="#FB2355" />
              <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 16, marginTop: 12 }}>Loading subscribers...</Text>
            </View>
          ) : filteredAudience.length === 0 ? (
            <Text style={{ 
              color: '#888888', 
              fontSize: 16, 
              textAlign: 'center',
                  fontFamily: 'Urbanist-Regular',
              marginTop: 24
                }}>
              No subscribers yet.
                </Text>
          ) : (
            <View style={{ width: '100%', marginTop: 8 }}>
              {filteredAudience.map((sub, idx) => (
                <TouchableOpacity
                  key={sub.$id || idx}
                  onPress={() => {
                    setSelectedSubscriber(sub);
                    setShowSubscriberModal(true);
                  }}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#18181B',
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#23232B',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.10,
                    shadowRadius: 4,
                    elevation: 2,
                    marginLeft: 8,
                    marginRight: 8,
                    width: 'auto',
                  }}
                >
                  {/* Icon or Initial */}
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#FB2355',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                    overflow: 'hidden',
                  }}>
                    <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', fontFamily: 'Urbanist-Bold' }}>
                      {sub.userName ? sub.userName[0]?.toUpperCase() : (sub.customerEmail ? sub.customerEmail[0]?.toUpperCase() : 'U')}
                </Text>
              </View>
                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 17 }}>
                      {sub.userName || sub.customerEmail || 'No name'}
                    </Text>
                    <Text style={{ color: '#CCCCCC', fontFamily: 'Urbanist-Regular', fontSize: 14 }}>
                      {sub.customerEmail && sub.userName ? sub.customerEmail : ''}
                    </Text>
                  </View>
                  {/* Plan info */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 14 }}>
                      {sub.planInterval ? sub.planInterval.charAt(0).toUpperCase() + sub.planInterval.slice(1) : ''}
                    </Text>
                    <Text style={{ color: '#FFD700', fontFamily: 'Urbanist-Bold', fontSize: 14 }}>
                      {sub.planAmount ? `$${(sub.planAmount / 100).toFixed(2)}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {selectedTab === 'other' && (
        <ScrollView 
          style={{ 
            flex: 1, 
            backgroundColor: 'black',
          }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingVertical: 20,
          }}
        >
          <View>
            
            {/* Lifetime Volume */}
            {creatorFinancials?.lifetimeVolume !== undefined && (
              <View style={{
                backgroundColor: '#2A1A2A',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#FB2355'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, position: 'relative' }}>
                <Text style={{
                    color: '#CCCCCC',
                  fontSize: 14,
                  fontFamily: 'Urbanist-Regular',
                    marginRight: 6
                }}>
                    Lifetime Volume
                </Text>
                  <TouchableOpacity onPress={() => setOpenInfoBubble(openInfoBubble === 'lifetime' ? null : 'lifetime')}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color="#CCCCCC"
                      style={{ marginTop: 1 }}
                    />
                  </TouchableOpacity>
                  {openInfoBubble === 'lifetime' && (
              <View style={{
                      position: 'absolute',
                      top: 22,
                      left: 0,
                      backgroundColor: '#23232B',
                      borderRadius: 8,
                      padding: 10,
                      minWidth: 180,
                      zIndex: 10,
                  borderWidth: 1,
                      borderColor: '#444',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.18,
                      shadowRadius: 6,
                      elevation: 6,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Urbanist-Regular' }}>
                        Total gross revenue you have earned on the platform.
                  </Text>
                    </View>
                  )}
                </View>
                <Text style={{
                  color: '#FFD700',
                  fontSize: 28,
                  fontWeight: 'bold',
                  fontFamily: 'Urbanist-Bold'
                }}>
                  ${(creatorFinancials.lifetimeVolume / 100).toFixed(2)}
                </Text>
                <Text style={{
                    color: '#888888',
                  fontSize: 12,
                  fontFamily: 'Urbanist-Regular',
                  marginTop: 4
                }}>
                  Last updated: {creatorFinancials.stripeLastBalanceUpdate ? new Date(creatorFinancials.stripeLastBalanceUpdate).toLocaleString() : 'N/A'}
                </Text>
              </View>
            )}

            {/* Balance and Payouts Display */}
            {creatorFinancials && (
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
                   Balance
                  </Text>
                
                {/* Available Balance */}
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{
                    color: '#888888',
                      fontSize: 14,
                    fontFamily: 'Urbanist-Regular',
                      marginRight: 6
                    }}>
                      Available
                  </Text>
                    <TouchableOpacity onPress={() => setOpenInfoBubble(openInfoBubble === 'available' ? null : 'available')}>
                      <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color="#888888"
                        style={{ marginTop: 1 }}
                      />
                    </TouchableOpacity>
                    {openInfoBubble === 'available' && (
                <View style={{
                        position: 'absolute',
                        top: 22,
                        left: 0,
                        backgroundColor: '#23232B',
                        borderRadius: 8,
                        padding: 10,
                        minWidth: 180,
                        zIndex: 10,
                  borderWidth: 1,
                        borderColor: '#444',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        elevation: 6,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Urbanist-Regular' }}>
                          Funds that are available for payout to your bank account.
                  </Text>
                </View>
              )}
            </View>
                  <Text style={{ color: '#4CAF50', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>
                    ${((creatorFinancials.stripeBalanceAvailable || 0) / 100).toFixed(2)}
                  </Text>
                </View>

                {/* Pending Balance */}
                <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{
                    color: '#888888',
                      fontSize: 14,
                    fontFamily: 'Urbanist-Regular',
                      marginRight: 6
                  }}>
                      Pending
                  </Text>
                    <TouchableOpacity onPress={() => setOpenInfoBubble(openInfoBubble === 'pending' ? null : 'pending')}>
                      <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color="#888888"
                        style={{ marginTop: 1 }}
                      />
                    </TouchableOpacity>
                    {openInfoBubble === 'pending' && (
                      <View style={{
                        position: 'absolute',
                        top: 22,
                        left: 0,
                        backgroundColor: '#23232B',
                        borderRadius: 8,
                        padding: 10,
                        minWidth: 180,
                        zIndex: 10,
                        borderWidth: 1,
                        borderColor: '#444',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        elevation: 6,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Urbanist-Regular' }}>
                          Funds that are still being processed and will become available soon.
          </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: '#FF9800', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>
                    ${((creatorFinancials.stripeBalancePending || 0) / 100).toFixed(2)}
                  </Text>
                </View>

                {/* Payouts Section */}
                <View style={{ borderTopColor: '#333', borderTopWidth: 1, paddingTop: 16 }}>
                  {/* Payout Tabs */}
                  <View style={{ flexDirection: 'row', marginBottom: 12, backgroundColor: '#222', borderRadius: 8, padding: 4 }}>
                    {['inTransit', 'pending'].map(tab => (
                      <TouchableOpacity
                        key={tab}
                        onPress={() => setPayoutTab(tab)}
          style={{ 
          flex: 1, 
                          paddingVertical: 8,
                          borderRadius: 6,
                          backgroundColor: payoutTab === tab ? '#FB2355' : 'transparent',
                        }}
        >
                  <Text style={{
            color: 'white', 
            fontFamily: 'Urbanist-Bold',
            textAlign: 'center',
                          fontSize: 13,
                          textTransform: 'capitalize'
          }}>
                          {tab === 'inTransit' ? 'In Transit' : tab}
                  </Text>
                      </TouchableOpacity>
                    ))}
                </View>
                  
                  {/* Payout Amounts */}
                   <View style={{ marginBottom: 6, paddingVertical: 4 }}>
                      {payoutTab === 'inTransit' && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                          <Text style={{ color: '#E0E0E0', fontFamily: 'Urbanist-Bold', fontSize: 14 }}>
                            In Transit Amount
                          </Text>
                          <Text style={{ color: '#BDBDBD', fontFamily: 'Urbanist-Regular', fontSize: 13 }}>
                             ${((creatorFinancials.payoutsInTransitAmount || 0) / 100).toFixed(2)}
                          </Text>
              </View>
                      )}
                      {payoutTab === 'pending' && (
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                          <Text style={{ color: '#E0E0E0', fontFamily: 'Urbanist-Bold', fontSize: 14 }}>
                            Pending Amount
                          </Text>
                          <Text style={{ color: '#BDBDBD', fontFamily: 'Urbanist-Regular', fontSize: 13 }}>
                             ${((creatorFinancials.payoutsPendingAmount || 0) / 100).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                </View>
              </View>
            )}
            
            <TouchableOpacity
              onPress={handleUpdateStripeData}
              disabled={isLoadingFinancials}
          style={{ 
                backgroundColor: '#333',
                borderRadius: 12,
                paddingVertical: 12,
                marginTop: 1,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoadingFinancials ? 0.5 : 1,
              }}
            >
              <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>
                {isLoadingFinancials ? 'Updating...' : 'Update Earnings Data'}
              </Text>
            </TouchableOpacity>
            
            {/* Stripe Status Display */}
            {creatorFinancials?.stripeConnectSetupComplete ? (
                <View style={{
                  backgroundColor: '#1A1A1A',
                  borderRadius: 16,
                  padding: 20,
                width: '100%',
                  borderWidth: 1,
                borderColor: '#333333',
                marginTop: 20
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 18,
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 16
                  }}>
                  Payment Status
                  </Text>
                {/* Status Items */}
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#4CAF50" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#CCCCCC', fontFamily: 'Urbanist-Regular' }}>Setup Complete</Text>
                  </View>
                  <Text style={{ color: '#4CAF50', fontFamily: 'Urbanist-Bold' }}>Yes</Text>
                </View>
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectEnabled ? "card-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectEnabled ? '#4CAF50' : '#F44336'} style={{ marginRight: 10 }} />
                    <Text style={{ color: '#CCCCCC', fontFamily: 'Urbanist-Regular' }}>Payments Active</Text>
                  </View>
                  <Text style={{ color: creatorFinancials.stripeConnectEnabled ? '#4CAF50' : '#F44336', fontFamily: 'Urbanist-Bold' }}>
                    {creatorFinancials.stripeConnectEnabled ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectPayoutsEnabled ? "cash-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectPayoutsEnabled ? '#4CAF50' : '#F44336'} style={{ marginRight: 10 }} />
                    <Text style={{ color: '#CCCCCC', fontFamily: 'Urbanist-Regular' }}>Payouts Active</Text>
                  </View>
                  <Text style={{ color: creatorFinancials.stripeConnectPayoutsEnabled ? '#4CAF50' : '#F44336', fontFamily: 'Urbanist-Bold' }}>
                    {creatorFinancials.stripeConnectPayoutsEnabled ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectVerified ? "person-circle-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectVerified ? '#4CAF50' : '#FF9800'} style={{ marginRight: 10 }} />
                    <Text style={{ color: '#CCCCCC', fontFamily: 'Urbanist-Regular' }}>Account Verified</Text>
                  </View>
                  <Text style={{ color: creatorFinancials.stripeConnectVerified ? '#4CAF50' : '#FF9800', fontFamily: 'Urbanist-Bold' }}>
                    {creatorFinancials.stripeConnectVerified ? 'Yes' : 'Pending'}
                  </Text>
                </View>
                
                {/* View Dashboard Button */}
                <TouchableOpacity
                  onPress={handleOpenDashboard}
                    style={{
                    backgroundColor: '#333',
                    borderRadius: 12,
                    paddingVertical: 12,
                    marginTop: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row'
                  }}
                >
                  <Ionicons name="open-outline" size={18} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>
                    View Dashboard
                  </Text>
                </TouchableOpacity>

                {creatorFinancials.stripeConnectSetupDate && (
                  <View style={{ marginTop: 12, borderTopColor: '#333', borderTopWidth: 1, paddingTop: 12 }}>
                    <Text style={{ color: '#888', fontFamily: 'Urbanist-Regular', fontSize: 12, textAlign: 'center' }}>
                      Setup completed on: {new Date(creatorFinancials.stripeConnectSetupDate).toLocaleDateString()}
                    </Text>
                </View>
              )}
              </View>
            ) : (
                <View style={{
                backgroundColor: 'rgba(251, 35, 85, 0.1)',
                  borderRadius: 16,
                padding: 20,
                width: '100%',
                flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                borderColor: 'rgba(251, 35, 85, 0.3)',
                marginTop: 20
                }}>
                <Ionicons name="information-circle-outline" size={32} color="#FB2355" style={{ marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 16,
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 4
                  }}>
                    Get Paid
                  </Text>
                  <Text style={{
                    color: '#CCCCCC',
                    fontSize: 14,
                    fontFamily: 'Urbanist-Regular',
                    lineHeight: 20
                  }}>
                    Connect a Stripe account to start accepting payments and earning from your content.
                  </Text>
                </View>
            </View>
          )}
          </View>
          
          <View style={{ alignItems: 'center', width: '100%', paddingBottom: 10, marginTop: 20 }}>
            {/* Stripe Connect Express Button */}
            <TouchableOpacity
              style={{
                backgroundColor: creatorFinancials?.stripeConnectSetupComplete ? '#333' : '#FB2355',
                paddingVertical: 16,
                borderRadius: 16,
                flexDirection: 'row',
          alignItems: 'center', 
          justifyContent: 'center',
                width: '100%',
                shadowColor: creatorFinancials?.stripeConnectSetupComplete ? 'transparent' : '#FB2355',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: creatorFinancials?.stripeConnectSetupComplete ? 0 : 8,
                opacity: isLoadingStripeConnect ? 0.7 : 1,
              }}
              disabled={isLoadingStripeConnect || creatorFinancials?.stripeConnectSetupComplete}
              onPress={handleOnboarding}
            >
              <Ionicons name="card-outline" size={22} color="white" style={{ marginRight: 12 }} />
              <View>
          <Text style={{ 
            color: 'white', 
                  fontSize: 18, 
                  fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold',
                  textAlign: 'left'
          }}>
                  {isLoadingStripeConnect 
                    ? 'Connecting...' 
                    : (creatorFinancials?.stripeConnectSetupComplete ? 'Setup Complete' : 'Set Up Payments')}
          </Text>
          <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: 13,
                  fontFamily: 'Urbanist-Regular',
                  textAlign: 'left',
                  marginTop: 2
                }}>
                  {creatorFinancials?.stripeConnectSetupComplete ? 'You can now manage payouts from your dashboard' : 'Connect with Stripe to get paid'}
          </Text>
        </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Stripe Connect WebView Modal */}
      <Modal
        visible={showStripeConnect}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStripeConnect(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
          {/* Header */}
        <View style={{ 
            flexDirection: 'row',
          alignItems: 'center', 
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
          backgroundColor: 'black',
            borderBottomWidth: 1,
            borderBottomColor: '#333333'
        }}>
          <Text style={{ 
            color: 'white', 
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'Urbanist-Bold'
            }}>
              Stripe Connect Setup
          </Text>
            <TouchableOpacity
              onPress={() => setShowStripeConnect(false)}
              style={{
                padding: 8,
                backgroundColor: '#333333',
                borderRadius: 8
              }}
            >
          <Text style={{ 
                color: 'white',
            fontSize: 16, 
                fontWeight: 'bold',
                fontFamily: 'Urbanist-Bold'
          }}>
                ✕
          </Text>
            </TouchableOpacity>
        </View>

          {/* WebView */}
          {stripeConnectUrl ? (
            <WebView
              source={{ uri: stripeConnectUrl }}
              style={{ flex: 1, backgroundColor: 'white' }}
              startInLoadingState={true}
              renderLoading={() => (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'white'
        }}>
                  <ActivityIndicator size="large" color="#FB2355" />
          <Text style={{ 
                    color: '#666666',
                    fontSize: 16,
                    fontFamily: 'Urbanist-Regular',
                    marginTop: 16
                  }}>
                    Loading Stripe Connect...
          </Text>
                </View>
              )}
              onNavigationStateChange={(navState) => {
                // Handle navigation state changes
                console.log('🌐 Navigation state changed:', navState.url);
                
                // Close modal when user completes onboarding or goes to return URL
                if (navState.url.includes('cherrybox.app/connect-return') || 
                    navState.url.includes('success') ||
                    navState.url.includes('complete') ||
                    navState.url.includes('dashboard.stripe.com/connect/accounts') ||
                    navState.url.includes('account_updated=true')) {
                  setShowStripeConnect(false);
                  loadCreatorFinancials(); // Refresh data after completion
                  Alert.alert(
                    "Setup Complete",
                    "Your Stripe Connect account has been set up successfully! You can now receive payments directly.",
                    [{ text: "OK", style: "default" }]
                  );
                }
                
                // Handle errors or cancellations
                if (navState.url.includes('error') || 
                    navState.url.includes('cancel') ||
                    navState.url.includes('failure')) {
                  setShowStripeConnect(false);
                  loadCreatorFinancials(); // Refresh data even on cancellation
                  Alert.alert(
                    "Setup Incomplete",
                    "Stripe Connect setup was not completed. You can try again anytime.",
                    [{ text: "OK", style: "default" }]
                  );
                }
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error:', nativeEvent);
                Alert.alert(
                  "Error",
                  "Failed to load Stripe Connect. Please try again.",
                  [{ text: "OK", style: "default" }]
                );
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView HTTP error:', nativeEvent);
              }}
            />
          ) : (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'white'
            }}>
              <ActivityIndicator size="large" color="#FB2355" />
          <Text style={{ 
                color: '#666666',
            fontSize: 16, 
                fontFamily: 'Urbanist-Regular',
                marginTop: 16
          }}>
                Preparing Stripe Connect...
          </Text>
        </View>
      )}
        </SafeAreaView>
      </Modal>
        {/* Overlay to close info bubble when open */}
      {openInfoBubble && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }}
          activeOpacity={1}
          onPress={() => setOpenInfoBubble(null)}
        />
      )}
        {/* Subscriber Info Modal (always mounted, controlled by state) */}
        <Modal
          visible={showSubscriberModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowSubscriberModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#18181B', borderRadius: 18, padding: 28, width: '85%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: '#FB2355' }}>
              <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 22, marginBottom: 10, textAlign: 'center' }}>
                {selectedSubscriber?.userName || selectedSubscriber?.customerEmail || 'Subscriber'}
              </Text>
              <Text style={{ color: '#CCCCCC', fontFamily: 'Urbanist-Regular', fontSize: 15, marginBottom: 18, textAlign: 'center' }}>
                {selectedSubscriber?.customerEmail && selectedSubscriber?.userName ? selectedSubscriber.customerEmail : ''}
              </Text>
              <View style={{ width: '100%', marginBottom: 10 }}>
                <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 15, marginBottom: 2 }}>Subscription Created</Text>
                <Text style={{ color: 'white', fontFamily: 'Urbanist-Regular', fontSize: 15, marginBottom: 8 }}>
                  {selectedSubscriber?.createdAt ? new Date(selectedSubscriber.createdAt).toLocaleString() : (selectedSubscriber?.$createdAt ? new Date(selectedSubscriber.$createdAt).toLocaleString() : 'N/A')}
                </Text>
                <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 15, marginBottom: 2 }}>Renewal Date</Text>
                <Text style={{ color: 'white', fontFamily: 'Urbanist-Regular', fontSize: 15, marginBottom: 8 }}>
                  {selectedSubscriber?.renewalDate ? new Date(selectedSubscriber.renewalDate).toLocaleString() : 'N/A'}
                </Text>
                <Text style={{ color: '#FB2355', fontFamily: 'Urbanist-Bold', fontSize: 15, marginBottom: 2 }}>Payment Status</Text>
                <Text style={{ color: 'white', fontFamily: 'Urbanist-Regular', fontSize: 15, marginBottom: 8 }}>
                  {selectedSubscriber?.paymentStatus || 'N/A'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSubscriberModal(false)}
                style={{ marginTop: 10, backgroundColor: '#FB2355', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 32 }}
              >
                <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        </SafeAreaView>
    );
} 