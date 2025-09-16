import {
    ChannelList,
    SearchBar,
    type Cluster
} from '@/app/components/channels';

import {
    AnswerForAllModal,
    CustomNotificationModal,
    OneByOneModal,
    SocialMediaVerificationModal
} from '@/app/components/modals';
import { getUserProfile } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import {
    filterChannels,
    type Channel
} from '@/lib/index-utils';
import { client, connectUser } from '@/lib/stream-chat';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AudienceTab from './AudienceTab';
import EarningsTab from './EarningsTab';
import InsightsTab from './InsightsTab';

export default function Index() {
    const router = useRouter();
    const { theme, isDark, setThemeMode } = useTheme();
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
    const [selectedTab, setSelectedTab] = useState('chats');
    const [refreshing, setRefreshing] = useState(false);
    const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [isCheckingConditions, setIsCheckingConditions] = useState(false);
  const [shouldHighlightSetup, setShouldHighlightSetup] = useState(false);
  const [socialMediaCode, setSocialMediaCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [channelCreated, setChannelCreated] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [uncollectedTips, setUncollectedTips] = useState<Set<string>>(new Set());
    const [userCurrency, setUserCurrency] = useState('USD');
    
    // Clustering states
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [isLoadingClusters, setIsLoadingClusters] = useState(false);
    const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
    const [showOneByOneModal, setShowOneByOneModal] = useState(false);
    const [showAnswerForAllModal, setShowAnswerForAllModal] = useState(false);
    
    // Preload financial data for EarningsTab
    const [creatorFinancials, setCreatorFinancials] = useState<any>(null);
    const [isLoadingFinancials, setIsLoadingFinancials] = useState(false);
    const [stripeBalanceData, setStripeBalanceData] = useState<any>(null);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
    
    // Preload insights data for InsightsTab
    const [insightsFinancials, setInsightsFinancials] = useState<any>(null);

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

    // Animation for cherry icon
    const cherryIconScale = useRef(new Animated.Value(1)).current;

    // Function to animate cherry icon zoom with natural spring effect and toggle theme
    const animateCherryIcon = () => {
        // Toggle theme
        setThemeMode(isDark ? 'light' : 'dark');
        
        // Animate icon
        Animated.sequence([
            Animated.spring(cherryIconScale, {
                toValue: 1.15,
                tension: 300,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(cherryIconScale, {
                toValue: 1,
                tension: 200,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const tabs = [
      { id: 'chats', label: 'Chats', icon: 'chatbubbles-outline' },
      { id: 'other', label: 'Earnings', icon: 'cash-outline' },
      { id: 'insights', label: 'Insights', icon: 'analytics-outline' },
      { id: 'audience', label: 'Audience', icon: 'people-outline' }
    ];

    // Social media platform icons mapping
  const networks = [
    { name: 'LinkedIn', icon: 'logo-linkedin', color: '#0077B5', type: 'ionicon' },
    { name: 'TikTok', icon: 'musical-notes', color: '#000000', type: 'ionicon' },
    { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', type: 'ionicon' },
    { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', type: 'ionicon' },
    { name: 'Twitch', icon: 'logo-twitch', color: '#9146FF', type: 'ionicon' },
    { name: 'X', icon: require('../../../assets/images/X.png'), color: '#000000', type: 'image' },
  ];
    
    // Handle tip collection (when user opens a channel with tips)
    const handleTipCollected = (channelId: string) => {
      setUncollectedTips(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        console.log(`✅ [Index] Removed ${channelId} from uncollected tips`);
        return newSet;
      });
    };

    // Handle live channel updates from Stream Chat
    const handleChannelUpdate = useCallback((channelId: string, updates: Partial<Channel & { hasTip?: boolean }>) => {
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
      setFilteredChannels(prevFiltered => 
        prevFiltered.map(channel => 
          channel.id === channelId 
            ? { ...channel, ...channelUpdates }
            : channel
        )
      );
    }, [searchQuery]);

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
            channel.lastMessage.includes('Tip:')
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
        
        // If account state is 'ok' but no channels exist, trigger channel creation
        if (userDoc.account_state === 'ok' && finalChannels.length === 0 && !loadMore) {
          console.log('🚀 [Channels] Account verified but no channels found, triggering channel creation...');
          await handleMissingChannelCreation(userDoc, profile);
        }
        
        } catch (error) {
      console.error('❌ [Channels] Error loading channels:', error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
      }
    };
  
  // Handle missing channel creation for verified accounts
  const handleMissingChannelCreation = async (userDoc: any, profile: any) => {
    if (!user?.$id || !profile) return;
    
    try {
      console.log('🚀 [MissingChannels] Starting channel creation for verified account...');
      
      const { databases, config } = await import('@/lib/appwrite');
      const { ID, Query } = await import('react-native-appwrite');
      
      // 1. Create/update photo document if missing
      console.log('📸 [MissingChannels] Checking photo document...');
      const { getUserPhoto } = await import('@/lib/appwrite');
      const userPhoto = await getUserPhoto(user.$id);
      
      if (!userPhoto) {
        console.log('📸 [MissingChannels] Creating missing photo document...');
        
        // Get payment data from profile
        let paymentData = { monthlyPrice: '10', yearlyPrice: '21' };
        if (profile.creatorpayment) {
          try {
            const parsedPayment = JSON.parse(profile.creatorpayment);
            paymentData = {
              monthlyPrice: parsedPayment.monthlyPrice?.toString() || '10',
              yearlyPrice: parsedPayment.yearlyPrice?.toString() || '21'
            };
          } catch (e) {
            console.log('⚠️ [MissingChannels] Error parsing payment data, using defaults');
          }
        }
        
        await databases.createDocument(
          config.databaseId,
          config.photoCollectionId,
          ID.unique(),
          {
            thumbnail: profile.profileImageUri || '',
            compressed_thumbnail: profile.compressed_thumbnail || '',
            title: profile.creatorsname || user.name || 'Creator',
            prompte: profile.creatorsname || user.name || 'Creator',
            IdCreator: user.$id,
            PhotosLocation: profile.Location || '',
            payment: JSON.stringify(paymentData),
            PhotoTopics: profile.topics || '',
            Bio: profile.ProfilesBio || ''
          }
        );
        console.log('✅ [MissingChannels] Photo document created');
      } else {
        console.log('✅ [MissingChannels] Photo document already exists');
      }

      // 2. Copy to available collection if configured
      try {
        if (config.photosAvailableToUsersCollectionId) {
          console.log('🔄 [MissingChannels] Copying to available collection...');
          
          const photoDocs = await databases.listDocuments(
            config.databaseId,
            config.photoCollectionId,
            [Query.equal('IdCreator', user.$id)]
          );
          
          if (photoDocs.documents.length > 0) {
            const photoDoc = photoDocs.documents[0];
            
            // Check if already exists in available collection
            const existingAvailable = await databases.listDocuments(
              config.databaseId,
              config.photosAvailableToUsersCollectionId,
              [Query.equal('IdCreator', user.$id)]
            );
            
            if (existingAvailable.documents.length === 0) {
              await databases.createDocument(
                config.databaseId,
                config.photosAvailableToUsersCollectionId,
                ID.unique(),
                {
                  thumbnail: photoDoc.thumbnail,
                  title: photoDoc.title,
                  prompte: photoDoc.prompte,
                  IdCreator: photoDoc.IdCreator,
                  payment: photoDoc.payment,
                  PhotosLocation: photoDoc.PhotosLocation,
                  PhotoTopics: photoDoc.PhotoTopics,
                  Bio: photoDoc.Bio,
                  compressed_thumbnail: photoDoc.compressed_thumbnail,
                  ...(photoDoc.currency && { currency: photoDoc.currency })
                }
              );
              console.log('✅ [MissingChannels] Photo copied to available collection');
            }
          }
        }
      } catch (error) {
        console.error('❌ [MissingChannels] Error with available collection:', error);
      }

      // 3. Create creator channel
      try {
        console.log('🚀 [MissingChannels] Creating creator channel...');
        const { createCreatorChannel } = await import('@/lib/stream-chat');
        const creatorDisplayName = profile.creatorsname || user.name || 'Creator';
        
        const channel = await createCreatorChannel(user.$id, creatorDisplayName);
        console.log('✅ [MissingChannels] Creator channel created successfully:', channel.id);
        
        // Wait a moment for channel to be fully created
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Reload channels to show the new channel
        console.log('🔄 [MissingChannels] Reloading channels to show new channel...');
        await loadChannels(false);
        
        // Show success notification
        showCustomNotification('Your creator channel has been created successfully! 🎉', 'success');
        
        return true;
      } catch (error) {
        console.error('❌ [MissingChannels] Error creating creator channel:', error);
        return false;
      }
      
    } catch (error) {
      console.error('❌ [MissingChannels] Channel creation process failed:', error);
      return false;
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
      const { databases, config } = await import('@/lib/appwrite');
        const { Query, Functions, Client } = await import('react-native-appwrite');
      
      // Get user document to get social media info
      const userDocs = await databases.listDocuments(
        config.databaseId,
        config.creatorCollectionId,
        [Query.equal('creatoraccountid', user.$id)]
      );
      
      if (userDocs.documents.length > 0) {
        const userDoc = userDocs.documents[0];
        
        // Setup Appwrite client for functions
        const client = new Client()
          .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
          .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);
        
        const functions = new Functions(client);
        
        const functionId = process.env.EXPO_PUBLIC_SEND_SOCIAL_MEDIA_CODE_ID;
        if (!functionId) {
          throw new Error('SEND_SOCIAL_MEDIA_CODE_ID environment variable is not defined');
        }
        
        const requestData = {
          userId: user.$id,
          socialMedia: userDoc.social_media,
          socialMediaUsername: userDoc.social_media_username,
          userEmail: user.email
        };
        
        // Show success message immediately
        showCustomNotification('A new verification code has been sent to your social media account.', 'success');
        
          // Call the function in the background
          functions.createExecution(functionId, JSON.stringify(requestData))
            .then(response => console.log('✅ Function execution response:', response))
            .catch(error => console.error('❌ Function execution error:', error));
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

  // Load message clusters for the pro
  const loadClusters = async () => {
    if (!user?.$id) return;
    
    setIsLoadingClusters(true);
    try {
      console.log('🔄 [Clusters] Loading message clusters for pro:', user.$id);
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Fetch clusters where proId matches current user
      const clustersResponse = await databases.listDocuments(
        config.databaseId,
        'clusters', // Clusters collection ID
        [
          Query.equal('proId', user.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );
      
      if (clustersResponse.documents.length > 0) {
        // Group documents by clusterId
        const groupedClusters = new Map<string, any[]>();
        
        clustersResponse.documents.forEach((doc: any) => {
          const existing = groupedClusters.get(doc.clusterId) || [];
          existing.push(doc);
          groupedClusters.set(doc.clusterId, existing);
        });
        
        console.log(`📊 [Clusters] Found ${groupedClusters.size} unique clusters from ${clustersResponse.documents.length} documents`);
        
        // Aggregate data for each unique clusterId
        const aggregatedClusters: Cluster[] = [];
        
        groupedClusters.forEach((docs, clusterId) => {
          // Separate pending and answered documents
          const pendingDocs = docs.filter(doc => doc.status === 'pending');
          const answeredDocs = docs.filter(doc => doc.status === 'answered');
          
          // If no pending documents, skip this cluster
          if (pendingDocs.length === 0) {
            console.log(`⏭️ [Clusters] Skipping cluster ${clusterId} - all fans answered`);
            return;
          }
          
          // Use the first pending document as the base
          const baseDoc = pendingDocs[0];
          
          // Aggregate ONLY from pending documents
          const pendingAffectedChats = new Set<string>();
          const pendingFanIds = new Set<string>();
          let allQuestions: string[] = [];
          
          pendingDocs.forEach(doc => {
            // Parse and combine affected chats from pending docs only
            try {
              const chats = JSON.parse(doc.affectedChats);
              if (Array.isArray(chats)) {
                chats.forEach(chat => pendingAffectedChats.add(chat));
              }
            } catch (e) {
              console.warn('Failed to parse affectedChats:', e);
            }
            
            // Collect only pending fan IDs
            pendingFanIds.add(doc.fanId);
            
            // Collect all representative questions from pending docs
            try {
              const questions = JSON.parse(doc.representativeQuestions);
              if (Array.isArray(questions)) {
                allQuestions = [...allQuestions, ...questions];
              }
            } catch (e) {
              console.warn('Failed to parse representativeQuestions:', e);
            }
          });
          
          // Remove duplicate questions
          const uniqueQuestions = Array.from(new Set(allQuestions));
          
          // Create aggregated cluster object with ONLY pending fans
          const aggregatedCluster: Cluster = {
            $id: baseDoc.$id, // Use the first pending document's ID
            clusterId: clusterId,
            proId: baseDoc.proId,
            fanId: Array.from(pendingFanIds).join(','), // Store only pending fan IDs
            title: baseDoc.title, // Use the title from the first pending document
            topic: baseDoc.topic,
            representativeQuestions: JSON.stringify(uniqueQuestions),
            affectedChats: JSON.stringify(Array.from(pendingAffectedChats)), // Only pending chats
            status: 'pending', // Always pending since we only include clusters with pending fans
            canonicalAnswer: baseDoc.canonicalAnswer || '',
            fullMessage: baseDoc.fullMessage,
            $createdAt: baseDoc.$createdAt,
            $updatedAt: baseDoc.$updatedAt,
            fanCount: pendingFanIds.size // Count of pending fans only
          } as Cluster & { fanCount: number };
          
          console.log(`📊 [Clusters] Cluster ${clusterId}: ${pendingFanIds.size} pending, ${answeredDocs.length} answered`);
          
          aggregatedClusters.push(aggregatedCluster);
        });
        
        // Sort by creation date (newest first)
        aggregatedClusters.sort((a, b) => 
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        );
        
        setClusters(aggregatedClusters);
        console.log(`✅ [Clusters] Loaded ${aggregatedClusters.length} unique clusters`);
        console.log('📊 [Clusters] Pending clusters:', aggregatedClusters.filter(c => c.status === 'pending').length);
      } else {
        setClusters([]);
        console.log('ℹ️ [Clusters] No clusters found for this pro');
      }
    } catch (error) {
      console.error('❌ [Clusters] Error loading clusters:', error);
      setClusters([]);
    } finally {
      setIsLoadingClusters(false);
    }
  };

  // Handle cluster actions
  const handleAnswerForAll = async (cluster: Cluster) => {
    console.log('🚀 [Clusters] Answer for all:', cluster.clusterId);
    setSelectedCluster(cluster);
    setShowAnswerForAllModal(true);
  };

  const handleAnswerOneByOne = async (cluster: Cluster) => {
    console.log('🚀 [Clusters] Answer one by one:', cluster.clusterId);
    setSelectedCluster(cluster);
    setShowOneByOneModal(true);
  };

  const handleViewAllClusters = () => {
    console.log('🚀 [Clusters] View all clusters');
    // TODO: Navigate to all clusters screen
    // router.push('/clusters');
  };

  // Preload creator financials for smooth EarningsTab experience
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
        console.log('📊 [Preload] Creator financial data loaded:', {
          currentPeriodGross: creatorData.currentPeriodGross,
          previousPeriodGross: creatorData.previousPeriodGross,
          lifetimeGross: creatorData.lifetimeGross,
          stripeConnectAccountId: creatorData.stripeConnectAccountId
        });
        setCreatorFinancials(creatorData);
        setInsightsFinancials(creatorData); // Also cache for InsightsTab
        console.log('✅ [Preload] Financial data cached for EarningsTab and InsightsTab');
        
        // If Stripe is connected, also preload balance data
        if (creatorData.stripeConnectAccountId && creatorData.stripeConnectSetupComplete) {
          console.log('💳 [Preload] Triggering Stripe balance preload...');
          setTimeout(() => {
            loadStripeBalanceData(creatorData.stripeConnectAccountId);
          }, 500); // Small delay to avoid blocking main load
        }
        
        return creatorData;
      } else {
        console.log('❌ [Preload] No creator document found for this user.');
        setCreatorFinancials(null);
        return null;
      }
        } catch (error) {  
      console.error('❌ [Preload] Error loading creator financials:', error);
      setCreatorFinancials(null);
      return null;
        } finally {
      setIsLoadingFinancials(false);
    }
  };

  // Preload Stripe balance data for instant EarningsTab display
  const loadStripeBalanceData = async (stripeAccountId: string, retryCount = 0) => {
    try {
      console.log(`🔄 [Preload] Loading Stripe balance data for: ${stripeAccountId}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
        const { functions } = await import('@/lib/appwrite');
        const { ExecutionMethod } = await import('react-native-appwrite');

        const execution = await functions.createExecution(
            process.env.EXPO_PUBLIC_STRIPE_BALANCE_FUNCTION_ID!,
        JSON.stringify({ stripeConnectAccountId: stripeAccountId }),
            true, '/get-balance', ExecutionMethod.POST,  // Changed to async
            { 'Content-Type': 'application/json' }
        );

        // With async execution, the response might not be immediately available
        if (execution.responseBody && execution.responseBody !== '') {
          try {
            const response = JSON.parse(execution.responseBody);
            console.log('📡 [Preload] Stripe balance response received');

            if (response.goals) {
              setDailyGoal(response.goals.dailyGoal || 0);
              setWeeklyGoal(response.goals.weeklyGoal || 0);
              console.log('🎯 [Preload] Goals preloaded - Daily:', response.goals.dailyGoal, 'Weekly:', response.goals.weeklyGoal);
            }
        
            if (response.kpis) {
              setStripeBalanceData(response.kpis);
              console.log('📈 [Preload] KPIs preloaded for instant EarningsTab display');
          
              // Update creator financials with the latest data
              setCreatorFinancials((prev: any) => ({
                ...prev,
                todayEarnings: response.kpis.todayEarnings || 0,
                weekEarnings: response.kpis.weekEarnings || 0,
                dailyEarnings: JSON.stringify(response.kpis.dailyEarnings || {})
              }));
            }

            console.log('✅ [Preload] Stripe balance data loaded successfully');
          } catch (e) {
            console.log('⏳ [Preload] Async execution in progress, data will be updated in the background');
          }
        } else {
          console.log('⏳ [Preload] Async execution started, data will be updated in the background');
        }

    } catch (error: any) {
      console.error('❌ [Preload] Error loading Stripe balance data:', error);
      
      // Retry with exponential backoff if it's a timeout error
      if (retryCount < 2 && (error?.code === 408 || error?.message?.includes('timeout'))) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        console.log(`🔄 [Preload] Retrying in ${delay}ms...`);
        setTimeout(() => {
          loadStripeBalanceData(stripeAccountId, retryCount + 1);
        }, delay);
      }
      // Don't show error to user since this is background preloading
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
        // Load channels and clusters in parallel
        await Promise.all([
          loadChannels(false),
          loadProfileImage(),
          loadClusters()
        ]);
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
      setClusters([]);
      setChannelsLoaded(false);
      return;
    }
    
    if (!channelsLoaded && user?.$id) {
      console.log('🚀 [Init] Initial load triggered');
      loadChannels(false).then(() => {
        setChannelsLoaded(true);
        setFilteredChannels(channels);
        console.log('✅ [Init] Initial load complete');
      });
    }
    loadProfileImage();
    loadUserCurrency();
    loadClusters(); // Load clusters on init
    
    // Preload financial data for smooth EarningsTab experience
    if (user?.$id) {
        loadCreatorFinancials();
    }
  }, [user, channelsLoaded]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }} edges={['top']}>
            {/* Custom Notification */}
            <CustomNotificationModal
              visible={showNotification}
              message={notificationMessage}
              type={notificationType}
              onClose={() => setShowNotification(false)}
            />
            
            {/* One by One Modal */}
            <OneByOneModal
              visible={showOneByOneModal}
              cluster={selectedCluster}
              onClose={() => {
                setShowOneByOneModal(false);
                setSelectedCluster(null);
              }}
              onChatAnswered={() => {
                // Refresh clusters when a chat is answered
                console.log('🔄 [Index] Refreshing clusters after one-by-one answer');
                loadClusters();
              }}
              currentUserId={user?.$id}
              userProfileCache={userProfileCache}
            />
            
            {/* Answer for All Modal */}
            <AnswerForAllModal
              visible={showAnswerForAllModal}
              cluster={selectedCluster}
              onClose={() => {
                setShowAnswerForAllModal(false);
                setSelectedCluster(null);
              }}
              onAnswerSent={() => {
                // Refresh clusters after answering
                console.log('🔄 [Clusters] Refreshing after answer sent');
                loadClusters();
              }}
              currentUserId={user?.$id}
            />
            
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.backgroundTertiary }}>
                <TouchableOpacity 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    animateCherryIcon();
                }} 
                activeOpacity={0.8}
            >
                  <Animated.Image 
                      source={require('../../../assets/images/cherry-icon.png')}
                      className="w-16 h-16 rounded-lg"
                      resizeMode="contain"
                      style={{
                          transform: [{ scale: cherryIconScale }]
                      }}
                  />
                </TouchableOpacity>
                
                <View className="flex-row items-center">
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{
                            fontSize: 39,
                            fontWeight: 'bold',
                            color: theme.text,
                            fontFamily: 'MuseoModerno-Regular',
                            textAlign: 'center',
                        }}>
                            cherrizbox
                        </Text>
                    </View>
                </View>
                
        <TouchableOpacity onPress={() => router.push('/edit-profile')}>
                    <View style={{ width: 61, height: 61, borderRadius: 30.5, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={{ fontSize: 24, color: theme.textInverse, fontWeight: 'bold' }}>
                                {user?.name?.[0] || 'U'}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

      {/* Toggle Picker */}
      <View style={{
        backgroundColor: theme.backgroundTertiary,
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
                backgroundColor: selectedTab === item.id ? theme.cardBackground : theme.backgroundTertiary,
                borderWidth: 1,
                borderColor: selectedTab === item.id ? 'transparent' : theme.borderDark,
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
                  color={theme.text}
                />
                <Text style={{
                  color: theme.text,
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
          style={{ flex: 1, backgroundColor: theme.backgroundTertiary }}
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
              clusters={clusters}
              isLoadingClusters={isLoadingClusters}
              onAnswerForAll={handleAnswerForAll}
              onAnswerOneByOne={handleAnswerOneByOne}
              onViewAllClusters={handleViewAllClusters}
            />
          ) : (
            <ScrollView
              contentContainerStyle={{ 
                flex: 1, 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: theme.backgroundTertiary,
                paddingHorizontal: 32
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.textTertiary}
                  colors={[theme.textTertiary]}
                  progressBackgroundColor={theme.backgroundTertiary}
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
                    color: theme.text, 
                    fontSize: 18, 
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 12,
                    textAlign: 'center'
                  }}>
                    Checking requirements...
                  </Text>
                  <ActivityIndicator size="large" color={theme.text} />
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
                        onVerificationSuccess={() => {
                          // Reload channels after successful verification and channel creation
                          loadChannels(false);
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
                      color: theme.text, 
                      fontSize: 22, 
                      fontFamily: 'Urbanist-Bold',
                      marginBottom: 8,
                      textAlign: 'center'
                    }}>
                      Almost Ready! 🚀
                    </Text>
                    
                    <Text style={{ 
                      color: theme.text, 
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
                            color: theme.text, 
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
                          color: theme.textInverse, 
                          fontSize: 17, 
                          fontFamily: 'Urbanist-Bold'
                        }}>
                                Complete Setup
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={{ 
                    color: theme.text, 
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
                    color: theme.text, 
                    fontSize: 24, 
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 16,
                    textAlign: 'center'
                  }}>
                    No channels yet 😢
                  </Text>
                  <Text style={{ 
                    color: theme.text, 
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
              <InsightsTab
                refreshing={refreshing}
                onRefresh={onRefresh}
                preloadedFinancials={insightsFinancials}
              />
      )}

      {selectedTab === 'audience' && (
              <AudienceTab
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
      )}

      {selectedTab === 'other' && (
              <EarningsTab
                refreshing={refreshing}
                onRefresh={onRefresh}
                shouldHighlightSetup={shouldHighlightSetup}
                setShouldHighlightSetup={setShouldHighlightSetup}
                missingChannelConditions={missingChannelConditions}
                preloadedFinancials={creatorFinancials}
                preloadedCurrency={userCurrency}
                preloadedStripeData={stripeBalanceData}
                preloadedDailyGoal={dailyGoal}
                preloadedWeeklyGoal={weeklyGoal}
              />
            )}

        </SafeAreaView>
    );
} 
