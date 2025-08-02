import React, { createContext, ReactNode, useContext, useEffect, useRef } from "react";

import { getCurrentUser } from "./appwrite";
import { connectUser, disconnectUser } from "./stream-chat";
import { useAppwrite } from "./useAppwrite";

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
  const previousUserId = useRef<string | null>(null);

  const isLogged = !!user;

  const refreshChannelConditions = async () => {
    if (!user?.$id) return;
    
    try {
      // First check if all profile fields are filled (same as handleGoLive validation)
      const { getUserProfile, getUserPhoto } = await import('./appwrite');
      const profile = await getUserProfile(user.$id);
      
      if (!profile) {
        setMissingChannelConditions(['Profile setup incomplete']);
        return;
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
        config.userCollectionId,
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

  useEffect(() => {
    const connectToStream = async () => {
      if (user) {
        try {
          // First check if all profile fields are filled (same as handleGoLive validation)
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
            config.userCollectionId,
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