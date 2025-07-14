import { useGlobalContext } from '@/lib/global-provider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getSubscriptionCount, isUserSubscribed } from '../../../lib/appwrite';
import StripePaymentModal from '../../components/StripePaymentModal';

const Property = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, posts, getCachedImageUrl } = useGlobalContext();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const params = useLocalSearchParams();
  const imageParam = params.image as string | undefined;
  const titleParam = params.title as string | undefined;

  const backgroundScale = useRef(new Animated.Value(0.95)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const infoTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        console.log('Property screen - Posts available:', posts.length);
        console.log('Property screen - Looking for post ID:', id);
        
        // Use preloaded posts from global state instead of fetching again
        const found = posts.find((p: any) => p.$id === id);
        console.log('Property screen - Found post:', found ? 'Yes' : 'No');
        
        setPost(found);
        
        if (found) {
          const creatorName = titleParam || found.title || 'this';
          const count = await getSubscriptionCount(creatorName);
          setFollowerCount(count);

          // Check if user is subscribed
          if (user?.$id) {
            const subscribed = await isUserSubscribed(user.$id, creatorName);
            setIsSubscribed(subscribed);
          }
        }
      } catch (e) {
        console.error('Property screen - Error:', e);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch if posts are available (they should be preloaded)
    if (posts.length > 0) {
      fetchPost();
    } else {
      console.log('Property screen - No posts available yet');
    }
  }, [id, titleParam, user, posts]);

  // Preload the specific image for this property
  useEffect(() => {
    if (post) {
      const imageUrl = imageParam || post.thumbnail || post.imageUrl || post.fileUrl;
      const cachedUrl = getCachedImageUrl(imageUrl);
      if (cachedUrl) {
        console.log('Preloading specific image:', cachedUrl);
        Image.prefetch(cachedUrl)
          .then(() => {
            console.log('Specific image preloaded successfully');
            setImageLoaded(true);
          })
          .catch((error) => {
            console.log('Failed to preload specific image:', error);
            setImageLoaded(true); // Still show the image even if preload fails
          });
      } else {
        setImageLoaded(true);
      }
    }
  }, [post, imageParam]);

  useEffect(() => {
    if (!loading && post) {
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

      // Animate info section with delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(infoOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(infoTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
        ]).start();
      }, 200);
    }
  }, [loading, post]);

  const handleJoinBox = async () => {
    try {
      setIsProcessingPayment(true);
      const paymentData = JSON.parse(post.payment);
      const amount = selectedPricing === 'monthly' 
        ? parseFloat(paymentData.monthlyPrice)
        : parseFloat(paymentData.yearlyPrice);
      const interval = selectedPricing === 'monthly' ? 'month' : 'year';
      const creatorName = titleParam || post.title || 'this';
      
      // Show the payment modal instead of opening browser
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert(
        'Subscription Error',
        error instanceof Error ? error.message : 'Failed to initiate subscription'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    Alert.alert(
      'Success!',
      'Your subscription has been activated successfully.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Optionally refresh subscription status
            setIsSubscribed(true);
          }
        }
      ]
    );
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Image 
          source={require('../../../assets/icon/loading-icon.png')} 
          style={{ width: 80, height: 80, marginBottom: 20 }} 
        />
        <Text style={{ color: '#FB2355', fontSize: 18, fontFamily: 'questrial' }}>Loading...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>Post not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#FB2355', fontSize: 18 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = imageParam || post.thumbnail || post.imageUrl || post.fileUrl;
  const cachedImageUrl = getCachedImageUrl(imageUrl);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[
        StyleSheet.absoluteFill,
        {
          opacity: backgroundOpacity,
          transform: [{ scale: backgroundScale }]
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
            console.log('ImageBackground loaded');
            setImageLoaded(true);
          }}
          onLoadStart={() => console.log('ImageBackground loading started')}
          onError={(error) => console.log('ImageBackground error:', error)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginHorizontal: 20 }}>
              <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 6 }}>
                <Image 
                  source={require('../../../assets/icon/back.png')} 
                  style={{ width: 28, height: 28, tintColor: 'white', resizeMode: 'contain' }} 
                />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isSubscribed && (
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#FFD700',
                    borderWidth: 2,
                    borderColor: 'white'
                  }} />
                )}
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} 
                  onPress={() => setShowBioModal(true)}
                >
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'white', marginHorizontal: 2 }} />
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'white', marginHorizontal: 2 }} />
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'white', marginHorizontal: 2 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bio Modal - New Approach */}
            <Modal
              visible={showBioModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowBioModal(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ 
                  width: '90%', 
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
                  {/* Header */}
                  <View style={{
                    backgroundColor: '#FB2355',
                    paddingVertical: 20,
                    paddingHorizontal: 24,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'white',
                        marginRight: 12
                      }} />
                      <Text style={{ 
                        color: 'white', 
                        fontSize: 20, 
                        fontWeight: 'bold', 
                        fontFamily: 'questrial',
                        flex: 1
                      }} numberOfLines={1}>
                        About {titleParam || post?.title || 'Creator'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => setShowBioModal(false)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Image 
                        source={require('../../../assets/icon/close.png')} 
                        style={{ width: 16, height: 16, tintColor: 'white' }} 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Content */}
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: 400 }}
                    contentContainerStyle={{ padding: 20 }}
                  >
                    {post?.Bio ? (
                      <View>
                        {/* Bio Card */}
                        <View style={{
                          backgroundColor: '#2A2A2A',
                          borderRadius: 16,
                          padding: 16,
                          marginBottom: 16
                        }}>
                          <Text style={{ 
                            color: 'white', 
                            fontSize: 16, 
                            lineHeight: 24, 
                            fontFamily: 'questrial'
                          }}>
                            {post.Bio}
                          </Text>
                        </View>
                        
                        {/* Stats Cards */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <View style={{ 
                            flex: 1,
                            backgroundColor: '#2A2A2A',
                            borderRadius: 16,
                            padding: 16,
                            alignItems: 'center'
                          }}>
                            <Text style={{
                              color: 'white',
                              fontSize: 24,
                              fontWeight: 'bold',
                              fontFamily: 'questrial',
                              marginBottom: 4
                            }}>
                              {followerCount}
                            </Text>
                            <Text style={{
                              color: '#B9B9B9',
                              fontSize: 13,
                              fontFamily: 'questrial'
                            }}>
                              Followers
                            </Text>
                          </View>
                          
                          <View style={{ 
                            flex: 1,
                            backgroundColor: '#2A2A2A',
                            borderRadius: 16,
                            padding: 16,
                            alignItems: 'center'
                          }}>
                            <Text style={{
                              color: 'white',
                              fontSize: 24,
                              fontWeight: 'bold',
                              fontFamily: 'questrial',
                              marginBottom: 4
                            }} numberOfLines={1}>
                              {post.PhotosLocation || 'N/A'}
                            </Text>
                            <Text style={{
                              color: '#B9B9B9',
                              fontSize: 13,
                              fontFamily: 'questrial'
                            }}>
                              Location
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={{ 
                        alignItems: 'center', 
                        paddingVertical: 40
                      }}>
                        <View style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: '#FB2355',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 16
                        }}>
                          <Image 
                            source={require('../../../assets/icon/image.png')} 
                            style={{ 
                              width: 32, 
                              height: 32, 
                              tintColor: 'white'
                            }} 
                          />
                        </View>
                        <Text style={{ 
                          color: '#999', 
                          fontSize: 18, 
                          fontFamily: 'questrial',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          marginBottom: 8
                        }}>
                          No bio available yet
                        </Text>
                        <Text style={{ 
                          color: '#666', 
                          fontSize: 14, 
                          fontFamily: 'questrial',
                          textAlign: 'center'
                        }}>
                          Check back later for updates
                        </Text>
                      </View>
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
                        backgroundColor: '#FB2355',
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: 'center'
                      }}
                      onPress={() => setShowBioModal(false)}
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
            </Modal>

            <Animated.View style={[
              { 
                flex: 1, 
                justifyContent: 'flex-end', 
                alignItems: 'center', 
                marginBottom: 8,
                opacity: infoOpacity,
                transform: [{ translateY: infoTranslateY }]
              }
            ]}>
              <View style={{ width: '97%', height: '35%', backgroundColor: 'rgba(32, 32, 32, 0.92)', borderRadius: 40, padding: 20, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }} numberOfLines={2}>
                  {titleParam || post.title || 'Untitled'}
                </Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)', paddingBottom: 8 }}>
                    <Image source={require('../../../assets/icon/localisation.png')} style={{ width: 16, height: 20, tintColor: 'white', marginRight: 10 }} />
                    <Text style={{ color: 'white', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                      {post.PhotosLocation || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 15 }}>
                    <View style={{ paddingTop: 10 }}>
                      <Text style={{ color: 'white', fontSize: 24, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                        {followerCount}
                      </Text>
                      <Text style={{ color: '#B9B9B9', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 8 }}>
                        followers
                      </Text>
                    </View>
                    <View>
                      <TouchableOpacity 
                        onPress={() => setSelectedPricing('monthly')}
                        style={{ 
                          borderWidth: selectedPricing === 'monthly' ? 3 : 2,
                          borderColor: selectedPricing === 'monthly' ? 'white' : 'rgba(255,255,255,0.3)',
                          borderRadius: 16,
                          padding: 8,
                          backgroundColor: selectedPricing === 'monthly' ? 'rgba(255,255,255,0.1)' : 'transparent',
                          transform: [{ scale: selectedPricing === 'monthly' ? 1.05 : 1 }]
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                          ${JSON.parse(post.payment).monthlyPrice}
                        </Text>
                        <Text style={{ color: 'white', fontSize: 16, textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 4 }}>
                          per month
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ justifyContent: 'center' }}>
                      <Text style={{ color: '#B9B9B9', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                        or
                      </Text>
                    </View>
                    <View>
                      <TouchableOpacity 
                        onPress={() => setSelectedPricing('yearly')}
                        style={{ 
                          borderWidth: selectedPricing === 'yearly' ? 3 : 2,
                          borderColor: selectedPricing === 'yearly' ? '#FB2355' : 'rgba(251, 35, 85, 0.3)',
                          borderRadius: 16,
                          padding: 8,
                          backgroundColor: selectedPricing === 'yearly' ? 'rgba(251, 35, 85, 0.1)' : 'transparent',
                          transform: [{ scale: selectedPricing === 'yearly' ? 1.05 : 1 }]
                        }}
                      >
                        <Text style={{ color: '#FB2355', fontSize: 28, fontWeight: 'bold', textShadowColor: 'rgba(251, 35, 85, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                          ${JSON.parse(post.payment).yearlyPrice}
                        </Text>
                        <Text style={{ color: '#FB2355', fontSize: 16, textShadowColor: 'rgba(251, 35, 85, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 4 }}>
                          per year
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  style={{ 
                    marginTop: 30, 
                    backgroundColor: '#FB2355', 
                    borderRadius: 20, 
                    paddingVertical: 12, 
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isProcessingPayment ? 0.7 : 1
                  }}
                  onPress={handleJoinBox}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <>
                      <ActivityIndicator size="small" color="white" style={{ marginRight: 10 }} />
                      <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'questrial' }}>
                        Processing...
                      </Text>
                    </>
                  ) : (
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 18, 
                      fontWeight: 'bold', 
                      fontFamily: 'questrial',
                      textAlign: 'center',
                      flex: 1
                    }} numberOfLines={1}>
                      Join {titleParam || post.title || 'this'}'s box
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ImageBackground>
      </Animated.View>

      {/* Stripe Payment Modal */}
      <StripePaymentModal
        visible={showPaymentModal}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        amount={selectedPricing === 'monthly' ? parseFloat(JSON.parse(post?.payment || '{}').monthlyPrice || '0') : parseFloat(JSON.parse(post?.payment || '{}').yearlyPrice || '0')}
        interval={selectedPricing === 'monthly' ? 'month' : 'year'}
        creatorName={titleParam || post?.title || 'this'}
      />
    </View>
  );
};

export default Property;