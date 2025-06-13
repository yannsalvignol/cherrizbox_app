import { Ionicons } from '@expo/vector-icons'
import { Models, Query } from 'appwrite'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Dimensions, Image, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import Modal from 'react-native-modal'
import { SafeAreaView } from 'react-native-safe-area-context'
import { config, databases, deleteExpiredSubscriptions, getCreatorEarnings, getCreatorSubscriptions, getCurrentUser, getUserProfile, getUserSubscriptions } from '../../../lib/appwrite'
import { cancelSubscription } from '../../../lib/subscription'

interface User extends Models.User<Models.Preferences> {
    name: string;
    email: string;
}

interface Profile {
    userId: string;
    profileImageUri?: string;
}

interface Subscription {
    $id: string;
    userId: string;
    status: 'active' | 'cancelled' | 'expired';
    createdAt: string;
    planCurrency: string;
    planInterval: string;
    creatorName: string;
    creatorAccountId: string;
    renewalDate: string;
    stripeSubscriptionId: string;
    endsAt?: string;
    cancelledAt?: string;
}

interface SubscriptionStats {
  active: number;
  cancelled: number;
  timeline: {
    date: string;
    active: number;
    cancelled: number;
  }[];
}

interface EarningsStats {
  totalEarnings: number;
  timeline: {
    date: string;
    earnings: number;
  }[];
}

