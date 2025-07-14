import { Models } from 'appwrite';
import * as FileSystem from 'expo-file-system';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

import { deleteExpiredSubscriptions, getAllPosts, getCurrentUser, getSubscriptionStatus, getUserProfile, getUserSubscriptions } from "./appwrite";
import { connectUser, disconnectUser, preSetupChannels } from "./stream-chat";
import { useAppwrite } from "./useAppwrite";

const CACHE_DIR = FileSystem.cacheDirectory + 'images/';

const getCacheKey = (url: string): string => {
  // A simple hash function to create a unique key for the URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
};

const cacheImage = async (url: string): Promise<string> => {
  const cacheKey = getCacheKey(url);
  // Basic extension extraction, default to jpg
  const extMatch = url.match(/\.([^.?/]+)(?:\?.*)?$/);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const localUri = `${CACHE_DIR}${cacheKey}.${ext}`;

  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }

  try {
    const { uri } = await FileSystem.downloadAsync(url, localUri);
    return uri;
  } catch (e) {
    console.error(`Failed to download image for caching: ${url}`, e);
    throw e; // rethrow to be caught by preloadImages
  }
};


interface AppwriteDocument extends Models.Document {
    userId: string;
    status: 'active' | 'cancelled';
    createdAt: string;

    planCurrency: string;
    planInterval: string;
    creatorName: string;
    creatorAccountId: string;
    renewalDate: string;
    stripeSubscriptionId: string;
    endsAt?: string;
}

interface Subscription extends AppwriteDocument {}

interface Post extends Models.Document {
    type: 'photo' | 'video';
    title?: string;
    thumbnail?: string;
    imageUrl?: string;
    fileUrl?: string;
    PhotoTopics?: string;
    isSubscribed?: boolean;
    isCancelled?: boolean;
}

interface UserProfile extends Models.Document {
    userId: string;
    profileImageUri?: string;
}

