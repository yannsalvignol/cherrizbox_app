import * as ImageManipulator from 'expo-image-manipulator';
import { openAuthSessionAsync } from "expo-web-browser";
import {
    Account,
    Avatars,
    Client,
    Databases,
    ExecutionMethod,
    Functions,
    ID,
    OAuthProvider,
    Query,
    Storage
} from "react-native-appwrite";
  
export const config = {
    platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!,
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
    creatorCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CREATOR_COLLECTION_ID!,
    userCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
    profileCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROFILE_COLLECTION_ID!,
    photoCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PHOTO_COLLECTION_ID!,
    photosAvailableToUsersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PHOTOS_AVAILABLE_TO_USERS || '',
    storageId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID!,
    storageStreamChatId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_STREAM_CHAT_ID!,
    activeSubscriptionsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ACTIVE_SUBSCRIPTIONS_COLLECTION_ID!,
    cancelledSubscriptionsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CANCELLED_SUBSCRIPTIONS_COLLECTION_ID!,
    paidContentPurchasesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PAID_CONTENT_PURCHASES_COLLECTION_ID!
};

// Debug logging for the new collection ID
console.log('🔍 [Config] EXPO_PUBLIC_APPWRITE_PHOTOS_AVAILABLE_TO_USERS:', process.env.EXPO_PUBLIC_APPWRITE_PHOTOS_AVAILABLE_TO_USERS);
console.log('🔍 [Config] photosAvailableToUsersCollectionId:', config.photosAvailableToUsersCollectionId);

export const client = new Client();
client
    .setEndpoint(config.endpoint!)
    .setProject(config.projectId!)
    .setPlatform(config.platform!);

