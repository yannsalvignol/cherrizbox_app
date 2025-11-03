import { useGlobalContext } from '@/lib/global-provider';
import { useTheme } from '@/lib/themes/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelChatSubscription as cancelChatSubscriptionLib, getActiveChatSubscription } from '../lib/chat-subscription';
import { cancelSubscription } from '../lib/subscription';

interface ChatSubscription {
  $id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  planType: string;
  planAmount: number;
  planCurrency: string;
  customerEmail: string;
  customerName: string;
  paymentStatus: string;
  paymentMethod: string;
  startDate: string;
  renewalDate: string;
  createdAt: string;
}

export default function ManageSubscriptions() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, creators, refreshCreators } = useGlobalContext();
  const [chatSubscriptions, setChatSubscriptions] = useState<ChatSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState<string | null>(null);
  const [cancellingCreatorSubscription, setCancellingCreatorSubscription] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, [user]);

  const loadSubscriptions = async () => {
    if (!user?.$id) {
      setLoading(false);
      return;
    }

    try {
      console.log('  [ManageSubscriptions] Loading subscriptions for user:', user.$id);
      
      // Get active chat subscription
      const chatSub = await getActiveChatSubscription(user.$id);
      if (chatSub) {
        setChatSubscriptions([chatSub as ChatSubscription]);
        console.log(' [ManageSubscriptions] Found chat subscription:', chatSub.$id);
      } else {
        setChatSubscriptions([]);
        console.log('📭 [ManageSubscriptions] No active chat subscriptions found');
      }
    } catch (error) {
      console.error('  [ManageSubscriptions] Error loading subscriptions:', error);
      setChatSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCreators();
    await loadSubscriptions();
    setRefreshing(false);
  };

  const cancelChatSubscriptionHandler = async (subscription: ChatSubscription) => {
    Alert.alert(
      'Cancel Unlimited Chat Subscription',
      `Are you sure you want to cancel your unlimited chat subscription?\n\n• You'll lose unlimited messaging access\n• Your subscription will remain active until ${new Date(subscription.renewalDate).toLocaleDateString()}\n• You can resubscribe anytime`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setCancellingSubscription(subscription.$id);
            
            try {
              console.log('🚫 [ManageSubscriptions] Cancelling subscription:', subscription.stripeSubscriptionId);
              
              // Use the proper cancellation function
              await cancelChatSubscriptionLib(subscription.stripeSubscriptionId);
              
              Alert.alert(
                'Subscription Cancelled',
                'Your unlimited chat subscription has been cancelled. You can continue using unlimited chats until your current billing period ends.',
                [{ text: 'OK' }]
              );
              
              // Reload subscriptions
              loadSubscriptions();
            } catch (error: any) {
              console.error('  [ManageSubscriptions] Error cancelling subscription:', error);
              Alert.alert(
                'Cancellation Failed',
                `Failed to cancel subscription: ${error.message}`,
                [{ text: 'OK' }]
              );
            } finally {
              setCancellingSubscription(null);
            }
          }
        }
      ]
    );
  };

  const cancelCreatorSubscription = async (creatorName: string, subscriptionId: string) => {
    Alert.alert(
      'Cancel Creator Subscription',
      `Are you sure you want to cancel your subscription to ${creatorName}?\n\n• You'll lose access to their exclusive content\n• Your subscription will remain active until the current billing period ends\n• You can resubscribe anytime`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setCancellingCreatorSubscription(subscriptionId);
            
            try {
              console.log('🚫 [ManageSubscriptions] Cancelling creator subscription:', subscriptionId);
              
              await cancelSubscription(subscriptionId);
              
              Alert.alert(
                'Subscription Cancelled',
                `Your subscription to ${creatorName} has been cancelled. You can continue accessing their content until your current billing period ends.`,
                [{ text: 'OK' }]
              );
              
              // Refresh creators list
              await refreshCreators();
            } catch (error: any) {
              console.error('  [ManageSubscriptions] Error cancelling creator subscription:', error);
              Alert.alert(
                'Cancellation Failed',
                `Failed to cancel subscription: ${error.message}`,
                [{ text: 'OK' }]
              );
            } finally {
              setCancellingCreatorSubscription(null);
            }
          }
        }
      ]
    );
  };

  const formatPrice = (amount: number, currency: string) => {
    const price = amount / 100; // Convert from cents
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderCreatorSubscription = (subscription: any) => {
    const isActive = subscription.status === 'active';
    const isCancelled = subscription.status === 'cancelled';
    const endDate = subscription.endsAt ? new Date(subscription.endsAt) : null;
    const isExpired = endDate && endDate < new Date();

    return (
      <View
        key={subscription.$id}
        style={{
          backgroundColor: theme.cardBackground,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: isCancelled ? theme.error : 
                     isActive ? theme.primary : theme.border,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: isCancelled ? theme.error : 
                     isActive ? theme.primary : theme.text,
              fontSize: 18,
              fontFamily: 'Urbanist-Bold',
              fontWeight: 'bold',
            }}>
              {subscription.creatorName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View style={{
                backgroundColor: isActive ? theme.primary : 
                               isCancelled ? theme.error : theme.textTertiary,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
                marginRight: 8,
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 10,
                  fontFamily: 'Urbanist-Bold',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}>
                  {isCancelled && isExpired ? 'EXPIRED' : subscription.status}
                </Text>
              </View>
              <Text style={{
                color: theme.textSecondary,
                fontSize: 12,
                fontFamily: 'Urbanist-Medium',
              }}>
                {subscription.planInterval}ly Plan
              </Text>
            </View>
            {isCancelled && !isExpired && (
              <Text style={{ 
                color: theme.error, 
                fontSize: 12, 
                fontFamily: 'Urbanist-Medium',
                marginTop: 4 
              }}>
                Access until {formatDate(subscription.endsAt)}
              </Text>
            )}
          </View>
          
          {/* Cancel Button */}
          {isActive && (
            <TouchableOpacity
              onPress={() => cancelCreatorSubscription(subscription.creatorName, subscription.stripeSubscriptionId)}
              disabled={cancellingCreatorSubscription === subscription.stripeSubscriptionId}
              style={{
                backgroundColor: theme.error,
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                opacity: cancellingCreatorSubscription === subscription.stripeSubscriptionId ? 0.5 : 1,
              }}
            >
              {cancellingCreatorSubscription === subscription.stripeSubscriptionId ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{
                  color: 'white',
                  fontSize: 12,
                  fontFamily: 'Urbanist-Bold',
                  fontWeight: 'bold',
                }}>
                  Cancel
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Details */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Urbanist-Medium' }}>
              Plan
            </Text>
            <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Urbanist-SemiBold' }}>
              {subscription.planInterval}ly ({subscription.planCurrency?.toUpperCase()})
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Urbanist-Medium' }}>
              Subscribed
            </Text>
            <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Urbanist-SemiBold' }}>
              {formatDate(subscription.createdAt)}
            </Text>
          </View>
          {isActive && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Urbanist-Medium' }}>
                Next Billing
              </Text>
              <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Urbanist-SemiBold' }}>
                {formatDate(subscription.renewalDate)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderChatSubscription = (subscription: ChatSubscription) => (
    <View
      key={subscription.$id}
      style={{
        backgroundColor: theme.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: subscription.status === 'active' ? '#10b981' : theme.border,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          backgroundColor: '#10b981',
          borderRadius: 8,
          width: 32,
          height: 32,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          <Ionicons name="infinite" size={18} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: theme.text,
            fontSize: 18,
            fontFamily: 'Urbanist-Bold',
            fontWeight: 'bold',
          }}>
            Unlimited Chat Subscription
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={{
              backgroundColor: subscription.status === 'active' ? '#10b981' : theme.textTertiary,
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginRight: 8,
            }}>
              <Text style={{
                color: 'white',
                fontSize: 10,
                fontFamily: 'Urbanist-Bold',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}>
                {subscription.status}
              </Text>
            </View>
            <Text style={{
              color: theme.textSecondary,
              fontSize: 12,
              fontFamily: 'Urbanist-Medium',
            }}>
              {subscription.planType === 'year' ? 'Yearly' : 'Monthly'} Plan
            </Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Urbanist-Medium' }}>
            Price
          </Text>
          <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Urbanist-SemiBold' }}>
            {formatPrice(subscription.planAmount, subscription.planCurrency)} / {subscription.planType === 'year' ? 'year' : 'month'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Urbanist-Medium' }}>
            Started
          </Text>
          <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Urbanist-SemiBold' }}>
            {formatDate(subscription.startDate)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Urbanist-Medium' }}>
            {subscription.status === 'active' ? 'Next Billing' : 'Expires'}
          </Text>
          <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Urbanist-SemiBold' }}>
            {formatDate(subscription.renewalDate)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Urbanist-Medium' }}>
            Payment Method
          </Text>
          <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Urbanist-SemiBold', textTransform: 'capitalize' }}>
            {subscription.paymentMethod}
          </Text>
        </View>
      </View>

      {/* Cancel Button */}
      {subscription.status === 'active' && (
         <TouchableOpacity
           onPress={() => cancelChatSubscriptionHandler(subscription)}
           disabled={cancellingSubscription === subscription.$id}
          style={{
            backgroundColor: theme.error,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: cancellingSubscription === subscription.$id ? 0.5 : 1,
          }}
        >
          {cancellingSubscription === subscription.$id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontFamily: 'Urbanist-Bold',
                fontWeight: 'bold',
              }}>
                Cancel Subscription
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons 
            name="chevron-back-outline" 
            size={32} 
            color={theme.text} 
            style={{ marginRight: 4 }}
          />
          <Text style={{ 
            color: theme.text, 
            fontSize: 24, 
            marginLeft: 8, 
            fontFamily: 'Nunito-Bold' 
          }}>
            Manage Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{
              color: theme.textSecondary,
              fontSize: 16,
              fontFamily: 'Urbanist-Medium',
              marginTop: 16,
            }}>
              Loading subscriptions...
            </Text>
          </View>
        ) : (
          <>
            {/* Chat Subscriptions Section */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{
                color: theme.primary,
                fontFamily: 'Nunito-Bold',
                fontSize: 20,
                marginBottom: 16,
              }}>
                Chat Subscriptions
              </Text>
              
              {chatSubscriptions.length > 0 ? (
                chatSubscriptions.map(renderChatSubscription)
              ) : (
                <View style={{
                  backgroundColor: theme.cardBackground,
                  borderRadius: 12,
                  padding: 24,
                  alignItems: 'center',
                }}>
                  <Ionicons name="chatbubbles-outline" size={48} color={theme.textTertiary} />
                  <Text style={{
                    color: theme.textSecondary,
                    fontSize: 16,
                    fontFamily: 'Urbanist-Medium',
                    textAlign: 'center',
                    marginTop: 12,
                  }}>
                    No active chat subscriptions
                  </Text>
                  <Text style={{
                    color: theme.textTertiary,
                    fontSize: 14,
                    fontFamily: 'Urbanist-Regular',
                    textAlign: 'center',
                    marginTop: 4,
                  }}>
                    Subscribe to unlimited chats with your favorite creators
                  </Text>
                </View>
              )}
            </View>

            {/* Creator Subscriptions Section */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{
                color: theme.primary,
                fontFamily: 'Nunito-Bold',
                fontSize: 20,
                marginBottom: 16,
              }}>
                Creator Subscriptions
              </Text>
              
              {creators.length > 0 ? (
                creators.map(renderCreatorSubscription)
              ) : (
                <View style={{
                  backgroundColor: theme.cardBackground,
                  borderRadius: 12,
                  padding: 24,
                  alignItems: 'center',
                }}>
                  <Ionicons name="person-outline" size={48} color={theme.textTertiary} />
                  <Text style={{
                    color: theme.textSecondary,
                    fontSize: 16,
                    fontFamily: 'Urbanist-Medium',
                    textAlign: 'center',
                    marginTop: 12,
                  }}>
                    No creator subscriptions
                  </Text>
                  <Text style={{
                    color: theme.textTertiary,
                    fontSize: 14,
                    fontFamily: 'Urbanist-Regular',
                    textAlign: 'center',
                    marginTop: 4,
                  }}>
                    Subscribe to creators to access their exclusive content
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
