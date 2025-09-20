import EarningsChart from '@/app/components/charts/EarningsChart';
import CircularProgress from '@/app/components/CircularProgress';
import { NetworkErrorModal, StripeConnectModal } from '@/app/components/modals';
import { useGlobalContext } from '@/lib/global-provider';
import { formatPrice } from '@/lib/index-utils';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface EarningsTabProps {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  shouldHighlightSetup: boolean;
  setShouldHighlightSetup: (value: boolean) => void;
  missingChannelConditions: string[];
  preloadedFinancials?: any;
  preloadedCurrency?: string;
  preloadedStripeData?: any;
  preloadedDailyGoal?: number;
  preloadedWeeklyGoal?: number;
}

interface StripeConnectProfile {
  stripeConnectAccountId?: string;
  stripeConnectEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  stripeConnectVerified?: boolean;
  stripeConnectSetupComplete?: boolean;
  stripeConnectSetupDate?: string;
  lifetimeVolume?: number;
  stripeBalanceAvailable?: number;
  stripeBalancePending?: number;
  payoutsInTransitAmount?: number;
  payoutsPendingAmount?: number;
  stripeLastBalanceUpdate?: string;
  currentPeriodGross?: number;
  previousPeriodGross?: number;
  lifetimeGross?: number;
  currentPeriodStart?: string;
  number_of_photos?: number;
  number_of_videos?: number;
  number_of_files?: number;
  number_of_monthly_subscribers?: number;
  number_of_yearly_subscriptions?: number;
  number_of_cancelled_monthly_sub?: number;
  number_of_cancelled_yearly_sub?: number;
  dailyEarnings?: string;
  todayEarnings?: number;
  weekEarnings?: number;
  monthEarnings?: number;
  yearEarnings?: number;
  dailySubscribersStats?: string;
}

