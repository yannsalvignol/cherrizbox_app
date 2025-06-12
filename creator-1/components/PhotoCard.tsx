import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PhotoCardProps {
    photo: {
        $id: string;
        type: 'photo' | 'video';
        title?: string;
        thumbnail?: string;
        imageUrl?: string;
        fileUrl?: string;
        $createdAt: string;
        $updatedAt: string;
        $collectionId: string;
        $databaseId: string;
        $permissions: string[];
        PhotoTopics?: string;
        isSubscribed?: boolean;
        isCancelled?: boolean;
    };
    index: number;
    scrollY: Animated.Value;
    scrolling: boolean;
    isSubscribed?: boolean;
    isCancelled?: boolean;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, index, scrollY, scrolling, isSubscribed, isCancelled }) => {
    const router = useRouter();
    const { user } = useGlobalContext();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handlePress = () => {
        if (!user) {
            router.push('/(auth)/login' as any);
            return;
        }
        router.push(`/properties/${photo.$id}`);
    };

    const getSubscriptionStatus = () => {
        if (!isSubscribed) return 'Subscribe';
        if (isCancelled) return 'Cancelled';
        return 'Subscribed';
    };

    const getSubscriptionColor = () => {
        if (!isSubscribed) return '#FB2355';
        if (isCancelled) return '#FFD700';
        return '#4CAF50';
    };

    return (
        <TouchableOpacity 
            onPress={handlePress}
            style={styles.container}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: photo.thumbnail || photo.imageUrl }}
                    style={styles.image}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                />
                {!imageLoaded && !imageError && (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                )}
                {imageError && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>Failed to load image</Text>
                    </View>
                )}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.title} numberOfLines={1}>
                    {photo.title || 'Untitled'}
                </Text>
                <View style={styles.subscriptionContainer}>
                    <Text style={[styles.subscriptionText, { color: getSubscriptionColor() }]}>
                        {getSubscriptionStatus()}
                    </Text>
                    {isCancelled && (
                        <Ionicons name="warning" size={16} color="#FFD700" style={styles.warningIcon} />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        overflow: 'hidden',
        width: '100%',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#2A2A2A',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FB2355',
        fontSize: 16,
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#FB2355',
        fontSize: 16,
    },
    infoContainer: {
        padding: 12,
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Urbanist-Bold',
        marginBottom: 4,
    },
    subscriptionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subscriptionText: {
        fontSize: 14,
        fontFamily: 'Urbanist-Bold',
    },
    warningIcon: {
        marginLeft: 4,
    },
});

export default PhotoCard; 