interface User extends Models.User<Models.Preferences> {}

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  loading: boolean;
  refetch: (newParams?: any) => Promise<void>;
  isStreamConnected: boolean;
  creators: UserProfile[];
  refreshCreators: () => Promise<void>;
  posts: Post[];
  refreshPosts: () => Promise<void>;
  imagesPreloaded: boolean;
  postsLoaded: boolean;
  getCachedImageUrl: (url?: string) => string | undefined;
  preloadCommonImages: () => Promise<void>;
  profileImage: string | null;
  setProfileImage: (url: string | null) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const { data: user, loading, refetch } = useAppwrite({ fn: getCurrentUser });

  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [creators, setCreators] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const imageDiskCache = useRef<{ [key: string]: string }>({});
  const imageCachePath = FileSystem.documentDirectory + 'imageCache.json';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const previousUserId = useRef<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const getCachedImageUrl = (remoteUrl?: string) => {
    if (!remoteUrl) return undefined;
    const cachedUri = imageDiskCache.current[remoteUrl];
    return cachedUri || remoteUrl;
  };

  const initializeImageCache = async () => {
    try {
      console.log('Reading image cache from disk...');
      const fileInfo = await FileSystem.getInfoAsync(imageCachePath);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(imageCachePath);
        if (content) {
          imageDiskCache.current = JSON.parse(content);
          console.log(`Image cache initialized with ${Object.keys(imageDiskCache.current).length} files.`);
        }
      } else {
        console.log('No image cache file found.');
      }
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  };

  // New function to preload common images during sign-up
  const preloadCommonImages = async () => {
    try {
      console.log('Starting to preload common images during sign-up...');
      
      // Get all posts without requiring user authentication
      const allPosts = await getAllPosts();
      
      // Get the most recent posts (limit to first 10 for faster caching)
      const recentPosts = allPosts.slice(0, 10);
      
      const postImageUrls = recentPosts
        .map((post: any) => post.thumbnail || post.imageUrl || post.fileUrl)
        .filter((url): url is string => !!url);

      if (postImageUrls.length === 0) {
        console.log('No images found to preload during sign-up.');
        return;
      }

      const uniqueUrls = [...new Set(postImageUrls)];
      console.log(`Found ${uniqueUrls.length} unique images to preload during sign-up.`);

      let downloadedCount = 0;
      const promises = uniqueUrls.map(async (url) => {
        if (!imageDiskCache.current[url]) { // Check if not already cached
          try {
            const fileUri = await cacheImage(url);
            imageDiskCache.current[url] = fileUri;
            downloadedCount++;
            console.log(`Cached image during sign-up: ${url}`);
          } catch (error) {
            console.error(`Failed to cache image during sign-up: ${url}`, error);
          }
        }
      });

      await Promise.all(promises);

      if (downloadedCount > 0) {
        await FileSystem.writeAsStringAsync(imageCachePath, JSON.stringify(imageDiskCache.current));
        console.log(`${downloadedCount} new images cached during sign-up and saved to disk.`);
      } else {
        console.log('All images were already cached during sign-up.');
      }
    } catch (error) {
      console.error('Error preloading common images during sign-up:', error);
    }
  };

  const loadUserProfile = async () => {
    setProfileLoaded(false);
    if (!user?.$id) {
      setProfileLoaded(true);
      return;
    }
    try {
      const userProfile = (await getUserProfile(user.$id)) as UserProfile;
      setProfile(userProfile);
      setProfileImage(userProfile?.profileImageUri || null);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setProfileLoaded(true);
    }
  };

  useEffect(() => {
    initializeImageCache();
  }, []);

  const loadCreators = async () => {
    if (!user?.$id) return;
    try {
      await deleteExpiredSubscriptions(user.$id);
      const userSubscriptions = (await getUserSubscriptions(user.$id)) as AppwriteDocument[];
      const filteredSubscriptions = userSubscriptions.filter((sub, _, self) => {
          if (sub.status === 'cancelled') return true;
        const hasCancelled = self.some(s => s.status === 'cancelled' && s.stripeSubscriptionId === sub.stripeSubscriptionId);
        return !hasCancelled;
        });
      setCreators(filteredSubscriptions);

      // Pre-setup channels for active subscriptions
      const activeCreatorIds = filteredSubscriptions
        .filter(sub => sub.status === 'active')
        .map(sub => sub.creatorAccountId);

      if (activeCreatorIds.length > 0) {
        console.log('🚀 Starting channel pre-setup for active creators...');
        // Run channel pre-setup in background (don't await to avoid blocking UI)
        preSetupChannels(user.$id, activeCreatorIds).then((result) => {
          console.log('✅ Channel pre-setup completed:', result);
        }).catch((error) => {
          console.error('❌ Channel pre-setup failed:', error);
        });
      }
    } catch (error) {
      console.error('Error loading creators:', error);
    }
  };

  const refreshCreators = async () => {
    await loadCreators();
  };

  const loadPosts = async () => {
    setPostsLoaded(false);
    try {
      const allPosts = (await getAllPosts()) as Post[];

      if (user?.$id) {
        // If user is logged in, check subscription status and sort
        const postsWithSubscription = await Promise.all(
          allPosts.map(async (post) => {
            const { isSubscribed, isCancelled } = await getSubscriptionStatus(user.$id, post.title || '');
            return { ...post, isSubscribed, isCancelled };
          })
        );
        
        const sortedPosts = postsWithSubscription.sort((a, b) => {
          if (a.isSubscribed && !a.isCancelled && (!b.isSubscribed || b.isCancelled)) return -1;
          if ((!a.isSubscribed || a.isCancelled) && b.isSubscribed && !b.isCancelled) return 1;
          if (a.isCancelled && !b.isCancelled) return -1;
          if (!a.isCancelled && b.isCancelled) return 1;
          return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
        });
      
        setPosts(sortedPosts);
      } else {
        // If no user, just set the posts
        setPosts(allPosts);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setPostsLoaded(true);
    }
  };

  const refreshPosts = async () => {
    await loadPosts();
  };

  const preloadImages = async () => {
    if (imagesPreloaded) return;
    
    const postImageUrls = posts
        .map(post => post.thumbnail || post.imageUrl || post.fileUrl)
      .filter((url): url is string => !!url);

    const allImageUrls = [...postImageUrls];
    if (profile?.profileImageUri) {
      allImageUrls.push(profile.profileImageUri);
    }

    if (allImageUrls.length === 0) {
        setImagesPreloaded(true);
        return;
      }
      
    const uniqueUrls = [...new Set(allImageUrls)];

    let downloadedCount = 0;
    const promises = uniqueUrls.map(async (url) => {
      if (!imageDiskCache.current[url]) { // Check if not already cached
    try {
          const fileUri = await cacheImage(url);
          imageDiskCache.current[url] = fileUri;
          downloadedCount++;
        } catch (error) {
          console.error(`Failed to cache image: ${url}`, error);
        }
      }
    });

    await Promise.all(promises);

    if (downloadedCount > 0) {
      await FileSystem.writeAsStringAsync(imageCachePath, JSON.stringify(imageDiskCache.current));
      console.log(`${downloadedCount} new images cached and saved to disk.`);
    }
    setImagesPreloaded(true);
    console.log("Image preloading complete. imagesPreloaded set to true.");
  };

  useEffect(() => {
    if (postsLoaded && profileLoaded) {
      preloadImages();
    }
  }, [postsLoaded, profileLoaded]);

  useEffect(() => {
    const handleConnection = async () => {
      if (user && !loading) {
        if (previousUserId.current !== user.$id) {
          if (previousUserId.current) await disconnectUser();
          await connectUser(user.$id);
              setIsStreamConnected(true);
              previousUserId.current = user.$id;
          loadCreators();
          loadPosts();
          loadUserProfile();
        }
      } else if (!user && !loading && previousUserId.current) {
            await disconnectUser();
            setIsStreamConnected(false);
            previousUserId.current = null;
        setCreators([]);
        setPosts([]);
        imageDiskCache.current = {};
        setImagesPreloaded(false);
        setPostsLoaded(false);
        setProfileLoaded(false);
      }
    };
    handleConnection();
  }, [user, loading]);

  const contextValue: GlobalContextType = {
    isLogged: !!user,
    user: user as User | null,
    profile,
    setProfile,
        loading,
        refetch,
        isStreamConnected,
        creators,
        refreshCreators,
        posts,
        refreshPosts,
        imagesPreloaded,
    postsLoaded,
    getCachedImageUrl,
    preloadCommonImages,
    profileImage,
    setProfileImage,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};