export default function Profile() {
  const router = useRouter();
  const [isPaidContent, setIsPaidContent] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedToggle, setSelectedToggle] = useState<'membership' | 'earnings' | 'creators'>('membership');
  const [hasExistingGroup, setHasExistingGroup] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isUnsubscribeModalVisible, setIsUnsubscribeModalVisible] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<{ name: string; subscriptionId: string } | null>(null);
  const [isProcessingUnsubscribe, setIsProcessingUnsubscribe] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats>({
    active: 0,
    cancelled: 0,
    timeline: []
  });
  const [earningsStats, setEarningsStats] = useState<EarningsStats>({
    totalEarnings: 0,
    timeline: []
  });

  // For swipe toggle
  const toggleOptions = ['membership', 'earnings', 'creators'] as const;
  const toggleIndex = toggleOptions.indexOf(selectedToggle);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user as User);

      if (user?.$id) {
        const userProfile = await getUserProfile(user.$id);
        if (userProfile) {
          setProfile({
            userId: userProfile.userId,
            profileImageUri: userProfile.profileImageUri
          });
        }

        // Check if user already has a chat group
        const response = await databases.listDocuments(
          config.databaseId,
          config.photoCollectionId,
          [
            Query.equal('IdCreator', user.$id)
          ]
        );
        setHasExistingGroup(response.documents.length > 0);

        // Delete expired subscriptions first
        await deleteExpiredSubscriptions(user.$id);
        
        // Load user subscriptions
        const userSubscriptions = await getUserSubscriptions(user.$id);
        
        // Map and filter subscriptions
        const filteredSubscriptions = userSubscriptions
          .map(sub => ({
            $id: sub.$id,
            userId: sub.userId,
            status: sub.status as 'active' | 'cancelled' | 'expired',
            createdAt: sub.createdAt,
            planCurrency: sub.planCurrency,
            planInterval: sub.planInterval,
            creatorName: sub.creatorName,
            creatorAccountId: sub.creatorAccountId,
            renewalDate: sub.renewalDate,
            stripeSubscriptionId: sub.stripeSubscriptionId,
            endsAt: sub.endsAt,
            cancelledAt: sub.cancelledAt
          }))
          .filter((sub, index, self) => {
            if (sub.status === 'cancelled' || sub.status === 'expired') return true;
            
            // If this is an active subscription, check if there's a cancelled/expired one with the same stripeSubscriptionId
            const hasCancelledCounterpart = self.some(
              otherSub => 
                (otherSub.status === 'cancelled' || otherSub.status === 'expired') && 
                otherSub.stripeSubscriptionId === sub.stripeSubscriptionId
            );
            
            return !hasCancelledCounterpart;
          });

        setSubscriptions(filteredSubscriptions);

        // Load subscription stats
        const stats = await getCreatorSubscriptions(user.$id);
        
        // Process timeline data
        const timelineData = new Map<string, { active: number; cancelled: number }>();
        
        // Get all unique dates from both active and cancelled subscriptions
        const allDates = new Set([
          ...stats.active.map(sub => new Date(sub.createdAt).toISOString().split('T')[0]),
          ...stats.cancelled.map(sub => new Date(sub.createdAt).toISOString().split('T')[0])
        ]);

        // Sort dates chronologically
        const sortedDates = Array.from(allDates).sort();

        // Initialize running counts
        let activeCount = 0;
        let cancelledCount = 0;

        // Process each date chronologically
        sortedDates.forEach(date => {
          // Count new active subscriptions on this date
          const newActiveOnDate = stats.active.filter(sub => 
            new Date(sub.createdAt).toISOString().split('T')[0] === date
          ).length;
          
          // Count new cancelled subscriptions on this date
          const newCancelledOnDate = stats.cancelled.filter(sub => 
            new Date(sub.createdAt).toISOString().split('T')[0] === date
          ).length;

          // Update running counts
          activeCount += newActiveOnDate;
          cancelledCount += newCancelledOnDate;

          // Store the cumulative counts for this date
          timelineData.set(date, {
            active: activeCount,
            cancelled: cancelledCount
          });
        });

        // Convert to array and sort by date
        const timeline = Array.from(timelineData.entries())
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setSubscriptionStats({
          active: stats.active.length,
          cancelled: stats.cancelled.length,
          timeline
        });

        // Load earnings data
        const earningsData = await getCreatorEarnings(user.$id);
        
        // Process timeline data
        const earningsTimelineData = new Map<string, number>();
        let totalEarnings = 0;

        // Process active subscriptions
        earningsData.active.forEach(sub => {
          const date = new Date(sub.createdAt).toISOString().split('T')[0];
          const amount = parseFloat(sub.planAmount) || 0;
          const currentEarnings = earningsTimelineData.get(date) || 0;
          earningsTimelineData.set(date, currentEarnings + amount);
          totalEarnings += amount;
        });

        // Process cancelled subscriptions
        earningsData.cancelled.forEach(sub => {
          const date = new Date(sub.createdAt).toISOString().split('T')[0];
          const amount = parseFloat(sub.planAmount) || 0;
          const currentEarnings = earningsTimelineData.get(date) || 0;
          earningsTimelineData.set(date, currentEarnings + amount);
          totalEarnings += amount;
        });

        // Convert to array and sort by date
        const earningsTimeline = Array.from(earningsTimelineData.entries())
          .map(([date, earnings]) => ({ date, earnings }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setEarningsStats({
          totalEarnings,
          timeline: earningsTimeline
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setModalMessage({ type: 'error', message: 'Failed to load user data' });
      setIsUnsubscribeModalVisible(true);
    }
  };

  const handleCreateGroup = () => {
    if (hasExistingGroup) {
      router.push('/already-have-group');
      return;
    }
    router.push('/my_page');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleUnsubscribe = (creatorName: string, subscriptionId: string) => {
    setSelectedCreator({ name: creatorName, subscriptionId });
    setIsUnsubscribeModalVisible(true);
  };

  const confirmUnsubscribe = async () => {
    if (!selectedCreator) return;
    
    setIsProcessingUnsubscribe(true);

    try {
      await cancelSubscription(selectedCreator.subscriptionId);
      setModalMessage({ type: 'success', message: `Successfully unsubscribed from ${selectedCreator.name}` });
      
      // Refresh subscriptions list
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Delete expired subscriptions first
        await deleteExpiredSubscriptions(currentUser.$id);
        
        const updatedSubscriptions = await getUserSubscriptions(currentUser.$id);
        const mappedSubscriptions = updatedSubscriptions
          .map(sub => ({
            $id: sub.$id,
            userId: sub.userId,
            status: sub.status as 'active' | 'cancelled' | 'expired',
            createdAt: sub.createdAt,
            planCurrency: sub.planCurrency,
            planInterval: sub.planInterval,
            creatorName: sub.creatorName,
            creatorAccountId: sub.creatorAccountId,
            renewalDate: sub.renewalDate,
            stripeSubscriptionId: sub.stripeSubscriptionId,
            endsAt: sub.endsAt,
            cancelledAt: sub.cancelledAt
          }))
          .filter((sub, index, self) => {
            if (sub.status === 'cancelled' || sub.status === 'expired') return true;
            
            const hasCancelledCounterpart = self.some(
              otherSub => 
                (otherSub.status === 'cancelled' || otherSub.status === 'expired') && 
                otherSub.stripeSubscriptionId === sub.stripeSubscriptionId
            );
            
            return !hasCancelledCounterpart;
          });
        setSubscriptions(mappedSubscriptions);
      }
    } catch (error) {
      setModalMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to unsubscribe'
      });
    } finally {
      setIsProcessingUnsubscribe(false);
    }
  };

  const closeModal = () => {
    setIsUnsubscribeModalVisible(false);
    setSelectedCreator(null);
    setModalMessage(null);
  };

  const renderContent = () => {
    switch (selectedToggle) {
      case 'creators':
        return (
          <ScrollView 
            className="w-full" 
            contentContainerStyle={{ paddingTop: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {subscriptions.length > 0 ? (
              subscriptions.map((subscription) => {
                const isActive = subscription.status === 'active';
                const isCancelled = subscription.status === 'cancelled';
                const isExpired = subscription.status === 'expired';
                const endDate = subscription.endsAt ? new Date(subscription.endsAt) : null;
                const hasExpired = endDate && endDate < new Date();

                return (
                  <View 
                    key={subscription.$id}
                    className="mb-3"
                  >
                    {isActive ? (
                      <View style={{
                        padding: 1,
                        borderRadius: 20,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        width: '100%',
                      }}>
                        <LinearGradient
                          colors={['#FB2355', '#FFD700', '#FB2355']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            padding: 1,
                            borderRadius: 19,
                            width: '100%',
                          }}
                        >
                          <View style={{
                            backgroundColor: '#1A1A1A',
                            borderRadius: 18,
                            overflow: 'hidden',
                            width: '100%',
                            padding: 12,
                          }}>
                            <View className="flex-row justify-between items-start mb-1">
                              <View>
                                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', fontWeight: 'bold' }}>
                                  {subscription.creatorName}
                                </Text>
                              </View>
                              <TouchableOpacity 
                                className="bg-[#FB2355] px-3 py-1 rounded-full"
                                onPress={() => handleUnsubscribe(subscription.creatorName, subscription.stripeSubscriptionId)}
                              >
                                <Text style={{ color: 'white', fontFamily: 'questrial' }}>Unsubscribe</Text>
                              </TouchableOpacity>
                            </View>
                            <View className="flex-row justify-between mb-1">
                              <Text style={{ color: '#888', fontFamily: 'questrial', fontSize: 13 }}>Plan:</Text>
                              <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 13 }}>
                                {subscription.planInterval}ly ({subscription.planCurrency})
                              </Text>
                            </View>
                            <View className="flex-row justify-between mb-1">
                              <Text style={{ color: '#888', fontFamily: 'questrial', fontSize: 13 }}>Subscribed:</Text>
                              <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 13 }}>
                                {formatDate(subscription.createdAt)}
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text style={{ color: '#888', fontFamily: 'questrial', fontSize: 13 }}>Renews:</Text>
                              <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 13 }}>
                                {formatDate(subscription.renewalDate)}
                              </Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </View>
                    ) : (
                      <View className="bg-[#1A1A1A] rounded-lg p-3 border border-red-500">
                        <View className="flex-row justify-between items-start mb-1">
                          <View>
                            <Text style={{ color: '#F44336', fontSize: 16, fontFamily: 'questrial', fontWeight: 'bold' }}>
                              {subscription.creatorName}
                            </Text>
                            {isCancelled && !hasExpired && subscription.endsAt && (
                              <Text style={{ color: '#F44336', fontFamily: 'questrial', fontSize: 11 }}>
                                Access until {formatDate(subscription.endsAt)}
                              </Text>
                            )}
                            {isCancelled && hasExpired && subscription.endsAt && (
                              <Text style={{ color: '#F44336', fontFamily: 'questrial', fontSize: 11 }}>
                                Expired on {formatDate(subscription.endsAt)}
                              </Text>
                            )}
                            {isExpired && subscription.endsAt && (
                              <Text style={{ color: '#F44336', fontFamily: 'questrial', fontSize: 11 }}>
                                Expired on {formatDate(subscription.endsAt)}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View className="flex-row justify-between mb-1">
                          <Text style={{ color: '#888', fontFamily: 'questrial', fontSize: 13 }}>Plan:</Text>
                          <Text style={{ color: '#F44336', fontFamily: 'questrial', fontSize: 13 }}>
                            {subscription.planInterval}ly ({subscription.planCurrency})
                          </Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                          <Text style={{ color: '#888', fontFamily: 'questrial', fontSize: 13 }}>Subscribed:</Text>
                          <Text style={{ color: '#F44336', fontFamily: 'questrial', fontSize: 13 }}>
                            {formatDate(subscription.createdAt)}
                          </Text>
                        </View>
                        {subscription.endsAt && (
                          <View className="flex-row justify-between">
                            <Text style={{ color: '#888', fontFamily: 'questrial', fontSize: 13 }}>Access until:</Text>
                            <Text style={{ color: '#F44336', fontFamily: 'questrial', fontSize: 13 }}>
                              {formatDate(subscription.endsAt)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View className="items-center justify-center py-8">
                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }}>
                  You haven't subscribed to any creators yet
                </Text>
              </View>
            )}
          </ScrollView>
        );
      case 'membership':
        return (
          <ScrollView className="w-full" contentContainerStyle={{ paddingTop: 20 }}>
            <View className="bg-[#1A1A1A] rounded-lg p-4 mb-4">
              <Text style={{ color: 'white', fontSize: 18, fontFamily: 'questrial', marginBottom: 16 }}>
                Subscription Statistics
              </Text>
              <View className="flex-row justify-between mb-4">
                <View className="bg-[#2A2A2A] p-4 rounded-lg flex-1 mr-2">
                  <Text style={{ color: '#4CAF50', fontSize: 24, fontFamily: 'questrial', textAlign: 'center' }}>
                    {subscriptionStats.active}
                  </Text>
                  <Text style={{ color: 'white', fontSize: 14, fontFamily: 'questrial', textAlign: 'center' }}>
                    Active Followers
                  </Text>
                </View>
                <View className="bg-[#2A2A2A] p-4 rounded-lg flex-1 ml-2">
                  <Text style={{ color: '#F44336', fontSize: 24, fontFamily: 'questrial', textAlign: 'center' }}>
                    {subscriptionStats.cancelled}
                  </Text>
                  <Text style={{ color: 'white', fontSize: 14, fontFamily: 'questrial', textAlign: 'center' }}>
                    Cancelled Followers
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-[#1A1A1A] rounded-lg p-4">
              <Text style={{ color: 'white', fontSize: 18, fontFamily: 'questrial', marginBottom: 16 }}>
                Follower Growth Over Time
              </Text>
              {subscriptionStats.timeline.length > 0 ? (
                <LineChart
                  data={{
                    labels: subscriptionStats.timeline.map(item => 
                      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ),
                    datasets: [
                      {
                        data: subscriptionStats.timeline.map(item => item.active),
                        color: () => '#4CAF50',
                        strokeWidth: 2
                      }
                    ]
                  }}
                  width={Dimensions.get('window').width - 48}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#1A1A1A',
                    backgroundGradientFrom: '#1A1A1A',
                    backgroundGradientTo: '#1A1A1A',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2'
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              ) : (
                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }}>
                  No data available yet
                </Text>
              )}
            </View>
          </ScrollView>
        );
      case 'earnings':
        return (
          <ScrollView className="w-full" contentContainerStyle={{ paddingTop: 20 }}>
            <View className="bg-[#1A1A1A] rounded-lg p-4 mb-4">
              <Text style={{ color: 'white', fontSize: 18, fontFamily: 'questrial', marginBottom: 16 }}>
                Earnings Overview
              </Text>
              <View className="bg-[#2A2A2A] p-4 rounded-lg">
                <Text style={{ color: '#4CAF50', fontSize: 32, fontFamily: 'questrial', textAlign: 'center' }}>
                  ${earningsStats.totalEarnings.toFixed(2)}
                </Text>
                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }}>
                  Total Earnings
                </Text>
              </View>
            </View>

            <View className="bg-[#1A1A1A] rounded-lg p-4">
              <Text style={{ color: 'white', fontSize: 18, fontFamily: 'questrial', marginBottom: 16 }}>
                Earnings Over Time
              </Text>
              {earningsStats.timeline.length > 0 ? (
                <LineChart
                  data={{
                    labels: earningsStats.timeline.map(item => 
                      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ),
                    datasets: [
                      {
                        data: earningsStats.timeline.map(item => item.earnings),
                        color: () => '#4CAF50',
                        strokeWidth: 2
                      }
                    ]
                  }}
                  width={Dimensions.get('window').width - 48}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#1A1A1A',
                    backgroundGradientFrom: '#1A1A1A',
                    backgroundGradientTo: '#1A1A1A',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2'
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              ) : (
                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }}>
                  No earnings data available yet
                </Text>
              )}
            </View>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Fixed Header with cherry icon and title */}
      <View className="flex-row items-center px-4 pt-1 pb-2">
        <TouchableOpacity 
          onPress={() => router.push('/')} 
          className="absolute left-4 z-10"
        >
          <Image 
            source={require('../../../assets/images/cherry-icon.png')}
            className="w-14 h-14"
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 0 }}>
          <Text style={{ color: 'white', fontSize: 38, fontWeight: 'bold', textAlign: 'center', fontFamily: 'questrial' }}>
            Cherrizbox
            <Text style={{ color: '#FB2355', fontFamily: 'questrial' }}>.</Text>
          </Text>
          <Text style={{
            color: '#FB2355',
            fontSize: 18,
            fontFamily: 'questrial',
            textAlign: 'center',
            marginTop: -3,
            letterSpacing: 2,
          }}>
            creator
          </Text>
        </View>
      </View>

      {/* Fixed Profile Picture Section */}
      <View className="items-center mb-6">
        <View className="w-32 h-32 rounded-full bg-[#1A1A1A] items-center justify-center mb-3 overflow-hidden">
          {profile?.profileImageUri ? (
            <Image
              source={{ uri: profile.profileImageUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>{currentUser?.name?.[0] || 'P'}</Text>
          )}
        </View>
        <View className="w-full px-6 relative">
          <Text style={{ color: 'white', fontSize: 20, textAlign: 'center', fontFamily: 'questrial' }}>
            {currentUser?.name || 'Profile Name'}
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/(root)/(tabs)/settings')} 
            className="absolute right-12 top-3"
          >
            <Image 
              source={require('../../../assets/icon/settings.png')}
              className="w-9 h-9"
              resizeMode="contain"
              style={{ tintColor: 'white' }}
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center justify-center mb-4">
          <Text style={{ color: 'white', fontSize: 14, fontFamily: 'questrial' }}>
            {currentUser?.email || 'email@example.com'}
          </Text>
          <Image 
            source={require('../../../assets/icon/ok.png')}
            className="w-4 h-4 ml-2"
            resizeMode="contain"
            style={{ tintColor: '#4CAF50' }}
          />
        </View>
        
        {/* Fixed Action Buttons */}
        <View className="w-full px-6 mb-2">
          <TouchableOpacity 
            className="w-full bg-[#1A1A1A] py-2 rounded-lg items-center flex-row justify-center mb-1"
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={{ color: 'white', fontFamily: 'questrial' }}>Edit Profile</Text>
            <Image 
              source={require('../../../assets/icon/down_arrow.png')}
              className="w-5 h-5 ml-2"
              resizeMode="contain"
              style={{ tintColor: 'white' }}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="w-full bg-[#1A1A1A] py-3 rounded-lg items-center flex-row justify-center mb-1"
            onPress={() => router.push('/payment-methods' as any)}
          >
            <Text style={{ color: 'white', fontFamily: 'questrial' }}>Add Payment Methods</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="w-full py-4 rounded-lg items-center mb-2"
            style={{ 
              backgroundColor: hasExistingGroup ? '#1A1A1A' : '#1A1A1A', 
              borderWidth: 2, 
              borderColor: hasExistingGroup ? '#666' : '#FB2355' 
            }}
            onPress={handleCreateGroup}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name="chatbubble-ellipses-outline" 
                size={22} 
                color={hasExistingGroup ? '#666' : '#FB2355'} 
                style={{ marginRight: 10 }} 
              />
              <Text style={{ 
                color: hasExistingGroup ? '#666' : 'white', 
                fontSize: 22, 
                fontFamily: 'questrial' 
              }}>
                {hasExistingGroup ? 'Chat Group Active' : 'Create my Chat group'}
              </Text>
              <Ionicons 
                name="chatbubble-ellipses-outline" 
                size={22} 
                color={hasExistingGroup ? '#666' : '#FB2355'} 
                style={{ marginLeft: 10 }} 
              />
            </View>
          </TouchableOpacity>

          {/* Toggle Section */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#1A1A1A',
            borderRadius: 999,
            marginBottom: -20,
            overflow: 'hidden',
            position: 'relative',
            height: 36,
          }}>
            {/* Pink slider */}
            <View style={{
              position: 'absolute',
              top: 4,
              left: `${(100 / 3) * toggleIndex}%`,
              width: '33.33%',
              height: 28,
              backgroundColor: '#FB2355',
              borderRadius: 999,
              zIndex: 1,
            }} />
            {toggleOptions.map((option, idx) => (
              <Pressable
                key={option}
                onPress={() => setSelectedToggle(option)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2, paddingVertical: 4 }}
              >
                <Text className={`font-questrial ${selectedToggle === option ? 'text-white' : 'text-gray-400'}`} style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Scrollable Content Area */}
      <View style={{ flex: 1, paddingHorizontal: 24, marginTop: -4 }}>
        {renderContent()}
      </View>

      <Modal
        isVisible={isUnsubscribeModalVisible}
        onBackdropPress={closeModal}
        onBackButtonPress={closeModal}
        style={{ margin: 0, justifyContent: 'center', alignItems: 'center' }}
      >
        <View className="bg-[#1A1A1A] rounded-2xl p-6 w-[90%] max-w-[400px]">
          {modalMessage ? (
            <>
              <Text style={[
                { color: modalMessage.type === 'success' ? '#4CAF50' : '#F44336' },
                { fontSize: 20, fontFamily: 'questrial', fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }
              ]}>
                {modalMessage.type === 'success' ? 'Success' : 'Error'}
              </Text>
              <Text style={[
                { color: 'white', fontSize: 16, fontFamily: 'questrial', textAlign: 'center', marginBottom: 24 }
              ]}>
                {modalMessage.message}
              </Text>
              <TouchableOpacity
                style={[
                  { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
                  { marginTop: 24 }
                ]}
                onPress={closeModal}
              >
                <Text style={[
                  { color: 'white', fontFamily: 'questrial', fontSize: 16, fontWeight: 'bold' }
                ]}>
                  OK
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ color: 'white', fontSize: 20, fontFamily: 'questrial', fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                Confirm Unsubscribe
              </Text>
              <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', textAlign: 'center', marginBottom: 24 }}>
                Are you sure you want to unsubscribe from {selectedCreator?.name}?
              </Text>
              <View className="flex-row justify-between">
                <TouchableOpacity
                  style={[
                    { backgroundColor: '#F44336', padding: 12, borderRadius: 8, flex: 1, marginRight: 2 }
                  ]}
                  onPress={confirmUnsubscribe}
                  disabled={isProcessingUnsubscribe}
                >
                  <Text style={[
                    { color: 'white', fontFamily: 'questrial', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }
                  ]}>
                    {isProcessingUnsubscribe ? 'Processing...' : 'Unsubscribe'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    { backgroundColor: '#9E9E9E', padding: 12, borderRadius: 8, flex: 1, marginLeft: 2 }
                  ]}
                  onPress={closeModal}
                  disabled={isProcessingUnsubscribe}
                >
                  <Text style={[
                    { color: 'white', fontFamily: 'questrial', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }
                  ]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  )
}
