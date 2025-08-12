import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef } from "react";

import { getCurrentUser } from "./appwrite";
import { connectUser, disconnectUser } from "./stream-chat";
import { useAppwrite } from "./useAppwrite";

interface ProfileCache {
  profile: any;
  userPhoto: any;
  timestamp: number;
}

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: () => void;
  isStreamConnected: boolean;
  missingChannelConditions: string[];
  setMissingChannelConditions: (conditions: string[]) => void;
  refreshChannelConditions: () => void;
  showInlineVerification: boolean;
  setShowInlineVerification: (show: boolean) => void;
  socialMediaPlatform: string;
  setSocialMediaPlatform: (platform: string) => void;
  socialMediaUsername: string;
  setSocialMediaUsername: (username: string) => void;
  userCurrency: string;
  setUserCurrency: (currency: string) => void;
  profileCache: ProfileCache | null;
  preloadProfileData: () => Promise<void>;
  getCachedProfile: () => ProfileCache | null;
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
  const [missingChannelConditions, setMissingChannelConditions] = React.useState<string[]>([]);
  const [showInlineVerification, setShowInlineVerification] = React.useState(false);
  const [socialMediaPlatform, setSocialMediaPlatform] = React.useState('');
  const [socialMediaUsername, setSocialMediaUsername] = React.useState('');
  const [userCurrency, setUserCurrency] = React.useState('USD');
  const [profileCache, setProfileCache] = React.useState<ProfileCache | null>(null);

  const previousUserId = useRef<string | null>(null);

  // Register the profile cache setter for logout clearing
  React.useEffect(() => {
    registerProfileCacheSetter(setProfileCache);
  }, []);

  const isLogged = !!user;

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  const preloadProfileData = useCallback(async () => {
    if (!user?.$id) return;
    
    try {
      console.log('🔄 [Profile Cache] Preloading profile data for user:', user.$id);
      
      const { getUserProfile, getUserPhoto } = await import('./appwrite');
      
      // Load both profile and photo data in parallel
      const [profile, userPhoto] = await Promise.all([
        getUserProfile(user.$id),
        getUserPhoto(user.$id)
      ]);
      
      if (profile) {
        const cacheData: ProfileCache = {
          profile,
          userPhoto,
          timestamp: Date.now()
        };
        
        setProfileCache(cacheData);
        console.log('✅ [Profile Cache] Profile data cached successfully');
        
        // Also update currency if available
        if (profile.currency) {
          setUserCurrency(profile.currency);
        }
      }
    } catch (error) {
      console.error('❌ [Profile Cache] Error preloading profile data:', error);
    }
  }, [user?.$id]);

  const getCachedProfile = (): ProfileCache | null => {
    if (!profileCache) return null;
    
    // Check if cache is still valid
    const now = Date.now();
    const isExpired = now - profileCache.timestamp > CACHE_DURATION;
    
    if (isExpired) {
      console.log('⏰ [Profile Cache] Cache expired, clearing');
      setProfileCache(null);
      return null;
    }
    
    console.log('✅ [Profile Cache] Returning cached profile data');
    return profileCache;
  };

  const refreshChannelConditions = async () => {
    console.log('🚀 [Global Currency] refreshChannelConditions called for user:', user?.$id);
    if (!user?.$id) {
      console.log('❌ [Global Currency] No user ID, returning early');
      return;
    }
    
    try {
      // Try to use cached data first
      let profile, userPhoto;
      const cached = getCachedProfile();
      
      if (cached) {
        console.log('🔄 [Global Currency] Using cached profile data...');
        profile = cached.profile;
        userPhoto = cached.userPhoto;
      } else {
        // First check if all profile fields are filled (same as handleGoLive validation)
        console.log('🔄 [Global Currency] Loading user profile from API...');
        const { getUserProfile, getUserPhoto } = await import('./appwrite');
        [profile, userPhoto] = await Promise.all([
          getUserProfile(user.$id),
          getUserPhoto(user.$id)
        ]);
        
        // Cache the data for future use
        if (profile) {
          setProfileCache({
            profile,
            userPhoto,
            timestamp: Date.now()
          });
        }
      }
      
      if (!profile) {
        console.log('❌ [Global Currency] No profile found');
        setMissingChannelConditions(['Profile setup incomplete']);
        return;
      }

      // Load user currency from profile
      console.log('🔍 [Global Currency] Full profile data:', JSON.stringify(profile, null, 2));
      console.log('🔍 [Global Currency] Profile currency field:', profile.currency);
      console.log('🔍 [Global Currency] All profile keys:', Object.keys(profile));
      
      if (profile.currency) {
        console.log('✅ [Global Currency] Setting currency to:', profile.currency);
        setUserCurrency(profile.currency);
      } else {
        console.log('⚠️ [Global Currency] No currency found in profile, keeping default USD');
        console.log('🔍 [Global Currency] Available fields:', Object.keys(profile));
      }

      // Check if all profile fields are filled
      const missingProfileFields: string[] = [];
      
      if (!profile.profileImageUri) {
        missingProfileFields.push('Profile Picture');
      }
      
      if (!profile.creatorsname || profile.creatorsname.trim() === '') {
        missingProfileFields.push('Creator Name');
      }
      
      if (!profile.ProfilesBio || profile.ProfilesBio.trim() === '') {
        missingProfileFields.push('Bio');
      }
      
      if (!profile.Location || profile.Location.trim() === '') {
        missingProfileFields.push('Location');
      }
      
      if (!profile.topics || profile.topics.trim() === '') {
        missingProfileFields.push('Topics');
      }
      
      if (!profile.phoneNumber || profile.phoneNumber.trim() === '') {
        missingProfileFields.push('Phone Number');
      }
      
      if (!profile.gender || profile.gender.trim() === '') {
        missingProfileFields.push('Gender');
      }
      
      if (!profile.dateOfBirth || profile.dateOfBirth.trim() === '') {
        missingProfileFields.push('Date of Birth');
      }

      // Check if user has set up pricing (use cached userPhoto if available)
      if (!userPhoto || !userPhoto.payment) {
        missingProfileFields.push('Subscription Pricing');
      } else {
        try {
          const paymentData = JSON.parse((userPhoto as any).payment);
          if (!paymentData.monthlyPrice || !paymentData.yearlyPrice || 
              parseFloat(paymentData.monthlyPrice) <= 0 || parseFloat(paymentData.yearlyPrice) <= 0) {
            missingProfileFields.push('Subscription Pricing');
          }
        } catch (error) {
          missingProfileFields.push('Subscription Pricing');
        }
      }

      // If profile is incomplete, show missing profile fields
      if (missingProfileFields.length > 0) {
        setMissingChannelConditions(missingProfileFields);
        return;
      }

      // Profile is complete, now check verification conditions
      const { databases, config } = await import('./appwrite');
      const { Query } = await import('react-native-appwrite');
      
      const userDocs = await databases.listDocuments(
        config.databaseId,
        config.creatorCollectionId,
        [Query.equal('creatoraccountid', user.$id)]
      );
      
      if (userDocs.documents.length > 0) {
        const userDoc = userDocs.documents[0];
        
        // If Stripe is complete but social media is not, show the inline verification
        if (userDoc.stripeConnectSetupComplete === true && userDoc.social_media_number_correct !== true) {
          setSocialMediaPlatform(userDoc.social_media || '');
          setSocialMediaUsername(userDoc.social_media_username || '');
          setShowInlineVerification(true);
          setMissingChannelConditions([]);
          return;
        }
        
        const missingConditions: string[] = [];
        
        if (userDoc.social_media_number_correct !== true) {
          // Note: Social media verification is handled separately via inline verification, not shown in missing conditions
        }
        if (userDoc.stripeConnectSetupComplete !== true) {
          missingConditions.push('Payment setup incomplete');
        }
        setMissingChannelConditions(missingConditions);
        setShowInlineVerification(false);
      } else {
        setMissingChannelConditions(['Account setup incomplete']);
        setShowInlineVerification(false);
      }
    } catch (error) {
      console.error('Error refreshing channel conditions:', error);
    }
  };

  // Restore connection state on mount (before user loads)
  useEffect(() => {
    const restoreState = async () => {
      try {
        const { restoreConnectionState } = await import('./stream-chat');
        const restored = await restoreConnectionState();
        if (restored.isValid) {
          console.log('🚀 [GlobalProvider] Connection state restored for user:', restored.userId);
        }
      } catch (error) {
        console.log('Could not restore connection state:', error);
      }
    };
    restoreState();
  }, []); // Run once on mount

  useEffect(() => {
    const connectToStream = async () => {
      if (user) {
        try {
          // Preload profile data immediately when user logs in
          await preloadProfileData();
          
          // Preload Stream connection data early
          const { preloadStreamConnection } = await import('./stream-chat');
          preloadStreamConnection(user.$id); // Fire and forget for early cache warming
          
          // First check if all profile fields are filled (same as handleGoLive validation)
          console.log('🔄 [GlobalProvider] Loading user profile for Stream connection...');
          const { getUserProfile, getUserPhoto } = await import('./appwrite');
          const profile = await getUserProfile(user.$id);
          
          if (!profile) {
            console.log('⏳ [GlobalProvider] No profile found, skipping Stream Chat connection');
            if (isStreamConnected) {
              await disconnectUser();
              setIsStreamConnected(false);
              previousUserId.current = null;
            }
            return;
          }

          // Load user currency from profile (same as refreshChannelConditions)
          console.log('🔍 [GlobalProvider Stream] Full profile data:', JSON.stringify(profile, null, 2));
          console.log('🔍 [GlobalProvider Stream] Profile currency field:', profile.currency);
          if (profile.currency) {
            console.log('✅ [GlobalProvider Stream] Setting currency to:', profile.currency);
            setUserCurrency(profile.currency);
          } else {
            console.log('⚠️ [GlobalProvider Stream] No currency found in profile, keeping default USD');
            console.log('🔍 [GlobalProvider Stream] Available fields:', Object.keys(profile));
          }

          // Check if all profile fields are filled
          const missingProfileFields: string[] = [];
          
          if (!profile.profileImageUri) {
            missingProfileFields.push('Profile Picture');
          }
          
          if (!profile.creatorsname || profile.creatorsname.trim() === '') {
            missingProfileFields.push('Creator Name');
          }
          
          if (!profile.ProfilesBio || profile.ProfilesBio.trim() === '') {
            missingProfileFields.push('Bio');
          }
          
          if (!profile.Location || profile.Location.trim() === '') {
            missingProfileFields.push('Location');
          }
          
          if (!profile.topics || profile.topics.trim() === '') {
            missingProfileFields.push('Topics');
          }
          
          if (!profile.phoneNumber || profile.phoneNumber.trim() === '') {
            missingProfileFields.push('Phone Number');
          }
          
          if (!profile.gender || profile.gender.trim() === '') {
            missingProfileFields.push('Gender');
          }
          
          if (!profile.dateOfBirth || profile.dateOfBirth.trim() === '') {
            missingProfileFields.push('Date of Birth');
          }

          // Check if user has set up pricing
          const userPhoto = await getUserPhoto(user.$id);
          if (!userPhoto || !userPhoto.payment) {
            missingProfileFields.push('Subscription Pricing');
          } else {
            try {
              const paymentData = JSON.parse((userPhoto as any).payment);
              if (!paymentData.monthlyPrice || !paymentData.yearlyPrice || 
                  parseFloat(paymentData.monthlyPrice) <= 0 || parseFloat(paymentData.yearlyPrice) <= 0) {
                missingProfileFields.push('Subscription Pricing');
              }
            } catch (error) {
              missingProfileFields.push('Subscription Pricing');
            }
          }

          // If profile is incomplete, skip Stream Chat connection
          if (missingProfileFields.length > 0) {
            console.log('⏳ [GlobalProvider] Profile incomplete, skipping Stream Chat connection');
            if (isStreamConnected) {
              await disconnectUser();
              setIsStreamConnected(false);
              previousUserId.current = null;
            }
            return;
          }

          // Profile is complete, now check verification conditions
          const { databases, config } = await import('./appwrite');
          const { Query } = await import('react-native-appwrite');
          
          const userDocs = await databases.listDocuments(
            config.databaseId,
            config.creatorCollectionId,
            [Query.equal('creatoraccountid', user.$id)]
          );
          
          if (userDocs.documents.length > 0) {
            const userDoc = userDocs.documents[0];
            const conditionsMet = userDoc.social_media_number_correct === true && 
                                 userDoc.stripeConnectSetupComplete === true;
            
            if (!conditionsMet) {
              console.log('⏳ [GlobalProvider] Verification conditions not met, skipping Stream Chat connection');
              if (isStreamConnected) {
                await disconnectUser();
                setIsStreamConnected(false);
                previousUserId.current = null;
              }
              return;
            }
          } else {
            console.log('⏳ [GlobalProvider] No user document found, skipping Stream Chat connection');
            if (isStreamConnected) {
              await disconnectUser();
              setIsStreamConnected(false);
              previousUserId.current = null;
            }
            return;
          }
          
          // Conditions are met, proceed with Stream Chat connection
          console.log('✅ [GlobalProvider] All conditions met, proceeding with Stream Chat connection');
          
          if (previousUserId.current && previousUserId.current !== user.$id) {
            try {
              await disconnectUser();
              setIsStreamConnected(false);
            } catch (error) {
              console.log('Error disconnecting previous user:', error);
            }
          }
          if (!isStreamConnected || previousUserId.current !== user.$id) {
            const connected = await connectUser(user.$id);
            if (connected) {
              setIsStreamConnected(true);
              previousUserId.current = user.$id;
            } else {
              setIsStreamConnected(false);
            }
          }
        } catch (error) {
          console.error('❌ [GlobalProvider] Error in Stream Chat connection:', error);
          setIsStreamConnected(false);
        }
      } else {
        if (isStreamConnected) {
          try {
            await disconnectUser();
            setIsStreamConnected(false);
            previousUserId.current = null;
          } catch (error) {
            // ignore
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
        refetch: () => refetch({}),
        isStreamConnected,
        missingChannelConditions,
        setMissingChannelConditions,
        refreshChannelConditions,
        showInlineVerification,
        setShowInlineVerification,
        socialMediaPlatform,
        setSocialMediaPlatform,
        socialMediaUsername,
        setSocialMediaUsername,
        userCurrency,
        setUserCurrency,
        profileCache,
        preloadProfileData,
        getCachedProfile,
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

// Export function to clear profile cache (used during logout)
let globalProfileCacheSetter: React.Dispatch<React.SetStateAction<ProfileCache | null>> | null = null;

// Function to register the cache setter (called from within the provider)
export const registerProfileCacheSetter = (setter: React.Dispatch<React.SetStateAction<ProfileCache | null>>) => {
  globalProfileCacheSetter = setter;
};

// Function to clear profile cache (used during logout)
export const clearProfileCache = () => {
  if (globalProfileCacheSetter) {
    globalProfileCacheSetter(null);
    console.log('✅ [Profile Cache] Cleared in-memory cache');
  } else {
    console.warn('⚠️ [Profile Cache] Cache setter not registered, cannot clear');
  }
};

export default GlobalProvider;