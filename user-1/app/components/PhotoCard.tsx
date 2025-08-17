import { getCreatorIdByName } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeImage } from './SafeImage';

const { width } = Dimensions.get('window');
const cardWidth = (width - 24) / 2; // Match the width from index.tsx

interface MediaItem {
    $id: string;
    title?: string;
    thumbnail?: string;
    imageUrl?: string;
    fileUrl?: string;
    type: 'photo' | 'video';
    PhotoTopics?: string;
    currency?: string;
}

interface PhotoCardProps {
    photo: MediaItem;
    index?: number;
    scrollY?: any;
    isSubscribed?: boolean;
    isCancelled?: boolean;
    scrolling?: boolean;
}

const PhotoCard = ({ photo, index = 0, scrollY, isSubscribed = false, isCancelled = false, scrolling = false }: PhotoCardProps) => {
    const router = useRouter();
    const { getCachedImageUrl } = useGlobalContext();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;

    const imageUrl = photo.thumbnail || photo.imageUrl || photo.fileUrl || '';
    const cachedUrl = getCachedImageUrl(imageUrl);

    // Add logging to check if the image is cached
    useEffect(() => {
        if (imageUrl) {
            console.log(
                `PhotoCard Title: ${photo.title || 'Untitled'}\n` +
                `  - Original URL: ${imageUrl}\n` +
                `  - Used URL: ${cachedUrl}\n` +
                `  - Is Cached: ${cachedUrl.startsWith('file://')}\n` +
                `------------------------------------`
            );
        }
    }, [photo.title, imageUrl, cachedUrl]);

    useEffect(() => {
        const delay = index * 50;
        Animated.sequence([
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1.02,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 5,
                    delay,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                    delay,
                }),
            ]),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 5,
            }),
        ]).start();

        // Start the gradient animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, {
                    toValue: 50,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const photoTitle = photo.title || 'Untitled';
    const isVideo = photo.type === 'video';

    // Zoom effect on press
    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    // Scale parallax effect: cards in the same row scale identically
    const rowIndex = Math.floor(index / 2);
    const scaleParallax = scrollY
        ? scrollY.interpolate({
            inputRange: [0, 1000],
            outputRange: [1, (rowIndex % 2 === 0 ? 0.96 : 1.04)],
            extrapolate: 'clamp',
        })
        : 1;

    const handlePress = async () => {
        if (isSubscribed || isCancelled) {
            // Get creator ID from name
            const creatorId = await getCreatorIdByName(photo.title || '');
            if (creatorId) {
                // Redirect directly to group chat by default
                router.push({
                    pathname: '/chat',
                    params: {
                        channelId: `creator-${creatorId}`,
                        creatorName: photo.title,
                        chatType: 'group'
                    }
                });
            }
        } else {
            // Redirect to property page for non-subscribers
            router.push(`/properties/${photo.$id}`);
        }
    };

    return (
        <Animated.View
            style={{
                transform: scrollY
                    ? [{ scale: Animated.multiply(scaleAnim, scaleParallax) }]
                    : [{ scale: scaleAnim }],
                opacity: opacityAnim,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.18,
                shadowRadius: 16,
                elevation: 8,
                borderRadius: 20,
                backgroundColor: 'transparent',
                width: '100%',
            }}
        >
            <LinearGradient
                colors={['#232526', '#414345']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    borderRadius: 20,
                    padding: 2,
                    width: '100%',
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.92}
                    style={{ 
                        width: '100%', 
                        borderRadius: 18, 
                        overflow: 'hidden', 
                        backgroundColor: '#18181b' 
                    }}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <View style={{ borderRadius: 18, overflow: 'hidden', position: 'relative' }}>
                        {/* Image */}
                        {imageUrl ? (
                            <SafeImage
                                source={{ uri: cachedUrl }}
                                style={{ width: '100%', height: 290 }}
                                resizeMode="cover"
                                fallbackText={`${photo.title || 'Image'} not available`}
                                onError={(error) => {
                                    console.log(`❌ [PhotoCard] Image load error for ${photo.title}:`, error.nativeEvent.error);
                                    console.log(`❌ [PhotoCard] Failed URL: ${cachedUrl}`);
                                    console.log(`❌ [PhotoCard] Original URL: ${imageUrl}`);
                                }}
                                onLoad={() => {
                                    console.log(`✅ [PhotoCard] Image loaded successfully for ${photo.title}`);
                                }}
                            />
                        ) : (
                            <View style={{ width: '100%', height: 290, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
                                <Image source={require('../../assets/icon/loading-icon.png')} style={{ width: 48, height: 48, marginBottom: 8, opacity: 0.7 }} />
                                <Text style={{ color: '#aaa', fontWeight: '500' }}>No Image</Text>
                            </View>
                        )}
                        {/* Creator name pill badge at bottom left */}
                        <View style={{
                            position: 'absolute',
                            bottom: 10,
                            left: 11,
                            borderRadius: 16,
                            paddingVertical: 7,
                            paddingHorizontal: 18,
                            maxWidth: '80%',
                            overflow: 'hidden',
                        }}>
                            {isSubscribed ? (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                }}>
                                    <Animated.View style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: -50,
                                        right: -50,
                                        bottom: 0,
                                        transform: [{ translateX }],
                                    }}>
                                        <LinearGradient
                                            colors={['rgba(251, 35, 85, 0.7)', 'rgba(255, 215, 0, 0.7)', 'rgba(251, 35, 85, 0.7)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                            }}
                                        />
                                    </Animated.View>
                                </View>
                            ) : (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: isCancelled ? 'rgba(244, 67, 54, 0.7)' : 'rgba(0,0,0,0.55)',
                                    borderRadius: 16,
                                }} />
                            )}
                            <Text style={{
                                color: '#fff',
                                fontWeight: '700',
                                fontSize: 16,
                                letterSpacing: 0.2,
                                textShadowColor: 'rgba(0,0,0,0.3)',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 4,
                                fontFamily: 'MuseoModerno-Regular',
                            }} numberOfLines={1}>
                                {photoTitle}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </LinearGradient>
        </Animated.View>
    );
};

export default PhotoCard;