export const avatars = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export const createUser = async (email: string, password: string, username: string, socialMedia?: string, socialMediaUsername?: string, socialMediaNumber?: string) => {
    try {
        const newAccount = await account.create(ID.unique(), email, password, username);

        if(!newAccount) throw new Error("Failed to create account");
        const avatarUrl = avatars.getInitials(username);
        await SignIn(email, password);

        const userData: any = {
            creatorId: newAccount.$id,
            creatorEmail: email,
            creatorUsername: username,
            creatorAvatar: avatarUrl
        };

        // Add social media data if provided
        if (socialMedia && socialMediaUsername) {
            userData.social_media = socialMedia;
            userData.social_media_username = socialMediaUsername;
        }
        
        // Add social media number if provided
        if (socialMediaNumber) {
            userData.social_media_number = socialMediaNumber;
        }

        const newUser = await databases.createDocument(
            config.databaseId,
            config.creatorCollectionId,
            ID.unique(),
            userData
        );
        
        return newUser;
    } catch (error: unknown) {
        console.error("Error creating user:", error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("Failed to create user");
    }
}




// Helper to build redirect URI that follows Appwrite mobile guideline
const getAppwriteRedirectUri = () => {
    const scheme = `appwrite-callback-${config.projectId}`;
    return `${scheme}://`;
};

export async function login(socialMedia?: string, socialMediaUsername?: string, socialMediaNumber?: string) {
    try {
        const redirectUri = getAppwriteRedirectUri();
        const scheme = `appwrite-callback-${config.projectId}://`;
        console.log("[Google OAuth] redirectUri:", redirectUri);

        const loginUrl = await account.createOAuth2Token(
            OAuthProvider.Google,
            redirectUri,
            redirectUri
        );
        const loginUrlObj = loginUrl as URL;
        console.log("[Google OAuth] loginUrl:", loginUrlObj.toString());
        if (!loginUrl) throw new Error("Failed to create Google OAuth2 token");

        const browserResult = await openAuthSessionAsync(loginUrlObj.toString(), scheme);
        console.log("[Google OAuth] browserResult:", browserResult);
        if (browserResult.type !== "success") throw new Error("Google OAuth flow was cancelled or failed");

        const url = new URL(browserResult.url);
        const secret = url.searchParams.get("secret")?.toString();
        const userId = url.searchParams.get("userId")?.toString();
        console.log("[Google OAuth] Parsed secret present:", !!secret, "userId present:", !!userId);
        if (!secret || !userId) throw new Error("Missing OAuth credentials in redirect URL");

        await account.createSession(userId, secret);
        console.log("[Google OAuth] Session created successfully for user", userId);

        // Check if user email exists in user collection before proceeding
        const user = await account.get();
        const emailExistsInUserCollection = await checkEmailExistsInUserCollection(user.email);
        if (emailExistsInUserCollection) {
            // Delete the session we just created
            await account.deleteSession("current");
            console.log("[Google OAuth] Email exists in user collection, blocking login");
            return { success: false, error: 'EMAIL_EXISTS_IN_USER_COLLECTION' };
        }

        // Ensure a corresponding user document exists in Appwrite collection
        try {
            const existingUser = await databases.listDocuments(
                config.databaseId,
                config.creatorCollectionId,
                [Query.equal('creatorId', user.$id)]
            );

            if (existingUser.documents.length === 0) {
                const avatarUrl = avatars.getInitials(user.name);
                await databases.createDocument(
                    config.databaseId,
                    config.creatorCollectionId,
                    ID.unique(),
                    {
                        creatorId: user.$id,
                        creatorEmail: user.email,
                        creatorUsername: user.name,
                        creatorAvatar: avatarUrl,
                        // Use social media info passed from landing page, or fallback to Google
                        social_media: socialMedia || 'Google',
                        social_media_username: socialMediaUsername || user.email,
                        social_media_number: socialMediaNumber || Math.floor(100000 + Math.random() * 900000).toString(),
                        $permissions: [
                            `read(\"user:${user.$id}\")`,
                            `write(\"user:${user.$id}\")`
                        ]
                    }
                );
                console.log('[Google OAuth] Created new user document for', user.$id);
            }
        } catch (userDocErr) {
            console.error('[Google OAuth] Error ensuring user doc exists:', userDocErr);
        }
        return true;
    } catch (error) {
        console.error("Google OAuth error:", error);
        return false;
    }
}

export async function loginWithApple(authorizationCode: string, firstName?: string, lastName?: string) {
    try {
        console.log("[Apple OAuth] Starting Dart function authentication...");
        console.log("[Apple OAuth] Authorization code present:", !!authorizationCode);
        console.log("[Apple OAuth] Authorization code length:", authorizationCode?.length);
        
        if (!authorizationCode) {
            throw new Error("Authorization code is required for Apple Sign In");
        }
        
        const APPLE_FUNCTION_ID = process.env.EXPO_PUBLIC_APPLE_SIGNIN_FUNCTION_ID;
        if (!APPLE_FUNCTION_ID) {
            throw new Error('Apple Sign-In function ID not configured. Please set EXPO_PUBLIC_APPLE_SIGNIN_FUNCTION_ID in your environment variables.');
        }

        console.log("[Apple OAuth] Calling Dart function with authorization code");
        
        // Call the Dart function with the authorization code
        const execution = await functions.createExecution(
            APPLE_FUNCTION_ID,
            JSON.stringify({
                code: authorizationCode,
                firstName: firstName || '',
                lastName: lastName || ''
            }),
            false,
            '/',
            ExecutionMethod.POST,
            { 'Content-Type': 'application/json' }
        );

        console.log("[Apple OAuth] Function execution status:", execution.status);
        console.log("[Apple OAuth] Function response:", execution.responseBody);

        if (execution.status === 'failed') {
            const errorResponse = JSON.parse(execution.responseBody);
            throw new Error(errorResponse.message || 'Apple Sign-In function failed');
        }

        const response = JSON.parse(execution.responseBody);
        const { secret, userId, expire } = response;

        if (!secret || !userId) {
            throw new Error('Invalid response from Apple Sign-In function');
        }

        console.log("[Apple OAuth] Creating session with userId:", userId);
        
        // Create session using the token from Dart function
        await account.createSession(userId, secret);
        console.log("[Apple OAuth] Session created successfully");
        
        // Get user info to check email
        const user = await account.get();
        if (user.email) {
            console.log("[Apple OAuth] Checking if email exists in user collection:", user.email);
            const emailExistsInUserCollection = await checkEmailExistsInUserCollection(user.email);
            if (emailExistsInUserCollection) {
                console.log("[Apple OAuth] Email exists in user collection - blocking login");
                // Delete the session we just created
                await account.deleteSession('current');
                return { success: false, error: 'EMAIL_EXISTS_IN_USER_COLLECTION' };
            }
        }
        
        // Ensure a corresponding user document exists in Appwrite collection
        try {
            const existingUser = await databases.listDocuments(
                config.databaseId,
                config.creatorCollectionId,
                [Query.equal('creatorId', user.$id)]
            );

            if (existingUser.documents.length === 0) {
                const avatarUrl = avatars.getInitials(user.name);
                await databases.createDocument(
                    config.databaseId,
                    config.creatorCollectionId,
                    ID.unique(),
                    {
                        creatorId: user.$id,
                        creatorEmail: user.email,
                        creatorUsername: user.name,
                        creatorAvatar: avatarUrl,
                        social_media: 'Apple',
                        social_media_username: user.email,
                        social_media_number: Math.floor(100000 + Math.random() * 900000).toString(),
                        $permissions: [
                            `read(\"user:${user.$id}\")`,
                            `write(\"user:${user.$id}\")`
                        ]
                    }
                );
                console.log('[Apple OAuth] Created new user document for', user.$id);
            }
        } catch (userDocErr) {
            console.error('[Apple OAuth] Error ensuring user doc exists:', userDocErr);
        }
        
        return true;
    } catch (error) {
        console.error("Apple OAuth error:", error);
        if (error instanceof Error && error.message === "EMAIL_EXISTS_IN_USER_COLLECTION") {
            throw error; // Re-throw this specific error to be handled by the UI
        }
        return false;
    }
}

export async function logout() {
    try {
        // First, delete the Appwrite session to prevent any new API calls
        console.log('   Deleting Appwrite session...');
        const result = await account.deleteSession("current");
        console.log(' Appwrite session deleted');
        
        // Give a small delay to let React components detect the session change and unmount
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Clear in-memory profile cache from global provider
        try {
            console.log('   Clearing in-memory profile cache...');
            const { clearProfileCache } = await import('./global-provider');
            clearProfileCache();
            console.log(' In-memory profile cache cleared');
        } catch (profileCacheError) {
            console.error('Error clearing profile cache:', profileCacheError);
        }
        
        // Clear Stream Chat connection and caches
        try {
            console.log('   Clearing Stream Chat connection and caches...');
            const { disconnectUser, clearTokenCache } = await import('./stream-chat');
            
            // Disconnect from Stream Chat
            await disconnectUser();
            
            // Clear all caches (memory, AsyncStorage, but not backend since user might login again)
            await clearTokenCache(false, true);
            
            console.log(' Stream Chat cleared successfully');
        } catch (streamError) {
            console.error('Error clearing Stream Chat:', streamError);
            // Continue with logout even if Stream clearing fails
        }
        
        // Clear any other app caches from AsyncStorage
        try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            
            // Clear any additional app-specific keys
            const keysToRemove = [
                'user_currency',
                'user_profile_cache',
                // Add any other app-specific keys here
            ];
            
            await AsyncStorage.multiRemove(keysToRemove);
            console.log(' App caches cleared from AsyncStorage');
        } catch (cacheError) {
            console.error('Error clearing app caches:', cacheError);
        }
        
        return result;
    } catch (error) {
        console.error('Logout error:', error);
        return false;
    }
}
// Check if email exists in user collection
export const checkEmailExistsInUserCollection = async (email: string): Promise<boolean> => {
    try {
        const existingUsers = await databases.listDocuments(
            config.databaseId,
            config.userCollectionId,
            [Query.equal('email', email)]
        );
        
        return existingUsers.documents.length > 0;
    } catch (error) {
        console.error('Error checking email in user collection:', error);
        return false;
    }
};

