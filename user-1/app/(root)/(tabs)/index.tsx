import { config, databases, getAllPosts, getUserProfile, isUserSubscribed } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Query } from 'appwrite';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Keyboard, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhotoCard from '../../components/PhotoCard';
import SearchInput from '../../components/SearchInput';
import Trending from '../../components/Trending';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 cards per row with padding

interface Post {
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
}

export default function Index() {
    const router = useRouter();
    const { user } = useGlobalContext();
    const [refreshing, setRefreshing] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const scrollY = useRef(new Animated.Value(0)).current;
    const [scrolling, setScrolling] = useState(false);

    const loadPosts = async () => {
        try {
            const allPosts = await getAllPosts();
            // Ensure type is either 'photo' or 'video'
            const typedPosts = allPosts.map(post => ({
                ...post,
                type: post.type === 'photo' ? 'photo' : 'video'
            })) as Post[];

            // Check subscription status for each post
            if (user?.$id) {
                const postsWithSubscription = await Promise.all(
                    typedPosts.map(async (post) => {
                        const isSubscribed = await isUserSubscribed(user.$id, post.title || '');
                        // Get subscription status from the database
                        const subscriptions = await databases.listDocuments(
                            config.databaseId,
                            config.activeSubscriptionsCollectionId,
                            [
                                Query.equal('userId', user.$id),
                                Query.equal('creatorName', post.title || '')
                            ]
                        );
                        const isCancelled = subscriptions.documents.some(sub => sub.status === 'cancelled');
                        return { ...post, isSubscribed, isCancelled };
                    })
                );
                // Sort posts: active subscriptions first, then by creation date
                const sortedPosts = postsWithSubscription.sort((a, b) => {
                    if (a.isSubscribed && !a.isCancelled && (!b.isSubscribed || b.isCancelled)) return -1;
                    if ((!a.isSubscribed || a.isCancelled) && b.isSubscribed && !b.isCancelled) return 1;
                    // If subscription status is the same, sort by creation date
                    return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
                });
                setPosts(sortedPosts);
                setFilteredPosts(sortedPosts);
            } else {
                setPosts(typedPosts);
                setFilteredPosts(typedPosts);
            }
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setIsLoading(false);
        }
    };
    const handleTrendsChange = (trends: string[]) => {
        setSelectedTrends(trends);
        filterPosts(searchQuery, trends);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            filterPosts(query, selectedTrends);
        } else {
            setFilteredPosts(posts); // Reset to show all posts when search is empty
        }
    };

    const filterPosts = (query: string, trends: string[]) => {
        let filtered = [...posts];

        // Apply search filter
        if (query.trim()) {
            filtered = filtered.filter(post => 
                post.title?.toLowerCase().includes(query.toLowerCase())
            );
        }

        // Apply trends filter
        if (trends.length > 0) {
            filtered = filtered.filter(post => {
                const postTopics = post.PhotoTopics?.split(',').map(t => t.trim()) || [];
                return trends.some(trend => postTopics.includes(trend));
            });
        }

        setFilteredPosts(filtered);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadPosts();
        } catch (error) {  
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, []);

    useEffect(() => {
        const loadProfileData = async () => {
            try {
                if (user?.$id) {
                    const profile = await getUserProfile(user.$id);
                    if (profile?.profileImageUri) {
                        setProfileImage(profile.profileImageUri);
                    }
                }
            } catch (error) {
                console.error('Error loading profile data:', error);
            }
        };

        loadProfileData();
    }, [user]);

    // Add keyboard listener to dismiss trending when keyboard is dismissed
    useEffect(() => {
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                // Only dismiss trending if the search input is not focused
                if (!isSearchFocused) {
                    setIsSearchFocused(false);
                }
            }
        );

        return () => {
            keyboardDidHideListener.remove();
        };
    }, [isSearchFocused]);
    
    const handleSearchFocus = (focused: boolean) => {
        setIsSearchFocused(focused);
        if (!focused) {
            setSearchQuery('');
            setFilteredPosts(posts); // Reset to show all posts when search is unfocused
        }
    };
    
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 bg-black">
                <Image 
                    source={require('../../../assets/images/cherry-icon.png')}
                    className="w-14 h-14"
                    resizeMode="contain"
                />
                
                <View className="flex-row items-center">
                    <Text style={{ 
                        fontSize: 40,
                        fontWeight: 'bold',
                        color: 'white',
                        fontFamily: 'questrial'
                    }}>
                        Cherrizbox
                    </Text>
                    <Text style={{ 
                        fontSize: 40,
                        fontWeight: 'bold',
                        color: '#FB2355',
                        fontFamily: 'questrial'
                    }}>
                        .
                    </Text>
                </View>
                
            
                <TouchableOpacity onPress={() => router.push('/profile')}>
                    <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center overflow-hidden">
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <Text className="text-xl text-white font-bold">
                                {user?.name?.[0] || 'U'}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Search input */}
            <View className='px-4 mt-4 mb-4'>
                <SearchInput onSearch={handleSearch} onFocus={handleSearchFocus} />
            </View>

            {/* Trending section - only visible when search is focused */}
            {isSearchFocused && <Trending onTrendsChange={handleTrendsChange} />}

            {/* Content */}
            <Animated.ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FB2355"
                        colors={["#FB2355"]}
                    />
                }
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                onScrollBeginDrag={() => setScrolling(true)}
                onScrollEndDrag={() => setScrolling(false)}
                onMomentumScrollEnd={() => setScrolling(false)}
            >
                {/* Posts section */}
                <View className="px-4 -mt-5">
                    <Text className="text-white font-['Urbanist-Bold'] text-lg mb-1">
                        {isSearchFocused ? 'Search Results' : 'For You'}
                    </Text>
                    
                    {isLoading ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                            <Image source={require('../../../assets/images/cherry-icon.png')} style={{ width: 60, height: 60, marginBottom: 16 }} />
                            <Text style={{ color: '#FB2355', fontSize: 18, marginBottom: 12 }}>Loading posts...</Text>
                            <ActivityIndicator size="large" color="#FB2355" />
                        </View>
                    ) : (filteredPosts.length > 0 || isSearchFocused) ? (
                        <View className="flex-row flex-wrap justify-between">
                            {filteredPosts.map((post, index) => (
                                post.type === "photo" ? (
                                    <View key={post.$id} style={{ marginBottom: 16, width: cardWidth }}>
                                        {post.isSubscribed && !post.isCancelled ? (
                                            <View style={{
                                                padding: 2,
                                                borderRadius: 20,
                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                width: '100%',
                                            }}>
                                                <LinearGradient
                                                    colors={['#FB2355', '#FFD700', '#FB2355']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={{
                                                        padding: 1,
                                                        borderRadius: 19,
                                                        width: '100%',
                                                    }}
                                                >
                                                    <View style={{
                                                        backgroundColor: 'black',
                                                        borderRadius: 18,
                                                        overflow: 'hidden',
                                                        width: '100%',
                                                    }}>
                                                        <PhotoCard 
                                                            photo={post} 
                                                            index={index} 
                                                            scrollY={scrollY} 
                                                            scrolling={scrolling}
                                                            isSubscribed={post.isSubscribed} 
                                                            isCancelled={post.isCancelled}
                                                        />
                                                    </View>
                                                </LinearGradient>
                                            </View>
                                        ) : (
                                            <PhotoCard 
                                                photo={post} 
                                                index={index} 
                                                scrollY={scrollY} 
                                                scrolling={scrolling}
                                                isSubscribed={post.isSubscribed} 
                                                isCancelled={post.isCancelled}
                                            />
                                        )}
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        key={post.$id} 
                                        className="bg-[#1A1A1A] rounded-lg mb-3 p-4 w-full"
                                        onPress={() => router.push(`/properties/${post.$id}`)}
                                    >
                                        <View className="flex-row items-center mb-2">
                                            <Text className="font-['Urbanist-Bold'] text-white text-lg">
                                                {post.title || 'Untitled'}
                                            </Text>
                                            {post.type && (
                                                <View className="ml-2 px-2 py-1 bg-[#FB2355] rounded-full">
                                                    <Text className="text-white text-xs font-['Urbanist-Bold']">
                                                        {post.type}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )
                            ))}
                        </View>
                    ) : (
                        <View className="items-center justify-center py-20">
                            <Image 
                                source={require('../../../assets/images/cherry-icon.png')} 
                                style={{ width: 80, height: 80, marginBottom: 16 }} 
                            />
                            <Text style={{ 
                                color: 'white', 
                                fontSize: 24, 
                                fontFamily: 'Urbanist-Bold',
                                marginBottom: 16,
                                textAlign: 'center'
                            }}>
                                No posts found 😢
                            </Text>
                            <Text style={{ 
                                color: 'white', 
                                fontSize: 18, 
                                textAlign: 'center',
                                paddingHorizontal: 32
                            }}>
                                {selectedTrends.length > 0 
                                    ? `We couldn't find any posts matching "${selectedTrends.join(', ')}"`
                                    : searchQuery 
                                        ? `No results for "${searchQuery}"`
                                        : 'No posts available at the moment'}
                            </Text>
                        </View>
                    )}
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
} 