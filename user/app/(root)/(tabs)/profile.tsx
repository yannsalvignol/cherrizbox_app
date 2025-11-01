import { Ionicons } from '@expo/vector-icons'
import { Models } from 'appwrite'
import * as FileSystem from 'expo-file-system'
import { Image as ExpoImage } from 'expo-image'
import * as MediaLibrary from 'expo-media-library'
import { useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import * as VideoThumbnails from 'expo-video-thumbnails'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Image, Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Query } from 'react-native-appwrite'
import Modal from 'react-native-modal'
import { SafeAreaView } from 'react-native-safe-area-context'
import { config, databases } from '../../../lib/appwrite'
import { useGlobalContext } from '../../../lib/global-provider'
import { cancelSubscription } from '../../../lib/subscription'
import { useTheme } from '../../../lib/themes/useTheme'

// temp fix - need to move this later
const getPurchasedContent = async (
  userId: string, 
  contentType?: string, 
  creatorId?: string
) => {
  try {
    const queries = [Query.equal('userId', userId)];
    
    // Add content type filter if specified
    if (contentType) {
      queries.push(Query.equal('contentType', contentType));
    }
    
    // Add creator filter if specified
    if (creatorId) {
      queries.push(Query.equal('creatorId', creatorId));
    }
    
    console.log('Filtering content:', { userId, contentType, creatorId });
    console.log('Query params:', queries.map(q => q.toString()));

    const response = await databases.listDocuments(
      config.databaseId!,
      '686a99d3002ec49567b3',
      queries
    );
    
    console.log('Found documents:', response.documents.length);
    
    // Check all user purchases when filtering by content type
    if (contentType) {
      const allUserPurchases = await databases.listDocuments(
        config.databaseId!,
        '686a99d3002ec49567b3',
        [Query.equal('userId', userId)]
      );
      console.log('Total user purchases:', allUserPurchases.documents.length);
      allUserPurchases.documents.forEach(doc => {
        console.log('Purchase:', doc.$id, doc.contentType, doc.title || 'untitled', doc.creatorId);
      });
    }
    
    response.documents.forEach(doc => {
      console.log('Content:', doc.$id, doc.contentType, doc.title || 'untitled', doc.creatorId);
    });

    return response.documents;
  } catch (error) {
    console.error('Failed to fetch content:', error);
    return [];
  }
};

interface User extends Models.User<Models.Preferences> {
    name: string;
}

interface Profile {
    userId: string;
    profileImageUri?: string;
}

interface Subscription {
    $id: string;
    userId: string;
    status: 'active' | 'cancelled';
    createdAt: string;
    planCurrency: string;
    planInterval: string;
    creatorName: string;
    creatorId: string;
    renewalDate: string;
    stripeSubscriptionId: string;
    endsAt?: string;
}

