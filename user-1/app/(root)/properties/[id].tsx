import { useGlobalContext } from '@/lib/global-provider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, ImageBackground, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { getAllPosts, getSubscriptionCount, isUserSubscribed } from '../../../lib/appwrite';
import { initiateSubscription } from '../../../lib/subscription';

const Property = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useGlobalContext();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBioModal, setShowBioModal] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const params = useLocalSearchParams();
  const imageParam = params.image as string | undefined;
  const titleParam = params.title as string | undefined;

  // Animation values
  const backgroundScale = useRef(new Animated.Value(0.95)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const infoTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const allPosts = await getAllPosts();
        const found = allPosts.find((p: any) => p.$id === id);
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
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, titleParam, user]);

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
      
      const checkoutUrl = await initiateSubscription(amount, interval, creatorName);
      
      if (checkoutUrl) {
        const supported = await Linking.canOpenURL(checkoutUrl);
        if (supported) {
          await Linking.openURL(checkoutUrl);
        } else {
          Alert.alert('Error', 'Cannot open payment page');
        }
      }
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FB2355" />
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

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[
        StyleSheet.absoluteFill,
        {
          opacity: backgroundOpacity,
          transform: [{ scale: backgroundScale }]
        }
      ]}>
        <ImageBackground
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={0}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginHorizontal: 20 }}>
              <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 6 }}>
                <Image source={require('../../../assets/icon/back.png')} style={{ width: 28, height: 28, tintColor: 'white', resizeMode: 'contain' }} />
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

            {/* Bio Modal */}
            <Modal
              visible={showBioModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowBioModal(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowBioModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                  <TouchableWithoutFeedback>
                    <View style={{ backgroundColor: '#181818', borderRadius: 24, padding: 24, width: '90%', maxHeight: '80%' }}>
                      <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-white text-xl font-bold">About</Text>
                        <TouchableOpacity onPress={() => setShowBioModal(false)}>
                          <Image 
                            source={require('../../../assets/icon/close.png')} 
                            style={{ width: 24, height: 24, tintColor: '#FB2355' }} 
                          />
                        </TouchableOpacity>
                      </View>

                      <ScrollView>
                        <Text style={{ color: 'white', fontSize: 16, lineHeight: 24, fontFamily: 'questrial' }}>
                          {post?.Bio || 'No bio available'}
                        </Text>
                      </ScrollView>

                      <TouchableOpacity 
                        className="bg-[#FB2355] rounded-lg px-6 py-3 mt-4"
                        onPress={() => setShowBioModal(false)}
                      >
                        <Text className="text-white font-questrial text-center">Close</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
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
                    paddingHorizontal: 100,
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
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'questrial' }}>
                      Join {titleParam || post.title || 'this'}'s box
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
};

export default Property;