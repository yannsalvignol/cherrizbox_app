import { dataCache } from '@/lib/data-cache';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';

import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Client, Databases, Query } from 'react-native-appwrite';

import { config } from '../../../lib/appwrite';
import { CherryLoadingIndicator } from '../CherryLoadingIndicator';

interface FullScreenProfileModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string | null;
  creatorName: string;
}

export const FullScreenProfileModal: React.FC<FullScreenProfileModalProps> = ({
  visible,
  onClose,
  imageUrl,
  creatorName,
}) => {
  const { getCachedImageUrl, user } = useGlobalContext();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [purchasedContent, setPurchasedContent] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState<any | null>(null);
  const [isContentViewerVisible, setIsContentViewerVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map());
  const [videoThumbnails, setVideoThumbnails] = useState<Map<string, string>>(new Map());
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const videoRef = useRef<Video>(null);



  // Function to get file URL from contentId
  const getFileUrlFromContentId = async (contentId: string): Promise<string | null> => {
    try {
      console.log('📄 [PDF] Fetching file URL for contentId:', contentId);
      
      // The contentId format is like "file_1755948937289_ifo9mhxlm"
      // We need to search for this in the Stream Chat messages or use Appwrite storage
      
      // For now, let's construct the Appwrite storage URL
      // The contentId contains the file ID after the timestamp
      const parts = contentId.split('_');
      if (parts.length >= 3) {
        const fileId = parts[2]; // Extract the file ID part
        const fileUrl = `https://cloud.appwrite.io/v1/storage/buckets/${config.streamChatStorageId || config.storageId}/files/${fileId}/view?project=${config.projectId}`;
        console.log('📄 [PDF] Constructed file URL:', fileUrl);
        return fileUrl;
      }
      
      console.log('❌ [PDF] Could not parse contentId:', contentId);
      return null;
    } catch (error) {
      console.error('❌ [PDF] Error getting file URL:', error);
      return null;
    }
  };

  // Animation values
  const backgroundScale = useRef(new Animated.Value(0.95)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  // Temporary function to get purchased content (same as profile.tsx)
  const getPurchasedContent = async (
    userId: string, 
    contentType?: string, 
    creatorId?: string
  ) => {
    try {
      const queries = [Query.equal('userId', userId)];
      
      if (contentType) {
        queries.push(Query.equal('contentType', contentType));
      }
      
      if (creatorId) {
        queries.push(Query.equal('creatorId', creatorId));
      }

      const appwriteClient = new Client()
        .setEndpoint(config.endpoint || '')
        .setProject(config.projectId || '');
      
      const databases = new Databases(appwriteClient);

      const response = await databases.listDocuments(
        config.databaseId || '',
        '686a99d3002ec49567b3', // Paid content purchases collection ID
        queries
      );

      return response.documents;
    } catch (error) {
      console.error('Error fetching purchased content:', error);
      return [];
    }
  };

  // Load purchased content for this creator
  const loadPurchasedContent = async () => {
    if (!user || !creatorName) return;
    
    setIsLoadingContent(true);
    try {
      // Get creator ID from name
      const { getCreatorIdByName } = await import('../../../lib/appwrite');
      const creatorId = await getCreatorIdByName(creatorName);
      
      if (creatorId) {
        const content = await getPurchasedContent(user.$id, undefined, creatorId);
        setPurchasedContent(content);
      } else {
        setPurchasedContent([]);
      }
    } catch (error) {
      console.error('Error loading purchased content:', error);
      setPurchasedContent([]);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Fetch creator data when modal becomes visible
  useEffect(() => {
    const fetchCreatorData = async () => {
      if (!visible || !creatorName) return;
      
      try {
        // Get follower count from subscriptions
        const { getSubscriptionCount } = await import('../../../lib/appwrite');
        const followerCount = await getSubscriptionCount(creatorName);
        
        // Get creator post data (including location) from photos collection
        if (!config.endpoint || !config.projectId || !config.databaseId || !config.photoCollectionId) {
          return;
        }

        const appwriteClient = new Client()
          .setEndpoint(config.endpoint)
          .setProject(config.projectId);
        
        const databases = new Databases(appwriteClient);
        
        // Query photos collection for the creator's data
        const photos = await databases.listDocuments(
          config.databaseId,
          config.photoCollectionId,
          [Query.equal('title', creatorName)]
        );
        
        if (photos.documents.length > 0) {
          const postData = photos.documents[0];
          setCreatorData({
            followers: followerCount,
            location: postData.PhotosLocation || null
          });
        } else {
          // If no post found, still set follower count
          setCreatorData({
            followers: followerCount,
            location: null
          });
        }

        // Load purchased content for this creator
        await loadPurchasedContent();
      } catch (error) {
        console.error('Error fetching creator data:', error);
        // Set default data even if there's an error
        setCreatorData({
          followers: 0,
          location: null
        });
      }
    };
    
    fetchCreatorData();
  }, [visible, creatorName, user]);

  // Generate video thumbnail with caching
  const generateVideoThumbnail = async (item: any): Promise<string | null> => {
    try {
      if (item.contentType !== 'video') return null;
      
      console.log(`🎬 [VideoThumbnail] Generating thumbnail for video: ${item.$id}`);
      
      const thumbnailKey = `thumbnail_${item.$id}`;
      
      // Check memory cache first
      if (videoThumbnails.has(thumbnailKey)) {
        console.log(`✅ [VideoThumbnail] Memory cache HIT`);
        return videoThumbnails.get(thumbnailKey) || null;
      }

      // Check persistent cache
      const cachedThumbnail = dataCache.get(`video_thumbnail_${item.$id}`) as string | null;
      if (cachedThumbnail) {
        console.log(`✅ [VideoThumbnail] Persistent cache HIT - loading to memory`);
        setVideoThumbnails(prev => new Map(prev.set(thumbnailKey, cachedThumbnail)));
        return cachedThumbnail;
      }

      console.log(`❌ [VideoThumbnail] Cache MISS - generating new thumbnail...`);
      
      const { uri } = await VideoThumbnails.getThumbnailAsync(item.imageUri, {
        time: 1000,
        quality: 0.8,
      });

      // Cache in memory and persistent storage
      setVideoThumbnails(prev => new Map(prev.set(thumbnailKey, uri)));
      dataCache.set(`video_thumbnail_${item.$id}`, uri, 24 * 60 * 60 * 1000); // 24 hours
      
      console.log(`✅ [VideoThumbnail] Generated and cached thumbnail (24h TTL)`);
      
      return uri;
    } catch (error) {
      console.warn('❌ [VideoThumbnail] Failed to generate video thumbnail:', error);
      return null;
    }
  };

  // Lazy loading for video thumbnails - only generate when visible
  const generateThumbnailOnDemand = async (item: any) => {
    if (item.contentType === 'video') {
      const thumbnailKey = `thumbnail_${item.$id}`;
      if (!videoThumbnails.has(thumbnailKey)) {
        try {
          await generateVideoThumbnail(item);
        } catch (error) {
          console.warn(`Failed to generate thumbnail for video ${item.$id}:`, error);
        }
      }
    }
  };

  // Get display URL (thumbnail for videos, regular URL for images)
  const getDisplayUrl = (item: any): string => {
    if (item.contentType === 'video') {
      const thumbnailKey = `thumbnail_${item.$id}`;
      const thumbnail = videoThumbnails.get(thumbnailKey);
      return thumbnail || item.imageUri;
    }
    return item.imageUri;
  };

  // Check if video thumbnail is being generated
  const isGeneratingThumbnail = (item: any): boolean => {
    if (item.contentType !== 'video') return false;
    const thumbnailKey = `thumbnail_${item.$id}`;
    return !videoThumbnails.has(thumbnailKey);
  };

  const openContentItem = (item: any) => {
    setSelectedContentItem(item);
    setIsContentViewerVisible(true);
  };

  const closeContentViewer = () => {
    setIsContentViewerVisible(false);
    setSelectedContentItem(null);
    setIsVideoPlaying(false);
    setIsVideoLoaded(false);
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
  };

  const getActionText = () => {
    if (!selectedContentItem) return 'Process';
    
    const contentType = selectedContentItem.contentType || '';
    const isImageOrVideo = contentType === 'image' || contentType === 'video';
    
    if (isProcessing) {
      return isImageOrVideo ? 'Downloading...' : 'Sharing...';
    }
    
    return isImageOrVideo ? 'Download' : 'Share';
  };

  const handleContentAction = async () => {
    if (!selectedContentItem) {
      console.log('❌ [PDF] No selectedContentItem');
      return;
    }

    const contentType = selectedContentItem.contentType || '';
    const isImageOrVideo = contentType === 'image' || contentType === 'video';

    console.log('📄 [PDF] handleContentAction called');
    console.log('📄 [PDF] contentType:', contentType);
    console.log('📄 [PDF] isImageOrVideo:', isImageOrVideo);
    console.log('📄 [PDF] selectedContentItem:', selectedContentItem);

    // For PDF files, use native sharing
    if (!isImageOrVideo) {
      console.log('📄 [PDF] Sharing PDF file...');
      console.log('📄 [PDF] Current imageUri:', selectedContentItem.imageUri);
      console.log('📄 [PDF] ContentId:', selectedContentItem.contentId);
      
      setIsProcessing(true);
      
      try {
        // Get the file URL from contentId if imageUri is null
        let fileUrl = selectedContentItem.imageUri;
        
        if (!fileUrl && selectedContentItem.contentId) {
          fileUrl = await getFileUrlFromContentId(selectedContentItem.contentId);
        }
        
        if (!fileUrl) {
          Alert.alert('Error', 'PDF file URL not available');
          setIsProcessing(false);
          return;
        }
        
        console.log('📄 [PDF] Final PDF URL:', fileUrl);
        
        // Use native sharing for PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUrl, {
            dialogTitle: `Share ${selectedContentItem.title || 'PDF Document'}`,
            UTI: 'com.adobe.pdf',
          });
          console.log('📄 [PDF] Successfully shared PDF');
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      } catch (error) {
        console.error('❌ [PDF] Error sharing PDF:', error);
        Alert.alert('Error', 'Failed to share PDF file. Please try again.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // For images and videos, download to gallery
    setIsProcessing(true);
    try {
      if (!selectedContentItem.imageUri) {
        Alert.alert('Error', 'Content URL is not available');
        return;
      }

      const downloadUrl = selectedContentItem.imageUri.includes('/view?')
        ? selectedContentItem.imageUri.replace('/view?', '/download?').concat('&output=attachment')
        : selectedContentItem.imageUri;

      const getFileExtension = (type: string) => {
        switch (type) {
          case 'image': return 'jpg';
          case 'video': return 'mp4';
          default: return 'file';
        }
      };
      
      const fileName = selectedContentItem.title || `content_${selectedContentItem.$id}.${getFileExtension(selectedContentItem.contentType || '')}`;
      const localFileUri = FileSystem.documentDirectory + fileName;

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localFileUri
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        Alert.alert('Error', 'Failed to download content');
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to save to your photo library');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(result.uri);
      Alert.alert('Success', `${contentType === 'image' ? 'Photo' : 'Video'} saved to your gallery!`);

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

  // Preload image using cached URL
  useEffect(() => {
    if (visible && imageUrl) {
      const cachedUrl = getCachedImageUrl(imageUrl);
      if (cachedUrl) {
        Image.prefetch(cachedUrl)
          .then(() => setImageLoaded(true))
          .catch(() => setImageLoaded(true));
      } else {
        setImageLoaded(true);
      }
    }
  }, [visible, imageUrl, getCachedImageUrl]);

  // Animate when visible
  useEffect(() => {
    if (visible) {
      // Animate background
      Animated.parallel([
        Animated.spring(backgroundScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const cachedImageUrl = getCachedImageUrl(imageUrl || '');

  return (
    <React.Fragment>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={onClose}
      >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 9999,
        elevation: 9999
      }}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          {
            opacity: backgroundOpacity,
            transform: [{ scale: backgroundScale }],
            zIndex: 10000,
            elevation: 10000
          }
        ]}>
          {/* Fallback background for instant display */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A1A1A' }]} />
          
          <ImageBackground
            source={{ uri: cachedImageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            blurRadius={0}
            imageStyle={{ opacity: imageLoaded ? 1 : 0 }}
            onLoad={() => {
              console.log('FullScreenProfile ImageBackground loaded');
              setImageLoaded(true);
            }}
            onLoadStart={() => console.log('FullScreenProfile ImageBackground loading started')}
            onError={(error: any) => console.log('FullScreenProfile ImageBackground error:', error)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
              {/* Top section with back button, creator name, and logo */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: 50, 
                marginHorizontal: 20 
              }}>
                {/* Back button in top left */}
                <TouchableOpacity onPress={onClose} style={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: 24,
                  paddingHorizontal: 12,
                  paddingVertical: 12
                }}>
                  <Image 
                    source={require('../../../assets/icon/back.png')} 
                    style={{ width: 20, height: 20, tintColor: 'white', resizeMode: 'contain' }} 
                  />
                </TouchableOpacity>
                
                {/* Creator name in top middle */}
                <BlurView intensity={80} style={{
                  borderRadius: 40,
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 12,
                  overflow: 'hidden'
                }}>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 22, 
                    fontWeight: '600', 
                    fontFamily: 'Questrial-Regular',
                    textAlign: 'center'
                  }}>
                    {creatorName || 'Creator'}
                  </Text>
                </BlurView>
                
                {/* Cherrizbox logo in top right */}
                <Image 
                  source={require('../../../assets/images/cherry-icon-low.png')} 
                  style={{ 
                    width: 56, 
                    height: 56, 
                    resizeMode: 'contain',
                    borderRadius: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8
                  }} 
                />
              </View>

              {/* Horizontal info section below */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginTop: 20, 
                marginHorizontal: 20,
                gap: 12
              }}>
                {/* Location with neutral card */}
                {creatorData?.location && (
                  <BlurView intensity={80} style={{
                    borderRadius: 36,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                    overflow: 'hidden'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
                      <Text style={{ 
                        color: 'rgba(255, 255, 255, 0.9)', 
                        fontSize: 15, 
                        fontFamily: 'Questrial-Regular',
                        fontWeight: '500'
                      }}>
                        {creatorData.location}
                      </Text>
                    </View>
                  </BlurView>
                )}
                
                {/* Followers with neutral card */}
                {creatorData?.followers && (
                  <BlurView intensity={80} style={{
                    borderRadius: 36,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                    overflow: 'hidden'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="people-outline" size={16} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
                      <Text style={{ 
                        color: 'rgba(255, 255, 255, 0.9)', 
                        fontSize: 15, 
                        fontFamily: 'Questrial-Regular',
                        fontWeight: '500'
                      }}>
                        {creatorData.followers} followers
                      </Text>
                    </View>
                  </BlurView>
                )}
              </View>

              {/* Scrollable Paid Content Section - Positioned to show first bubble at bottom */}
              <ScrollView 
                style={{ 
                  flex: 1,
                  marginTop: 20
                }}
                contentContainerStyle={{ 
                  paddingHorizontal: 20,
                  paddingTop: Dimensions.get('window').height - 400, // Push content to bottom of screen
                  paddingBottom: 40
                }}
                showsVerticalScrollIndicator={false}
              >
                {/* Content Header */}
                <BlurView intensity={80} style={{ 
                  marginHorizontal: 20, 
                  borderRadius: 40, 
                  padding: 24, 
                  marginBottom: 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 12,
                  overflow: 'hidden'
                }}>
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#FD6F3E',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12
                    }}>
                      <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>📱</Text>
                    </View>
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 22, 
                      fontWeight: 'bold', 
                      fontFamily: 'Questrial-Regular',
                      textAlign: 'center',
                      marginBottom: 6
                    }}>
                      Scroll for your paid content
                    </Text>
                    <Text style={{ 
                      color: '#B9B9B9', 
                      fontSize: 15, 
                      fontFamily: 'Questrial-Regular',
                      textAlign: 'center'
                    }}>
                      {purchasedContent.length} items from {creatorName}
                    </Text>
                  </View>
                </BlurView>

                {/* Content Grid */}
                {isLoadingContent ? (
                  <BlurView intensity={80} style={{ 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    paddingVertical: 60,
                    marginHorizontal: 20,
                    borderRadius: 36,
                    padding: 40,
                    overflow: 'hidden'
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#FD6F3E',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 16
                    }}>
                      <Text style={{ color: 'white', fontSize: 16 }}>⏳</Text>
                    </View>
                    <Text style={{ 
                      color: '#888', 
                      fontSize: 16, 
                      fontFamily: 'Questrial-Regular', 
                      textAlign: 'center' 
                    }}>
                      Loading content...
                    </Text>
                  </BlurView>
                ) : purchasedContent.length > 0 ? (
                  <View style={{ 
                    flexDirection: 'row', 
                    flexWrap: 'wrap', 
                    justifyContent: 'space-between',
                    paddingHorizontal: 20
                  }}>
                    {purchasedContent.map((item, index) => (
                      <TouchableOpacity
                        key={item.$id}
                        onPress={() => openContentItem(item)}
                        style={{
                          width: '48%',
                          marginBottom: 16,
                          backgroundColor: '#1A1A1A',
                          borderRadius: 16,
                          overflow: 'hidden',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 6
                        }}
                      >
                        {item.contentType === 'image' || item.contentType === 'video' ? (
                          <Image
                            source={{ uri: getDisplayUrl(item) }}
                            style={{
                              width: '100%',
                              height: 140,
                              backgroundColor: '#2A2A2A'
                            }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{
                            width: '100%',
                            height: 140,
                            backgroundColor: '#2A2A2A',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            <Image
                              source={require('../../../assets/icon/pdf.png')}
                              style={{
                                width: 48,
                                height: 48,
                                marginBottom: 8
                              }}
                              resizeMode="contain"
                            />
                            <Text style={{
                              color: '#888',
                              fontSize: 12,
                              fontFamily: 'Questrial-Regular',
                              textAlign: 'center'
                            }}>
                              PDF
                            </Text>
                          </View>
                        )}
                        {item.contentType === 'video' && (
                          <>
                            {/* Video Icon Overlay */}
                            <View style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: [{ translateX: -22 }, { translateY: -22 }],
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              borderRadius: 22,
                              width: 44,
                              height: 44,
                              justifyContent: 'center',
                              alignItems: 'center',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.3,
                              shadowRadius: 8,
                              elevation: 6
                            }}>
                              <Ionicons name="videocam-outline" size={24} color="white" />
                            </View>
                            
                            {/* Video Badge */}
                            <View style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4
                            }}>
                              <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Questrial-Regular', fontWeight: 'bold' }}>VIDEO</Text>
                            </View>
                          </>
                        )}
                        
                        <View style={{ padding: 12 }}>
                          <Text style={{ 
                            color: 'white', 
                            fontSize: 13, 
                            fontFamily: 'Questrial-Regular',
                            fontWeight: '500'
                          }} numberOfLines={1}>
                            {item.contentType === 'video' ? 'Video Content' : 
                             item.contentType === 'image' ? 'Photo Content' : 'PDF Content'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <BlurView intensity={80} style={{ 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    paddingVertical: 60,
                    marginHorizontal: 20,
                    borderRadius: 36,
                    padding: 40,
                    overflow: 'hidden'
                  }}>
                    <View style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: '#FD6F3E',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 16
                    }}>
                      <Text style={{ color: 'white', fontSize: 24 }}>📱</Text>
                    </View>
                    <Text style={{ 
                      color: '#888', 
                      fontSize: 18, 
                      fontFamily: 'Questrial-Regular', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      marginBottom: 8
                    }}>
                      No purchased content yet
                    </Text>
                    <Text style={{ 
                      color: '#666', 
                      fontSize: 14, 
                      fontFamily: 'Questrial-Regular', 
                      textAlign: 'center'
                    }}>
                      Content you purchase will appear here
                    </Text>
                  </BlurView>
                )}
              </ScrollView>
            </View>
          </ImageBackground>
        </Animated.View>
      </View>

      {/* Content Viewer Modal */}
      <Modal
        visible={isContentViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeContentViewer}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{ 
            backgroundColor: '#000', 
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
                style={{ width: 20, height: 20, tintColor: 'white' }}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {selectedContentItem && (
              <View>
                {/* Content Header */}
                <View style={{ padding: 16, paddingTop: 60 }}>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 18, 
                    fontFamily: 'Questrial-Regular', 
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {selectedContentItem.contentType === 'video' ? 'Video Content' : 
                     selectedContentItem.contentType === 'image' ? 'Photo Content' : 'File Content'}
                  </Text>
                  <Text style={{ 
                    color: '#888', 
                    fontSize: 14, 
                    fontFamily: 'Questrial-Regular',
                    textAlign: 'center',
                    marginTop: 4
                  }}>
                    {selectedContentItem.contentType}
                  </Text>
                </View>

                {/* Content Display */}
                <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 }}>
                  {selectedContentItem.contentType === 'video' ? (
                    <View style={{ 
                      width: '100%', 
                      height: 400, 
                      borderRadius: 8, 
                      overflow: 'hidden',
                      backgroundColor: '#1A1A1A',
                      position: 'relative'
                    }}>
                      <Video
                        ref={videoRef}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                        source={{ uri: selectedContentItem.imageUri }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={false}
                        isLooping={false}
                        onPlaybackStatusUpdate={(status: any) => {
                          if (status.isLoaded) {
                            setIsVideoPlaying(status.isPlaying);
                            setIsVideoLoaded(true);
                          }
                        }}
                        onLoadStart={() => {
                          setIsVideoLoaded(false);
                        }}
                        onLoad={() => {
                          setIsVideoLoaded(true);
                        }}
                      />
                      
                      {/* Loading indicator for video */}
                      {!isVideoLoaded && (
                        <View style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        }}>
                          <CherryLoadingIndicator size={60} />
                          <Text style={{
                            color: '#FFFFFF',
                            fontSize: 14,
                            fontWeight: '600',
                            marginTop: 12,
                            fontFamily: 'Questrial-Regular',
                            textAlign: 'center',
                          }}>
                            Loading video...
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : selectedContentItem.contentType === 'image' ? (
                    <Image
                      source={{ uri: selectedContentItem.imageUri }}
                      style={{
                        width: '100%',
                        height: 400,
                        borderRadius: 8,
                        backgroundColor: '#1A1A1A'
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{
                      backgroundColor: '#1A1A1A',
                      padding: 32,
                      borderRadius: 8,
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <Image 
                        source={require('../../../assets/icon/pdf.png')}
                        style={{ width: 64, height: 64, marginBottom: 16 }}
                        resizeMode="contain"
                      />
                      <Text style={{ 
                        color: 'white', 
                        fontSize: 16, 
                        fontFamily: 'Questrial-Regular',
                        textAlign: 'center'
                      }}>
                        PDF Document
                      </Text>
                      <Text style={{ 
                        color: '#888', 
                        fontSize: 14, 
                        fontFamily: 'Questrial-Regular',
                        textAlign: 'center',
                        marginTop: 8
                      }}>
                        Tap to share or save
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Button */}
                <View style={{ padding: 16 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: isProcessing ? '#999' : '#FD6F3E',
                      padding: 16,
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                    onPress={handleContentAction}
                    disabled={isProcessing}
                  >
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 16, 
                      fontFamily: 'Questrial-Regular', 
                      fontWeight: 'bold' 
                    }}>
                      {getActionText()}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </Modal>


    </React.Fragment>
  );
};