export default function Profile() {
  const router = useRouter();
  const { creators, refreshCreators, user, profileImage } = useGlobalContext();
  const { theme } = useTheme();
  const [isPaidContent, setIsPaidContent] = useState(false);
  const [isUnsubscribeModalVisible, setIsUnsubscribeModalVisible] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<{ name: string; subscriptionId: string } | null>(null);
  const [isProcessingUnsubscribe, setIsProcessingUnsubscribe] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('all');
  const [selectedContentType, setSelectedContentType] = useState<string>('Videos');
  const [purchasedContent, setPurchasedContent] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState<any | null>(null);
  const [isContentViewerVisible, setIsContentViewerVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map());
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [videoThumbnails, setVideoThumbnails] = useState<Map<string, string>>(new Map());
  const cachedContentIds = useRef<Set<string>>(new Set());
  const hasPreloadedForCurrentContent = useRef<string>('');

  // where we store the downloads
  const CACHE_DIR = FileSystem.cacheDirectory + 'cherrybox_content/';

  useEffect(() => {
    loadUserData();
    initializeCache();
  }, []);

  useEffect(() => {
    if (isPaidContent && user) {
      loadPurchasedContent();
    }
  }, [isPaidContent, selectedCreatorId, selectedContentType, user]);

  // Generate thumbnails for newly loaded video content
  useEffect(() => {
    const generateThumbnailsForVideos = async () => {
      for (const item of purchasedContent) {
        if (item.contentType === 'video') {
          const thumbnailKey = `thumbnail_${item.$id}`;
          if (!videoThumbnails.has(thumbnailKey)) {
            generateVideoThumbnail(item).catch(error => {
              console.warn(`Failed to generate thumbnail for video ${item.$id}:`, error);
            });
          }
        }
      }
    };

    if (purchasedContent.length > 0) {
      generateThumbnailsForVideos();
    }
  }, [purchasedContent]);

  // setup cache stuff
  const initializeCache = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }

      const cachedFiles = await FileSystem.readDirectoryAsync(CACHE_DIR);
      const cacheMap = new Map<string, string>();
      
      for (const file of cachedFiles) {
        const filePath = CACHE_DIR + file;
        const fileKey = file.split('.')[0]; 
        cacheMap.set(fileKey, filePath);
      }
      
      setContentCache(cacheMap);
      console.log('Cache files:', cachedFiles.length);
    } catch (error) {
      console.error('Cache init error:', error);
    }
  };

  // makes url into number we can use for filename
  const getCacheKey = (url: string): string => {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  };

  // figure out file type
  const getFileExtension = (contentType: string): string => {
    switch (contentType) {
      case 'image': return '.jpg';
      case 'video': return '.mp4';
      case 'pdf': return '.pdf';
      case 'file': return '.pdf'; // old stuff uses this
      default: return '.file';
    }
  };

  // Cache a single content item
  const cacheContentItem = async (item: any): Promise<string | null> => {
    try {
      const cacheKey = getCacheKey(item.imageUri);
      const extension = getFileExtension(item.contentType);
      const fileName = `${cacheKey}${extension}`;
      const localPath = CACHE_DIR + fileName;

      // dont download if we already have it
      if (contentCache.has(cacheKey) || cachedContentIds.current.has(item.$id)) {
        return contentCache.get(cacheKey) || localPath;
      }

      const downloadUrl = item.imageUri.includes('/view?') 
        ? item.imageUri.replace('/view?', '/download?') 
        : item.imageUri;

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localPath);
      
      if (downloadResult.status === 200) {
        setContentCache(prev => new Map(prev.set(cacheKey, localPath)));
        cachedContentIds.current.add(item.$id);
        console.log('Cached file:', fileName);
        return localPath;
      }
      return null;
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  };

  // Preload content based on current selection
  const preloadContent = useCallback(async () => {
    if (!user || !purchasedContent.length || isPreloading) return;

    // Create a unique key for current content state
    const contentKey = `${selectedContentType}-${selectedCreatorId}-${purchasedContent.length}`;
    
    // Check if we already preloaded for this exact content set
    if (hasPreloadedForCurrentContent.current === contentKey) {
      console.log('Content already loaded');
      return;
    }

    const uncachedItems = purchasedContent.filter(item => !cachedContentIds.current.has(item.$id));
    if (uncachedItems.length === 0) {
      console.log('All items in cache');
      hasPreloadedForCurrentContent.current = contentKey;
      return;
    }

    setIsPreloading(true);
    setPreloadProgress(0);

    try {
      console.log('Loading items:', uncachedItems.length);
      
      for (let i = 0; i < uncachedItems.length; i++) {
        const item = uncachedItems[i];
        await cacheContentItem(item);
        setPreloadProgress(((i + 1) / uncachedItems.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      hasPreloadedForCurrentContent.current = contentKey;
      console.log('Content loading done');
    } catch (error) {
      console.error('Preloading failed:', error);
    } finally {
      setIsPreloading(false);
      setPreloadProgress(0);
    }
  }, [user, purchasedContent, isPreloading, selectedContentType, selectedCreatorId]);

  // Trigger preloading when content is loaded
  useEffect(() => {
    if (isPaidContent && purchasedContent.length > 0 && !isPreloading) {
      // Create content key to check if we should preload
      const contentKey = `${selectedContentType}-${selectedCreatorId}-${purchasedContent.length}`;
      
      // Only preload if we haven't already done it for this content set
      if (hasPreloadedForCurrentContent.current !== contentKey) {
        // Delay preloading slightly to not interfere with UI
        const timer = setTimeout(() => {
          preloadContent();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isPaidContent, purchasedContent.length, selectedContentType, selectedCreatorId, isPreloading]);

  // Cache cleanup, remove old files if cache gets too large
  const cleanupCache = async () => {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!cacheInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      
      // If we have more than 50 cached files, remove some
      if (files.length > 50) {
        console.log(`Cache cleanup: ${files.length} files found, cleaning up...`);
        
        // Sort files alphabetically and remove first 10 (simple cleanup strategy)
        files.sort();
        const filesToRemove = files.slice(0, 10);
        
        for (const file of filesToRemove) {
          const filePath = CACHE_DIR + file;
          await FileSystem.deleteAsync(filePath);
          console.log(`Removed cache file: ${file}`);
        }
        
        // Update cache map
        setContentCache(prev => {
          const newCache = new Map(prev);
          filesToRemove.forEach(file => {
            const key = file.split('.')[0];
            newCache.delete(key);
          });
          return newCache;
        });
      }
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  };

  // Check if content is cached
  const isContentCached = (item: any): boolean => {
    const cacheKey = getCacheKey(item.imageUri);
    return contentCache.has(cacheKey) || cachedContentIds.current.has(item.$id);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCreators();
    if (isPaidContent && user) {
      await loadPurchasedContent();
    }
    // Cleanup cache during refresh
    await cleanupCache();
    setRefreshing(false);
  };

  const loadUserData = async () => {
    // Data (user) is now loaded from GlobalProvider
    // Profile image is loaded directly from database in useEffect above
  };

  const loadPurchasedContent = async () => {
    if (!user) return;
    
    setIsLoadingContent(true);
    try {
      // Map content type from picker to database values
      let dbContentType: string | undefined;
      switch (selectedContentType) {
        case 'Videos':
          dbContentType = 'video';
          break;
        case 'Photos':
          dbContentType = 'image';
          break;
        case 'Files':
          dbContentType = 'pdf';
          break;
      }
      
      const creatorId = selectedCreatorId === 'all' ? undefined : selectedCreatorId;
      
      console.log('Loading user content:', user.$id, dbContentType, creatorId);
      
      const content = await getPurchasedContent(user.$id, dbContentType, creatorId);
      
      console.log('Content loaded:', content.length);
      
      setPurchasedContent(content);
      
      // Clear and repopulate cached content IDs by checking which items are actually cached
      cachedContentIds.current.clear();
      
      for (const item of content) {
        const cacheKey = getCacheKey(item.imageUri);
        if (contentCache.has(cacheKey)) {
          cachedContentIds.current.add(item.$id);
        }
      }
      

      
      // Reset preload flag for new content
      hasPreloadedForCurrentContent.current = '';
      
      console.log('Items in cache:', cachedContentIds.current.size);
    } catch (error) {
      console.error('Failed to load content:', error);
      setPurchasedContent([]);
    } finally {
      setIsLoadingContent(false);
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
      
      // Refresh creators list using global function
      await refreshCreators();
    } catch (error) {
      setModalMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to unsubscribe'
      });
    } finally {
      setIsProcessingUnsubscribe(false);
    }
  };

  const closeModal = async () => {
    setIsUnsubscribeModalVisible(false);
    setSelectedCreator(null);
    if (modalMessage?.type === 'success') {
      // Refresh creators list after successful unsubscribe
      await refreshCreators();
    }
    setModalMessage(null);
  };

  const openContentItem = (item: any) => {
    setSelectedContentItem(item);
    setIsContentViewerVisible(true);
  };

  const closeContentViewer = () => {
    setIsContentViewerVisible(false);
    setSelectedContentItem(null);
  };

  const getActionText = () => {
    if (!selectedContentItem) return 'Process';
    
    const contentType = selectedContentItem.contentType || '';
    const isImageOrVideo = contentType === 'image' || contentType === 'video';
    const isPdf = contentType === 'pdf' || contentType === 'file';
    
    if (isProcessing) {
      return isImageOrVideo ? 'Downloading...' : 'Sharing...';
    }
    
    return isImageOrVideo ? 'Download' : 'Share';
  };

  const shareContent = async () => {
    if (!selectedContentItem) return;

    setIsProcessing(true);
    try {
      // Check if imageUri exists
      if (!selectedContentItem.imageUri) {
        Alert.alert('Error', 'Content URL is not available');
        return;
      }

      // Convert Appwrite view URL to download URL
      const downloadUrl = selectedContentItem.imageUri.includes('/view?')
        ? selectedContentItem.imageUri.replace('/view?', '/download?').concat('&output=attachment')
        : selectedContentItem.imageUri;

      // Generate filename based on content type
      const getFileExtension = (type: string) => {
        switch (type) {
          case 'image': return 'jpg';
          case 'video': return 'mp4';
          case 'pdf': return 'pdf';
          case 'file': return 'pdf'; // fallback for old 'file' type
          default: return 'file';
        }
      };
      
      const fileName = selectedContentItem.title || `content_${selectedContentItem.$id}.${getFileExtension(selectedContentItem.contentType || '')}`;
      const localFileUri = FileSystem.documentDirectory + fileName;

      // Download the file
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localFileUri
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        Alert.alert('Error', 'Failed to download content');
        return;
      }

      // Check if it's an image or video
      const contentType = selectedContentItem.contentType || '';
      const isImageOrVideo = contentType === 'image' || contentType === 'video';
      const isPdf = contentType === 'pdf' || contentType === 'file';

      if (isImageOrVideo) {
        // For photos/videos: Save to device gallery
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please grant permission to save to your photo library');
          return;
        }

        await MediaLibrary.saveToLibraryAsync(result.uri);
        Alert.alert('Success', `${contentType === 'image' ? 'Photo' : 'Video'} saved to your gallery!`);
      } else {
        // For files: Share using sharing API
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            dialogTitle: `Share ${selectedContentItem.title || 'Content'}`,
          });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      }

      // cleanup after sharing
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    } catch (error) {
      console.error('Error processing content:', error);
      Alert.alert(
        'Error',
        'Failed to process content. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // get the url for the content
  const getContentUrl = (item: any): string => {
    const cacheKey = getCacheKey(item.imageUri);
    const cachedPath = contentCache.get(cacheKey);
    return cachedPath || item.imageUri;
  };

  // make thumbnail for videos
  const generateVideoThumbnail = async (item: any): Promise<string | null> => {
    try {
      if (item.contentType !== 'video') return null;
      
      // Check if thumbnail already exists
      const thumbnailKey = `thumbnail_${item.$id}`;
      if (videoThumbnails.has(thumbnailKey)) {
        return videoThumbnails.get(thumbnailKey) || null;
      }

      const videoUrl = getContentUrl(item);
      
      // Generate thumbnail using VideoThumbnails
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
        time: 1000, // Get thumbnail at 1 second
        quality: 0.8,
      });

      // Update thumbnails state
      setVideoThumbnails(prev => new Map(prev.set(thumbnailKey, uri)));
      
      return uri;
    } catch (error) {
      console.warn('Failed to generate video thumbnail:', error);
      return null;
    }
  };

  // Get display URL (thumbnail for videos, regular URL for images)
  const getDisplayUrl = (item: any): string => {
    if (item.contentType === 'video') {
      const thumbnailKey = `thumbnail_${item.$id}`;
      const thumbnail = videoThumbnails.get(thumbnailKey);
      // Return thumbnail if available, otherwise fallback to original URL
      return thumbnail || getContentUrl(item);
    }
    return getContentUrl(item);
  };

  // Check if video thumbnail is being generated
  const isGeneratingThumbnail = (item: any): boolean => {
    if (item.contentType !== 'video') return false;
    const thumbnailKey = `thumbnail_${item.$id}`;
    return !videoThumbnails.has(thumbnailKey);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }} edges={['top']}>
      {/* Header with cherry icon and title */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="absolute left-4 z-10"
        >
          <Image 
            source={require('../../../assets/images/cherry-icon-low.png')}
            style={{
              width: 56,
              height: 56,
              borderRadius: 10, // Slightly rounded corners
              backgroundColor: theme.text,
            }}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <Text style={{ color: theme.text, fontSize: 40, textAlign: 'center', flex: 1, fontFamily: 'MuseoModerno-Regular', letterSpacing: 1, marginTop: 8 }} allowFontScaling={false}>
          cherrizbox
        </Text>
      </View>

      {/* Profile Picture Section - Fixed */}
      <View className="items-center mb-5">
        <View style={{ 
          width: 128, 
          height: 128, 
          borderRadius: 64, 
          backgroundColor: theme.primary, 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: 12, 
          overflow: 'hidden' 
        }}>
          {profileImage ? (
            <ExpoImage
              source={{ uri: profileImage }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={{ blurhash: 'L6PZfSjE.AyE_3t7t7R**0o#DgR4' }}
              transition={200}
            />
          ) : (
            <Text style={{ color: theme.textInverse, fontSize: 32 }}>{user?.name?.[0] || 'P'}</Text>
          )}
        </View>
        <View className="w-full px-6 relative">
          <Text style={{ color: theme.text, fontSize: 20, textAlign: 'center', fontFamily: 'questrial' }} allowFontScaling={false}>
            {user?.name || 'Profile Name'}
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/(root)/(tabs)/settings')} 
            className="absolute right-12 top-1"
          >
            <Ionicons name="settings-sharp" size={32} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center justify-center mb-4">
          <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'questrial' }} allowFontScaling={false}>
            {user?.email || 'email@example.com'}
          </Text>
          <Image 
            source={require('../../../assets/icon/ok.png')}
            className="w-4 h-4 ml-2"
            resizeMode="contain"
            style={{ tintColor: theme.success }}
          />
        </View>
        
        {/* Action Buttons */}
        <View className="w-full px-4">
          <TouchableOpacity 
            style={{ 
              width: '100%', 
              backgroundColor: theme.cardBackground, 
              paddingVertical: 8, 
              borderRadius: 8, 
              alignItems: 'center', 
              flexDirection: 'row', 
              justifyContent: 'center', 
              marginBottom: 4 
            }}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={{ color: theme.text, fontFamily: 'questrial' }} allowFontScaling={false}>Edit Profile</Text>
            <Ionicons name="chevron-down-outline" size={16} color={theme.text} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ 
              width: '100%', 
              backgroundColor: theme.cardBackground, 
              paddingVertical: 12, 
              borderRadius: 8, 
              alignItems: 'center', 
              flexDirection: 'row', 
              justifyContent: 'center', 
              marginBottom: 8 
            }}
            onPress={() => router.push('/payment-methods')}
          >
            <Text style={{ color: theme.text, fontFamily: 'questrial' }} allowFontScaling={false}>Payment Methods</Text>
          </TouchableOpacity>
          
          {/* Custom Content Type Toggle */}
          <View className="w-full items-center">
            <View style={{ 
              flexDirection: 'row', 
              backgroundColor: theme.cardBackground, 
              borderRadius: 25, 
              overflow: 'hidden', 
              position: 'relative', 
              padding: 4 
            }}>
              {/* Sliding pink background */}
              <View 
                style={{
                  position: 'absolute',
                  width: '50%',
                  height: '100%',
                  borderRadius: 25,
                  backgroundColor: theme.primary,
                  top: 4,
                  left: isPaidContent ? '50%' : 4,
                  right: isPaidContent ? 4 : '50%'
                }}
              />
              
              {/* Toggle options */}
              <Pressable 
                onPress={() => setIsPaidContent(false)}
                style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 32, alignItems: 'center', zIndex: 10 }}
              >
                <Text style={{ 
                  fontFamily: 'questrial', 
                  color: !isPaidContent ? theme.textInverse : theme.textSecondary 
                }} allowFontScaling={false}>
                  My Creators
                </Text>
              </Pressable>
              <Pressable 
                onPress={() => setIsPaidContent(true)}
                style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 32, alignItems: 'center', zIndex: 10 }}
              >
                <Text style={{ 
                  fontFamily: 'questrial', 
                  color: isPaidContent ? theme.textInverse : theme.textSecondary 
                }} allowFontScaling={false}>
                  Paid Content
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Scrollable Creators List */}
      {!isPaidContent && (
        <ScrollView 
          className="flex-1 px-4 -mt-5" 
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          {creators.length > 0 ? (
            creators.map((subscription) => {
              const isActive = subscription.status === 'active';
              const isCancelled = subscription.status === 'cancelled';
              const endDate = subscription.endsAt ? new Date(subscription.endsAt) : null;
              const isExpired = endDate && endDate < new Date();

              return (
                <View 
                  key={subscription.$id}
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isCancelled ? theme.error : 
                               isActive ? theme.primary : theme.border
                  }}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <Text style={[
                        { fontSize: 18, fontFamily: 'questrial' },
                        { 
                          color: isCancelled ? theme.error : 
                                 isActive ? theme.primary : theme.text 
                        }
                      ]}>
                        {subscription.creatorName}
                      </Text>
                      {isCancelled && !isExpired && (
                        <Text style={{ color: theme.error, fontFamily: 'questrial', fontSize: 12 }}>
                          Access until {formatDate(subscription.endsAt || '')}
                        </Text>
                      )}
                      {isCancelled && isExpired && (
                        <Text style={{ color: theme.error, fontFamily: 'questrial', fontSize: 12 }}>
                          Expired on {formatDate(subscription.endsAt || '')}
                        </Text>
                      )}
                    </View>
                    {isActive && (
                      <TouchableOpacity 
                        style={{ 
                          backgroundColor: theme.primary, 
                          paddingHorizontal: 12, 
                          paddingVertical: 4, 
                          borderRadius: 25 
                        }}
                        onPress={() => handleUnsubscribe(subscription.creatorName, subscription.stripeSubscriptionId)}
                      >
                        <Text style={{ color: theme.textInverse, fontFamily: 'questrial' }}>Unsubscribe</Text>
                      </TouchableOpacity>
                    )}
                    {isCancelled && !isExpired && (
                      <View style={{ 
                        backgroundColor: theme.error, 
                        paddingHorizontal: 12, 
                        paddingVertical: 4, 
                        borderRadius: 25 
                      }}>
                        <Text style={{ color: theme.textInverse, fontFamily: 'questrial' }}>Cancelled</Text>
                      </View>
                    )}
                    {isCancelled && isExpired && (
                      <View style={{ 
                        backgroundColor: theme.error, 
                        paddingHorizontal: 12, 
                        paddingVertical: 4, 
                        borderRadius: 25 
                      }}>
                        <Text style={{ color: theme.textInverse, fontFamily: 'questrial' }}>Expired</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text style={{ color: '#888', fontFamily: 'questrial' }}>Plan:</Text>
                    <Text style={[
                      { fontFamily: 'questrial' },
                      { 
                        color: isCancelled ? '#F44336' : 
                               isActive ? '#FD6F3E' : 'black' 
                      }
                    ]}>
                      {subscription.planInterval}ly ({subscription.planCurrency})
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text style={{ color: '#888', fontFamily: 'questrial' }}>Subscribed:</Text>
                    <Text style={[
                      { fontFamily: 'questrial' },
                      { 
                        color: isCancelled ? '#F44336' : 
                               isActive ? '#FD6F3E' : 'black' 
                      }
                    ]}>
                      {formatDate(subscription.createdAt)}
                    </Text>
                  </View>
                  {isActive && (
                    <View className="flex-row justify-between">
                      <Text style={{ color: '#888', fontFamily: 'questrial' }}>Renews:</Text>
                      <Text style={{ color: '#FD6F3E', fontFamily: 'questrial' }}>
                        {formatDate(subscription.renewalDate || '')}
                      </Text>
                    </View>
                  )}
                  {isCancelled && !isExpired && (
                    <View className="flex-row justify-between">
                      <Text style={{ color: '#888', fontFamily: 'questrial' }}>Access until:</Text>
                      <Text style={{ color: '#F44336', fontFamily: 'questrial' }}>
                        {formatDate(subscription.endsAt || '')}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View className="items-center justify-center py-8">
              <Text style={{ color: theme.text, fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }} allowFontScaling={false}>
                You haven't subscribed to any creators yet
              </Text>
            </View>
          )}
        </ScrollView>
      )}

            {/* Bubble Pickers for Other Content */}
      {isPaidContent && (
        <View className="flex-1 px-4 -mt-5" style={{ paddingTop: 8 }}>
          {/* Bubble Pickers Section */}
          <View className="mb-4">
            {/* Content Type Filter Row */}
            <View style={{ marginBottom: 12 }}>
              <View className="flex-row justify-between">
                {['Videos', 'Photos', 'Files'].map((contentType) => (
                  <Pressable 
                    key={contentType}
                    onPress={() => setSelectedContentType(contentType)}
                    style={{
                      backgroundColor: selectedContentType === contentType ? theme.cardBackground : theme.backgroundTertiary,
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 25,
                      flex: 1,
                      marginHorizontal: 4,
                      alignItems: 'center',
                      borderWidth: selectedContentType === contentType ? 1 : 1,
                      borderColor: selectedContentType === contentType ? theme.cardBackground : theme.borderDark
                    }}
                  >
                        <Text style={{ 
                          color: selectedContentType === contentType ? theme.text : theme.textSecondary, 
                          fontFamily: 'questrial', 
                          fontSize: 16,
                          fontWeight: selectedContentType === contentType ? '600' : 'normal'
                        }} allowFontScaling={false}>
                          {contentType}
                        </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Creator Filter Row */}
            <ScrollView 
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              style={{ marginLeft: -16, paddingLeft: 16 }}
            >
              <View className="flex-row">
                {/* All Creators Bubble */}
                <Pressable 
                  onPress={() => setSelectedCreatorId('all')}
                  style={{
                    backgroundColor: selectedCreatorId === 'all' ? theme.cardBackground : theme.backgroundTertiary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 25,
                    marginRight: 12,
                    borderWidth: selectedCreatorId === 'all' ? 1 : 1,
                    borderColor: selectedCreatorId === 'all' ? theme.cardBackground : theme.borderDark
                  }}
                >
                  <Text style={{ 
                    color: selectedCreatorId === 'all' ? theme.text : theme.textSecondary, 
                    fontFamily: 'questrial', 
                    fontSize: 16,
                    fontWeight: selectedCreatorId === 'all' ? '600' : 'normal'
                  }} allowFontScaling={false}>
                    All creators
                  </Text>
                </Pressable>
                
                {/* Creator Bubbles */}
                {creators
                  .filter(subscription => subscription.status === 'active')
                  .map((subscription) => (
                    <Pressable 
                      key={subscription.$id}
                      onPress={() => setSelectedCreatorId(subscription.creatorId)}
                      style={{
                        backgroundColor: selectedCreatorId === subscription.creatorId ? theme.cardBackground : theme.backgroundTertiary,
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 25,
                        marginRight: 12,
                        borderWidth: selectedCreatorId === subscription.creatorId ? 1 : 1,
                        borderColor: selectedCreatorId === subscription.creatorId ? theme.cardBackground : theme.borderDark
                      }}
                    >
                      <Text style={{ 
                        color: selectedCreatorId === subscription.creatorId ? theme.text : theme.textSecondary, 
                        fontFamily: 'questrial', 
                        fontSize: 16,
                        fontWeight: selectedCreatorId === subscription.creatorId ? '600' : 'normal'
                      }} allowFontScaling={false}>
                        {subscription.creatorName}
                      </Text>
                    </Pressable>
                  ))
                }
              </View>
            </ScrollView>
          </View>

          {/* Content Display Area */}
          <ScrollView 
            className="flex-1" 
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {isLoadingContent ? (
              <View className="items-center justify-center py-8">
                <Text style={{ color: theme.textSecondary, fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }} allowFontScaling={false}>
                  Loading {selectedContentType.toLowerCase()}...
                </Text>
              </View>
            ) : purchasedContent.length > 0 ? (
              <View style={{ paddingHorizontal: 8 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'questrial', textAlign: 'center', marginBottom: 16 }} allowFontScaling={false}>
                  {purchasedContent.length} {selectedContentType.toLowerCase()} from {selectedCreatorId === 'all' ? 'all creators' : creators.find(c => c.creatorId === selectedCreatorId)?.creatorName || ''}
                </Text>
                
                {/* Preloading Progress Indicator */}
                {isPreloading && (
                  <View style={{ 
                    backgroundColor: theme.cardBackground, 
                    padding: 12, 
                    borderRadius: 8, 
                    marginBottom: 16,
                    alignItems: 'center'
                  }}>
                    <Text style={{ color: theme.primary, fontSize: 12, fontFamily: 'questrial', marginBottom: 8 }}>
                      Caching content for faster loading...
                    </Text>
                    <View style={{ 
                      width: '100%', 
                      height: 4, 
                      backgroundColor: theme.border, 
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                      <View style={{ 
                        width: `${preloadProgress}%`, 
                        height: '100%', 
                        backgroundColor: theme.primary,
                        borderRadius: 2
                      }} />
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 10, fontFamily: 'questrial', marginTop: 4 }}>
                      {Math.round(preloadProgress)}% complete
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {purchasedContent.map((item, index) => (
                    <TouchableOpacity
                      key={item.$id}
                      onPress={() => openContentItem(item)}
                      style={{
                        width: '48%',
                        marginBottom: 12,
                        backgroundColor: theme.cardBackground,
                        borderRadius: 12,
                        overflow: 'hidden'
                      }}
                    >
                      <ExpoImage
                        source={{ uri: getDisplayUrl(item) }}
                        style={{
                          width: '100%',
                          height: 120,
                          backgroundColor: '#2A2A2A'
                        }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        placeholder={{ blurhash: 'L6PZfSjE.AyE_3t7t7R**0o#DgR4' }}
                        transition={200}
                      />
                      {item.contentType === 'video' && (
                        <>
                          {/* Play Button Overlay */}
                          <View style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: [{ translateX: -20 }, { translateY: -20 }],
                            backgroundColor: 'rgba(251, 35, 85, 0.9)',
                            borderRadius: 20,
                            width: 40,
                            height: 40,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            <Text style={{ color: 'black', fontSize: 16, marginLeft: 2 }}>▶</Text>
                          </View>
                          
                          {/* Thumbnail Loading Indicator */}
                          {isGeneratingThumbnail(item) && (
                            <View style={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              backgroundColor: 'rgba(251, 35, 85, 0.9)',
                              borderRadius: 8,
                              padding: 2,
                              minWidth: 16,
                              alignItems: 'center'
                            }}>
                              <Text style={{ color: 'black', fontSize: 8, fontFamily: 'questrial' }}>🎬</Text>
                            </View>
                          )}
                          
                          {/* Video Badge */}
                          <View style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            borderRadius: 12,
                            padding: 4
                          }}>
                            <Text style={{ color: 'black', fontSize: 10, fontFamily: 'questrial' }}>VIDEO</Text>
                          </View>
                        </>
                      )}
                      
                      {/* Cache Status Indicator */}
                      {isContentCached(item) && (
                        <View style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          backgroundColor: 'rgba(76, 175, 80, 0.9)',
                          borderRadius: 8,
                          padding: 2,
                          minWidth: 16,
                          alignItems: 'center'
                        }}>
                          <Text style={{ color: 'black', fontSize: 8, fontFamily: 'questrial' }}>✓</Text>
                        </View>
                      )}
                      
                      <View style={{ padding: 8 }}>
                        <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'questrial' }} numberOfLines={1}>
                          {item.contentType === 'video' ? 'Video Content' : 
                           item.contentType === 'image' ? 'Photo Content' : 
                           (item.contentType === 'pdf' || item.contentType === 'file') ? 'PDF Document' : 'File Content'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View className="items-center justify-center py-8">
                <Text style={{ color: theme.textSecondary, fontSize: 16, fontFamily: 'questrial', textAlign: 'center' }} allowFontScaling={false}>
                  No {selectedContentType.toLowerCase()} found
                </Text>
                <Text style={{ color: theme.textTertiary, fontSize: 14, fontFamily: 'questrial', textAlign: 'center', marginTop: 8 }} allowFontScaling={false}>
                  {selectedCreatorId === 'all' ? 'You haven\'t purchased any content yet' : `No content from ${creators.find(c => c.creatorId === selectedCreatorId)?.creatorName || ''}`}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <Modal
        isVisible={isUnsubscribeModalVisible}
        onBackdropPress={closeModal}
        onBackButtonPress={closeModal}
        style={{ margin: 0, justifyContent: 'center', alignItems: 'center' }}
      >
        <View style={{ 
          backgroundColor: theme.modalBackground, 
          borderRadius: 16, 
          padding: 24, 
          width: '90%', 
          maxWidth: 400 
        }}>
          {modalMessage ? (
            <>
              <Text style={[
                { color: modalMessage.type === 'success' ? theme.success : theme.error },
                { fontSize: 20, fontFamily: 'questrial', textAlign: 'center', marginBottom: 16 }
              ]}>
                {modalMessage.type === 'success' ? 'Success' : 'Error'}
              </Text>
              <Text style={[
                { color: theme.text, fontSize: 16, fontFamily: 'questrial', textAlign: 'center', marginBottom: 24 }
              ]}>
                {modalMessage.message}
              </Text>
              <TouchableOpacity
                style={[
                  { backgroundColor: theme.success, padding: 12, borderRadius: 8, alignItems: 'center' },
                  { marginTop: 24 }
                ]}
                onPress={closeModal}
              >
                <Text style={[
                  { color: theme.textInverse, fontFamily: 'questrial', fontSize: 16 }
                ]}>
                  OK
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ color: theme.text, fontSize: 20, fontFamily: 'questrial', textAlign: 'center', marginBottom: 16 }}>
                Confirm Unsubscribe
              </Text>
              <Text style={{ color: theme.text, fontSize: 16, fontFamily: 'questrial', textAlign: 'center', marginBottom: 24 }}>
                Are you sure you want to unsubscribe from {selectedCreator?.name}?
              </Text>
              <View className="flex-row justify-between">
                <TouchableOpacity
                  style={[
                    { backgroundColor: theme.error, padding: 12, borderRadius: 8, flex: 1, marginRight: 2 }
                  ]}
                  onPress={confirmUnsubscribe}
                  disabled={isProcessingUnsubscribe}
                >
                  <Text style={[
                    { color: theme.textInverse, fontFamily: 'questrial', fontSize: 16, textAlign: 'center' }
                  ]}>
                    {isProcessingUnsubscribe ? 'Processing...' : 'Unsubscribe'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    { backgroundColor: theme.textSecondary, padding: 12, borderRadius: 8, flex: 1, marginLeft: 2 }
                  ]}
                  onPress={closeModal}
                  disabled={isProcessingUnsubscribe}
                >
                  <Text style={[
                    { color: theme.textInverse, fontFamily: 'questrial', fontSize: 16, textAlign: 'center' }
                  ]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Content Viewer Modal */}
      <Modal
        isVisible={isContentViewerVisible}
        onBackdropPress={closeContentViewer}
        onBackButtonPress={closeContentViewer}
        style={{ margin: 0, justifyContent: 'center', alignItems: 'center' }}
      >
        <View style={{ 
          backgroundColor: theme.modalBackground, 
          width: '95%', 
          maxHeight: '90%', 
          borderRadius: 12, 
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Close Button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10
            }}
            onPress={closeContentViewer}
          >
            <Image 
              source={require('../../../assets/icon/close.png')}
              style={{ width: 20, height: 20, tintColor: 'black' }}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {selectedContentItem && (
            <View>
              {/* Content Header */}
              <View style={{ padding: 16, paddingTop: 60 }}>
                <Text style={{ 
                  color: theme.text, 
                  fontSize: 18, 
                  fontFamily: 'questrial', 
                  textAlign: 'center'
                }}>
                  {selectedContentItem.contentType === 'video' ? 'Video Content' : 
                   selectedContentItem.contentType === 'image' ? 'Photo Content' : 
                   (selectedContentItem.contentType === 'pdf' || selectedContentItem.contentType === 'file') ? 'PDF Document' : 'File Content'}
                </Text>
                <Text style={{ 
                  color: theme.textSecondary, 
                  fontSize: 14, 
                  fontFamily: 'questrial',
                  textAlign: 'center',
                  marginTop: 4
                }}>
                  {selectedContentItem.contentType}
                </Text>
              </View>

              {/* Content Display */}
              <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 }}>
                {selectedContentItem.contentType === 'image' || selectedContentItem.contentType === 'video' ? (
                  <ExpoImage
                    source={{ uri: getContentUrl(selectedContentItem) }}
                    style={{
                      width: '100%',
                      height: 400,
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF'
                    }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    placeholder={{ blurhash: 'L6PZfSjE.AyE_3t7t7R**0o#DgR4' }}
                    transition={200}
                  />
                ) : (
                  <View style={{
                    backgroundColor: theme.cardBackground,
                    padding: 32,
                    borderRadius: 8,
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <Image 
                      source={require('../../../assets/icon/edit.png')}
                      style={{ width: 48, height: 48, tintColor: theme.textSecondary, marginBottom: 16 }}
                      resizeMode="contain"
                    />
                    <Text style={{ 
                      color: theme.text, 
                      fontSize: 16, 
                      fontFamily: 'questrial',
                      textAlign: 'center'
                    }}>
                      File Content
                    </Text>
                    <Text style={{ 
                      color: theme.textSecondary, 
                      fontSize: 14, 
                      fontFamily: 'questrial',
                      textAlign: 'center',
                      marginTop: 8
                    }}>
                      Tap to download or view
                    </Text>
                  </View>
                )}

                {selectedContentItem.contentType === 'video' && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: [{ translateX: -30 }, { translateY: -30 }],
                      backgroundColor: 'rgba(251, 35, 85, 0.9)',
                      borderRadius: 30,
                      width: 60,
                      height: 60,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={shareContent}
                  >
                    <Text style={{ color: 'black', fontSize: 24 }}>▶</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Button */}
              <View style={{ padding: 16 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: isProcessing ? theme.textSecondary : theme.primary,
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={shareContent}
                  disabled={isProcessing}
                >
                  <Text style={{ 
                    color: theme.textInverse, 
                    fontSize: 16, 
                    fontFamily: 'questrial', 
                    fontWeight: 'bold' 
                  }}>
                    {getActionText()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  )
}