export default function EarningsTab({ 
  refreshing, 
  onRefresh, 
  shouldHighlightSetup, 
  setShouldHighlightSetup,
  missingChannelConditions,
  preloadedFinancials,
  preloadedCurrency,
  preloadedStripeData,
  preloadedDailyGoal,
  preloadedWeeklyGoal 
}: EarningsTabProps) {
  const { theme } = useTheme();
  const { user, refreshChannelConditions } = useGlobalContext();
  const router = useRouter();
  
  const [creatorFinancials, setCreatorFinancials] = useState<StripeConnectProfile | null>(preloadedFinancials || null);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(false);
  const [earningsTimeframe, setEarningsTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [dailyGoal, setDailyGoal] = useState(preloadedDailyGoal || 0);
  const [weeklyGoal, setWeeklyGoal] = useState(preloadedWeeklyGoal || 0);
  const [userCurrency, setUserCurrency] = useState(preloadedCurrency || 'USD');
  const [openInfoBubble, setOpenInfoBubble] = useState<null | 'available' | 'pending' | 'total' | 'transit' | 'earnings'>(null);
  const [showPaymentStatusInfo, setShowPaymentStatusInfo] = useState(false);
  const [isLoadingStripeConnect, setIsLoadingStripeConnect] = useState(false);
  const [showStripeConnect, setShowStripeConnect] = useState(false);
  const [stripeConnectUrl, setStripeConnectUrl] = useState<string>('');
  const [showNetworkErrorModal, setShowNetworkErrorModal] = useState(false);
  
  const setupButtonAnimation = useRef(new Animated.Value(1)).current;
  const earningsScrollRef = useRef<ScrollView>(null);

  // Helper function to calculate earnings for different timeframes
  const calculateTimeframeEarnings = (dailyEarnings: any, timeframe: 'weekly' | 'monthly' | 'yearly') => {
    if (!dailyEarnings || typeof dailyEarnings !== 'object') return 0;
    
    const today = new Date();
    let total = 0;
    
    if (timeframe === 'weekly') {
      // Last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        if (dailyEarnings[dateStr]) {
          total += dailyEarnings[dateStr];
        }
      }
    } else if (timeframe === 'monthly') {
      // Last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        if (dailyEarnings[dateStr]) {
          total += dailyEarnings[dateStr];
        }
      }
    } else if (timeframe === 'yearly') {
      // Last 365 days
      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        if (dailyEarnings[dateStr]) {
          total += dailyEarnings[dateStr];
        }
      }
    }
    
    return total;
  };

  const loadUserCurrency = async () => {
    if (!user?.$id) return;
    
    try {
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      const userProfiles = await databases.listDocuments(
        config.databaseId,
        process.env.EXPO_PUBLIC_APPWRITE_PROFILE_COLLECTION_ID!,
        [Query.equal('userId', user.$id)]
      );
      
      if (userProfiles.documents.length > 0) {
        const currency = userProfiles.documents[0].currency || 'USD';
        setUserCurrency(currency);
        console.log('💰 [Earnings] Loaded user currency:', currency);
      }
    } catch (error) {
      console.error('❌ [Earnings] Error loading user currency:', error);
      setUserCurrency('USD'); // Default fallback
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
        process.env.EXPO_PUBLIC_APPWRITE_CREATOR_COLLECTION_ID!,
        [Query.equal('creatorId', user.$id)]
      );

      if (creatorResponse.documents.length > 0) {
        const creatorData = creatorResponse.documents[0];
        console.log('📊 [Earnings] Creator financial data loaded:', {
          currentPeriodGross: creatorData.currentPeriodGross,
          previousPeriodGross: creatorData.previousPeriodGross,
          lifetimeGross: creatorData.lifetimeGross,
          currentPeriodStart: creatorData.currentPeriodStart,
          lifetimeVolume: creatorData.lifetimeVolume,
          stripeConnectAccountId: creatorData.stripeConnectAccountId
        });
        setCreatorFinancials(creatorData as StripeConnectProfile);
        console.log('✅ [Earnings] Loaded creator financial data.');
        return creatorData;
      } else {
        console.log('❌ [Earnings] No creator document found for this user.');
        setCreatorFinancials(null);
        return null;
      }
    } catch (error) {  
      console.error('❌ [Earnings] Error loading creator financials:', error);
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
      console.log('🔄 [Earnings] Calling Stripe balance API for account:', creatorFinancials.stripeConnectAccountId);
      const execution = await functions.createExecution(
        process.env.EXPO_PUBLIC_STRIPE_BALANCE_FUNCTION_ID!,
        JSON.stringify({ stripeConnectAccountId: creatorFinancials.stripeConnectAccountId }),
        true, '/get-balance', ExecutionMethod.POST,  // Changed to async
        { 'Content-Type': 'application/json' }
      );
      console.log('📡 [Earnings] Stripe API execution result:', execution);

      // Parse the response to get goals
      // With async execution, the response might not be immediately available
      if (execution.responseBody && execution.responseBody !== '') {
        try {
          const response = JSON.parse(execution.responseBody);
          if (response.goals) {
            setDailyGoal(response.goals.dailyGoal || 0);
            setWeeklyGoal(response.goals.weeklyGoal || 0);
          }
          if (response.kpis) {
            // Update creator financials with the latest data
            setCreatorFinancials(prev => ({
              ...prev,
              todayEarnings: response.kpis.todayEarnings || 0,
              weekEarnings: response.kpis.weekEarnings || 0,
              dailyEarnings: JSON.stringify(response.kpis.dailyEarnings || {})
            }));
          }
        } catch (e) {
          console.log('⏳ [Earnings] Async execution in progress, data will be updated on next refresh');
        }
      } else {
        console.log('⏳ [Earnings] Async execution started, data will be updated in the background');
      }

      // Refetch the data from our DB
      console.log('🔄 [Earnings] Refetching creator financial data...');
      await loadCreatorFinancials();

    } catch (error) {
      console.error('❌ [Earnings] Error updating Stripe data:', error);
      Alert.alert("Error", "Could not update your financial data. Please try again.");
    } finally {
      setIsLoadingFinancials(false);
    }
  };

  const handleOnboarding = async () => {
    if (isLoadingStripeConnect || creatorFinancials?.stripeConnectSetupComplete) return;

    setIsLoadingStripeConnect(true);
    console.log('🚀 [Earnings] Starting Stripe Onboarding...');
    
    try {
      const { functions, databases, config } = await import('@/lib/appwrite');
      const { ExecutionMethod, Query } = await import('react-native-appwrite');
      
      // Fetch user's profile data (currency, date of birth, phone number, etc.)
      let userCurrency = 'USD'; // Default currency
      let dateOfBirth = null;
      let phoneNumber = null;
      try {
        const userProfiles = await databases.listDocuments(
          config.databaseId,
          process.env.EXPO_PUBLIC_APPWRITE_PROFILE_COLLECTION_ID!,
          [Query.equal('userId', user?.$id || '')]
        );
        
        if (userProfiles.documents.length > 0) {
          const profile = userProfiles.documents[0];
          userCurrency = profile.currency || 'USD';
          dateOfBirth = profile.dateOfBirth || null;
          phoneNumber = profile.phoneNumber || null;
          console.log('💰 [Earnings] User currency:', userCurrency);
          console.log('🎂 [Earnings] User date of birth:', dateOfBirth);
          console.log('📱 [Earnings] User phone number:', phoneNumber);
        }
      } catch (profileError) {
        console.log('⚠️ [Earnings] Could not fetch user profile data, using defaults:', profileError);
      }
      
      const result = await functions.createExecution(
        process.env.EXPO_PUBLIC_STRIPE_CONNECT_FUNCTION_ID!,
        JSON.stringify({
          userEmail: user?.email,
          userName: user?.name,
          returnUrl: 'https://cherrybox.app/connect-return',
          currency: userCurrency,
          ...(dateOfBirth && { dateOfBirth: dateOfBirth }),
          ...(phoneNumber && { phoneNumber: phoneNumber })
        }),
        false,
        '/create-connect-account',
        ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
      );

      const response = JSON.parse(result.responseBody);
      if (response.success && response.accountLinkUrl) {
        console.log('✅ [Earnings] Got account link URL:', response.accountLinkUrl);
        setStripeConnectUrl(response.accountLinkUrl);
        setShowStripeConnect(true);
        // Refresh data after onboarding attempt
        await loadCreatorFinancials();
        // Update channel conditions to reflect the new Stripe setup status
        await refreshChannelConditions(true); // Force refresh after Stripe setup
      } else {
        throw new Error(response.error || 'Failed to create Stripe Connect account.');
      }
    } catch (error) {
      console.error('❌ [Earnings] Error during Stripe onboarding:', error);
      setShowNetworkErrorModal(true);
    } finally {
      setIsLoadingStripeConnect(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (isLoadingStripeConnect || !creatorFinancials?.stripeConnectAccountId) return;
    
    setIsLoadingStripeConnect(true);
    console.log('🚀 [Earnings] Opening Stripe Dashboard...');

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
        console.log('✅ [Earnings] Got dashboard link URL:', response.url);
        setStripeConnectUrl(response.url);
        setShowStripeConnect(true);
      } else {
        throw new Error(response.error || 'Failed to create dashboard link.');
      }
    } catch (error) {  
      console.error('❌ [Earnings] Error opening Stripe dashboard:', error);
      setShowNetworkErrorModal(true);
    } finally {
      setIsLoadingStripeConnect(false);
    }
  };

  // Update state when preloaded data changes
  useEffect(() => {
    if (preloadedFinancials) {
      console.log('📊 [Earnings] Using preloaded financial data');
      setCreatorFinancials(preloadedFinancials);
    }
  }, [preloadedFinancials]);

  useEffect(() => {
    if (preloadedCurrency) {
      console.log('💰 [Earnings] Using preloaded currency:', preloadedCurrency);
      setUserCurrency(preloadedCurrency);
    }
  }, [preloadedCurrency]);

  useEffect(() => {
    if (preloadedDailyGoal !== undefined) {
      console.log('🎯 [Earnings] Using preloaded daily goal:', preloadedDailyGoal);
      setDailyGoal(preloadedDailyGoal);
    }
  }, [preloadedDailyGoal]);

  useEffect(() => {
    if (preloadedWeeklyGoal !== undefined) {
      console.log('🎯 [Earnings] Using preloaded weekly goal:', preloadedWeeklyGoal);
      setWeeklyGoal(preloadedWeeklyGoal);
    }
  }, [preloadedWeeklyGoal]);

  useEffect(() => {
    if (preloadedStripeData) {
      console.log('📈 [Earnings] Using preloaded Stripe KPI data');
      // Update creator financials with the preloaded Stripe data
      setCreatorFinancials(prev => ({
        ...prev,
        todayEarnings: preloadedStripeData.todayEarnings || 0,
        weekEarnings: preloadedStripeData.weekEarnings || 0,
        dailyEarnings: JSON.stringify(preloadedStripeData.dailyEarnings || {})
      }));
    }
  }, [preloadedStripeData]);

  // Load financial data when component mounts or user changes (fallback if no preloaded data)
  useEffect(() => {
    if (user?.$id) {
      // Only load if we don't have preloaded data
      if (!preloadedFinancials) {
        loadCreatorFinancials();
      }
      if (!preloadedCurrency) {
        loadUserCurrency();
      }
    }
  }, [user?.$id, preloadedFinancials, preloadedCurrency]);

  // Handle highlighting setup button when navigating from payment setup incomplete
  useEffect(() => {
    if (shouldHighlightSetup) {
      // Start the animation after a short delay to ensure the tab content is rendered
      setTimeout(() => {
        startSetupButtonAnimation();
      }, 500);
    }
  }, [shouldHighlightSetup]);

  // Animation function for the setup button
  const startSetupButtonAnimation = () => {
    // Scroll to the bottom to show the setup button
    if (earningsScrollRef.current) {
      earningsScrollRef.current.scrollToEnd({ animated: true });
    }
    
    // Start the pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(setupButtonAnimation, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(setupButtonAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 10 } // Animate 10 times then stop
    ).start(() => {
      // Reset highlight after animation completes
      setTimeout(() => {
        setShouldHighlightSetup(false);
      }, 1000);
    });
  };

  const handleRefresh = async () => {
    await handleUpdateStripeData();
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <>
      <ScrollView 
        ref={earningsScrollRef}
        style={{ 
          flex: 1, 
          backgroundColor: theme.backgroundTertiary,
        }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.textTertiary}
              colors={[theme.textTertiary]}
              progressBackgroundColor={theme.backgroundTertiary}
            />
          }
      >
        <View>
          {/* Auto-initialize KPI data if missing and Stripe is connected */}
          {(() => {
            if (creatorFinancials?.stripeConnectSetupComplete && 
                creatorFinancials?.currentPeriodGross === undefined && 
                !isLoadingFinancials) {
              console.log('🔄 [Earnings] Auto-initializing KPI data...');
              handleUpdateStripeData();
            }
            return null;
          })()}

          {/* First Row: Available & Pending */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {/* Available Card */}
            <View style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 16,
              position: 'relative',
            }}>
              {/* Info button positioned absolutely in top-right */}
              <TouchableOpacity 
                onPress={() => setOpenInfoBubble(openInfoBubble === 'available' ? null : 'available')}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 1,
                }}
              >
                <View style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: theme.text,
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{
                    color: theme.text,
                    fontSize: 12,
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    i
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Centered content */}
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 20,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 8,
                }}>
                  Available
                </Text>
                <Text style={{
                  color: theme.text,
                  fontSize: 28,
                  fontFamily: 'MuseoModerno-Regular',
                }}>
                  {formatPrice(creatorFinancials?.stripeBalanceAvailable || 0, userCurrency)}
                </Text>
              </View>
              {openInfoBubble === 'available' && (
                <View style={{
                  position: 'absolute',
                  top: 45,
                  right: 0,
                  backgroundColor: theme.text,
                  borderRadius: 8,
                  padding: 10,
                  minWidth: 180,
                  zIndex: 10,
                }}>
                  <Text style={{ color: theme.textInverse, fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
                    Funds that are available for payout to your bank account.
                  </Text>
                </View>
              )}
            </View>

            {/* Pending Card */}
            <View style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 16,
              position: 'relative',
            }}>
              {/* Info button positioned absolutely in top-right */}
              <TouchableOpacity 
                onPress={() => setOpenInfoBubble(openInfoBubble === 'pending' ? null : 'pending')}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 1,
                }}
              >
                <View style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: theme.text,
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{
                    color: theme.text,
                    fontSize: 12,
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    i
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Centered content */}
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 20,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 8,
                }}>
                  Pending
                </Text>
                <Text style={{
                  color: theme.text,
                  fontSize: 28,
                  fontFamily: 'MuseoModerno-Regular',
                }}>
                  {formatPrice(creatorFinancials?.stripeBalancePending || 0, userCurrency)}
                </Text>
              </View>
              {openInfoBubble === 'pending' && (
                <View style={{
                  position: 'absolute',
                  top: 45,
                  right: 0,
                  backgroundColor: theme.text,
                  borderRadius: 8,
                  padding: 10,
                  minWidth: 180,
                  zIndex: 10,
                }}>
                  <Text style={{ color: 'black', fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
                    Funds that are still being processed and will become available soon.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Second Row: Total & In Transit */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {/* Total Card */}
            <View style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 16,
              position: 'relative',
            }}>
              {/* Info button positioned absolutely in top-right */}
              <TouchableOpacity 
                onPress={() => setOpenInfoBubble(openInfoBubble === 'total' ? null : 'total')}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 1,
                }}
              >
                <View style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: theme.text,
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{
                    color: theme.text,
                    fontSize: 12,
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    i
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Centered content */}
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 20,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 8,
                }}>
                  Total
                </Text>
                <Text style={{
                  color: theme.text,
                  fontSize: 28,
                  fontFamily: 'MuseoModerno-Regular',
                }}>
                  {formatPrice(
                    (creatorFinancials?.stripeBalanceAvailable || 0) + 
                    (creatorFinancials?.stripeBalancePending || 0),
                    userCurrency
                  )}
                </Text>
              </View>
              {openInfoBubble === 'total' && (
                <View style={{
                  position: 'absolute',
                  top: 45,
                  right: 0,
                  backgroundColor: theme.text,
                  borderRadius: 8,
                  padding: 10,
                  minWidth: 180,
                  zIndex: 10,
                }}>
                  <Text style={{ color: 'black', fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
                    Combined total of available and pending funds in your account.
                  </Text>
                </View>
              )}
            </View>

            {/* In Transit Card */}
            <View style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 16,
              position: 'relative',
            }}>
              {/* Info button positioned absolutely in top-right */}
              <TouchableOpacity 
                onPress={() => setOpenInfoBubble(openInfoBubble === 'transit' ? null : 'transit')}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 1,
                }}
              >
                <View style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: theme.text,
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{
                    color: theme.text,
                    fontSize: 12,
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    i
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Centered content */}
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 20,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 8,
                }}>
                  In Transit
                </Text>
                <Text style={{
                  color: theme.text,
                  fontSize: 28,
                  fontFamily: 'MuseoModerno-Regular',
                }}>
                  {formatPrice(creatorFinancials?.payoutsInTransitAmount || 0, userCurrency)}
                </Text>
              </View>
              {openInfoBubble === 'transit' && (
                <View style={{
                  position: 'absolute',
                  top: 45,
                  right: 0,
                  backgroundColor: theme.text,
                  borderRadius: 8,
                  padding: 10,
                  minWidth: 180,
                  zIndex: 10,
                }}>
                  <Text style={{ color: 'black', fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
                    Funds that are currently being transferred to your bank account.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Third Row: Today's Goal & Weekly Goal */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {/* Today's Goal Card */}
            <View style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 16,
            }}>
              {/* Centered content */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 16,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 4,
                }}>
                  Today's Goal
                </Text>
                <Text style={{
                  color: theme.textTertiary,
                  fontSize: 12,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 12,
                }}>
                  {formatPrice(dailyGoal, userCurrency)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {(() => {
                    let todayEarnings = 0;
                    try {
                      const dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                      const today = new Date().toISOString().split('T')[0];
                      todayEarnings = dailyEarnings[today] || 0;
                    } catch (e) {
                      todayEarnings = 0;
                    }
                    
                    const goalReached = todayEarnings >= dailyGoal && dailyGoal > 0;
                    
                    return (
                      <Ionicons 
                        name={goalReached ? "caret-up-outline" : "caret-down-outline"} 
                        size={20} 
                        color={goalReached ? "#4CAF50" : "#FD6F3E"} 
                      />
                    );
                  })()}
                  <Text style={{
                    color: theme.text,
                    fontSize: 24,
                    fontFamily: 'MuseoModerno-Regular',
                  }}>
                    {(() => {
                      let todayEarnings = 0;
                      try {
                        const dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                        const today = new Date().toISOString().split('T')[0];
                        todayEarnings = dailyEarnings[today] || 0;
                      } catch (e) {
                        todayEarnings = 0;
                      }
                      return formatPrice(todayEarnings, userCurrency);
                    })()}
                  </Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  <CircularProgress
                    percentage={(() => {
                      let todayEarnings = 0;
                      try {
                        const dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                        const today = new Date().toISOString().split('T')[0];
                        todayEarnings = dailyEarnings[today] || 0;
                      } catch (e) {
                        todayEarnings = 0;
                      }
                      return dailyGoal > 0 ? Math.round((todayEarnings / dailyGoal) * 100) : 0;
                    })()}
                    size={60}
                    strokeWidth={4}
                    backgroundColor="#F0F0F0"
                    textColor={theme.text}
                    fontSize={12}
                    completedColor="#4CAF50"
                    incompleteColor="#FD6F3E"
                  />
                </View>
              </View>
            </View>

            {/* Weekly Goal Card */}
            <View style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 16,
            }}>
              {/* Centered content */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 16,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 4,
                }}>
                  Weekly Goal
                </Text>
                <Text style={{
                  color: theme.textTertiary,
                  fontSize: 12,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 12,
                }}>
                {formatPrice(weeklyGoal, userCurrency)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {(() => {
                    let weekEarnings = 0;
                    try {
                      const dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                      weekEarnings = calculateTimeframeEarnings(dailyEarnings, 'weekly');
                    } catch (e) {
                      weekEarnings = 0;
                    }
                    
                    const goalReached = weekEarnings >= weeklyGoal && weeklyGoal > 0;
                    
                    return (
                      <Ionicons 
                        name={goalReached ? "caret-up-outline" : "caret-down-outline"} 
                        size={20} 
                        color={goalReached ? "#4CAF50" : "#FD6F3E"} 
                      />
                    );
                  })()}
                  <Text style={{
                    color: theme.text,
                    fontSize: 24,
                    fontFamily: 'MuseoModerno-Regular',
                  }}>
                    {(() => {
                      let weekEarnings = 0;
                      try {
                        const dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                        weekEarnings = calculateTimeframeEarnings(dailyEarnings, 'weekly');
                      } catch (e) {
                        weekEarnings = 0;
                      }
                      return formatPrice(weekEarnings, userCurrency);
                    })()}
                  </Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  <CircularProgress
                    percentage={(() => {
                      let weekEarnings = 0;
                      try {
                        const dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                        weekEarnings = calculateTimeframeEarnings(dailyEarnings, 'weekly');
                      } catch (e) {
                        weekEarnings = 0;
                      }
                      return weeklyGoal > 0 ? Math.round((weekEarnings / weeklyGoal) * 100) : 0;
                    })()}
                    size={60}
                    strokeWidth={4}
                    backgroundColor="#F0F0F0"
                    textColor={theme.text}
                    fontSize={12}
                    completedColor="#4CAF50"
                    incompleteColor="#FD6F3E"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Total Earnings Card with Tabs */}
          <View style={{
            backgroundColor: theme.backgroundSecondary,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            position: 'relative',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{
                color: theme.text,
                fontSize: 24,
                fontFamily: 'MuseoModerno-Regular',
              }}>
                Total Earnings (Gross)
              </Text>
              <TouchableOpacity onPress={() => setOpenInfoBubble(openInfoBubble === 'earnings' ? null : 'earnings')}>
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.text,
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{
                    color: theme.text,
                    fontSize: 14,
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    i
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            

            {/* Earnings Display */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{
                color: theme.text,
                fontSize: 40,
                fontFamily: 'MuseoModerno-Regular',
                marginBottom: 8,
              }}>
                {(() => {
                  let dailyEarnings = {};
                  try {
                    dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                  } catch (e) {
                    dailyEarnings = {};
                  }
                  const earnings = calculateTimeframeEarnings(dailyEarnings, earningsTimeframe);
                  return formatPrice(earnings, userCurrency);
                })()}
              </Text>
              <Text style={{
                color: theme.textTertiary,
                fontSize: 14,
                fontFamily: 'Urbanist-Regular',
              }}>
                {earningsTimeframe === 'weekly' && 'Last 7 days'}
                {earningsTimeframe === 'monthly' && 'Last 30 days'}
                {earningsTimeframe === 'yearly' && 'Last 365 days'}
              </Text>
            </View>
            
            {/* Tabs */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: theme.background,
              borderRadius: 12,
              padding: 4,
              marginBottom: 8,
            }}>
              {(['weekly', 'monthly', 'yearly'] as const).map((timeframe) => (
                <TouchableOpacity
                  key={timeframe}
                  onPress={() => setEarningsTimeframe(timeframe)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: earningsTimeframe === timeframe ? theme.primary : theme.background,
                  }}
                >
                  <Text style={{
                    color: earningsTimeframe === timeframe ? 'white' : theme.textTertiary,
                    fontFamily: earningsTimeframe === timeframe ? 'Urbanist-Bold' : 'Urbanist-Regular',
                    fontSize: 14,
                    textAlign: 'center',
                    textTransform: 'capitalize',
                  }}>
                    {timeframe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Net Average Display */}
            <Text style={{
              color: theme.textSecondary,
              fontSize: 12,
              fontFamily: 'MuseoModerno-Regular',
              textAlign: 'center',
              marginBottom: 16,
            }}>
              {(() => {
                let dailyEarnings = {};
                try {
                  dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                } catch (e) {
                  dailyEarnings = {};
                }
              
                const grossEarnings = calculateTimeframeEarnings(dailyEarnings, earningsTimeframe);
                const netEarnings = Math.round(grossEarnings * 0.8); // 20% platform fee
                
                let divisor = 1;
                let period = '';
                
                if (earningsTimeframe === 'weekly') {
                  divisor = 7;
                  period = 'Weekly';
                } else if (earningsTimeframe === 'monthly') {
                  divisor = 30;
                  period = 'Monthly';
                } else if (earningsTimeframe === 'yearly') {
                  divisor = 365;
                  period = 'Yearly';
                }
                
                const average = divisor > 1 ? Math.round(netEarnings / divisor) : netEarnings;
                return `${period} Net Average: ${formatPrice(average, userCurrency)}`;
              })()}
            </Text>
          
            {/* Earnings Chart */}
            <View style={{ alignItems: 'center', marginHorizontal: -20 }}>
              {(() => {
                let dailyEarnings = {};
                try {
                  dailyEarnings = creatorFinancials?.dailyEarnings ? JSON.parse(creatorFinancials.dailyEarnings) : {};
                } catch (e) {
                  dailyEarnings = {};
                }
                
                // Only show chart if we have data
                const hasData = Object.keys(dailyEarnings).length > 0;
                
                return hasData ? (
                  <EarningsChart
                    dailyEarnings={dailyEarnings}
                    timeframe={earningsTimeframe}
                    currency={userCurrency}
                  />
                ) : (
                  <View style={{
                    height: 200,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.backgroundSecondary,
                    borderRadius: 12,
                    marginVertical: 8,
                  }}>
                    <Text style={{
                      color: theme.textTertiary,
                      fontSize: 14,
                      fontFamily: 'Urbanist-Regular',
                      textAlign: 'center',
                    }}>
                      No earnings data available yet.{'\n'}Chart will appear once you start earning.
                    </Text>
                  </View>
                );
              })()}
            </View>
            
            {openInfoBubble === 'earnings' && (
              <View style={{
                position: 'absolute',
                top: 55,
                right: 0,
                backgroundColor: 'black',
                borderRadius: 8,
                padding: 10,
                minWidth: 200,
                zIndex: 10,
              }}>
                <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
                  Your gross earnings before fees and taxes for the selected time period.
                </Text>
              </View>
            )}
          </View>
          
          {/* Stripe Status Display - Only show if there are issues */}
          {creatorFinancials?.stripeConnectSetupComplete && 
           (!creatorFinancials.stripeConnectEnabled || 
            !creatorFinancials.stripeConnectPayoutsEnabled || 
            !creatorFinancials.stripeConnectVerified) && (
              <View style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                padding: 20,
                width: '100%',
                borderWidth: 1,
                borderColor: '#333333',
                marginTop: 20
              }}>
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 16 
                }}>
                  <Text style={{
                    color: theme.text,
                    fontSize: 18,
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold'
                  }}>
                    Payment Status
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPaymentStatusInfo(true)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#E0E0E0',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{
                      color: theme.text,
                      fontSize: 14,
                      fontWeight: 'bold',
                      fontFamily: 'Urbanist-Bold'
                    }}>
                      i
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Status Items */}
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#4CAF50" style={{ marginRight: 10 }} />
                    <Text style={{ color: theme.text, fontFamily: 'Urbanist-Regular' }}>Setup Complete</Text>
                  </View>
                  <Text style={{ color: '#4CAF50', fontFamily: 'Urbanist-Bold' }}>Yes</Text>
                </View>
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectEnabled ? "card-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectEnabled ? '#4CAF50' : '#F44336'} style={{ marginRight: 10 }} />
                    <Text style={{ color: theme.text, fontFamily: 'Urbanist-Regular' }}>Payments Active</Text>
                  </View>
                  <Text style={{ color: creatorFinancials.stripeConnectEnabled ? '#4CAF50' : '#F44336', fontFamily: 'Urbanist-Bold' }}>
                    {creatorFinancials.stripeConnectEnabled ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectPayoutsEnabled ? "cash-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectPayoutsEnabled ? '#4CAF50' : '#F44336'} style={{ marginRight: 10 }} />
                    <Text style={{ color: theme.text, fontFamily: 'Urbanist-Regular' }}>Payouts Active</Text>
                  </View>
                  <Text style={{ color: creatorFinancials.stripeConnectPayoutsEnabled ? '#4CAF50' : '#F44336', fontFamily: 'Urbanist-Bold' }}>
                    {creatorFinancials.stripeConnectPayoutsEnabled ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectVerified ? "person-circle-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectVerified ? '#4CAF50' : '#FF9800'} style={{ marginRight: 10 }} />
                    <Text style={{ color: theme.text, fontFamily: 'Urbanist-Regular' }}>Account Verified</Text>
                  </View>
                  <Text style={{ color: creatorFinancials.stripeConnectVerified ? '#4CAF50' : '#FF9800', fontFamily: 'Urbanist-Bold' }}>
                    {creatorFinancials.stripeConnectVerified ? 'Yes' : 'Pending'}
                  </Text>
                </View>
                
                {creatorFinancials.stripeConnectSetupDate && (
                  <View style={{ marginTop: 12, borderTopColor: '#333', borderTopWidth: 1, paddingTop: 12 }}>
                    <Text style={{ color: '#888', fontFamily: 'Urbanist-Regular', fontSize: 12, textAlign: 'center' }}>
                      Setup completed on: {new Date(creatorFinancials.stripeConnectSetupDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
          )}
          
          {/* Get Paid message - Only show if Stripe is not connected */}
          {!creatorFinancials?.stripeConnectSetupComplete && (
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
              <Ionicons name="information-circle-outline" size={32} color="#676767" style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 16,
                  fontFamily: 'Urbanist-Bold',
                  marginBottom: 4
                }}>
                  Get Paid
                </Text>
                <Text style={{
                  color: theme.text,
                  fontSize: 14,
                  fontFamily: 'Urbanist-Regular',
                  lineHeight: 20
                }}>
                  Connect a Stripe account to start accepting payments and earning from your content.
                </Text>
              </View>
            </View>
          )}
          
          {/* View Dashboard Button - Always visible when Stripe is connected */}
          {creatorFinancials?.stripeConnectSetupComplete && (
            <TouchableOpacity
              onPress={handleOpenDashboard}
              style={{
                backgroundColor: theme.textSecondary,
                borderRadius: 12,
                paddingVertical: 14,
                marginTop: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row'
              }}
            >
              <Ionicons name="open-outline" size={20} color={theme.textInverse} style={{ marginRight: 8 }} />
              <Text style={{ color: theme.textInverse, fontFamily: 'Urbanist-Bold', fontSize: 16 }}>
                View Dashboard
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Stripe Connect Express Button - Only show if setup is not complete */}
        {!creatorFinancials?.stripeConnectSetupComplete && (
          <View style={{ alignItems: 'center', width: '100%', paddingBottom: 10, marginTop: 20 }}>
            <Animated.View
              style={{
                transform: [{ scale: setupButtonAnimation }],
                width: '100%',
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: shouldHighlightSetup ? '#FD6F3E' : '#676767',
                  paddingVertical: 16,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '100%',
                  shadowColor: shouldHighlightSetup ? '#FD6F3E' : '#676767',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: shouldHighlightSetup ? 0.6 : 0.4,
                  shadowRadius: shouldHighlightSetup ? 15 : 10,
                  elevation: shouldHighlightSetup ? 12 : 8,
                  opacity: (isLoadingStripeConnect || (missingChannelConditions.length > 1 || (missingChannelConditions.length === 1 && missingChannelConditions[0] !== 'Payment setup incomplete'))) ? 0.5 : 1,
                  borderWidth: shouldHighlightSetup ? 2 : 0,
                  borderColor: shouldHighlightSetup ? '#FFB74D' : 'transparent',
                }}
                disabled={isLoadingStripeConnect}
                onPress={() => {
                  // If profile is incomplete, navigate to edit-profile
                  if (missingChannelConditions.length > 1 || (missingChannelConditions.length === 1 && missingChannelConditions[0] !== 'Payment setup incomplete')) {
                    router.push('/edit-profile');
                  } else {
                    // If profile is complete, proceed with payment setup
                    handleOnboarding();
                  }
                }}
              >
                <Ionicons name="card-outline" size={22} color={theme.textInverse} style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ 
                    color: theme.textInverse, 
                    fontSize: 18, 
                    fontWeight: 'bold',
                    fontFamily: 'Urbanist-Bold',
                    textAlign: 'left'
                  }}>
                    {isLoadingStripeConnect 
                      ? 'Connecting...' 
                      : ((missingChannelConditions.length > 1 || (missingChannelConditions.length === 1 && missingChannelConditions[0] !== 'Payment setup incomplete'))
                          ? 'Complete Profile First' 
                          : 'Set Up Payments')}
                  </Text>
                  <Text style={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: 13,
                    fontFamily: 'Urbanist-Regular',
                    textAlign: 'left',
                    marginTop: 2
                  }}>
                    {(missingChannelConditions.length > 1 || (missingChannelConditions.length === 1 && missingChannelConditions[0] !== 'Payment setup incomplete'))
                        ? 'Finish your profile setup to enable payments' 
                        : 'Connect with Stripe to get paid'}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </ScrollView>

      {/* Stripe Connect WebView Modal */}
      <StripeConnectModal
        visible={showStripeConnect}
        stripeConnectUrl={stripeConnectUrl}
        onClose={() => setShowStripeConnect(false)}
        onNavigationStateChange={(navState) => {
          // Handle navigation state changes
          console.log('🌐 [Earnings] Navigation state changed:', navState.url);
          
          // Close modal when user completes onboarding or goes to return URL
          if (navState.url.includes('cherrybox.app/connect-return') || 
              navState.url.includes('success') ||
              navState.url.includes('complete') ||
              navState.url.includes('dashboard.stripe.com/connect/accounts') ||
              navState.url.includes('account_updated=true')) {
            setShowStripeConnect(false);
            loadCreatorFinancials(); // Refresh data after completion
            
            // Refresh channel conditions to update missing requirements
            setTimeout(async () => {
              await refreshChannelConditions(true); // Force refresh after Stripe completion
            }, 1000); // Small delay to ensure financial data is loaded
            
          }
          
          // Handle errors or cancellations
          if (navState.url.includes('error') || 
              navState.url.includes('cancel') ||
              navState.url.includes('failure')) {
            setShowStripeConnect(false);
            loadCreatorFinancials(); // Refresh data even on cancellation
            setShowNetworkErrorModal(true);
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ [Earnings] WebView error:', nativeEvent);
          setShowNetworkErrorModal(true);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ [Earnings] WebView HTTP error:', nativeEvent);
        }}
      />

      {/* Overlay to close info bubble when open */}
      {openInfoBubble && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }}
          activeOpacity={1}
          onPress={() => setOpenInfoBubble(null)}
        />
      )}

      {/* Network Error Modal */}
      <NetworkErrorModal
        visible={showNetworkErrorModal}
        onClose={() => setShowNetworkErrorModal(false)}
      />

      {/* Payment Status Info Modal */}
      <Modal
        visible={showPaymentStatusInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentStatusInfo(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20
        }}>
          <View style={{
            backgroundColor: theme.modalBackground,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{
                color: theme.text,
                fontSize: 20,
                fontWeight: 'bold',
                fontFamily: 'Urbanist-Bold'
              }}>
                Payment Status Help
              </Text>
              <TouchableOpacity
                onPress={() => setShowPaymentStatusInfo(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: theme.backgroundSecondary,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                color: theme.text,
                fontSize: 16,
                fontFamily: 'Urbanist-Regular',
                lineHeight: 24,
                marginBottom: 16
              }}>
                If any of your payment statuses show as inactive or pending, you can resolve the issues by accessing your Stripe dashboard.
              </Text>
              
              <Text style={{
                color: theme.text,
                fontSize: 16,
                fontFamily: 'Urbanist-Bold',
                marginBottom: 8
              }}>
                What to do:
              </Text>
              
              <Text style={{
                color: theme.text,
                fontSize: 15,
                fontFamily: 'Urbanist-Regular',
                lineHeight: 22
              }}>
                1. Press the "View Dashboard" button below{'\n'}
                2. Complete any required verification steps{'\n'}
                3. Provide any missing information{'\n'}
                4. Return to the app and refresh your earnings data
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowPaymentStatusInfo(false)}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: theme.textInverse,
                fontSize: 16,
                fontWeight: 'bold',
                fontFamily: 'Urbanist-Bold'
              }}>
                Got it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
