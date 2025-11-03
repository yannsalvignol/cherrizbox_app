import AsyncStorage from '@react-native-async-storage/async-storage';
import { Models } from 'appwrite';
import Constants from 'expo-constants';
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
    creatorId: string;
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
    currency?: string;
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
  setIsStreamConnected: (connected: boolean) => void;
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
    
    // Check if cached file exists and re-cache if missing
    if (cachedUri) {
      FileSystem.getInfoAsync(cachedUri).then(fileInfo => {
        if (!fileInfo.exists) {
          console.log(`   [ImageCache] Cached file missing, re-caching: ${remoteUrl.substring(0, 50)}...`);
          delete imageDiskCache.current[remoteUrl];
          // Re-cache the image in the background
          cacheImage(remoteUrl).then(newUri => {
            imageDiskCache.current[remoteUrl] = newUri;
            saveImageCacheToDisk();
            console.log(` [ImageCache] Image re-cached successfully: ${remoteUrl.substring(0, 50)}...`);
          }).catch(error => {
            console.error(`  [ImageCache] Failed to re-cache image: ${remoteUrl.substring(0, 50)}...`, error);
          });
        }
      }).catch(() => {
        // File check failed, remove from cache and re-cache
        delete imageDiskCache.current[remoteUrl];
        cacheImage(remoteUrl).then(newUri => {
          imageDiskCache.current[remoteUrl] = newUri;
          saveImageCacheToDisk();
        }).catch(() => {
          // Ignore re-cache failures
        });
      });
    } else {
      // No cached version, start caching in background for next time
      cacheImage(remoteUrl).then(newUri => {
        imageDiskCache.current[remoteUrl] = newUri;
        saveImageCacheToDisk();
        console.log(` [ImageCache] New image cached: ${remoteUrl.substring(0, 50)}...`);
      }).catch(error => {
        console.log(`  [ImageCache] Failed to cache new image: ${remoteUrl.substring(0, 50)}...`, error);
      });
    }
    
    console.log(`🖼️ [ImageCache] URL: ${remoteUrl.substring(0, 50)}...`);
    console.log(`🖼️ [ImageCache] Cached: ${cachedUri ? 'YES' : 'NO'}`);
    console.log(`🖼️ [ImageCache] Using: ${cachedUri && cachedUri.startsWith('file://') ? 'CACHED' : 'ORIGINAL'}`);
    
    // Return cached version if available and valid, otherwise original
    return cachedUri || remoteUrl;
  };

  const saveImageCacheToDisk = async () => {
    try {
      await FileSystem.writeAsStringAsync(imageCachePath, JSON.stringify(imageDiskCache.current));
      console.log('💾 [ImageCache] Cache saved to disk');
    } catch (error) {
      console.error('  [ImageCache] Failed to save cache to disk:', error);
    }
  };

  const clearImageCache = async () => {
    try {
      console.log('🗑️ [ImageCache] Clearing image cache...');
      imageDiskCache.current = {};
      await FileSystem.deleteAsync(imageCachePath, { idempotent: true });
      // Also clear the cached image files
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
      console.log(' [ImageCache] Image cache and files cleared successfully');
    } catch (error) {
      console.error('  [ImageCache] Failed to clear image cache:', error);
    }
  };

  const initializeImageCache = async () => {
    try {
      console.log('   [ImageCache] Reading image cache from disk...');
      
      // Check app version to clear cache on updates
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const versionKey = 'app_version';
      const storedVersion = await AsyncStorage.getItem(versionKey);
      
      if (storedVersion !== currentVersion) {
        console.log(`  [ImageCache] App updated from ${storedVersion} to ${currentVersion}, clearing cache...`);
        await clearImageCache();
        await AsyncStorage.setItem(versionKey, currentVersion);
        return;
      }
      
      const fileInfo = await FileSystem.getInfoAsync(imageCachePath);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(imageCachePath);
        if (content) {
          imageDiskCache.current = JSON.parse(content);
          console.log(` [ImageCache] Cache initialized with ${Object.keys(imageDiskCache.current).length} files.`);
        }
      } else {
        console.log('ℹ️ [ImageCache] No cache file found.');
      }
    } catch (error) {
      console.error('  [ImageCache] Failed to initialize image cache:', error);
      // Clear cache on error
      await clearImageCache();
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

      // Only pre-setup channels if Stream Chat is connected (meaning user has active subscriptions)
      const activeCreatorIds = filteredSubscriptions
        .filter(sub => sub.status === 'active')
        .map(sub => sub.creatorId);

      if (activeCreatorIds.length > 0 && isStreamConnected) {
        console.log('  Starting channel pre-setup for active creators...');
        // Run channel pre-setup in background (don't await to avoid blocking UI)
        preSetupChannels(user.$id, activeCreatorIds).then((result) => {
          console.log(' Channel pre-setup completed:', result);
        }).catch((error) => {
          console.error('  Channel pre-setup failed:', error);
        });
      } else if (activeCreatorIds.length > 0) {
        console.log('  Active subscriptions found but Stream Chat not connected - skipping channel pre-setup');
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
          // Always load user profile and check subscriptions first
          await loadUserProfile();
          await loadCreators();
          
          // Check if user has any active subscriptions
          const userSubscriptions = await getUserSubscriptions(user.$id);
          const hasActiveSubscriptions = userSubscriptions.some(sub => 
            sub.status === 'active' && (!sub.endsAt || new Date(sub.endsAt) > new Date())
          );
          
          console.log('🔍 User has active subscriptions:', hasActiveSubscriptions);
          
          // Only initialize heavy processes if user has active subscriptions
          if (hasActiveSubscriptions) {
            console.log('  User has subscriptions - initializing Stream Chat and heavy processes');
            if (previousUserId.current) await disconnectUser();
            await connectUser(user.$id);
            setIsStreamConnected(true);
            previousUserId.current = user.$id;
            loadPosts();
          } else {
            console.log('  User has no active subscriptions - skipping Stream Chat initialization');
            // Set basic states without heavy initialization
            setIsStreamConnected(false);
            previousUserId.current = user.$id;
            // Load posts anyway for the main feed
            loadPosts();
          }
        }
      } else if (!user && !loading && previousUserId.current) {
            // Stream Chat token is now cleared in the logout() function
            // Just disconnect from Stream Chat
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
        setIsStreamConnected,
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