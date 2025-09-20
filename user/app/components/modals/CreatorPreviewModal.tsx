import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface CreatorPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  creatorThumbnail: string | null;
  channelId: string;
}

export const CreatorPreviewModal: React.FC<CreatorPreviewModalProps> = ({
  visible,
  onClose,
  creatorName,
  creatorThumbnail,
  channelId,
}) => {
  const { posts, user } = useGlobalContext();
  const [creatorPost, setCreatorPost] = useState<any>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasedContent, setPurchasedContent] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<string>('Videos');
  const [selectedContentItem, setSelectedContentItem] = useState<any | null>(null);
  const [isContentViewerVisible, setIsContentViewerVisible] = useState(false);
  const [isDownloadComplete, setIsDownloadComplete] = useState(false);

  // Get creator ID from channel ID
  const getCreatorId = () => {
    if (channelId?.startsWith('creator-')) {
      return channelId.replace('creator-', '');
    } else if (channelId?.startsWith('dm-')) {
      return channelId.replace('dm-', '').split('-')[0];
    }
    return '';
  };

  // Temporary function definitions to work around import issues
  const getPurchasedContent = async (
    userId: string, 
    contentType?: string, 
    creatorId?: string
  ) => {
    try {
      const { Query } = await import('react-native-appwrite');
      const { config, databases } = await import('../../../lib/appwrite');
      
      const queries = [Query.equal('userId', userId)];
      
      // Add content type filter if specified
      if (contentType) {
        queries.push(Query.equal('contentType', contentType));
      }
      
      // Add creator filter if specified
      if (creatorId) {
        queries.push(Query.equal('creatorId', creatorId));
      }
      
      console.log(`[Query] Filtering purchased content with:`, { userId, contentType, creatorId });

      const response = await databases.listDocuments(
        config.databaseId || '',
        '686a99d3002ec49567b3', // Paid content purchases collection ID
        queries
      );
      
      console.log(`[Query Result] Found ${response.documents.length} documents.`);
      response.documents.forEach((doc, index) => {
        console.log(` -> Doc ${index + 1}: ID=${doc.$id}, Type=${doc.contentType}, Title=${doc.title || 'N/A'}`);
      });

      return response.documents;
    } catch (error) {
      console.error('Error fetching purchased content:', error);
      return [];
    }
  };

  // Find creator's post data and location
  useEffect(() => {
    const fetchCreatorData = async () => {
      if (visible && posts.length > 0) {
        const creatorId = getCreatorId();
        const found = posts.find((p: any) => p.$id === creatorId);
        setCreatorPost(found);
        
        // Fetch location from photos collection
        try {
          const { config, databases } = await import('../../../lib/appwrite');
          const { Query } = await import('react-native-appwrite');
          
          // Query photos collection for the creator's location
          const photos = await databases.listDocuments(
            config.databaseId!,
            config.photoCollectionId!,
            [Query.equal('creatorId', creatorId)]
          );
          
          if (photos.documents.length > 0) {
            // Update the creator post with location data
            setCreatorPost((prev: any) => ({
              ...prev,
              PhotosLocation: photos.documents[0].PhotosLocation
            }));
          }
        } catch (error) {
          console.error('Error fetching creator location:', error);
        }
        
        setLoading(false);
      }
    };
    
    fetchCreatorData();
  }, [visible, posts, channelId]);

  // Get follower count and purchased content
  useEffect(() => {
    const fetchData = async () => {
      if (creatorName && user) {
        try {
          // Get follower count
          const { getSubscriptionCount } = await import('../../../lib/appwrite');
          const count = await getSubscriptionCount(creatorName);
          setFollowerCount(count);

          // Get purchased content
          setIsLoadingContent(true);
          const { getPurchasedContent } = await import('../../../lib/appwrite');
          
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
              dbContentType = 'file';
              break;
          }
          
          // Get creator ID from channel ID
          const creatorId = getCreatorId();
          
          const content = await getPurchasedContent(user.$id, dbContentType, creatorId);
          setPurchasedContent(content);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setIsLoadingContent(false);
        }
      }
    };
    
    if (visible && creatorName && user) {
      fetchData();
    }
  }, [visible, creatorName, user, selectedContentType]);

  // Preload image
  useEffect(() => {
    if (creatorPost && creatorThumbnail) {
      Image.prefetch(creatorThumbnail)
        .then(() => setImageLoaded(true))
        .catch(() => setImageLoaded(true));
    } else {
      setImageLoaded(true);
    }
  }, [creatorPost, creatorThumbnail]);

  // Content viewer functions
  const openContentItem = (item: any) => {
    setSelectedContentItem(item);
    setIsContentViewerVisible(true);
    setIsDownloadComplete(false); // Reset download state for new item
  };

  const closeContentViewer = () => {
    setIsContentViewerVisible(false);
    setSelectedContentItem(null);
  };

  const [isProcessing, setIsProcessing] = useState(false);

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
          case 'file': return 'pdf';
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

      if (isImageOrVideo) {
        // For photos/videos: Save to device gallery
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please grant permission to save to your photo library');
          return;
        }

        await MediaLibrary.saveToLibraryAsync(result.uri);
        setIsDownloadComplete(true);
      } else {
        // For files: Share using sharing API
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            dialogTitle: `Share ${selectedContentItem.title || 'Content'}`,
          });
          setIsDownloadComplete(true);
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      }

      // Clean up the temporary file
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

  const getActionText = () => {
    if (!selectedContentItem) return 'Download';
    
    const contentType = selectedContentItem.contentType || '';
    const isImageOrVideo = contentType === 'image' || contentType === 'video';
    
    if (isDownloadComplete) {
      return 'Done';
    }
    
    if (isProcessing) {
      return isImageOrVideo ? 'Downloading...' : 'Sharing...';
    }
    
    return isImageOrVideo ? 'Download' : 'Share';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.9)', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <View style={{ 
          width: '95%', 
          maxWidth: 400,
          backgroundColor: '#1A1A1A',
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.5,
          shadowRadius: 30,
          elevation: 20
        }}>
          {/* Header with close button */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#333'
          }}>
            <Text style={{ 
              color: 'white', 
              fontSize: 18, 
              fontWeight: 'bold', 
              fontFamily: 'questrial'
            }}>
              Creator Profile
            </Text>
            <TouchableOpacity 
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#333',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 700 }}
          >
            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FD6F3E" />
                <Text style={{ color: 'white', marginTop: 16, fontFamily: 'questrial' }}>
                  Loading profile...
                </Text>
              </View>
            ) : (
              <>
                {/* Creator Image */}
                <View style={{
                  width: '100%',
                  height: 200,
                  backgroundColor: '#2A2A2A',
                  position: 'relative'
                }}>
                  {creatorThumbnail ? (
                    <Image
                      source={{ uri: creatorThumbnail }}
                      style={{
                        width: '100%',
                        height: '100%',
                        opacity: imageLoaded ? 1 : 0
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: '100%',
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#2A2A2A'
                    }}>
                      <Text style={{ 
                        fontSize: 48,
                        fontWeight: 'bold',
                        color: 'white', 
                        fontFamily: 'questrial'
                      }}>
                        {creatorName?.charAt(0)?.toUpperCase() || 'C'}
                      </Text>
      </View>
                  )}
                  
                  {/* Gradient overlay */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={{
    position: 'absolute',
                      bottom: 0,
    left: 0,
    right: 0,
                      height: 80
                    }}
                  />
                  
                  {/* Creator name overlay */}
                  <View style={{
    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    right: 16
                  }}>
                    <Text style={{ 
    color: 'white',
                      fontSize: 24, 
                      fontWeight: 'bold', 
    fontFamily: 'questrial',
                      textShadowColor: 'rgba(0,0,0,0.8)',
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 4
                    }}>
                      {creatorName || 'Creator'}
                    </Text>
                  </View>
                </View>

                {/* Stats and Info */}
                <View style={{ padding: 20 }}>
                  {/* Stats Row */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-around',
                    marginBottom: 20,
                    paddingVertical: 16,
                    backgroundColor: '#2A2A2A',
                    borderRadius: 12
                  }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                        fontFamily: 'questrial'
                      }}>
                        {followerCount}
                      </Text>
                      <Text style={{
    color: '#B9B9B9',
                        fontSize: 14,
                        fontFamily: 'questrial'
                      }}>
                        Followers
                      </Text>
                    </View>
                    
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                        fontFamily: 'questrial'
                      }}>
                        {creatorPost?.PhotosLocation || 'N/A'}
                      </Text>
                      <Text style={{
                        color: '#B9B9B9',
                        fontSize: 14,
                        fontFamily: 'questrial'
                      }}>
                        Location
                      </Text>
                    </View>
                  </View>

                  {/* Bio Section */}
                  {creatorPost?.Bio && (
                    <View style={{
                      backgroundColor: '#2A2A2A',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 20
                    }}>
                      <Text style={{
                        color: '#B9B9B9',
                        fontSize: 14,
    fontFamily: 'questrial',
                        marginBottom: 8
                      }}>
                        About
                      </Text>
                      <Text style={{ 
                        color: 'white', 
                        fontSize: 16, 
                        lineHeight: 24, 
                        fontFamily: 'questrial'
                      }}>
                        {creatorPost.Bio}
                      </Text>
                    </View>
                  )}

                  {/* Purchased Content Section */}
                  <View style={{
                    backgroundColor: '#2A2A2A',
    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20
                  }}>
                    <Text style={{
                      color: '#B9B9B9',
                      fontSize: 14,
                      fontFamily: 'questrial',
                      marginBottom: 12
                    }}>
                      Your Purchased Content
                    </Text>
                    
                    {/* Content Type Filter */}
                    <View style={{ 
    flexDirection: 'row',
    justifyContent: 'space-between',
                      marginBottom: 12
                    }}>
                      {['Videos', 'Photos', 'Files'].map((contentType) => (
                        <TouchableOpacity 
                          key={contentType}
                          onPress={() => setSelectedContentType(contentType)}
                          style={{
                            backgroundColor: selectedContentType === contentType ? '#FD6F3E' : '#404040',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            flex: 1,
                            marginHorizontal: 2,
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{ 
                            color: 'white', 
                            fontFamily: 'questrial', 
                            fontSize: 12,
                            fontWeight: selectedContentType === contentType ? 'bold' : 'normal'
                          }}>
                            {contentType}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Content Display */}
                    {isLoadingContent ? (
                      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                        <ActivityIndicator size="small" color="#FD6F3E" />
                        <Text style={{ 
    color: '#B9B9B9',
                          fontSize: 12, 
    fontFamily: 'questrial',
                          marginTop: 8
                        }}>
                          Loading content...
                        </Text>
                      </View>
                    ) : purchasedContent.length > 0 ? (
                      <View>
                        <Text style={{ 
    color: '#B9B9B9',
                          fontSize: 12, 
    fontFamily: 'questrial',
    marginBottom: 8,
                          textAlign: 'center'
                        }}>
                          {purchasedContent.length} {selectedContentType.toLowerCase()} purchased
                        </Text>
                        
                        <View style={{ 
                          flexDirection: 'row', 
                          flexWrap: 'wrap', 
                          justifyContent: 'space-between' 
                        }}>
                          {purchasedContent.slice(0, 6).map((item, index) => (
                            <TouchableOpacity
                              key={item.$id}
                              onPress={() => openContentItem(item)}
                              style={{
                                width: '48%',
                                marginBottom: 8,
                                backgroundColor: '#404040',
    borderRadius: 8,
                                overflow: 'hidden'
                              }}
                              activeOpacity={0.7}
                            >
                              <Image
                                source={{ uri: item.imageUri }}
                                style={{
    width: '100%',
                                  height: 60,
                                  backgroundColor: '#2A2A2A'
                                }}
                                resizeMode="cover"
                              />
                              {item.contentType === 'video' && (
                                <View style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  borderRadius: 8,
                                  padding: 2
                                }}>
                                  <Text style={{ color: 'white', fontSize: 8, fontFamily: 'questrial' }}>VIDEO</Text>
                                </View>
                              )}
                              <View style={{ padding: 4 }}>
                                <Text style={{ 
    color: 'white',
                                  fontSize: 10, 
                                  fontFamily: 'questrial' 
                                }} numberOfLines={1}>
                                  {item.title || `${item.contentType} content`}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                        
                        {purchasedContent.length > 6 && (
                          <Text style={{ 
                            color: '#FD6F3E', 
                            fontSize: 12, 
                            fontFamily: 'questrial',
                            textAlign: 'center',
                            marginTop: 8
                          }}>
                            +{purchasedContent.length - 6} more items
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                        <Ionicons name="folder-open" size={32} color="#666666" />
                        <Text style={{ 
                          color: '#666666', 
    fontSize: 14,
    fontFamily: 'questrial',
    textAlign: 'center',
                          marginTop: 8
                        }}>
                          No {selectedContentType.toLowerCase()} purchased yet
                        </Text>
                        <Text style={{ 
                          color: '#888888', 
                          fontSize: 12, 
                          fontFamily: 'questrial',
                          textAlign: 'center',
                          marginTop: 4
                        }}>
                          Visit their profile to purchase content
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: '#333'
          }}>
            <TouchableOpacity 
              style={{
    backgroundColor: '#FD6F3E',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center'
              }}
              onPress={onClose}
            >
              <Text style={{ 
                color: 'white', 
                fontSize: 16, 
                fontWeight: 'bold', 
                fontFamily: 'questrial'
              }}>
                Close 
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
          backgroundColor: 'rgba(0,0,0,0.95)', 
    justifyContent: 'center',
          alignItems: 'center' 
        }}>
          <View style={{ 
            width: '95%', 
            maxHeight: '90%', 
            backgroundColor: '#1A1A1A',
            borderRadius: 16,
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
              <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>

            {selectedContentItem && (
              <View>
                {/* Content Header */}
                <View style={{ padding: 16, paddingTop: 60 }}>
                  <Text style={{ 
    color: 'white',
    fontSize: 18,
                    fontFamily: 'questrial', 
    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {selectedContentItem.title || `${selectedContentItem.contentType} Content`}
                  </Text>
                  <Text style={{ 
                    color: '#888', 
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
                    <Image
                      source={{ uri: selectedContentItem.imageUri }}
                      style={{
                        width: '100%',
                        height: 400,
                        borderRadius: 8,
                        backgroundColor: '#2A2A2A'
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{
                      backgroundColor: '#2A2A2A',
                      padding: 32,
                      borderRadius: 8,
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <Ionicons name="document" size={48} color="#888" />
                      <Text style={{ 
                        color: 'white', 
                        fontSize: 16, 
    fontFamily: 'questrial',
    textAlign: 'center',
                        marginTop: 16
                      }}>
                        File Content
                      </Text>
                      <Text style={{ 
                        color: '#888', 
                        fontSize: 14, 
                        fontFamily: 'questrial',
                        textAlign: 'center',
                        marginTop: 8
                      }}>
                        {selectedContentItem.title || 'Document'}
                      </Text>
                    </View>
                  )}

                  {selectedContentItem.contentType === 'video' && (
                    <View style={{
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
                    }}>
                      <Text style={{ color: 'white', fontSize: 24 }}>▶</Text>
                    </View>
                  )}
                </View>

                {/* Download Button */}
                <View style={{ padding: 16 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: isDownloadComplete ? '#4CAF50' : (isProcessing ? '#999' : '#FD6F3E'),
                      padding: 16,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center'
                    }}
                    onPress={shareContent}
                    disabled={isProcessing || isDownloadComplete}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    ) : isDownloadComplete ? (
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color="white" 
                        style={{ marginRight: 8 }} 
                      />
                    ) : (
                      <Ionicons 
                        name={selectedContentItem?.contentType === 'image' || selectedContentItem?.contentType === 'video' ? "download" : "share"} 
                        size={20} 
                        color="white" 
                        style={{ marginRight: 8 }} 
                      />
                    )}
                    <Text style={{ 
                      color: 'white', 
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
        </View>
      </Modal>
    </Modal>
  );
};