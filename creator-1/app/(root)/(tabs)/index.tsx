import {
    ChannelList,
    SearchBar
} from '@/app/components/channels';

import EarningsChart from '@/app/components/charts/EarningsChart';
import SubscriberChart from '@/app/components/charts/SubscriberChart';
import CircularProgress from '@/app/components/CircularProgress';
import {
    CustomNotificationModal,
    NetworkErrorModal,
    SocialMediaVerificationModal,
    StripeConnectModal,
    SubscriberInfoModal
} from '@/app/components/modals';
import { getUserProfile } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import {
    filterChannels,
    formatPrice,
    type Channel
} from '@/lib/index-utils';
import { client, connectUser } from '@/lib/stream-chat';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



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
  // New KPI fields
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
  // Daily earnings tracking
  dailyEarnings?: string; // JSON string of date -> amount
  todayEarnings?: number;
  weekEarnings?: number;
  monthEarnings?: number;
  yearEarnings?: number;
  // Daily subscriber stats tracking
  dailySubscribersStats?: string; // JSON string of date -> {monthly, yearly, cancelledMonthly, cancelledYearly}
}

export default function Index() {
    const router = useRouter();
    const { 
      user, 
      missingChannelConditions, 
      setMissingChannelConditions, 
      refreshChannelConditions,
      showInlineVerification,
      setShowInlineVerification,
      socialMediaPlatform,
      setSocialMediaPlatform,
      socialMediaUsername,
      setSocialMediaUsername
    } = useGlobalContext();
      const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Handle live channel updates from Stream Chat
  const handleChannelUpdate = (channelId: string, updates: Partial<Channel & { hasTip?: boolean }>) => {
    console.log(`🔄 [Index] Updating channel ${channelId} with:`, updates);
    
    // If this update includes a tip, add channel to uncollected tips
    if (updates.hasTip) {
      setUncollectedTips(prev => {
        const newSet = new Set(prev);
        newSet.add(channelId);
        console.log(`💰 [Index] Added ${channelId} to uncollected tips`);
        return newSet;
      });
    }
    
    // Remove the hasTip flag before updating channels (it's not part of Channel interface)
    const { hasTip, ...channelUpdates } = updates;
    
    setChannels(prevChannels => 
      prevChannels.map(channel => 
        channel.id === channelId 
          ? { ...channel, ...channelUpdates }
          : channel
      )
    );
    
    // Also update filtered channels if search is active
    if (searchQuery) {
      setFilteredChannels(prevFiltered => 
        prevFiltered.map(channel => 
          channel.id === channelId 
            ? { ...channel, ...channelUpdates }
            : channel
        )
      );
    }
  };

  // Handle tip collection (when user opens a channel with tips)
  const handleTipCollected = (channelId: string) => {
    setUncollectedTips(prev => {
      const newSet = new Set(prev);
      newSet.delete(channelId);
      console.log(`✅ [Index] Removed ${channelId} from uncollected tips`);
      return newSet;
    });
  };
    const [selectedTab, setSelectedTab] = useState('chats');
    const [refreshing, setRefreshing] = useState(false);
    const [isLoadingStripeConnect, setIsLoadingStripeConnect] = useState(false);
    const [showStripeConnect, setShowStripeConnect] = useState(false);
    const [stripeConnectUrl, setStripeConnectUrl] = useState<string>('');
    const [creatorFinancials, setCreatorFinancials] = useState<StripeConnectProfile | null>(null);
    const [isLoadingFinancials, setIsLoadingFinancials] = useState(false);
    const [payoutTab, setPayoutTab] = useState('history');
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [openInfoBubble, setOpenInfoBubble] = useState<null | 'lifetime' | 'available' | 'pending' | 'current' | 'total' | 'transit' | 'earnings'>(null);
    const [audience, setAudience] = useState<any[]>([]);
    const [isLoadingAudience, setIsLoadingAudience] = useState(false);
    const [audienceSearch, setAudienceSearch] = useState('');
    const [audienceFilter, setAudienceFilter] = useState<'recent' | 'income_high' | 'income_low'>('recent');
    const [filteredAudience, setFilteredAudience] = useState<any[]>([]);
    const [selectedSubscriber, setSelectedSubscriber] = useState<any | null>(null);
    const [showSubscriberModal, setShowSubscriberModal] = useState(false);
    const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [isCheckingConditions, setIsCheckingConditions] = useState(false);
  const [shouldHighlightSetup, setShouldHighlightSetup] = useState(false);
  const setupButtonAnimation = useRef(new Animated.Value(1)).current;
  const earningsScrollRef = useRef<ScrollView>(null);
  const [socialMediaCode, setSocialMediaCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [channelCreated, setChannelCreated] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [showNetworkErrorModal, setShowNetworkErrorModal] = useState(false);
  const [userCurrency, setUserCurrency] = useState('USD');
  const [showPaymentStatusInfo, setShowPaymentStatusInfo] = useState(false);
  const [uncollectedTips, setUncollectedTips] = useState<Set<string>>(new Set());
  const [earningsTimeframe, setEarningsTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [dailyGoal, setDailyGoal] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [subscriberTimeframe, setSubscriberTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');



  // Social media platform icons mapping (same as landing.tsx)
  const networks = [
    { name: 'LinkedIn', icon: 'logo-linkedin', color: '#0077B5', type: 'ionicon' },
    { name: 'TikTok', icon: 'musical-notes', color: '#000000', type: 'ionicon' },
    { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', type: 'ionicon' },
    { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', type: 'ionicon' },
    { name: 'Twitch', icon: 'logo-twitch', color: '#9146FF', type: 'ionicon' },
    { name: 'X', icon: require('../../../assets/images/X.png'), color: '#000000', type: 'image' },
  ];
    
    // Pagination and performance states
    const [channelOffset, setChannelOffset] = useState(0);
    const [hasMoreChannels, setHasMoreChannels] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
    
    // Cache for user profiles to avoid redundant API calls
    const userProfileCache = useRef<Map<string, { name: string; avatar: string; documentId: string; timestamp: number }>>(new Map());
    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    const CHANNELS_PER_PAGE = 30; // Load 30 channels at a time

    const tabs = [
      { id: 'chats', label: 'Chats', icon: 'chatbubbles-outline' },
      { id: 'other', label: 'Earnings', icon: 'cash-outline' },
      { id: 'insights', label: 'Insights', icon: 'analytics-outline' },
      { id: 'audience', label: 'Audience', icon: 'people-outline' }
    ];

  const checkChannelConditions = async () => {
    if (!user?.$id) return;
    
    setIsCheckingConditions(true);
    try {
      await refreshChannelConditions(true); // Force refresh to ensure latest data
    } catch (error) {
      console.error('❌ [Conditions] Error checking channel conditions:', error);
    } finally {
      setIsCheckingConditions(false);
    }
  };

  const loadChannels = async (loadMore = false) => {
    if (!user?.$id) {
      console.log('⚠️ [Channels] No authenticated user, skipping channel load');
      return;
    }

    try {
      if (!loadMore) {
        console.log('🔄 [Channels] Starting initial load...');
        setIsLoading(true);
      } else {
        console.log(`🔄 [Channels] Loading more channels (offset: ${channelOffset})...`);
        setIsLoadingMore(true);
      }
      
      // First check user document to see if conditions are already met
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      const userDocs = await databases.listDocuments(
        config.databaseId,
        config.creatorCollectionId,
        [Query.equal('creatoraccountid', user.$id)]
      );
      
      if (userDocs.documents.length === 0) {
        console.log('⏳ [Channels] No user document found, skipping channel load');
        setMissingChannelConditions(['Account setup incomplete']);
        setChannels([]);
        return;
      }
      
      const userDoc = userDocs.documents[0];
      
      // Get profile data (needed for both paths)
      const { getUserProfile, getUserPhoto } = await import('@/lib/appwrite');
      const profile = await getUserProfile(user.$id);
      
      // If account_state is 'ok', conditions are already met, skip detailed checks
      if (userDoc.account_state === 'ok') {
        console.log('✅ [Channels] Account state is ok, conditions already met, proceeding with channel load');
        setChannelCreated(true);
      } else {
        // Only do detailed condition checks if account_state is not 'ok'
        console.log('🔍 [Channels] Account state not ok, checking conditions...');
        
        // Check if all profile fields are filled (same as handleGoLive validation)
        
        if (!profile) {
          console.log('⏳ [Channels] No profile found, skipping channel load');
          setMissingChannelConditions(['Profile setup incomplete']);
          setChannels([]);
          return;
        }

        // Check if all profile fields are filled
        const missingProfileFields: string[] = [];
        
        if (!profile.profileImageUri) {
          missingProfileFields.push('Profile Picture');
        }
        
        if (!profile.creatorsname || profile.creatorsname.trim() === '') {
          missingProfileFields.push('Creator Name');
        }
        
        if (!profile.ProfilesBio || profile.ProfilesBio.trim() === '') {
          missingProfileFields.push('Bio');
        }
        
        if (!profile.Location || profile.Location.trim() === '') {
          missingProfileFields.push('Location');
        }
        
        if (!profile.topics || profile.topics.trim() === '') {
          missingProfileFields.push('Topics');
        }
        
        if (!profile.phoneNumber || profile.phoneNumber.trim() === '') {
          missingProfileFields.push('Phone Number');
        }
        
        if (!profile.gender || profile.gender.trim() === '') {
          missingProfileFields.push('Gender');
        }
        
        if (!profile.dateOfBirth || profile.dateOfBirth.trim() === '') {
          missingProfileFields.push('Date of Birth');
        }

        // Check if user has set up pricing
        const userPhoto = await getUserPhoto(user.$id);
        if (!userPhoto || !userPhoto.payment) {
          missingProfileFields.push('Subscription Pricing');
        } else {
          try {
            const paymentData = JSON.parse((userPhoto as any).payment);
            if (!paymentData.monthlyPrice || !paymentData.yearlyPrice || 
                parseFloat(paymentData.monthlyPrice) <= 0 || parseFloat(paymentData.yearlyPrice) <= 0) {
              missingProfileFields.push('Subscription Pricing');
            }
          } catch (error) {
            missingProfileFields.push('Subscription Pricing');
          }
        }

        // If profile is incomplete, show missing profile fields
        if (missingProfileFields.length > 0) {
          console.log('⏳ [Channels] Profile incomplete, skipping channel load');
          setMissingChannelConditions(missingProfileFields);
          setChannels([]);
          return;
        }

        // Profile is complete, now check verification conditions
        const conditionsMet = userDoc.social_media_number_correct === true && 
                             userDoc.stripeConnectSetupComplete === true;
        
        if (!conditionsMet) {
          console.log('⏳ [Channels] Verification conditions not met, skipping channel load');
          // Update missing conditions for UI display
          const missingConditions: string[] = [];
          
          // If Stripe is complete but social media is not, show the inline verification
          if (userDoc.stripeConnectSetupComplete === true && userDoc.social_media_number_correct !== true) {
            setSocialMediaPlatform(userDoc.social_media || '');
            setSocialMediaUsername(userDoc.social_media_username || '');
            setShowInlineVerification(true);
            setMissingChannelConditions([]);
            setChannels([]);
            return;
          }
          
          if (userDoc.social_media_number_correct !== true) {
            // Note: Social media verification is handled separately via modal, not shown in missing conditions
          }
          if (userDoc.stripeConnectSetupComplete !== true) {
            missingConditions.push('Payment setup incomplete');
          }
          setMissingChannelConditions(missingConditions);
          setChannels([]);
          return;
        }
      }
      
      // Check if channel has already been created by checking account_state
      const channelAlreadyCreated = userDoc.account_state === 'required' || userDoc.account_state === 'ok';
      
      if (channelAlreadyCreated) {
        console.log('✅ [Channels] Channel already created (account_state: ' + userDoc.account_state + '), proceeding with normal load');
        setChannelCreated(true);
      } else {
        // First time all conditions are met, create channel and upload photo document
        console.log('✅ [Channels] First time all conditions met, creating channel and uploading photo document');
        
        // Upload photo document (same as rLive functionality)
        try {
          const { getUserProfile, getUserPhoto } = await import('@/lib/appwrite');
          const { ID } = await import('react-native-appwrite');
          
          const profile = await getUserProfile(user.$id);
          const userPhoto = await getUserPhoto(user.$id);
          
          if (userPhoto) {
            // Photo document already exists, no update needed
            console.log('✅ [Channels] Photo document already exists');
          } else {
            // Create new photo document
            await databases.createDocument(
              config.databaseId,
              config.photoCollectionId,
              ID.unique(),
              {
                thumbnail: profile?.profileImageUri || '',
                compressed_thumbnail: profile?.compressed_thumbnail || '',
                title: profile?.creatorsname || user.name || '',
                prompte: profile?.creatorsname || user.name || '',
                IdCreator: user.$id,
                PhotosLocation: profile?.Location || '',
                payment: JSON.stringify({
                  monthlyPrice: userPhoto && (userPhoto as any).payment ? JSON.parse((userPhoto as any).payment).monthlyPrice : '0',
                  yearlyPrice: userPhoto && (userPhoto as any).payment ? JSON.parse((userPhoto as any).payment).yearlyPrice : '0'
                }),
                PhotoTopics: profile?.topics || '',
                Bio: profile?.ProfilesBio || ''
              }
            );
            console.log('✅ [Channels] Created new photo document');
          }
          
          // Send verification notification email
          try {
            const { sendCreatorVerificationNotification } = await import('@/lib/appwrite');
            await sendCreatorVerificationNotification({
              userId: user.$id,
              creatorName: profile?.creatorsname || user.name,
              location: profile?.Location,
              topics: profile?.topics,
              bio: profile?.ProfilesBio,
              phoneNumber: profile?.phoneNumber,
              gender: profile?.gender,
              dateOfBirth: profile?.dateOfBirth,
              monthlyPrice: userPhoto && (userPhoto as any).payment ? JSON.parse((userPhoto as any).payment).monthlyPrice : '0',
              yearlyPrice: userPhoto && (userPhoto as any).payment ? JSON.parse((userPhoto as any).payment).yearlyPrice : '0',
              profileImageUri: profile?.profileImageUri || '',
              compressedThumbnail: profile?.compressed_thumbnail || ''
            });
            console.log('✅ [Channels] Creator verification notification sent successfully');
          } catch (error) {
            console.error('❌ [Channels] Error sending creator verification notification:', error);
            // Don't fail the entire process if email fails
          }
          
        } catch (error) {
          console.error('❌ [Channels] Error uploading photo document:', error);
          // Continue with channel creation even if photo upload fails
        }
        
        // Create the creator's group chat
        try {
          const { createCreatorChannel } = await import('@/lib/stream-chat');
          const creatorDisplayName = profile?.creatorsname || user.name || 'Creator';
          console.log('🚀 [Channels] Creating creator channel for:', creatorDisplayName);
          const channel = await createCreatorChannel(user.$id, creatorDisplayName);
          console.log('✅ [Channels] Creator group chat created successfully:', channel.id);
          
          // Add a small delay to ensure channel is fully created
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Show success notification
          Alert.alert(
            'Channel Created! 🎉',
            'Your creator channel has been successfully created and is now under review. You\'ll be notified once it\'s approved!',
            [{ text: 'OK', style: 'default' }]
          );
          
          // Mark channel as created
          setChannelCreated(true);
        } catch (error) {
          console.error('❌ [Channels] Error creating creator group chat:', error);
          // Don't throw error here - group chat creation failure shouldn't prevent going live
        }
      }
      
      // Connect user to Stream Chat if not already connected
      if (!client.user) {
        console.log('🔗 [Channels] Connecting user to Stream Chat...');
        await connectUser(user.$id);
      }
      
      console.log('🔍 [Channels] Current client user:', client.user?.id);
      console.log('🔍 [Channels] Client connected:', !!client.user);
      
      // Query channels where the current user is a member
      const filter = { members: { $in: [user.$id] } };
      const sort = [{ last_message_at: -1 }];
      
      console.log(`📡 [Channels] Querying channels with filter:`, filter);
      console.log(`📡 [Channels] Querying channels with limit: ${CHANNELS_PER_PAGE}, offset: ${loadMore ? channelOffset : 0}`);
      const response = await client.queryChannels(filter, sort, {
        limit: CHANNELS_PER_PAGE,
        offset: loadMore ? channelOffset : 0,
      });
      
      console.log(`📋 [Channels] Received ${response.length} channels from Stream Chat`);
      
      // Debug: Check if creator channel exists specifically
      try {
        const creatorChannelId = `creator-${user.$id}`;
        console.log(`🔍 [Channels] Checking for creator channel: ${creatorChannelId}`);
        const creatorChannel = client.channel('messaging', creatorChannelId);
        const channelState = await creatorChannel.watch();
        console.log(`✅ [Channels] Creator channel found:`, channelState);
        
        // If channel exists but user is not a member, add them
        if (channelState.members && channelState.members.length === 0) {
          console.log(`🔧 [Channels] Channel exists but no members, adding user as member`);
          try {
            await creatorChannel.addMembers([user.$id]);
            console.log(`✅ [Channels] Successfully added user as member to existing channel`);
          } catch (addMemberError) {
            console.log(`❌ [Channels] Error adding user as member:`, addMemberError);
          }
        } else {
          console.log(`✅ [Channels] Channel has ${channelState.members?.length || 0} members`);
        }
      } catch (error) {
        console.log(`❌ [Channels] Creator channel not found or error:`, error);
      }
      
      // Check if we have more channels to load
      if (response.length < CHANNELS_PER_PAGE) {
        console.log('✅ [Channels] No more channels to load');
        setHasMoreChannels(false);
      }

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
      
      console.log(`🔄 [Channels] Transformed ${transformedChannels.length} channels`);
      
      // Batch user profile fetching for DM channels
      const dmChannelsNeedingProfiles = transformedChannels.filter(channel => 
        channel.id.startsWith('dm-') && channel.members.length > 0
      );
      
      if (dmChannelsNeedingProfiles.length > 0) {
        console.log(`👥 [Channels] Batch fetching profiles for ${dmChannelsNeedingProfiles.length} DM channels`);
        await batchFetchUserProfiles(dmChannelsNeedingProfiles);
      }

      // Add cached user profile data to channels
      const channelsWithNames = transformedChannels.map(channel => {
          if (channel.id.startsWith('dm-')) {
            const memberNames: { [userId: string]: string } = {};
            const memberAvatars: { [userId: string]: string } = {};
            
          // Get cached data for other members
            const otherMembers = channel.members.filter(memberId => memberId !== user?.$id);
            
            for (const memberId of otherMembers) {
            const cachedProfile = userProfileCache.current.get(memberId);
            if (cachedProfile) {
              memberNames[memberId] = cachedProfile.name;
              memberAvatars[memberId] = cachedProfile.avatar;
            } else {
              // Fallback if not in cache (shouldn't happen after batch fetch)
              memberNames[memberId] = memberId;
              memberAvatars[memberId] = '';
              }
            }
            
            return { ...channel, memberNames, memberAvatars };
          }
          return channel;
      });

      // Check for existing tip messages and add to uncollected tips
      if (!loadMore) {
        const channelsWithTips = channelsWithNames
          .filter(channel => 
            channel.id.startsWith('dm-') && 
            channel.lastMessage && 
            channel.lastMessage.includes('💝 Tip:')
          )
          .map(channel => channel.id);
        
        if (channelsWithTips.length > 0) {
          setUncollectedTips(prev => {
            const newSet = new Set(prev);
            channelsWithTips.forEach(channelId => newSet.add(channelId));
            console.log(`💰 [Index] Found ${channelsWithTips.length} channels with existing tips`);
            return newSet;
          });
        }
      }

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

      console.log(`📊 [Channels] Final breakdown: ${groupChats.length} group chats, ${dmChannels.length} DM channels`);

      let finalChannels: Channel[];

      if (loadMore) {
        // Combine existing channels with new ones and remove duplicates by channel ID
        const allChannels = [...channels, ...uniqueChannels];
        const seenIds = new Set<string>();
        finalChannels = allChannels.filter(channel => {
          if (seenIds.has(channel.id)) {
            console.log(`🔄 [Channels] Removing duplicate channel: ${channel.id}`);
            return false;
          }
          seenIds.add(channel.id);
          return true;
        });
        console.log(`📈 [Channels] Added ${uniqueChannels.length} new channels. After dedup: ${finalChannels.length} total channels`);
        setChannels(finalChannels);
        setChannelOffset(prev => prev + uniqueChannels.length);
      } else {
        finalChannels = uniqueChannels;
        setChannels(finalChannels);
        setChannelOffset(finalChannels.length);
        console.log(`📈 [Channels] Set ${finalChannels.length} channels as initial load`);
      }
      
      // Update filtered channels for search
      if (searchQuery) {
        filterChannels(finalChannels, searchQuery);
      } else {
        setFilteredChannels(finalChannels);
      }
      
      console.log(`✅ [Channels] Load complete: ${uniqueChannels.length} channels (Total: ${finalChannels.length})`);
        } catch (error) {
      console.error('❌ [Channels] Error loading channels:', error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };
  
  // Batch fetch user profiles for better performance
  const batchFetchUserProfiles = async (dmChannels: Channel[]) => {
    const now = Date.now();
    const memberIdsToFetch = new Set<string>();
    
    console.log(`🔍 [Profiles] Analyzing ${dmChannels.length} DM channels for profile fetching...`);
    
    // Collect all unique member IDs that need fetching
    for (const channel of dmChannels) {
      const otherMembers = channel.members.filter(memberId => memberId !== user?.$id);
      for (const memberId of otherMembers) {
        const cachedProfile = userProfileCache.current.get(memberId);
        if (!cachedProfile || (now - cachedProfile.timestamp) > CACHE_DURATION) {
          memberIdsToFetch.add(memberId);
        }
      }
    }
    
    console.log(`👥 [Profiles] Need to fetch ${memberIdsToFetch.size} profiles (${userProfileCache.current.size} already cached)`);
    
    if (memberIdsToFetch.size === 0) {
      console.log('✅ [Profiles] All profiles already cached, skipping fetch');
      return;
    }
    
    try {
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Fetch profiles in batches of 100 (Appwrite limit)
      const memberIdArray = Array.from(memberIdsToFetch);
      const batchSize = 100;
      
      console.log(`📡 [Profiles] Fetching profiles in batches of ${batchSize}...`);
      
      for (let i = 0; i < memberIdArray.length; i += batchSize) {
        const batch = memberIdArray.slice(i, i + batchSize);
        
        console.log(`📦 [Profiles] Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(memberIdArray.length/batchSize)} (${batch.length} profiles)`);
        
        const userResponse = await databases.listDocuments(
          config.databaseId,
          process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
          [Query.equal('accountId', batch), Query.limit(batchSize)]
        );
        
        console.log(`✅ [Profiles] Batch ${Math.floor(i/batchSize) + 1} returned ${userResponse.documents.length} profiles`);
        
        // Update cache with fetched profiles
        for (const userData of userResponse.documents) {
          userProfileCache.current.set(userData.accountId, {
            name: userData.username || userData.accountId,
            avatar: userData.profileImageUri || userData.avatar || '',
            documentId: userData.$id,
            timestamp: now
          });
        }
        
        // Add entries for users not found
        for (const memberId of batch) {
          if (!userResponse.documents.some(doc => doc.accountId === memberId)) {
            userProfileCache.current.set(memberId, {
              name: memberId,
              avatar: '',
              documentId: '', // No document ID for users not found
              timestamp: now
            });
          }
        }
      }
      
      console.log(`✅ [Profiles] Batch fetch complete. Cache size: ${userProfileCache.current.size} profiles`);
    } catch (error) {
      console.error('❌ [Profiles] Error batch fetching user profiles:', error);
    }
  };
  

  
  // Handle search input changes
  const handleSearchChange = (text: string) => {
    console.log(`🔍 [Search] Search query changed: "${text}"`);
    setSearchQuery(text);
    const filtered = filterChannels(channels, text, user?.$id);
    setFilteredChannels(filtered);
  };
  
  // Load more channels when reaching the end of the list
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreChannels && !searchQuery) {
      console.log('📈 [LoadMore] Triggering load more...');
      loadChannels(true);
    } else {
      console.log(`📈 [LoadMore] Load more blocked - isLoadingMore: ${isLoadingMore}, hasMoreChannels: ${hasMoreChannels}, searchQuery: "${searchQuery}"`);
    }
  };

  const handleVerifySocialMediaCode = async () => {
    if (!user?.$id || !socialMediaCode.trim()) return;
    
    setIsVerifyingCode(true);
    setVerificationError('');
    
    try {
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Get user document to check the social_media_number
      const userDocs = await databases.listDocuments(
        config.databaseId,
        config.creatorCollectionId,
        [Query.equal('creatoraccountid', user.$id)]
      );
      
      if (userDocs.documents.length > 0) {
        const userDoc = userDocs.documents[0];
        const storedCode = userDoc.social_media_number;
        
                  if (storedCode === socialMediaCode.trim()) {
            // Code matches, update both social_media_number_correct and account_state
            await databases.updateDocument(
              config.databaseId,
              config.creatorCollectionId,
              userDoc.$id,
              {
                social_media_number_correct: true,
                account_state: 'ok'
              }
            );
            
            console.log('✅ [SocialMedia] Code verified successfully, account_state set to ok');
            
            // Copy all photo documents to the available collection for this user
            try {
              console.log('🔄 [PhotoCollection] Copying photo documents to available collection for user:', user.$id);
              console.log('🔍 [PhotoCollection] Available collection ID:', config.photosAvailableToUsersCollectionId);
              
              // Check if the new collection ID is configured
              if (!config.photosAvailableToUsersCollectionId) {
                console.error('❌ [PhotoCollection] EXPO_PUBLIC_APPWRITE_PHOTOS_AVAILABLE_TO_USERS environment variable not set');
                console.log('⚠️ [PhotoCollection] Skipping photo document processing - new collection not configured');
                return; // Exit early if new collection is not configured
              }
              
              // Get all photo documents for this user
              const photoDocs = await databases.listDocuments(
                config.databaseId,
                config.photoCollectionId,
                [Query.equal('IdCreator', user.$id)]
              );
              
              console.log(`📸 [PhotoCollection] Found ${photoDocs.documents.length} photo documents to copy`);
              
              // Copy each photo document to the available collection
              const copyPromises = photoDocs.documents.map(async (photoDoc) => {
                try {
                  // Create document in the available collection
                  const { ID } = await import('react-native-appwrite');
                  await databases.createDocument(
                    config.databaseId,
                    config.photosAvailableToUsersCollectionId,
                    ID.unique(),
                    {
                      // Only include allowed attributes based on the error message
                      thumbnail: photoDoc.thumbnail,
                      title: photoDoc.title,
                      prompte: photoDoc.prompte,
                      IdCreator: photoDoc.IdCreator,
                      payment: photoDoc.payment,
                      PhotosLocation: photoDoc.PhotosLocation,
                      PhotoTopics: photoDoc.PhotoTopics,
                      Bio: photoDoc.Bio,
                      compressed_thumbnail: photoDoc.compressed_thumbnail,
                      // Add currency if it exists in the original document
                      ...(photoDoc.currency && { currency: photoDoc.currency })
                    }
                  );
                  
                  console.log(`✅ [PhotoCollection] Copied photo document ${photoDoc.$id} to available collection`);
                  return { success: true, id: photoDoc.$id };
                } catch (error) {
                  console.error(`❌ [PhotoCollection] Failed to copy photo document ${photoDoc.$id}:`, error);
                  return { success: false, id: photoDoc.$id, error };
                }
              });
              
              const results = await Promise.allSettled(copyPromises);
              const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
              const failed = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)).length;
              
              console.log(`📊 [PhotoCollection] Copy summary: ${successful} copied successfully, ${failed} failed`);
              
              if (failed > 0) {
                console.warn(`⚠️ [PhotoCollection] Some photo documents failed to copy. Check logs above for details.`);
              }
              
            } catch (error) {
              console.error('❌ [PhotoCollection] Error copying photo documents:', error);
              // Don't throw here - we don't want to break the main verification flow
            }
            
            setShowInlineVerification(false);
            setSocialMediaCode('');
            
            // Reload channels to check if all conditions are now met
            await loadChannels(false);
        } else {
          // Code doesn't match
          setVerificationError('Invalid code. Please try again.');
          console.log('❌ [SocialMedia] Code verification failed');
        }
      } else {
        setVerificationError('User document not found.');
      }
    } catch (error) {
      console.error('❌ [SocialMedia] Error verifying code:', error);
      setVerificationError('An error occurred. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const showCustomNotification = (message: string, type: 'success' | 'error') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const handleResendCode = async () => {
    if (!user?.$id) return;
    
    try {
      console.log('🚀 Starting resend code process...');
      console.log('🔧 Environment variables:');
      console.log('  - EXPO_PUBLIC_APPWRITE_ENDPOINT:', process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT);
      console.log('  - EXPO_PUBLIC_APPWRITE_PROJECT_ID:', process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID);
      console.log('  - EXPO_PUBLIC_SEND_SOCIAL_MEDIA_CODE_ID:', process.env.EXPO_PUBLIC_SEND_SOCIAL_MEDIA_CODE_ID);
      
      const { databases, config } = await import('@/lib/appwrite');
      const { Query, Functions } = await import('react-native-appwrite');
      
      // Get user document to get social media info
      const userDocs = await databases.listDocuments(
        config.databaseId,
        config.creatorCollectionId,
        [Query.equal('creatoraccountid', user.$id)]
      );
      
      if (userDocs.documents.length > 0) {
        const userDoc = userDocs.documents[0];
        console.log('✅ User document found:', userDoc);
        
        // Setup Appwrite client for functions
        const { Client } = await import('react-native-appwrite');
        const client = new Client()
          .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
          .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);
        
        const functions = new Functions(client);
        
        // Call the SEND_SOCIAL_MEDIA_CODE_ID function using Appwrite SDK
        const functionId = process.env.EXPO_PUBLIC_SEND_SOCIAL_MEDIA_CODE_ID;
        console.log('🔧 Function ID:', functionId);
        
        if (!functionId) {
          throw new Error('SEND_SOCIAL_MEDIA_CODE_ID environment variable is not defined');
        }
        
        const requestData = {
          userId: user.$id,
          socialMedia: userDoc.social_media,
          socialMediaUsername: userDoc.social_media_username,
          userEmail: user.email
        };
        
        console.log('📤 Sending request data:', requestData);
        
        // Show success message immediately
        showCustomNotification('A new verification code has been sent to your social media account.', 'success');
        
        // Call the function in the background (fire and forget)
        functions.createExecution(
          functionId,
          JSON.stringify(requestData)
        ).then(response => {
          console.log('✅ Function execution response:', response);
        }).catch(error => {
          console.error('❌ Function execution error:', error);
        });
      } else {
        showCustomNotification('User information not found.', 'error');
      }
    } catch (error) {
      console.error('❌ [SocialMedia] Error resending code:', error);
      showCustomNotification('An error occurred while sending the code. Please try again.', 'error');
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
        console.log('💰 Loaded user currency:', currency);
      }
    } catch (error) {
      console.error('Error loading user currency:', error);
      setUserCurrency('USD'); // Default fallback
    }
  };

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

    setIsLoadingFinancials(true);
    try {
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      const creatorResponse = await databases.listDocuments(
        config.databaseId,
        process.env.EXPO_PUBLIC_APPWRITE_CREATOR_COLLECTION_ID!,
        [Query.equal('creatoraccountid', user.$id)]
      );

      if (creatorResponse.documents.length > 0) {
        const creatorData = creatorResponse.documents[0];
        console.log('📊 [KPI DEBUG] Creator financial data loaded:', {
          currentPeriodGross: creatorData.currentPeriodGross,
          previousPeriodGross: creatorData.previousPeriodGross,
          lifetimeGross: creatorData.lifetimeGross,
          currentPeriodStart: creatorData.currentPeriodStart,
          lifetimeVolume: creatorData.lifetimeVolume,
          stripeConnectAccountId: creatorData.stripeConnectAccountId
        });
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
        console.log('🔄 [KPI DEBUG] Calling Stripe balance API for account:', creatorFinancials.stripeConnectAccountId);
        const execution = await functions.createExecution(
            process.env.EXPO_PUBLIC_STRIPE_BALANCE_FUNCTION_ID!,
            JSON.stringify({ stripeConnectAccountId: creatorFinancials.stripeConnectAccountId }),
            false, '/get-balance', ExecutionMethod.POST,
            { 'Content-Type': 'application/json' }
        );
        console.log('📡 [KPI DEBUG] Stripe API execution result:', execution);

        // Parse the response to get goals
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
          console.log('Error parsing response:', e);
        }

        // Refetch the data from our DB
        console.log('🔄 [KPI DEBUG] Refetching creator financial data...');
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
          console.log('💰 User currency:', userCurrency);
          console.log('🎂 User date of birth:', dateOfBirth);
          console.log('📱 User phone number:', phoneNumber);
        }
      } catch (profileError) {
        console.log('⚠️ Could not fetch user profile data, using defaults:', profileError);
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
        console.log('✅ Got account link URL:', response.accountLinkUrl);
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
      console.error('❌ Error during Stripe onboarding:', error);
      setShowNetworkErrorModal(true);
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
      setShowNetworkErrorModal(true);
        } finally {
      setIsLoadingStripeConnect(false);
    }
  };





  const loadAudience = async () => {
    if (!user?.$id) return;
    console.log('👥 [Audience] Starting audience load...');
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
      console.log(`✅ [Audience] Loaded ${response.documents.length} subscribers`);
      setAudience(response.documents);
    } catch (error) {
      console.error('❌ [Audience] Error loading audience:', error);
      setAudience([]);
    } finally {
      setIsLoadingAudience(false);
    }
  };

  const onRefresh = async () => {
    console.log('🔄 [Refresh] Starting refresh...');
    setRefreshing(true);
    try {
      if (selectedTab === 'chats') {
        console.log('🔄 [Refresh] Refreshing chats tab...');
        // Reset pagination state
        setChannelOffset(0);
        setHasMoreChannels(true);
        setSearchQuery('');
        setShowSearch(false);
        await loadChannels(false);
        await loadProfileImage();
      } else if (selectedTab === 'other') {
        console.log('🔄 [Refresh] Refreshing other tab...');
        await loadCreatorFinancials();
      } else if (selectedTab === 'audience') {
        console.log('🔄 [Refresh] Refreshing audience tab...');
        await loadAudience();
      }
    } catch (error) {
      console.error('❌ [Refresh] Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user?.$id) {
      console.log('⚠️ [Init] No authenticated user, clearing channels and skipping load');
      setChannels([]);
      setFilteredChannels([]);
      setChannelsLoaded(false);
      return;
    }
    
    if (!channelsLoaded && user?.$id) {
      console.log('🚀 [Init] Initial load triggered');
      loadChannels(false).then(() => {
        setChannelsLoaded(true);
        // Initialize filtered channels after loading
        setFilteredChannels(channels);
        console.log('✅ [Init] Initial load complete');
      });
    }
    loadProfileImage();
    loadUserCurrency();
    if (user?.$id) {
        loadCreatorFinancials();
    }
  }, [user, channelsLoaded]);

  useEffect(() => {
    if (selectedTab === 'audience') {
      console.log('👥 [Audience] Tab selected, loading audience...');
      loadAudience();
    }
  }, [selectedTab, user]);

  // Update filteredAudience when audience, search, or filter changes
  useEffect(() => {
    console.log(`🔍 [Audience] Filtering ${audience.length} subscribers with search: "${audienceSearch}", filter: ${audienceFilter}`);
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
    console.log(`✅ [Audience] Filtered to ${filtered.length} subscribers`);
    setFilteredAudience(filtered);
  }, [audience, audienceSearch, audienceFilter]);



  // Handle highlighting setup button when navigating from payment setup incomplete
  useEffect(() => {
    // Check if we should highlight the setup button when other tab is selected
    if (selectedTab === 'other' && shouldHighlightSetup) {
      // Start the animation after a short delay to ensure the tab content is rendered
      setTimeout(() => {
        startSetupButtonAnimation();
      }, 500);
    }
  }, [selectedTab, shouldHighlightSetup]);

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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#DCDEDF' }} edges={['top']}>
            {/* Custom Notification */}
            <CustomNotificationModal
              visible={showNotification}
              message={notificationMessage}
              type={notificationType}
              onClose={() => setShowNotification(false)}
            />
            
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 bg-#DCDEDF">
                <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)} activeOpacity={0.8}>
                  <Image 
                      source={require('../../../assets/images/cherry-icon.png')}
                      className="w-16 h-16 rounded-lg"
                      resizeMode="contain"
                  />
                </TouchableOpacity>
                
                <View className="flex-row items-center">
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{
                            fontSize: 39,
                            fontWeight: 'bold',
                            color: 'black',
                            fontFamily: 'MuseoModerno-Regular',
                            textAlign: 'center',
                        }}>
                            cherrizbox
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
        backgroundColor: '#DCDEDF',
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
                backgroundColor: selectedTab === item.id ? 'white' : '#DCDEDF',
                borderWidth: 1,
                borderColor: selectedTab === item.id ? 'transparent' : '#676767',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 80,
              }}
              onPress={() => setSelectedTab(item.id)}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <Ionicons 
                  name={item.icon as any} 
                  size={16} 
                  color={selectedTab === item.id ? 'black' : 'black'}
                />
                <Text style={{
                  color: selectedTab === item.id ? 'black' : 'black',
                  fontSize: 14,
                  fontWeight: selectedTab === item.id ? 'bold' : 'normal',
                  fontFamily: selectedTab === item.id ? 'Urbanist-Bold' : 'Urbanist-Regular',
                }}>
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
                    
      {/* Content based on selected tab */}
      {selectedTab === 'chats' && (
        <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: '#DCDEDF' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Search Bar */}
          <SearchBar
            showSearch={showSearch}
            searchQuery={searchQuery}
            onSearchToggle={setShowSearch}
            onSearchChange={handleSearchChange}
            onSearchClear={() => setSearchQuery('')}
            onSearchCancel={() => {
              setShowSearch(false);
              setSearchQuery('');
              setFilteredChannels(channels);
            }}
            hasChannels={channels.length > 0}
          />
          
          {!isCheckingConditions && !showInlineVerification && missingChannelConditions.length === 0 ? (
            <ChannelList
              channels={channels}
              filteredChannels={filteredChannels}
              searchQuery={searchQuery}
              isLoading={isLoading}
              refreshing={refreshing}
              isLoadingMore={isLoadingMore}
              hasMoreChannels={hasMoreChannels}
              channelsPerPage={CHANNELS_PER_PAGE}
              currentUserId={user?.$id}
              profileImage={profileImage}
              userName={user?.name}
              userCurrency={userCurrency}
              userProfileCache={userProfileCache}
              uncollectedTips={uncollectedTips}
              onRefresh={onRefresh}
              onLoadMore={handleLoadMore}
              onChannelPress={(channelId) => {
                router.push(`/chat/${channelId}` as any);
              }}
              onChannelUpdate={handleChannelUpdate}
              onTipCollected={handleTipCollected}
            />
          ) : (
            <ScrollView
              contentContainerStyle={{ 
                flex: 1, 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#DCDEDF',
                paddingHorizontal: 32
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#676767"
                  colors={["#676767"]}
                  progressBackgroundColor="#DCDEDF"
                />
              }
            >
              {isCheckingConditions ? (
                <>
                  <Image 
                    source={require('../../../assets/icon/loading-icon.png')} 
                    style={{ width: 80, height: 80, marginBottom: 16 }} 
                  />
                  <Text style={{ 
                    color: 'black', 
                    fontSize: 18, 
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 12,
                    textAlign: 'center'
                  }}>
                    Checking requirements...
                  </Text>
                  <ActivityIndicator size="large" color="black" />
                </>
              ) : showInlineVerification ? (
                <SocialMediaVerificationModal
                  visible={showInlineVerification}
                  socialMediaPlatform={socialMediaPlatform}
                  socialMediaUsername={socialMediaUsername}
                  socialMediaCode={socialMediaCode}
                  verificationError={verificationError}
                  isVerifyingCode={isVerifyingCode}
                  networks={networks}
                  onCodeChange={(code) => {
                    setSocialMediaCode(code);
                    setVerificationError('');
                  }}
                  onVerifyCode={handleVerifySocialMediaCode}
                  onResendCode={handleResendCode}
                  onClose={() => setShowInlineVerification(false)}
                  onChangeUsername={() => {
                    setShowInlineVerification(false);
                    router.push('/change-username');
                  }}
                />
              ) : missingChannelConditions.length > 0 ? (
                <>
                  <View style={{
                    backgroundColor: 'rgba(175, 137, 146, 0.05)',
                    borderRadius: 20,
                    padding: 28,
                    marginBottom: 24,
                    borderWidth: 2,
                    borderColor: 'rgba(0, 0, 0, 0.2)',
                    width: '100%',
                    alignItems: 'center'
                  }}>
                    {/* Loading Icon */}
                    <View style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16
                    }}>
                      <Image 
                        source={require('../../../assets/icon/loading-icon.png')} 
                        style={{ width: 72, height: 72 }} 
                      />
                    </View>
                    
                    <Text style={{ 
                      color: 'black', 
                      fontSize: 22, 
                      fontFamily: 'Urbanist-Bold',
                      marginBottom: 8,
                      textAlign: 'center'
                    }}>
                      Almost Ready! 🚀
                    </Text>
                    
                    <Text style={{ 
                      color: 'black', 
                      fontSize: 16, 
                      textAlign: 'center',
                      fontFamily: 'Urbanist-Regular',
                      marginBottom: 24,
                      lineHeight: 22
                    }}>
                      You're just a few steps away from launching your creator channel! Complete these requirements to get started:
                    </Text>
                    
                    {missingChannelConditions.map((condition, index) => {
                      // Determine icon and colors based on condition
                      let iconName = 'checkmark-outline';
                      let iconColor = 'white';
                      let backgroundColor = 'rgb(255, 0, 0)';
                      let borderColor = 'rgb(255, 0, 0)';
                      
                      if (condition === 'Payment setup incomplete') {
                        iconName = 'card-outline';
                        iconColor = '#4CAF50';
                        backgroundColor = 'rgba(76, 175, 80, 0.2)';
                        borderColor = 'rgba(76, 175, 80, 0.3)';
                      }
                      
                      return (
                        <View key={index} style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 16,
                          paddingHorizontal: 20,
                          paddingVertical: 12,
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: borderColor,
                          width: '100%'
                        }}>
                          <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: backgroundColor,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                          }}>
                            <Ionicons name={iconName as any} size={14} color={iconColor} />
                          </View>
                          <Text style={{ 
                            color: 'black', 
                            fontSize: 15, 
                            fontFamily: 'Urbanist-Medium',
                            flex: 1
                          }}>
                            {condition}
                          </Text>
                        </View>
                      );
                    })}
                    
                    <TouchableOpacity
                      onPress={() => {
                        // If only payment setup is missing, go to earnings page and highlight setup button
                        if (missingChannelConditions.length === 1 && missingChannelConditions[0] === 'Payment setup incomplete') {
                          setShouldHighlightSetup(true);
                          setSelectedTab('other');
                        } else {
                          // Otherwise go to edit-profile page
                          router.push('/edit-profile');
                        }
                      }}
                      style={{
                        backgroundColor: missingChannelConditions.length === 1 && missingChannelConditions[0] === 'Payment setup incomplete' ? '#4CAF50' : '#676767',
                        borderRadius: 16,
                        paddingVertical: 16,
                        paddingHorizontal: 32,
                        alignItems: 'center',
                        marginTop: 8,
                        width: '100%',
                        shadowColor: missingChannelConditions.length === 1 && missingChannelConditions[0] === 'Payment setup incomplete' ? '#4CAF50' : '#676767',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 8
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {missingChannelConditions.length === 1 && missingChannelConditions[0] === 'Payment setup incomplete' && (
                          <Ionicons name="cash-outline" size={20} color="white" style={{ marginRight: 8 }} />
                        )}
                        <Text style={{ 
                          color: 'black', 
                          fontSize: 17, 
                          fontFamily: 'Urbanist-Bold'
                        }}>
                          Complete Setup {missingChannelConditions.length === 1 && missingChannelConditions[0] === 'Payment setup incomplete' ? '' : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={{ 
                    color: 'black', 
                    fontSize: 14, 
                    textAlign: 'center',
                    fontFamily: 'Urbanist-Regular',
                    lineHeight: 20
                  }}>
                    Don't worry, this will only take a few minutes! 
                  </Text>
                </>
              ) : (
                <>
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
                </>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      )}

      {selectedTab === 'insights' && (
        <ScrollView 
          style={{ 
              flex: 1, 
            backgroundColor: '#DCDEDF'
          }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingVertical: 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingInsights}
              onRefresh={async () => {
                setIsLoadingInsights(true);
                await loadCreatorFinancials();
                setIsLoadingInsights(false);
              }}
              tintColor="#676767"
              colors={["#676767"]}
              progressBackgroundColor="#DCDEDF"
            />
          }
        >
          {/* Big Total Subscribers Card with Weekly Stats */}
            <View style={{
              backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
          }}>
              <Text style={{ 
                color: 'black', 
              fontFamily: 'MuseoModerno-Regular', 
              fontSize: 18,
              marginBottom: 16,
              textAlign: 'center'
              }}>
                Total Current Subscribers
              </Text>
            
            {/* Total Number */}
            <Text style={{ 
              color: 'black', 
              fontFamily: 'MuseoModerno-Regular', 
              fontSize: 48, 
              textAlign: 'center',
              marginBottom: 20
            }}>
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
                      }}>
                        +{weeklyStats.gained}
                      </Text>
              </View>
                    <Text style={{ 
                      color: '#888888', 
                      fontFamily: 'MuseoModerno-Regular', 
                      fontSize: 12,
                      textAlign: 'center'
                    }}>
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
                      }}>
                        -{weeklyStats.lost}
                      </Text>
              </View>
                    <Text style={{ 
                      color: '#888888', 
                      fontFamily: 'MuseoModerno-Regular', 
                      fontSize: 12,
                      textAlign: 'center'
                    }}>
                      Lost this week
              </Text>
            </View>
          </View>
              );
            })()}
          </View>

          {/* Subscriber Growth Chart with Tabs */}
            <View style={{
              backgroundColor: 'white',
              borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}>
            <Text style={{
              color: 'black',
              fontSize: 18,
              fontFamily: 'MuseoModerno-Regular',
              marginBottom: 16,
            }}>
              Subscriber Growth
              </Text>
            
            {/* Tabs */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#F0F0F0',
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
                    backgroundColor: subscriberTimeframe === timeframe ? 'white' : 'transparent',
                  }}
                >
                  <Text style={{
                    color: subscriberTimeframe === timeframe ? 'black' : '#888888',
                    fontFamily: 'MuseoModerno-Regular',
                    fontSize: 14,
                    textAlign: 'center',
                    textTransform: 'capitalize',
                  }}>
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
                    }}>
                      {stats.net >= 0 ? '+' : ''}{stats.net}
                    </Text>
                    <Text style={{
                      color: '#888888',
                      fontSize: 14,
                      fontFamily: 'MuseoModerno-Regular',
                      marginBottom: 8,
                    }}>
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
                      }}>
                        +{stats.gained} gained
                      </Text>
                      <Text style={{
                        color: '#F44336',
                        fontSize: 14,
                        fontFamily: 'MuseoModerno-Regular',
                      }}>
                        -{stats.lost} lost
                      </Text>
              </View>
                  </>
                );
              })()}
            </View>
            
            {/* Subscriber Chart */}
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
                  backgroundColor: '#F8F8F8',
                  borderRadius: 12,
                  marginVertical: 8,
                }}>
                  <Text style={{
                    color: '#888888',
                    fontSize: 14,
                    fontFamily: 'MuseoModerno-Regular',
                    textAlign: 'center',
                  }}>
                    No subscriber data available yet.{'\n'}Chart will appear once you have subscriber activity.
              </Text>
            </View>
              );
            })()}
          </View>



          {/* Content Purchases Section */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ 
              color: 'black', 
              fontFamily: 'MuseoModerno-Regular', 
              fontSize: 20, 
              marginBottom: 16,
              textAlign: 'left'
            }}>
              Content Purchases
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
            {/* Photos */}
              <View style={{
              backgroundColor: 'white',
                borderRadius: 16,
              width: '32%',
              padding: 12,
            }}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#666666', borderRadius: 8, padding: 6, marginBottom: 6 }}>
                  <Ionicons name="image" size={16} color="white" />
                </View>
                <Text style={{ color: 'black', fontFamily: 'MuseoModerno-Regular', fontSize: 12, textAlign: 'center' }}>Photos</Text>
              </View>
              <Text style={{ color: '#333333', fontFamily: 'MuseoModerno-Regular', fontSize: 20, textAlign: 'center' }}>
                {creatorFinancials?.number_of_photos ?? '—'}
              </Text>
              </View>
              {/* Videos */}
              <View style={{
                backgroundColor: 'white',
                borderRadius: 16,
                width: '32%',
              padding: 12,
            }}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#777777', borderRadius: 8, padding: 6, marginBottom: 6 }}>
                  <Ionicons name="videocam" size={16} color="white" />
                </View>
                <Text style={{ color: 'black', fontFamily: 'MuseoModerno-Regular', fontSize: 12, textAlign: 'center' }}>Videos</Text>
              </View>
              <Text style={{ color: '#333333', fontFamily: 'MuseoModerno-Regular', fontSize: 20, textAlign: 'center' }}>
                {creatorFinancials?.number_of_videos ?? '—'}
              </Text>
              </View>
              {/* Files */}
              <View style={{
                backgroundColor: 'white',
                borderRadius: 16,
                width: '32%',
              padding: 12,
            }}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#888888', borderRadius: 8, padding: 6, marginBottom: 6 }}>
                  <Ionicons name="document" size={16} color="white" />
                </View>
                <Text style={{ color: 'black', fontFamily: 'MuseoModerno-Regular', fontSize: 12, textAlign: 'center' }}>Files</Text>
              </View>
              <Text style={{ color: '#333333', fontFamily: 'MuseoModerno-Regular', fontSize: 20, textAlign: 'center' }}>
                {creatorFinancials?.number_of_files ?? '—'}
              </Text>
              </View>
          </View>


        </ScrollView>
      )}

      {selectedTab === 'audience' && (
        <View style={{ flex: 1, backgroundColor: '#DCDEDF' }}>
          {/* Fixed Header with Search and Filters */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 }}>
            {/* Search Bar */}
            <View style={{ width: '100%', marginBottom: 12 }}>
                <View style={{
                backgroundColor: 'white',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}>
                <Ionicons name="search" size={20} color="black" style={{ marginRight: 4 }} />
                <TextInput
                  style={{
                    flex: 1,
                    color: 'white',
                    fontFamily: 'Urbanist-Regular',
                    fontSize: 16,
                    backgroundColor: 'transparent',
                    padding: 0,
                    letterSpacing: 0.2,
                  }}
                  placeholder="Search by username..."
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
                    backgroundColor: audienceFilter === tag.key ? 'white' : '#DCDEDF',
                    borderRadius: 20,
                    paddingVertical: 7,
                    paddingHorizontal: 16,
                    marginHorizontal: 2,
                    borderWidth: audienceFilter === tag.key ? 1.5 : 1,
                    borderColor: audienceFilter === tag.key ? 'white' : '#676767',
                  }}
                >
                  <Text style={{
                    color: audienceFilter === tag.key ? 'black' : 'black',
                    fontFamily: audienceFilter === tag.key ? 'Urbanist-Bold' : 'Urbanist-Regular',
                    fontSize: 14,
                  }}>{tag.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={{ 
              flex: 1, 
              backgroundColor: '#DCDEDF',
              paddingHorizontal: 0
            }}
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'stretch',
              justifyContent: filteredAudience.length === 0 && !isLoadingAudience ? 'center' : 'flex-start',
              paddingHorizontal: 16
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing || isLoadingAudience}
                onRefresh={onRefresh}
                tintColor="black"
                colors={["black"]}
                progressBackgroundColor="#DCDEDF"
              />
            }
          >
            {/* Loading indicator moved below search and filters */}
            {isLoadingAudience ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 32 }}>
                <Image 
                  source={require('../../../assets/icon/loading-icon.png')} 
                  style={{ width: 48, height: 48, marginBottom: 12 }}
                  resizeMode="contain"
                />
                <Text style={{ color: 'black', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>Loading subscribers...</Text>
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
                    backgroundColor: 'white',
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
                    backgroundColor: '#d3d3d3',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                    overflow: 'hidden',
                  }}>
                    <Text style={{ color: 'black', fontSize: 22, fontWeight: 'bold', fontFamily: 'Urbanist-Bold' }}>
                      {sub.userName ? sub.userName[0]?.toUpperCase() : (sub.customerEmail ? sub.customerEmail[0]?.toUpperCase() : 'U')}
                </Text>
              </View>
                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'black', fontFamily: 'Urbanist-Bold', fontSize: 17 }}>
                      {sub.userName || sub.customerEmail || 'No name'}
                    </Text>
                    <Text style={{ color: '#CCCCCC', fontFamily: 'Urbanist-Regular', fontSize: 14 }}>
                      {sub.customerEmail && sub.userName ? sub.customerEmail : ''}
                    </Text>
                  </View>
                  {/* Plan info */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: 'black', fontFamily: 'Urbanist-Bold', fontSize: 14 }}>
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
        </View>
      )}

      {selectedTab === 'other' && (
        <ScrollView 
          ref={earningsScrollRef}
          style={{ 
            flex: 1, 
            backgroundColor: '#DCDEDF',
          }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingFinancials}
              onRefresh={handleUpdateStripeData}
              tintColor="#676767"
              colors={["#676767"]}
              progressBackgroundColor="#DCDEDF"
            />
          }
        >
          <View>
            {/* Auto-initialize KPI data if missing and Stripe is connected */}
            {(() => {
              if (creatorFinancials?.stripeConnectSetupComplete && 
                  creatorFinancials?.currentPeriodGross === undefined && 
                  !isLoadingFinancials) {
                console.log('🔄 [AUTO-INIT] Auto-initializing KPI data...');
                handleUpdateStripeData();
              }
              return null;
            })()}

            {/* First Row: Available & Pending */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {/* Available Card */}
              <View style={{
                flex: 1,
                backgroundColor: 'white',
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
                    borderColor: 'black',
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      color: 'black',
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
                    color: 'black',
                    fontSize: 20,
                    fontFamily: 'MuseoModerno-Regular',
                    marginBottom: 8,
                  }}>
                    Available
                  </Text>
                  <Text style={{
                    color: 'black',
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
                    backgroundColor: 'black',
                    borderRadius: 8,
                    padding: 10,
                    minWidth: 180,
                    zIndex: 10,
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
                      Funds that are available for payout to your bank account.
                    </Text>
                  </View>
                )}
              </View>

              {/* Pending Card */}
              <View style={{
                flex: 1,
                backgroundColor: 'white',
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
                    borderColor: 'black',
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      color: 'black',
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
                    color: 'black',
                    fontSize: 20,
                    fontFamily: 'MuseoModerno-Regular',
                    marginBottom: 8,
                  }}>
                    Pending
                  </Text>
                  <Text style={{
                    color: 'black',
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
                    backgroundColor: 'black',
                    borderRadius: 8,
                    padding: 10,
                    minWidth: 180,
                    zIndex: 10,
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
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
                backgroundColor: 'white',
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
                    borderColor: 'black',
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      color: 'black',
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
                    color: 'black',
                    fontSize: 20,
                    fontFamily: 'MuseoModerno-Regular',
                    marginBottom: 8,
                  }}>
                    Total
                  </Text>
                  <Text style={{
                    color: 'black',
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
                    backgroundColor: 'black',
                    borderRadius: 8,
                    padding: 10,
                    minWidth: 180,
                    zIndex: 10,
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
                      Combined total of available and pending funds in your account.
                    </Text>
                  </View>
                )}
              </View>

              {/* In Transit Card */}
              <View style={{
                flex: 1,
                backgroundColor: 'white',
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
                    borderColor: 'black',
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      color: 'black',
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
                    color: 'black',
                    fontSize: 20,
                    fontFamily: 'MuseoModerno-Regular',
                    marginBottom: 8,
                  }}>
                    In Transit
                  </Text>
                  <Text style={{
                    color: 'black',
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
                    backgroundColor: 'black',
                    borderRadius: 8,
                    padding: 10,
                    minWidth: 180,
                    zIndex: 10,
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Urbanist-Regular' }}>
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
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
              }}>
                {/* Centered content */}
                <View style={{ alignItems: 'center' }}>
                  <Text style={{
                    color: 'black',
                    fontSize: 16,
                    fontFamily: 'MuseoModerno-Regular',
                    marginBottom: 4,
                  }}>
                    Today's Goal
                  </Text>
                  <Text style={{
                    color: '#888888',
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
                      color: 'black',
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
                      textColor="black"
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
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
              }}>
                {/* Centered content */}
                <View style={{ alignItems: 'center' }}>
                  <Text style={{
                    color: 'black',
                    fontSize: 16,
                    fontFamily: 'MuseoModerno-Regular',
                    marginBottom: 4,
                  }}>
                    Weekly Goal
                  </Text>
                  <Text style={{
                    color: '#888888',
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
                      color: 'black',
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
                      textColor="black"
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
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              position: 'relative',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{
                  color: 'black',
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
                    borderColor: 'black',
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      color: 'black',
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
                  color: 'black',
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
                  color: '#888888',
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
                backgroundColor: '#F0F0F0',
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
                      backgroundColor: earningsTimeframe === timeframe ? 'white' : 'transparent',
                    }}
                  >
                    <Text style={{
                      color: earningsTimeframe === timeframe ? 'black' : '#888888',
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
                color: '#666666',
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
                    backgroundColor: '#F8F8F8',
                    borderRadius: 12,
                    marginVertical: 8,
                  }}>
                    <Text style={{
                      color: '#888888',
                      fontSize: 14,
                      fontFamily: 'Urbanist-Regular',
                      textAlign: 'center',
                    }}>
                      No earnings data available yet.{'\n'}Chart will appear once you start earning.
                    </Text>
                  </View>
                );
              })()}
              
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
                  backgroundColor: 'white',
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
                    color: 'black',
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
                        color: 'black',
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
                    <Text style={{ color: 'black', fontFamily: 'Urbanist-Regular' }}>Setup Complete</Text>
                  </View>
                  <Text style={{ color: '#4CAF50', fontFamily: 'Urbanist-Bold' }}>Yes</Text>
                </View>
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectEnabled ? "card-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectEnabled ? '#4CAF50' : '#F44336'} style={{ marginRight: 10 }} />
                    <Text style={{ color: 'black', fontFamily: 'Urbanist-Regular' }}>Payments Active</Text>
                  </View>
                  <Text style={{ color: creatorFinancials.stripeConnectEnabled ? '#4CAF50' : '#F44336', fontFamily: 'Urbanist-Bold' }}>
                    {creatorFinancials.stripeConnectEnabled ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectPayoutsEnabled ? "cash-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectPayoutsEnabled ? '#4CAF50' : '#F44336'} style={{ marginRight: 10 }} />
                    <Text style={{ color: 'black', fontFamily: 'Urbanist-Regular' }}>Payouts Active</Text>
                  </View>
                  <Text style={{ color: creatorFinancials.stripeConnectPayoutsEnabled ? '#4CAF50' : '#F44336', fontFamily: 'Urbanist-Bold' }}>
                    {creatorFinancials.stripeConnectPayoutsEnabled ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={creatorFinancials.stripeConnectVerified ? "person-circle-outline" : "alert-circle-outline"} size={20} color={creatorFinancials.stripeConnectVerified ? '#4CAF50' : '#FF9800'} style={{ marginRight: 10 }} />
                    <Text style={{ color: 'black', fontFamily: 'Urbanist-Regular' }}>Account Verified</Text>
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
                    color: 'black',
                    fontSize: 16,
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 4
                  }}>
                    Get Paid
                  </Text>
                  <Text style={{
                    color: 'black',
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
                backgroundColor: '#333',
                borderRadius: 12,
                paddingVertical: 14,
                marginTop: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row'
              }}
            >
              <Ionicons name="open-outline" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontFamily: 'Urbanist-Bold', fontSize: 16 }}>
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
      )}

      {/* Stripe Connect WebView Modal */}
      <StripeConnectModal
        visible={showStripeConnect}
        stripeConnectUrl={stripeConnectUrl}
        onClose={() => setShowStripeConnect(false)}
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
            
            // Refresh channel conditions to update missing requirements
            setTimeout(async () => {
              await refreshChannelConditions(true); // Force refresh after Stripe completion
              
              // Switch to chat tab and show 6-digit code modal
              setSelectedTab('chats');
              setShowInlineVerification(true);
            }, 1000); // Small delay to ensure financial data is loaded
            
            Alert.alert(
              "Setup Complete",
              "Your Stripe Connect account has been set up successfully! Please verify your social media to complete channel setup.",
              [{ 
                text: "OK", 
                style: "default",
                onPress: () => {
                  // Ensure we're on the chat tab after alert dismissal
                  setSelectedTab('chats');
                }
              }]
            );
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
          console.error('WebView error:', nativeEvent);
          setShowNetworkErrorModal(true);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
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
        {/* Subscriber Info Modal */}
        <SubscriberInfoModal
          visible={showSubscriberModal}
          subscriber={selectedSubscriber}
          onClose={() => setShowSubscriberModal(false)}
        />

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
              backgroundColor: '#FFFFFF',
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
                  color: 'black',
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
                    backgroundColor: '#F0F0F0',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ionicons name="close" size={18} color="black" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  color: 'black',
                  fontSize: 16,
                  fontFamily: 'Urbanist-Regular',
                  lineHeight: 24,
                  marginBottom: 16
                }}>
                  If any of your payment statuses show as inactive or pending, you can resolve the issues by accessing your Stripe dashboard.
                </Text>
                
                <Text style={{
                  color: 'black',
                  fontSize: 16,
                  fontFamily: 'Urbanist-Bold',
                  marginBottom: 8
                }}>
                  What to do:
                </Text>
                
                <Text style={{
                  color: 'black',
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
                  backgroundColor: '#FD6F3E',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  color: 'white',
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

        </SafeAreaView>
    );
} 