export async function SignIn(email: string, password: string) {
    try {
        // Check if email exists in the user collection
        const emailExistsInUserCollection = await checkEmailExistsInUserCollection(email);
        if (emailExistsInUserCollection) {
            throw new Error('EMAIL_EXISTS_IN_USER_COLLECTION');
        }

        // First, clear any existing Stream Chat connection and caches
        try {
            const { disconnectUser, clearTokenCache } = await import('./stream-chat');
            await disconnectUser();
            await clearTokenCache(false, true); // Clear AsyncStorage but not backend
        } catch (streamError) {
            // Ignore if Stream Chat is not connected
        }
        
        // Try to delete any existing Appwrite session
        try {
            await account.deleteSession('current');
        } catch (error) {
            // Ignore errors if no session exists
        }
        
        // Create new session
        const session = await account.createEmailPasswordSession(email, password);
        return session;
    } catch (error) {
        throw error;
    }
}

export async function getCurrentUser() {
    try {
        const result = await account.get();
        if (result.$id) {
            const userAvatar = avatars.getInitials(result.name);
  
            return {
                ...result,
                avatar: userAvatar.toString(),
            };
        }
  
        return null;
    } catch (error) {
        console.log(error);
        return null;
    }
}
  
export const getUserProfile = async (userId: string) => {
    try {
        const profile = await databases.listDocuments(
            config.databaseId,
            config.profileCollectionId,
            [Query.equal('userId', userId)]
        );
        
        if (profile.documents.length > 0) {
            return profile.documents[0];
        }
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
};

interface ProfileData {
    userId: string;
    [key: string]: any;
}

interface FileData {
    uri: string;
    type?: string;
    name?: string;
}

// Update user profile
export const updateUserProfile = async (userId: string, data: any): Promise<any> => {
    try {
        console.log("Updating profile for user:", userId);
        console.log("Update data:", data);

        // First verify the current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error("User not authenticated");
        }

        // Check if profile exists
        const existingProfile = await databases.listDocuments(
            config.databaseId,
            config.profileCollectionId,
            [Query.equal('userId', userId)]
        );

        console.log("Existing profile:", existingProfile);

        if (existingProfile.documents.length > 0) {
            // Update existing profile
            const updatedProfile = await databases.updateDocument(
                config.databaseId,
                config.profileCollectionId,
                existingProfile.documents[0].$id,
                {
                    ...data,
                    Location: data.Location,
                    creatorsname: data.creatorsname,
                    topics: data.topics,
                    ProfilesBio: data.ProfilesBio,
                    $permissions: [
                        `read("user:${userId}")`,
                        `write("user:${userId}")`
                    ]
                }
            );

            // NEW: Sync public creator name to users collection
            if (data.creatorsname) {
                try {
                    const userDocs = await databases.listDocuments(
                        config.databaseId,
                        config.creatorCollectionId,
                        [Query.equal('creatorId', userId)]
                    );
                    if (userDocs.documents.length > 0) {
                        const userDocId = userDocs.documents[0].$id;
                        await databases.updateDocument(
                            config.databaseId,
                            config.creatorCollectionId,
                            userDocId,
                            { creators_public_name: data.creatorsname }
                        );
                    }
                } catch (syncErr) {
                    console.error('Error syncing creators_public_name to user collection:', syncErr);
                }
            }

            console.log("Profile updated successfully:", updatedProfile);
            return updatedProfile;
        } else {
            // Create new profile
            const newProfile = await databases.createDocument(
                config.databaseId,
                config.profileCollectionId,
                ID.unique(),
                {
                    ...data,
                    Location: data.Location,
                    creatorsname: data.creatorsname,
                    topics: data.topics,
                    ProfilesBio: data.ProfilesBio,
                    $permissions: [
                        `read("user:${userId}")`,
                        `write("user:${userId}")`
                    ]
                }
            );

            // NEW: Sync public creator name to users collection when creating profile
            if (data.creatorsname) {
                try {
                    const userDocs = await databases.listDocuments(
                        config.databaseId,
                        config.creatorCollectionId,
                        [Query.equal('creatorId', userId)]
                    );
                    if (userDocs.documents.length > 0) {
                        const userDocId = userDocs.documents[0].$id;
                        await databases.updateDocument(
                            config.databaseId,
                            config.creatorCollectionId,
                            userDocId,
                            { creators_public_name: data.creatorsname }
                        );
                    }
                } catch (syncErr) {
                    console.error('Error syncing creators_public_name to user collection:', syncErr);
                }
            }

            console.log("New profile created:", newProfile);
            return newProfile;
        }
    } catch (error) {
        console.error("Error updating user profile:", error);
        if (error instanceof Error) {
            throw new Error(error.message || "Failed to update profile");
        }
        throw new Error("Failed to update profile");
    }
};

