import SubscriberChart from '@/app/components/charts/SubscriberChart';
import { useGlobalContext } from '@/lib/global-provider';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface InsightsTabProps {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  preloadedFinancials?: any;
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

export default function InsightsTab({ refreshing, onRefresh, preloadedFinancials }: InsightsTabProps) {
  const { theme } = useTheme();
  const { user } = useGlobalContext();
  
  const [creatorFinancials, setCreatorFinancials] = useState<StripeConnectProfile | null>(preloadedFinancials || null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [subscriberTimeframe, setSubscriberTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  // Helper function to calculate subscriber stats for different timeframes
  const calculateSubscriberStats = (dailySubscribersStats: any, timeframe: 'weekly' | 'monthly' | 'yearly') => {
    if (!dailySubscribersStats || typeof dailySubscribersStats !== 'object') {
      return { gained: 0, lost: 0, net: 0 };
    }
    
    const today = new Date();
    let gained = 0;
    let lost = 0;
    let days = 7;
    
    if (timeframe === 'monthly') days = 30;
    else if (timeframe === 'yearly') days = 365;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (dailySubscribersStats[dateStr]) {
        const dayStats = dailySubscribersStats[dateStr];
        gained += (dayStats.monthly || 0) + (dayStats.yearly || 0);
        lost += (dayStats.cancelledMonthly || 0) + (dayStats.cancelledYearly || 0);
      }
    }
    
    return { gained, lost, net: gained - lost };
  };

  const loadCreatorFinancials = async () => {
    if (!user?.$id) return;

    setIsLoadingInsights(true);
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
        console.log('  [Insights] Creator financial data loaded:', {
          currentPeriodGross: creatorData.currentPeriodGross,
          previousPeriodGross: creatorData.previousPeriodGross,
          lifetimeGross: creatorData.lifetimeGross,
          currentPeriodStart: creatorData.currentPeriodStart,
          lifetimeVolume: creatorData.lifetimeVolume,
          stripeConnectAccountId: creatorData.stripeConnectAccountId
        });
        setCreatorFinancials(creatorData as StripeConnectProfile);
        console.log(' [Insights] Loaded creator financial data.');
      } else {
        console.log('   [Insights] No creator document found for this user.');
        setCreatorFinancials(null);
      }
    } catch (error) {  
      console.error('   [Insights] Error loading creator financials:', error);
      setCreatorFinancials(null);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Update state when preloaded data changes
  useEffect(() => {
    if (preloadedFinancials) {
      console.log('  [Insights] Using preloaded financial data');
      setCreatorFinancials(preloadedFinancials);
    }
  }, [preloadedFinancials]);

  // Load financial data when component mounts or user changes (fallback if no preloaded data)
  useEffect(() => {
    if (user?.$id && !preloadedFinancials) {
      console.log('  [Insights] No preloaded data, loading financial data...');
      loadCreatorFinancials();
    }
  }, [user?.$id, preloadedFinancials]);

  const handleRefresh = async () => {
    await loadCreatorFinancials();
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <ScrollView 
      style={{ 
        flex: 1, 
        backgroundColor: theme.backgroundTertiary
      }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingVertical: 20,
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
      {/* Big Total Subscribers Card with Weekly Stats */}
      <View style={{
        backgroundColor: theme.cardBackground,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
      }}>
        <Text style={{ 
          color: theme.text, 
          fontFamily: 'MuseoModerno-Regular', 
          fontSize: 18,
          marginBottom: 16,
          textAlign: 'center'
        }} allowFontScaling={false}>
          Total Current Subscribers
        </Text>
      
        {/* Total Number */}
        <Text style={{ 
          color: theme.text, 
          fontFamily: 'MuseoModerno-Regular', 
          fontSize: 48, 
          textAlign: 'center',
          marginBottom: 20
        }} allowFontScaling={false}>
          {(typeof creatorFinancials?.number_of_monthly_subscribers === 'number' || typeof creatorFinancials?.number_of_yearly_subscriptions === 'number')
            ? ((creatorFinancials?.number_of_monthly_subscribers || 0) + (creatorFinancials?.number_of_yearly_subscriptions || 0))
            : '—'}
        </Text>

        {/* Weekly Stats */}
        {(() => {
          let weeklyStats = { gained: 0, lost: 0, net: 0 };
          try {
            const dailyStats = creatorFinancials?.dailySubscribersStats ? JSON.parse(creatorFinancials.dailySubscribersStats) : {};
            weeklyStats = calculateSubscriberStats(dailyStats, 'weekly');
          } catch (e) {
            weeklyStats = { gained: 0, lost: 0, net: 0 };
          }
          
          return (
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
              {/* Gained this week */}
              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="arrow-up-circle" size={20} color="#4CAF50" style={{ marginRight: 6 }} />
                  <Text style={{ 
                    color: '#4CAF50', 
                    fontFamily: 'MuseoModerno-Regular', 
                    fontSize: 24 
                  }} allowFontScaling={false}>
                    +{weeklyStats.gained}
                  </Text>
                </View>
                <Text style={{ 
                  color: theme.textTertiary, 
                  fontFamily: 'MuseoModerno-Regular', 
                  fontSize: 12,
                  textAlign: 'center'
                }} allowFontScaling={false}>
                  Gained this week
                </Text>
              </View>

              {/* Divider */}
              <View style={{ width: 1, height: 40, backgroundColor: '#E0E0E0', marginHorizontal: 16 }} />

              {/* Lost this week */}
              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="arrow-down-circle" size={20} color="#F44336" style={{ marginRight: 6 }} />
                  <Text style={{ 
                    color: '#F44336', 
                    fontFamily: 'MuseoModerno-Regular', 
                    fontSize: 24 
                  }} allowFontScaling={false}>
                    -{weeklyStats.lost}
                  </Text>
                </View>
                <Text style={{ 
                  color: theme.textTertiary, 
                  fontFamily: 'MuseoModerno-Regular', 
                  fontSize: 12,
                  textAlign: 'center'
                }} allowFontScaling={false}>
                  Lost this week
                </Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* Subscriber Growth Chart with Tabs */}
      <View style={{
        backgroundColor: theme.cardBackground,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}>
        <Text style={{
          color: theme.text,
          fontSize: 18,
          fontFamily: 'MuseoModerno-Regular',
          marginBottom: 16,
        }} allowFontScaling={false}>
          Subscriber Growth
        </Text>
      
        {/* Tabs */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: theme.background,
          borderRadius: 12,
          padding: 4,
          marginBottom: 16,
        }}>
          {(['weekly', 'monthly', 'yearly'] as const).map((timeframe) => (
            <TouchableOpacity
              key={timeframe}
              onPress={() => setSubscriberTimeframe(timeframe)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: subscriberTimeframe === timeframe ? theme.cardBackground : 'transparent',
              }}
            >
              <Text style={{
                color: subscriberTimeframe === timeframe ? theme.text : theme.textTertiary,
                fontFamily: 'MuseoModerno-Regular',
                fontSize: 14,
                textAlign: 'center',
                textTransform: 'capitalize',
              }} allowFontScaling={false}>
                {timeframe}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      
        {/* Stats Display */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          {(() => {
            let stats = { gained: 0, lost: 0, net: 0 };
            try {
              const dailyStats = creatorFinancials?.dailySubscribersStats ? JSON.parse(creatorFinancials.dailySubscribersStats) : {};
              stats = calculateSubscriberStats(dailyStats, subscriberTimeframe);
            } catch (e) {
              stats = { gained: 0, lost: 0, net: 0 };
            }
            
            return (
              <>
                <Text style={{
                  color: stats.net >= 0 ? '#4CAF50' : '#F44336',
                  fontSize: 36,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 8,
                }} allowFontScaling={false}>
                  {stats.net >= 0 ? '+' : ''}{stats.net}
                </Text>
                <Text style={{
                  color: theme.textTertiary,
                  fontSize: 14,
                  fontFamily: 'MuseoModerno-Regular',
                  marginBottom: 8,
                }} allowFontScaling={false}>
                  Net change (
                  {subscriberTimeframe === 'weekly' && 'last 7 days'}
                  {subscriberTimeframe === 'monthly' && 'last 30 days'}
                  {subscriberTimeframe === 'yearly' && 'last 365 days'})
                </Text>
                <View style={{ flexDirection: 'row', gap: 20 }}>
                  <Text style={{
                    color: '#4CAF50',
                    fontSize: 14,
                    fontFamily: 'MuseoModerno-Regular',
                  }} allowFontScaling={false}>
                    +{stats.gained} gained
                  </Text>
                  <Text style={{
                    color: '#F44336',
                    fontSize: 14,
                    fontFamily: 'MuseoModerno-Regular',
                  }} allowFontScaling={false}>
                    -{stats.lost} lost
                  </Text>
                </View>
              </>
            );
          })()}
        </View>
        
        {/* Subscriber Chart */}
        <View style={{ alignItems: 'center', marginHorizontal: -20 }}>
          {(() => {
            let dailyStats = {};
            try {
              dailyStats = creatorFinancials?.dailySubscribersStats ? JSON.parse(creatorFinancials.dailySubscribersStats) : {};
            } catch (e) {
              dailyStats = {};
            }
            
            // Only show chart if we have data
            const hasData = Object.keys(dailyStats).length > 0;
            
            return hasData ? (
              <SubscriberChart
                dailySubscribersStats={dailyStats}
                timeframe={subscriberTimeframe}
              />
            ) : (
              <View style={{
                height: 200,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.background,
                borderRadius: 12,
                marginVertical: 8,
              }}>
                <Text style={{
                  color: theme.textTertiary,
                  fontSize: 14,
                  fontFamily: 'MuseoModerno-Regular',
                  textAlign: 'center',
                }} allowFontScaling={false}>
                  No subscriber data available yet.{'\n'}Chart will appear once you have subscriber activity.
                </Text>
              </View>
            );
          })()}
        </View>
      </View>

      {/* Content Purchases Section */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ 
          color: theme.text, 
          fontFamily: 'MuseoModerno-Regular', 
          fontSize: 20, 
          marginBottom: 16,
          textAlign: 'left'
        }} allowFontScaling={false}>
          Content Purchases
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
        {/* Photos */}
        <View style={{
          backgroundColor: theme.cardBackground,
          borderRadius: 16,
          width: '32%',
          padding: 12,
        }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View style={{ backgroundColor: theme.textTertiary, borderRadius: 8, padding: 6, marginBottom: 6 }}>
              <Ionicons name="image" size={16} color={theme.textInverse} />
            </View>
            <Text style={{ color: theme.text, fontFamily: 'MuseoModerno-Regular', fontSize: 12, textAlign: 'center' }} allowFontScaling={false}>Photos</Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontFamily: 'MuseoModerno-Regular', fontSize: 20, textAlign: 'center' }} allowFontScaling={false}>
            {creatorFinancials?.number_of_photos ?? '—'}
          </Text>
        </View>

        {/* Videos */}
        <View style={{
          backgroundColor: theme.cardBackground,
          borderRadius: 16,
          width: '32%',
          padding: 12,
        }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View style={{ backgroundColor: theme.textTertiary, borderRadius: 8, padding: 6, marginBottom: 6 }}>
              <Ionicons name="videocam" size={16} color={theme.textInverse} />
            </View>
            <Text style={{ color: theme.text, fontFamily: 'MuseoModerno-Regular', fontSize: 12, textAlign: 'center' }} allowFontScaling={false}>Videos</Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontFamily: 'MuseoModerno-Regular', fontSize: 20, textAlign: 'center' }} allowFontScaling={false}>
            {creatorFinancials?.number_of_videos ?? '—'}
          </Text>
        </View>

        {/* Files */}
        <View style={{
          backgroundColor: theme.cardBackground,
          borderRadius: 16,
          width: '32%',
          padding: 12,
        }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View style={{ backgroundColor: theme.textTertiary, borderRadius: 8, padding: 6, marginBottom: 6 }}>
              <Ionicons name="document" size={16} color={theme.textInverse} />
            </View>
            <Text style={{ color: theme.text, fontFamily: 'MuseoModerno-Regular', fontSize: 12, textAlign: 'center' }} allowFontScaling={false}>Files</Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontFamily: 'MuseoModerno-Regular', fontSize: 20, textAlign: 'center' }} allowFontScaling={false}>
            {creatorFinancials?.number_of_files ?? '—'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
