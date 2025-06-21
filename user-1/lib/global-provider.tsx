import React, { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { Image } from 'react-native';

import { deleteExpiredSubscriptions, getAllPosts, getCurrentUser, getUserSubscriptions } from "./appwrite";
import { connectUser, disconnectUser } from "./stream-chat";
import { useAppwrite } from "./useAppwrite";

interface Subscription {
    $id: string;
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

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: () => void;
  isStreamConnected: boolean;
  creators: Subscription[];
  loadCreators: () => Promise<void>;
  refreshCreators: () => Promise<void>;
  posts: Post[];
  loadPosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  preloadImages: () => Promise<void>;
  imagesPreloaded: boolean;
}

interface User {
  $id: string;
  name: string;
  email: string;
  avatar: string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const {
    data: user,
    loading,
    refetch,
  } = useAppwrite({
    fn: getCurrentUser,
  });

  const [isStreamConnected, setIsStreamConnected] = React.useState(false);
  const [creators, setCreators] = React.useState<Subscription[]>([]);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [imagesPreloaded, setImagesPreloaded] = React.useState(false);
  const previousUserId = useRef<string | null>(null);

  const isLogged = !!user;

  const loadCreators = async () => {
    if (!user?.$id || creators.length > 0) return;
    
    try {
      // Delete expired subscriptions first
      await deleteExpiredSubscriptions(user.$id);
      
      // Then get the updated list of subscriptions
      const userSubscriptions = await getUserSubscriptions(user.$id);
      
      // Filter out active subscriptions that have a cancelled counterpart
      const filteredSubscriptions = userSubscriptions
        .map(sub => ({
          $id: sub.$id,
          userId: sub.userId,
          status: sub.status as 'active' | 'cancelled',
          createdAt: sub.createdAt,
          planCurrency: sub.planCurrency,
          planInterval: sub.planInterval,
          creatorName: sub.creatorName,
          creatorAccountId: sub.creatorAccountId,
          renewalDate: sub.renewalDate,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          endsAt: sub.endsAt
        }))
        .filter((sub, index, self) => {
          if (sub.status === 'cancelled') return true;
          
          // If this is an active subscription, check if there's a cancelled one with the same stripeSubscriptionId
          const hasCancelledCounterpart = self.some(
            otherSub => 
              otherSub.status === 'cancelled' && 
              otherSub.stripeSubscriptionId === sub.stripeSubscriptionId
          );
          
          return !hasCancelledCounterpart;
        });

      setCreators(filteredSubscriptions);
    } catch (error) {
      console.error('Error loading creators:', error);
    }
  };

  const refreshCreators = async () => {
    if (!user?.$id) return;
    
    try {
      // Delete expired subscriptions first
      await deleteExpiredSubscriptions(user.$id);
      
      // Then get the updated list of subscriptions
      const userSubscriptions = await getUserSubscriptions(user.$id);
      
      // Filter out active subscriptions that have a cancelled counterpart
      const filteredSubscriptions = userSubscriptions
        .map(sub => ({
          $id: sub.$id,
          userId: sub.userId,
          status: sub.status as 'active' | 'cancelled',
          createdAt: sub.createdAt,
          planCurrency: sub.planCurrency,
          planInterval: sub.planInterval,
          creatorName: sub.creatorName,
          creatorAccountId: sub.creatorAccountId,
          renewalDate: sub.renewalDate,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          endsAt: sub.endsAt
        }))
        .filter((sub, index, self) => {
          if (sub.status === 'cancelled') return true;
          
          // If this is an active subscription, check if there's a cancelled one with the same stripeSubscriptionId
          const hasCancelledCounterpart = self.some(
            otherSub => 
              otherSub.status === 'cancelled' && 
              otherSub.stripeSubscriptionId === sub.stripeSubscriptionId
          );
          
          return !hasCancelledCounterpart;
        });

      setCreators(filteredSubscriptions);
    } catch (error) {
      console.error('Error refreshing creators:', error);
    }
  };

  const loadPosts = async () => {
    if (posts.length > 0) return;
    
    try {
      const allPosts = await getAllPosts();
      // Ensure type is either 'photo' or 'video'
      const typedPosts = allPosts.map(post => ({
        ...post,
        type: post.type === 'photo' ? 'photo' : 'video'
      })) as Post[];
      
      setPosts(typedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const preloadImages = async () => {
    if (imagesPreloaded) return;
    
    try {
      console.log('Starting image preloading...');
      console.log('Posts available:', posts.length);
      
      // Get all unique image URLs from posts
      const imageUrls = posts
        .map(post => post.thumbnail || post.imageUrl || post.fileUrl)
        .filter(url => url && url.trim() !== '')
        .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
      
      console.log(`Preloading ${imageUrls.length} images...`);
      console.log('Image URLs:', imageUrls);
      
      if (imageUrls.length === 0) {
        console.log('No images to preload');
        setImagesPreloaded(true);
        return;
      }
      
      // Preload images in parallel with a limit to avoid overwhelming the network
      const batchSize = 3; // Reduced batch size
      for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(url => 
            new Promise((resolve, reject) => {
              if (!url) {
                resolve(null);
                return;
              }
              
              Image.prefetch(url)
                .then(() => {
                  console.log(`Preloaded: ${url}`);
                  resolve(null);
                })
                .catch((error) => {
                  console.log(`Failed to preload: ${url}`, error);
                  resolve(null); // Don't fail the entire batch
                });
            })
          )
        );
        
        // Small delay between batches to be nice to the network
        if (i + batchSize < imageUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log('Image preloading completed');
      setImagesPreloaded(true);
    } catch (error) {
      console.error('Error preloading images:', error);
      setImagesPreloaded(true); // Mark as done even if there was an error
    }
  };

  // Function to preload missing images for new posts
  const preloadMissingImages = async (newPosts: Post[]) => {
    try {
      console.log('Checking for missing images in new posts...');
      
      // Get all unique image URLs from new posts
      const imageUrls = newPosts
        .map(post => post.thumbnail || post.imageUrl || post.fileUrl)
        .filter(url => url && url.trim() !== '')
        .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
      
      if (imageUrls.length === 0) {
        console.log('No new images to preload');
        return;
      }
      
      console.log(`Preloading ${imageUrls.length} new images...`);
      
      // Preload new images in parallel
      await Promise.allSettled(
        imageUrls.map(url => 
          new Promise((resolve) => {
            if (!url) {
              resolve(null);
              return;
            }
            
            Image.prefetch(url)
              .then(() => {
                console.log(`Preloaded new image: ${url}`);
                resolve(null);
              })
              .catch((error) => {
                console.log(`Failed to preload new image: ${url}`, error);
                resolve(null); // Don't fail the entire operation
              });
          })
        )
      );
      
      console.log('New image preloading completed');
    } catch (error) {
      console.error('Error preloading new images:', error);
    }
  };

  // Function to refresh posts and preload missing images
  const refreshPosts = async () => {
    try {
      console.log('Refreshing posts...');
      const allPosts = await getAllPosts();
      
      // Ensure type is either 'photo' or 'video'
      const typedPosts = allPosts.map(post => ({
        ...post,
        type: post.type === 'photo' ? 'photo' : 'video'
      })) as Post[];
      
      // Find new posts (posts that weren't in the previous list)
      const existingPostIds = new Set(posts.map(post => post.$id));
      const newPosts = typedPosts.filter(post => !existingPostIds.has(post.$id));
      
      if (newPosts.length > 0) {
        console.log(`Found ${newPosts.length} new posts, preloading their images...`);
        await preloadMissingImages(newPosts);
      }
      
      setPosts(typedPosts);
    } catch (error) {
      console.error('Error refreshing posts:', error);
    }
  };

  // Load creators when user is available
  useEffect(() => {
    if (user?.$id) {
      loadCreators();
    } else {
      setCreators([]);
    }
  }, [user?.$id]);

  // Load posts when user is available
  useEffect(() => {
    if (user?.$id) {
      loadPosts();
    } else {
      setPosts([]);
    }
  }, [user?.$id]);

  // Auto-trigger image preloading when posts are loaded
  useEffect(() => {
    if (posts.length > 0 && !imagesPreloaded) {
      console.log('Posts loaded, triggering image preloading...');
      preloadImages();
    }
  }, [posts, imagesPreloaded]);

  // Connect to Stream Chat when user is loaded
  useEffect(() => {
    const connectToStream = async () => {
      if (user) {
        try {
          // Check if this is a different user than before
          if (previousUserId.current && previousUserId.current !== user.$id) {
            console.log('User changed, disconnecting previous user...');
            try {
              await disconnectUser();
              setIsStreamConnected(false);
            } catch (error) {
              console.log('Error disconnecting previous user:', error);
            }
          }

          // If not connected or user changed, connect
          if (!isStreamConnected || previousUserId.current !== user.$id) {
            console.log('Connecting user to Stream Chat...');
            
            // Connect user (this will create the user if it doesn't exist)
            const connected = await connectUser(user.$id);
            
            if (connected) {
              console.log('Successfully connected to Stream Chat');
              setIsStreamConnected(true);
              previousUserId.current = user.$id;
            } else {
              console.log('Failed to connect to Stream Chat');
            }
          }
        } catch (error) {
          console.error('Error connecting to Stream Chat:', error);
        }
      } else {
        // No user, disconnect if connected
        if (isStreamConnected) {
          console.log('No user found, disconnecting from Stream Chat...');
          try {
            await disconnectUser();
            setIsStreamConnected(false);
            previousUserId.current = null;
          } catch (error) {
            console.log('Error disconnecting:', error);
          }
        }
      }
    };

    connectToStream();
  }, [user, isStreamConnected]);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        user,
        loading,
        refetch,
        isStreamConnected,
        creators,
        loadCreators,
        refreshCreators,
        posts,
        loadPosts,
        refreshPosts,
        preloadImages,
        imagesPreloaded,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context)
    throw new Error("useGlobalContext must be used within a GlobalProvider");

  return context;
};

export default GlobalProvider;