export const deleteFileFromBucket = async (fileUrl: string): Promise<void> => {
    try {
        // Extract file ID from the URL
        const fileId = fileUrl.split('/files/')[1]?.split('/')[0];
        if (fileId) {
            await storage.deleteFile(config.storageId, fileId);
        }
    } catch (error) {
        console.error("Error deleting file:", error);
        // Don't throw error, just log it
    }
};

export const uploadProfilePicture = async (file: FileData, previousImageUrl?: string): Promise<{ $id: string; imageUrl: string; compressedImageUrl: string }> => {
    try {
        // Delete previous image if it exists
        if (previousImageUrl) {
            await deleteFileFromBucket(previousImageUrl);
        }

        // --- Compress the "regular" image (lightly compressed) ---
        const regularCompressed = await ImageManipulator.manipulateAsync(
            file.uri,
            [{ resize: { width: 800, height: 800 } }], // Larger size for regular version
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // Light compression
        );
        
        const regularFileToUpload = {
            uri: regularCompressed.uri,
            name: file.name || 'profile.jpg',
            type: 'image/jpeg',
            size: 0 // Appwrite will calculate the actual size
        };

        // Upload regular compressed file to Appwrite Storage
        const response = await storage.createFile(
            config.storageId,
            ID.unique(),
            regularFileToUpload
        );
        const imageUrl = storage.getFileView(config.storageId, response.$id).href;
        
        // --- Compress the image heavily for thumbnail ---
        const heavyCompressed = await ImageManipulator.manipulateAsync(
            file.uri,
            [{ resize: { width: 200, height: 200 } }], // Small size for thumbnail
            { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG } // Heavy compression
        );
        
        const compressedFileToUpload = {
            uri: heavyCompressed.uri,
            name: 'compressed_' + (file.name || 'profile.jpg'),
            type: 'image/jpeg',
            size: 0
        };
        const compressedResponse = await storage.createFile(
            config.storageId,
            ID.unique(),
            compressedFileToUpload
        );
        const compressedImageUrl = storage.getFileView(config.storageId, compressedResponse.$id).href;

        return { $id: response.$id, imageUrl, compressedImageUrl };
    } catch (error: unknown) {
        console.error("Error uploading profile picture:", error);
        if (error instanceof Error) {
            throw new Error(error.message || "Failed to upload profile picture");
        }
        throw new Error("Failed to upload profile picture");
    }
};

export const getProfilePictureUrl = (photoIdOrUri: string | null): string | null => {
    try {
        // If it's a URI, return it directly
        if (photoIdOrUri && (photoIdOrUri.startsWith('file://') || photoIdOrUri.startsWith('http'))) {
            return photoIdOrUri;
        }
        return null;
    } catch (error) {
        console.error("Error getting profile picture URL:", error);
        return null;
    }
};

interface CreatorPayment {
    monthlyPrice: number;
    yearlyPrice: number;
    currency?: string;
}

