import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, ImageBackground, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { getAllPosts } from '../../../lib/appwrite';
import { initiateSubscription } from '../../../lib/subscription';

const Property = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBioModal, setShowBioModal] = useState(false);
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
      } catch (e) {
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

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
      console.log('Starting subscription process...');
      const checkoutUrl = await initiateSubscription();
      console.log('Got checkout URL:', checkoutUrl);
      
      if (checkoutUrl) {
        // Open the Stripe Checkout URL in the device's browser
        const supported = await Linking.canOpenURL(checkoutUrl);
        console.log('Can open URL:', supported);
        
        if (supported) {
          await Linking.openURL(checkoutUrl);
        } else {
          Alert.alert('Error', 'Cannot open payment page');
        }
      }
    } catch (error) {
      console.error('Join box error:', error);
      Alert.alert(
        'Subscription Error',
        error instanceof Error ? error.message : 'Failed to initiate subscription'
      );
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
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} 
                onPress={() => setShowBioModal(true)}
              >
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'white', marginHorizontal: 2 }} />
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'white', marginHorizontal: 2 }} />
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'white', marginHorizontal: 2 }} />
              </TouchableOpacity>
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
                        0
                      </Text>
                      <Text style={{ color: '#B9B9B9', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 8 }}>
                        followers
                      </Text>
                    </View>
                    <View>
                      <View style={{ borderWidth: 2, borderColor: 'white', borderRadius: 16, padding: 8 }}>
                        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                          ${JSON.parse(post.payment).monthlyPrice}
                        </Text>
                        <Text style={{ color: 'white', fontSize: 16, textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 4 }}>
                          per month
                        </Text>
                      </View>
                    </View>
                    <View style={{ justifyContent: 'center' }}>
                      <Text style={{ color: '#B9B9B9', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                        or
                      </Text>
                    </View>
                    <View>
                      <View style={{ borderWidth: 2, borderColor: '#FB2355', borderRadius: 16, padding: 8 }}>
                        <Text style={{ color: '#FB2355', fontSize: 28, fontWeight: 'bold', textShadowColor: 'rgba(251, 35, 85, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                          ${JSON.parse(post.payment).yearlyPrice}
                        </Text>
                        <Text style={{ color: '#FB2355', fontSize: 16, textShadowColor: 'rgba(251, 35, 85, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 4 }}>
                          per year
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  style={{ marginTop: 30, backgroundColor: '#FB2355', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 100 }}
                  onPress={handleJoinBox}
                >
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'questrial' }}>
                    Join {titleParam || post.title || 'this'}'s box
                  </Text>
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