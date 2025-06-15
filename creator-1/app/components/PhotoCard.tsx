import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 cards per row with padding

interface MediaItem {
    $id: string;
    title?: string;
    thumbnail?: string;
    imageUrl?: string;
    fileUrl?: string;
    type: 'photo' | 'video';
    PhotoTopics?: string;
    creatorId?: string;
}

interface PhotoCardProps {
    photo: MediaItem;
    index?: number;
    scrollY?: any;
    isSubscribed?: boolean;
    isCancelled?: boolean;
    scrolling?: boolean;
    user?: any;
}

const PhotoCard = ({ photo, index = 0, scrollY, isSubscribed = false, isCancelled = false, scrolling = false, user }: PhotoCardProps) => {
    const router = useRouter();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;

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

    const handlePress = () => {
        // If it's the creator's own content or user is subscribed and not cancelled
        if (photo.creatorId === user?.$id || (isSubscribed && !isCancelled)) {
            // Navigate to chat
            router.push({
                pathname: '/(root)/chat',
                params: {
                    channelId: `creator-${photo.creatorId}`,
                    creatorName: photoTitle
                }
            });
        } else {
            // Navigate to properties if not subscribed
            router.push(`/properties/${photo.$id}`);
        }
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
                        {photo.thumbnail || photo.imageUrl || photo.fileUrl ? (
                            <Image
                                source={{ uri: photo.thumbnail || photo.imageUrl || photo.fileUrl }}
                                style={{ width: '100%', height: 270 }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={{ width: '100%', height: 270, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
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
                            {isSubscribed && !isCancelled ? (
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