export const updateCreatorPayment = async (userId: string, payment: CreatorPayment): Promise<any> => {
    try {
        // First verify the current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error("User not authenticated");
        }

        // Find the profile document
        const existingProfile = await databases.listDocuments(
            config.databaseId,
            config.profileCollectionId,
            [Query.equal('userId', userId)]
        );

                // Convert payment object to JSON string
        const paymentString = JSON.stringify(payment);

        if (existingProfile.documents.length > 0) {
          // Update existing profile
          const updatedProfile = await databases.updateDocument(
            config.databaseId,
            config.profileCollectionId,
            existingProfile.documents[0].$id,
            {
              creatorpayment: paymentString,
              currency: payment.currency || 'USD', // Save currency separately for easy access
              $permissions: [
                `read("user:${userId}")`,
                `write("user:${userId}")`
              ]
            }
          );
          return updatedProfile;
        } else {
          // Create new profile with payment info
          const newProfile = await databases.createDocument(
            config.databaseId,
            config.profileCollectionId,
            ID.unique(),
            {
              userId: userId,
              creatorpayment: paymentString,
              currency: payment.currency || 'USD', // Save currency separately for easy access
              $permissions: [
                `read("user:${userId}")`,
                `write("user:${userId}")`
              ]
            }
          );
          return newProfile;
        }
    } catch (error) {
        console.error("Error updating user profile:", error);
        if (error instanceof Error) {
            throw new Error(error.message || "Failed to update profile");
        }
        throw new Error("Failed to update profile");
    }
};

// Utility to check if a profile is complete
export function isProfileComplete(profile: any): boolean {
    if (!profile) return false;
    // Define required fields for a complete profile
    const requiredFields = [
        'creatorsname',
        'ProfilesBio',
        'Location',
        'topics',
        'profileImageUri',
        'gender',
        'creatorpayment',
    ];
    for (const field of requiredFields) {
        if (!profile[field] || (typeof profile[field] === 'string' && profile[field].trim() === '')) {
            return false;
        }
        // For topics, check if it's a non-empty array or string
        if (field === 'topics') {
            if (Array.isArray(profile.topics) && profile.topics.length === 0) return false;
            if (typeof profile.topics === 'string' && profile.topics.trim() === '') return false;
        }
    }
    return true;
};


export const getSubscriptionCount = async (creatorName: string): Promise<number> => {
    try {
        const subscriptions = await databases.listDocuments(
            config.databaseId,
            config.activeSubscriptionsCollectionId,
            [Query.equal('creatorName', creatorName)]
        );
        
        // Count unique userIds
        const uniqueSubscribers = new Set(subscriptions.documents.map(sub => sub.userId));
        return uniqueSubscribers.size;
    } catch (error) {
        console.error("Error getting subscription count:", error);
        return 0;
    }
};

export const isUserSubscribed = async (userId: string, creatorName: string): Promise<boolean> => {
    try {
        const subscriptions = await databases.listDocuments(
            config.databaseId,
            config.activeSubscriptionsCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('creatorName', creatorName),
                Query.equal('status', 'active')
            ]
        );
        
        return subscriptions.documents.length > 0;
    } catch (error) {
        console.error("Error checking subscription status:", error);
        return false;
    }
};

export const createSubscription = async (userId: string, creatorName: string, subscriptionId: string, interval: 'month' | 'year'): Promise<any> => {
    try {
        const subscription = await databases.createDocument(
            config.databaseId,
            config.activeSubscriptionsCollectionId,
            ID.unique(),
            {
                userId,
                creatorName,
                stripeSubscriptionId: subscriptionId,
                interval,
                status: 'active',
                startDate: new Date().toISOString(),
                $permissions: [
                    `read("user:${userId}")`,
                    `write("user:${userId}")`
                ]
            }
        );
        
        return subscription;
    } catch (error) {
        console.error("Error creating subscription:", error);
        throw error;
    }
};

export const updateSubscriptionStatus = async (subscriptionId: string, status: 'active' | 'cancelled' | 'expired'): Promise<any> => {
    try {
        const subscription = await databases.listDocuments(
            config.databaseId,
            config.activeSubscriptionsCollectionId,
            [Query.equal('stripeSubscriptionId', subscriptionId)]
        );

        if (subscription.documents.length === 0) {
            throw new Error('Subscription not found');
        }

        const updatedSubscription = await databases.updateDocument(
            config.databaseId,
            config.activeSubscriptionsCollectionId,
            subscription.documents[0].$id,
            {
                status,
                ...(status === 'cancelled' && { endDate: new Date().toISOString() })
            }
        );

        return updatedSubscription;
    } catch (error) {
        console.error("Error updating subscription status:", error);
        throw error;
    }
};

export const getUserSubscriptions = async (userId: string) => {
    try {
        const subscriptions = await databases.listDocuments(
            config.databaseId,
            config.activeSubscriptionsCollectionId,
            [Query.equal('userId', userId)]
        );
        
        return subscriptions.documents;
    } catch (error) {
        console.error("Error getting user subscriptions:", error);
        return [];
    }
};

export const deleteExpiredSubscriptions = async (creatorId: string) => {
    try {
        // Get all active subscriptions for this creator
        const activeSubscriptions = await databases.listDocuments(
            config.databaseId,
            config.activeSubscriptionsCollectionId,
            [
                Query.equal('creatorId', creatorId)
            ]
        );

        const currentDate = new Date();
        const expiredSubscriptions = activeSubscriptions.documents.filter(sub => {
            const endDate = new Date(sub.endDate);
            return endDate < currentDate;
        });

        // Process each expired subscription
        for (const sub of expiredSubscriptions) {
            // Create a copy in cancelled subscriptions
            await databases.createDocument(
                config.databaseId,
                config.cancelledSubscriptionsCollectionId,
                ID.unique(),
                {
                    ...sub,
                    cancellationDate: new Date().toISOString(),
                    reason: 'expired'
                }
            );

            // Delete from active subscriptions
            await databases.deleteDocument(
                config.databaseId,
                config.activeSubscriptionsCollectionId,
                sub.$id
            );
        }

        return expiredSubscriptions.length;
    } catch (error) {
        console.error('Error deleting expired subscriptions:', error);
        throw error;
    }
};

