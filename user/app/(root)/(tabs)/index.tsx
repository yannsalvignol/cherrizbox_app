import { useGlobalContext } from '@/lib/global-provider';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Keyboard, Platform, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/themes/useTheme';
import PhotoCard from '../../components/PhotoCard';
import SearchInput from '../../components/SearchInput';
import Trending from '../../components/Trending';

const { width } = Dimensions.get('window');
const cardWidth = (width - 24) / 2; // Reduced padding from 32 to 24 for wider cards

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
    currency?: string;
    state?: string;
}

interface UserProfile {
    userId: string;
    profileImageUri?: string;
}

export default function Index() {
    const router = useRouter();
    const navigation = useNavigation();
    const { theme, themeMode, setThemeMode } = useTheme();
    
    // Debug font loading on Android
    useEffect(() => {
        console.log(`📱 Platform: ${Platform.OS}`);
        console.log(`🔤 Font family will be: MuseoModerno-Regular`);
    }, []);
    const { user, profile, posts, loading, postsLoaded, refreshPosts, getCachedImageUrl, profileImage } = useGlobalContext();
    const [refreshing, setRefreshing] = useState(false);
    const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const scrollY = useRef(new Animated.Value(0)).current;
    const [scrolling, setScrolling] = useState(false);
    const cherryIconScale = useRef(new Animated.Value(1)).current;

    // Disable iOS swipe-back gesture on this screen
    useEffect(() => {
      navigation.setOptions?.({ gestureEnabled: false });
    }, [navigation]);

    useEffect(() => {
      if (!loading) {
        console.log('📱 [Index] Posts loaded:', posts.length);
        console.log('📱 [Index] Sample post:', posts[0]);
        setFilteredPosts(posts);
      }
    }, [posts, loading]);

    const handleTrendsChange = (trends: string[]) => {
        setSelectedTrends(trends);
        filterPosts(searchQuery, trends);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            filterPosts(query, selectedTrends);
        } else {
            // Reset to show all posts when search is empty
            setFilteredPosts(posts);
        }
    };

    const filterPosts = (query: string, trends: string[]) => {
        // Start with all posts
        let filtered = posts;

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
            await refreshPosts();
        } catch (error) {  
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    };

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

    const handleCherryIconPressIn = () => {
        // Trigger haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Scale up animation
        Animated.spring(cherryIconScale, {
            toValue: 1.2,
            tension: 300,
            friction: 10,
            useNativeDriver: true,
        }).start();
    };

    const handleCherryIconPressOut = () => {
        // Scale back to normal
        Animated.spring(cherryIconScale, {
            toValue: 1,
            tension: 300,
            friction: 10,
            useNativeDriver: true,
        }).start();
    };

    const handleThemeToggle = () => {
        // Toggle between light and dark theme (same logic as settings)
        setThemeMode(themeMode === 'light' ? 'dark' : 'light');
    };
    
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }} edges={['top']}>
            {/* Header */}
            <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                paddingHorizontal: 16, 
                paddingVertical: 8, 
                backgroundColor: theme.backgroundTertiary,
                borderBottomWidth: 1,
                borderBottomColor:theme.backgroundTertiary
            }}>
                <TouchableOpacity
                    onPressIn={handleCherryIconPressIn}
                    onPressOut={handleCherryIconPressOut}
                    onPress={handleThemeToggle}
                    activeOpacity={1}
                >
                    <Animated.Image 
                        source={require('../../../assets/images/cherry-icon-low.png')}
                        style={{
                            width: Platform.OS === 'android' ? 52 : 56,
                            height: Platform.OS === 'android' ? 52 : 56,
                            borderRadius: Platform.OS === 'android' ? 9 : 10,
                            backgroundColor: theme.cardBackground,
                            transform: [{ scale: cherryIconScale }],
                        }}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ 
                        fontSize: 40,
                        color: theme.text,
                        fontFamily: 'MuseoModerno-Regular',
                        letterSpacing: 1
                    }} allowFontScaling={false}>
                        cherrizbox
                    </Text>
                </View>
                
            
                <TouchableOpacity onPress={() => router.push('/profile')}>
                    <View style={{
                        width: Platform.OS === 'android' ? 60 : 67,
                        height: Platform.OS === 'android' ? 60 : 67,
                        borderRadius: Platform.OS === 'android' ? 30 : 36,
                        backgroundColor: theme.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}>
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={{ 
                                fontSize: Platform.OS === 'android' ? 22 : 24, 
                                color: theme.textInverse, 
                                fontWeight: 'bold' 
                            }} allowFontScaling={false}>
                                {user?.name?.[0] || 'U'}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
                <SearchInput onSearch={handleSearch} onFocus={handleSearchFocus} />
            </View>

            {/* Trending section - only visible when search is focused */}
            {isSearchFocused && <Trending onTrendsChange={handleTrendsChange} />}

            {/* Content */}
            <Animated.ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.primary}
                        colors={[theme.primary]}
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
                <View style={{ paddingHorizontal: 8, marginTop: 8 }}>
                    <Text style={{ 
                        color: theme.text, 
                        fontFamily: 'Urbanist-Bold', 
                        fontSize: 18, 
                        marginBottom: 4 
                    }} allowFontScaling={false}>
                        {isSearchFocused ? 'Search Results' : 'For You'}
                    </Text>
                    
                    {loading || !postsLoaded ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                            <Image source={require('../../../assets/icon/loading-icon.png')} style={{ width: 60, height: 60, marginBottom: 16 }} />
                            <Text style={{ color: theme.primary, fontSize: 18, marginBottom: 12 }} allowFontScaling={false}>Loading posts...</Text>
                        </View>
                    ) : (filteredPosts.length > 0 || isSearchFocused) ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            {filteredPosts.map((post, index) => (
                                post.type === "photo" ? (
                                    <View key={post.$id} style={{ marginBottom: 12, width: cardWidth }}>
                                        {post.isSubscribed && !post.isCancelled ? (
                                            <View style={{
                                                padding: 2,
                                                borderRadius: 20,
                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                width: '100%',
                                            }}>
                                                <LinearGradient
                                                    colors={['#FD6F3E', '#FFD700', '#FD6F3E']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={{
                                                        padding: 1,
                                                        borderRadius: 19,
                                                        width: '100%',
                                                    }}
                                                >
                                                    <View style={{
                                                        backgroundColor: theme.background,
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
                                        style={{
                                            backgroundColor: theme.cardBackground,
                                            borderRadius: 8,
                                            marginBottom: 12,
                                            padding: 16,
                                            width: '100%'
                                        }}
                                        onPress={() => router.replace(`/properties/${post.$id}`)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{
                                fontFamily: 'Urbanist-Bold',
                                color: theme.text,
                                fontSize: 18
                            }} allowFontScaling={false}>
                                {post.title || 'Untitled'}
                            </Text>
                                            {post.type && (
                                                <View style={{
                                                    marginLeft: 8,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    backgroundColor: theme.primary,
                                                    borderRadius: 16
                                                }}>
                                    <Text style={{
                                        color: theme.textInverse,
                                        fontSize: 12,
                                        fontFamily: 'Urbanist-Bold'
                                    }} allowFontScaling={false}>
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
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Image 
                                source={require('../../../assets/images/loading-icon.png')} 
                                style={{ width: 80, height: 80, marginBottom: 16 }} 
                            />
                            <Text style={{ 
                                color: theme.text, 
                                fontSize: 24, 
                                fontFamily: 'Urbanist-Bold',
                                marginBottom: 16,
                                textAlign: 'center'
                            }} allowFontScaling={false}>
                                No posts found 😢
                            </Text>
                            <Text style={{ 
                                color: theme.textSecondary, 
                                fontSize: 18, 
                                textAlign: 'center',
                                paddingHorizontal: 32
                            }} allowFontScaling={false}>
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