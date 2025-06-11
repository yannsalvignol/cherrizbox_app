import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Image, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Modal from 'react-native-modal'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getCurrentUser, getUserProfile, getUserSubscriptions } from '../../../lib/appwrite'
import { cancelSubscription } from '../../../lib/subscription'

interface Subscription {
    $id: string;
    userId: string;
    status: 'active' | 'cancelled';
    createdAt: string;
    planCurrency: string;
    planInterval: string;
    creatorName: string;
    creatorAccountId: string;
    renewalDate: string;
    stripeSubscriptionId: string;
}

export default function Profile() {
  const router = useRouter();
  const [isPaidContent, setIsPaidContent] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isUnsubscribeModalVisible, setIsUnsubscribeModalVisible] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<{ name: string; subscriptionId: string } | null>(null);
  const [isProcessingUnsubscribe, setIsProcessingUnsubscribe] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const userProfile = await getUserProfile(currentUser.$id);
        setProfile(userProfile);
        
        const userSubscriptions = await getUserSubscriptions(currentUser.$id);
        
        // Filter out active subscriptions that have a cancelled counterpart
        const filteredSubscriptions = userSubscriptions.filter((sub, index, self) => {
          if (sub.status === 'cancelled') return true;
          
          // If this is an active subscription, check if there's a cancelled one with the same stripeSubscriptionId
          const hasCancelledCounterpart = self.some(
            otherSub => 
              otherSub.status === 'cancelled' && 
              otherSub.stripeSubscriptionId === sub.stripeSubscriptionId
          );
          
          return !hasCancelledCounterpart;
        });

        setSubscriptions(filteredSubscriptions);
      }
    } catch (error) {
      setModalMessage({ type: 'error', message: 'Failed to load user data' });
      setIsUnsubscribeModalVisible(true);
    }
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
        const updatedSubscriptions = await getUserSubscriptions(currentUser.$id);
        setSubscriptions(updatedSubscriptions);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Header with cherry icon and title */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity 
          onPress={() => router.replace('/(root)/(tabs)/')} 
          className="absolute left-4 z-10"
        >
          <Image 
            source={require('../../../assets/images/cherry-icon.png')}
            className="w-14 h-14"
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <Text style={{ color: 'white', fontSize: 38, fontWeight: 'bold', textAlign: 'center', flex: 1, fontFamily: 'questrial' }}>
          Cherrybox<Text style={{ color: '#FB2355', fontFamily: 'questrial' }}>.</Text>
        </Text>
      </View>

      {/* Profile Picture Section */}
      <View className="items-center mb-6">
        <View className="w-32 h-32 rounded-full bg-[#1A1A1A] items-center justify-center mb-3 overflow-hidden">
          {profile?.profileImageUri ? (
            <Image
              source={{ uri: profile.profileImageUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>{user?.name?.[0] || 'P'}</Text>
          )}
        </View>
        <View className="w-full px-6 relative">
          <Text style={{ color: 'white', fontSize: 20, textAlign: 'center', fontFamily: 'questrial' }}>
            {user?.name || 'Profile Name'}
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
            {user?.email || 'email@example.com'}
          </Text>
          <Image 
            source={require('../../../assets/icon/ok.png')}
            className="w-4 h-4 ml-2"
            resizeMode="contain"
            style={{ tintColor: '#4CAF50' }}
          />
        </View>
        
        {/* Action Buttons */}
        <View className="w-full px-6">
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
            className="w-full bg-[#1A1A1A] py-3 rounded-lg items-center flex-row justify-center mb-6"
            onPress={() => router.push('/payment-methods')}
          >
            <Text style={{ color: 'white', fontFamily: 'questrial' }}>Add Payment Methods</Text>
          </TouchableOpacity>
          
          {/* Custom Content Type Toggle */}
          <View className="w-full items-center mb-4">
            <View className="flex-row bg-[#1A1A1A] rounded-full overflow-hidden relative p-1">
              {/* Sliding pink background */}
              <View 
                className={`absolute w-1/2 h-full rounded-full bg-[#FB2355] top-1 ${
                  isPaidContent ? 'right-1' : 'left-1'
                }`}
              />
              
              {/* Toggle options */}
              <Pressable 
                onPress={() => setIsPaidContent(false)}
                className="flex-1 py-2 px-8 items-center z-10"
              >
                <Text className={`font-questrial ${!isPaidContent ? 'text-white' : 'text-gray-400'}`}>
                  My Creators
                </Text>
              </Pressable>
              <Pressable 
                onPress={() => setIsPaidContent(true)}
                className="flex-1 py-2 px-8 items-center z-10"
              >
                <Text className={`font-questrial ${isPaidContent ? 'text-white' : 'text-gray-400'}`}>
                  Other
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Subscriptions List */}
          {!isPaidContent && (
            <ScrollView className="w-full">
              {subscriptions.length > 0 ? (
                subscriptions.map((subscription) => (
                  <View 
                    key={subscription.$id}
                    className={`bg-[#1A1A1A] rounded-lg p-4 mb-3 ${subscription.status === 'cancelled' ? 'border border-red-500' : ''}`}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View>
                        <Text style={[
                          { fontSize: 18, fontFamily: 'questrial', fontWeight: 'bold' },
                          { color: subscription.status === 'cancelled' ? '#F44336' : 'white' }
                        ]}>
                          {subscription.creatorName}
                        </Text>
                        {subscription.status === 'cancelled' && (
                          <Text style={{ color: '#F44336', fontFamily: 'questrial', fontSize: 12 }}>
                            Cancelled on {formatDate(subscription.createdAt)}
                          </Text>
                        )}
                      </View>
                      {subscription.status === 'active' && (
                        <TouchableOpacity 
                          className="bg-[#FB2355] px-3 py-1 rounded-full"
                          onPress={() => handleUnsubscribe(subscription.creatorName, subscription.stripeSubscriptionId)}
                        >
                          <Text style={{ color: 'white', fontFamily: 'questrial' }}>Unsubscribe</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text style={{ color: '#888', fontFamily: 'questrial' }}>Plan:</Text>
                      <Text style={[
                        { fontFamily: 'questrial' },
                        { color: subscription.status === 'cancelled' ? '#F44336' : 'white' }
                      ]}>
                        {subscription.planInterval}ly ({subscription.planCurrency})
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text style={{ color: '#888', fontFamily: 'questrial' }}>Subscribed:</Text>
                      <Text style={[
                        { fontFamily: 'questrial' },
                        { color: subscription.status === 'cancelled' ? '#F44336' : 'white' }
                      ]}>
                        {formatDate(subscription.createdAt)}
                      </Text>
                    </View>
                    {subscription.status === 'active' && (
                      <View className="flex-row justify-between">
                        <Text style={{ color: '#888', fontFamily: 'questrial' }}>Renews:</Text>
                        <Text style={{ color: 'white', fontFamily: 'questrial' }}>
                          {formatDate(subscription.renewalDate)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View className="items-center justify-center py-8">
                  <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }}>
                    You haven't subscribed to any creators yet
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
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
                    { backgroundColor: '#F44336', padding: 12, borderRadius: 8, flex: 1, marginRight: 2 },
                    { disabled: isProcessingUnsubscribe }
                  ]}
                  onPress={confirmUnsubscribe}
                  disabled={isProcessingUnsubscribe}
                >
                  <Text style={[
                    { color: 'white', fontFamily: 'questrial', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
                    { disabled: isProcessingUnsubscribe }
                  ]}>
                    {isProcessingUnsubscribe ? 'Processing...' : 'Unsubscribe'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    { backgroundColor: '#9E9E9E', padding: 12, borderRadius: 8, flex: 1, marginLeft: 2 },
                    { disabled: isProcessingUnsubscribe }
                  ]}
                  onPress={closeModal}
                  disabled={isProcessingUnsubscribe}
                >
                  <Text style={[
                    { color: 'white', fontFamily: 'questrial', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
                    { disabled: isProcessingUnsubscribe }
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