export const getSubscriptionStatus = async (userId: string, creatorName: string): Promise<{ isSubscribed: boolean; isCancelled: boolean }> => {
    try {
        const subscriptions = await databases.listDocuments(
            config.databaseId,
            config.activeSubscriptionsCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('creatorName', creatorName)
            ]
        );
        
        // Check for active subscription
        const activeSubscription = subscriptions.documents.find(sub => 
            sub.status === 'active' && 
            (!sub.endsAt || new Date(sub.endsAt) > new Date())
        );
        
        // Check for cancelled subscription
        const cancelledSubscription = subscriptions.documents.find(sub => 
            sub.status === 'cancelled' && 
            sub.endsAt && 
            new Date(sub.endsAt) > new Date()
        );
        
        return {
            isSubscribed: !!activeSubscription,
            isCancelled: !!cancelledSubscription
        };
    } catch (error) {
        console.error("Error getting subscription status:", error);
        return { isSubscribed: false, isCancelled: false };
    }
};

export const getCreatorSubscriptions = async (creatorId: string) => {
  try {
    // Get active subscriptions with active status
    const activeSubscriptions = await databases.listDocuments(
      config.databaseId,
      config.activeSubscriptionsCollectionId,
      [
        Query.equal('creatorId', creatorId),
        Query.equal('status', 'active')
      ]
    );

    // Get cancelled subscriptions from active_subscriptions collection
    const cancelledFromActive = await databases.listDocuments(
      config.databaseId,
      config.activeSubscriptionsCollectionId,
      [
        Query.equal('creatorId', creatorId),
        Query.equal('status', 'cancelled')
      ]
    );

    // Get cancelled subscriptions from cancelled_subscriptions collection
    const cancelledFromCancelled = await databases.listDocuments(
      config.databaseId,
      config.cancelledSubscriptionsCollectionId,
      [
        Query.equal('creatorId', creatorId),
        Query.equal('status', 'cancelled')
      ]
    );

    // Calculate total cancelled by combining both collections
    const totalCancelled = cancelledFromActive.documents.length + cancelledFromCancelled.documents.length;

    // Calculate net active by subtracting cancelled from active_subscriptions
    const netActive = activeSubscriptions.documents.length - cancelledFromActive.documents.length;

    return {
      active: activeSubscriptions.documents,
      cancelled: [...cancelledFromActive.documents, ...cancelledFromCancelled.documents],
      netActive: netActive // Add this new field to return the net active count
    };
  } catch (error) {
    console.error('Error fetching creator subscriptions:', error);
    throw error;
  }
};

export const getCreatorEarnings = async (creatorId: string) => {
  try {
    // Get active subscriptions
    const activeSubscriptions = await databases.listDocuments(
      config.databaseId,
      config.activeSubscriptionsCollectionId,
      [
        Query.equal('creatorId', creatorId)
      ]
    );

    // Get cancelled subscriptions
    const cancelledSubscriptions = await databases.listDocuments(
      config.databaseId,
      config.cancelledSubscriptionsCollectionId,
      [
        Query.equal('creatorId', creatorId)
      ]
    );

    return {
      active: activeSubscriptions.documents,
      cancelled: cancelledSubscriptions.documents
    };
  } catch (error) {
    console.error('Error fetching creator earnings:', error);
    throw error;
    }
};

// Get user's photo from photos collection
export const getUserPhoto = async (creatorId: string) => {
    try {
        const response = await databases.listDocuments(
            config.databaseId,
            config.photoCollectionId,
            [Query.equal('creatorId', creatorId)]
        );
        
        if (response.documents.length > 0) {
            return response.documents[0];
        }
        return null;
    } catch (error) {
        console.error('Error getting user photo:', error);
        return null;
    }
};

// Get user information by account ID
export const getUserByAccountId = async (accountId: string) => {
    try {
        const users = await databases.listDocuments(
            config.databaseId,
            config.creatorCollectionId,
            [Query.equal('creatorId', accountId)]
        );
        
        if (users.documents.length > 0) {
            return users.documents[0];
        }
        
        return null;
    } catch (error) {
        console.error("Error getting user by account ID:", error);
        return null;
    }
};

// Create payment intent for paid content
export const createPaidContentPaymentIntent = async (
    amount: number,
    currency: string = 'usd',
    metadata: {
        userId: string;
        creatorId: string;
        creatorName: string;
        contentId: string;
        contentType: string;
        imageUrl?: string;
    }
) => {
    try {
        console.log('  Starting createPaidContentPaymentIntent...');
        
        // Use the same function endpoint logic as your existing setup
        const FUNCTION_ID = process.env.EXPO_PUBLIC_STRIPE_FUNCTION_ID;
        const backendUrl = `${config.endpoint}/functions/${FUNCTION_ID}/executions`;
        
        console.log('📋 Environment check:', {
            functionId: FUNCTION_ID,
            endpoint: config.endpoint,
            backendUrl,
            amount,
            currency,
            metadata
        });

        if (!FUNCTION_ID) {
            console.error('   Missing EXPO_PUBLIC_STRIPE_FUNCTION_ID');
            throw new Error('EXPO_PUBLIC_STRIPE_FUNCTION_ID is not configured. Please set your function ID in environment variables.');
        }

        if (!config.endpoint) {
            console.error('   Missing config.endpoint');
            throw new Error('Appwrite endpoint is not configured.');
        }
        
        const requestBody = {
            path: '/create-paid-content-payment-intent',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                metadata,
            }),
        };

        console.log('📤 Sending request to backend:', {
            url: backendUrl,
            requestBody
        });
        
        console.log('  Making fetch request...');
        
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': config.projectId,
            },
            body: JSON.stringify(requestBody),
        });

        console.log('📥 Received response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            console.error('   Response not OK, reading error text...');
            const errorText = await response.text();
            console.error('   Backend error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        console.log(' Response OK, parsing JSON...');
        const data = await response.json();
        console.log('  Backend response data:', data);
        
        // Parse the actual response from Appwrite Function's responseBody
        let actualResponse;
        if (data.responseBody) {
            try {
                actualResponse = JSON.parse(data.responseBody);
                console.log('📋 Parsed responseBody:', actualResponse);
            } catch (parseError) {
                console.error('   Failed to parse responseBody:', parseError);
                throw new Error('Invalid response format from backend');
            }
        } else {
            actualResponse = data;
        }
        
        if (!actualResponse.success) {
            console.error('   Backend returned success: false');
            throw new Error(actualResponse.error || 'Failed to create payment intent');
        }

        console.log('🎉 Payment intent created successfully!');
        return {
            clientSecret: actualResponse.clientSecret,
            paymentIntentId: actualResponse.paymentIntentId,
        };
    } catch (error) {
        console.error('💥 Error in createPaidContentPaymentIntent:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : 'Unknown'
        });
        throw error;
    }
};

// Record successful paid content purchase
export const recordPaidContentPurchase = async (
    userId: string,
    creatorId: string,
    contentId: string,
    paymentIntentId: string,
    amount: number
) => {
    try {
        if (!config.paidContentPurchasesCollectionId) {
            console.error('Missing paidContentPurchasesCollectionId in config');
            throw new Error('Missing collection ID configuration');
        }

        // Create a purchase record in the database
        const purchaseRecord = await databases.createDocument(
            config.databaseId,
            config.paidContentPurchasesCollectionId,
            ID.unique(),
            {
                userId,
                creatorId,
                contentId,
                paymentIntentId,
                amount,
                purchaseDate: new Date().toISOString(),
                status: 'completed'
            }
        );

        return purchaseRecord;
    } catch (error) {
        console.error('Error recording paid content purchase:', error);
        throw error;
    }
};

// Check if user has purchased specific content
export const checkPaidContentPurchase = async (userId: string, contentId: string): Promise<boolean> => {
    try {
        if (!config.paidContentPurchasesCollectionId) {
            console.error('Missing paidContentPurchasesCollectionId in config');
            return false;
        }

        const purchases = await databases.listDocuments(
            config.databaseId,
            config.paidContentPurchasesCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('contentId', contentId),
                Query.equal('status', 'completed')
            ]
        );

        return purchases.documents.length > 0;
    } catch (error) {
        console.error('Error checking paid content purchase:', error);
        return false;
    }
};

// Password Reset Functions
export const codeBasedPasswordReset = async (email: string) => {
    const FUNCTION_ID = process.env.EXPO_PUBLIC_CREATOR_REQUEST_PASSWORD_RESET_FUNCTION_ID;
    if (!FUNCTION_ID) throw new Error('Request password reset function ID not set');

    const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({ email }),
        false, 
        '/',
        ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
    );
    
    if (execution.status === 'failed') {
        throw new Error(JSON.parse(execution.responseBody).message || 'Failed to request password reset.');
    }
    
    return JSON.parse(execution.responseBody);
};

export const verifyCodeAndResetPassword = async (email: string, code: string, password?: string) => {
    const FUNCTION_ID = process.env.EXPO_PUBLIC_CREATOR_VERIFY_PASSWORD_RESET_FUNCTION_ID;
    if (!FUNCTION_ID) throw new Error('Verify password reset function ID not set');
    
    const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({ email, code, password }),
        false,
        '/',
        ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
    );
    
    const responseBody = JSON.parse(execution.responseBody);

    if (execution.status === 'failed' || !responseBody.ok) {
        throw new Error(responseBody.message || 'Failed to reset password.');
    }
    
    return responseBody;
};

// --- EMAIL VERIFICATION FUNCTION ---
import { Alert } from 'react-native';

export const sendVerificationEmailViaFunction = async (email: string, code: string) => {
    console.log(`📧 [sendVerificationEmailViaFunction] Starting email verification process`);
    console.log(`📧 [sendVerificationEmailViaFunction] Email: ${email}, Code: ${code}`);
    
    const FUNCTION_ID = process.env.EXPO_PUBLIC_SEND_SIGNUP_EMAIL_FUNCTION_ID;
    if (!FUNCTION_ID) {
        console.log(`   [sendVerificationEmailViaFunction] Function ID not configured`);
        throw new Error('Send signup email function ID not set');
    }
    
    console.log(` [sendVerificationEmailViaFunction] Function ID found: ${FUNCTION_ID}`);
    
    const requestBody = JSON.stringify({ email, code });
    console.log(`📤 [sendVerificationEmailViaFunction] Request body: ${requestBody}`);
    
    try {
        console.log(`  [sendVerificationEmailViaFunction] Executing Appwrite function...`);
        const execution = await functions.createExecution(
            FUNCTION_ID,
            requestBody,
            false,
            '/send-verification-email',
            ExecutionMethod.POST,
            { 'Content-Type': 'application/json' }
        );
        
        console.log(`📥 [sendVerificationEmailViaFunction] Function execution completed`);
        console.log(`  [sendVerificationEmailViaFunction] Execution status: ${execution.status}`);
        console.log(`  [sendVerificationEmailViaFunction] Response body: ${execution.responseBody}`);
        
        if (execution.status === 'failed') {
            console.log(`   [sendVerificationEmailViaFunction] Function execution failed`);
            let errorResponse;
            try {
                errorResponse = JSON.parse(execution.responseBody);
                console.log(`📋 [sendVerificationEmailViaFunction] Parsed error response:`, errorResponse);
            } catch (parseError) {
                const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
                console.log(`   [sendVerificationEmailViaFunction] Failed to parse error response: ${errorMessage}`);
                throw new Error('Failed to send verification email - invalid response format.');
            }
            throw new Error(errorResponse.error || 'Failed to send verification email.');
        }
        
        let responseBody;
        try {
            responseBody = JSON.parse(execution.responseBody);
            console.log(`📋 [sendVerificationEmailViaFunction] Parsed response body:`, responseBody);
        } catch (parseError) {
            const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
            console.log(`   [sendVerificationEmailViaFunction] Failed to parse response body: ${errorMessage}`);
            throw new Error('Failed to send verification email - invalid response format.');
        }
        
        if (!responseBody.success) {
            console.log(`   [sendVerificationEmailViaFunction] Response indicates failure:`, responseBody);
            throw new Error(responseBody.error || 'Failed to send verification email.');
        }
        
        console.log(` [sendVerificationEmailViaFunction] Email verification process completed successfully`);
        return responseBody;
        
    } catch (error) {
        console.log(`💥 [sendVerificationEmailViaFunction] Error during function execution:`, error);
        if (error instanceof Error) {
            throw new Error(`Email verification failed: ${error.message}`);
        }
        throw new Error('Email verification failed with unknown error.');
    }
};

export const sendVerificationEmail = async (email: string, code: string) => {
    try {
        return await sendVerificationEmailViaFunction(email, code);
    } catch (error) {
        console.error('Error sending verification email:', error);
        
        // Fallback for development/testing when function is not configured
        if (error instanceof Error && error.message.includes('function ID not set')) {
            Alert.alert(
                "Email Not Sent (DEMO)",
                `Backend function not configured. For testing, your code is: ${code}`
            );
            return { success: true };
        }
        
        return { success: false, error: error instanceof Error ? error.message : 'Failed to send verification email.' };
    }
};

export const sendCreatorVerificationNotification = async (creatorData: {
    userId: string;
    creatorName?: string;
    location?: string;
    topics?: string;
    bio?: string;
    phoneNumber?: string;
    gender?: string;
    dateOfBirth?: string;
    monthlyPrice?: string;
    yearlyPrice?: string;
    profileImageUri?: string;
    compressedThumbnail?: string;
}) => {
    try {
        const FUNCTION_ID = process.env.EXPO_PUBLIC_CREATOR_VERIFICATION_FUNCTION_ID;
        if (!FUNCTION_ID) {
            console.log(`   [sendCreatorVerificationNotification] Function ID not configured`);
            throw new Error('Creator verification function ID not set');
        }
        
        console.log(` [sendCreatorVerificationNotification] Function ID found: ${FUNCTION_ID}`);
        console.log(`📤 [sendCreatorVerificationNotification] Creator data:`, creatorData);
        
        const result = await functions.createExecution(
            FUNCTION_ID,
            JSON.stringify(creatorData),
            false,
            '/',
            ExecutionMethod.POST,
            { 'Content-Type': 'application/json' }
        );
        
        console.log('Creator verification notification function result:', result);
        
        if (result.status === 'failed') {
            throw new Error('Failed to send creator verification notification');
        }
        
        return result;
    } catch (error) {
        console.error('Error sending creator verification notification:', error);
        throw error;
    }
};