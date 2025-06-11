import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import {
    Account,
    Avatars,
    Client,
    Databases,
    ID,
    OAuthProvider,
    Query,
    Storage
} from "react-native-appwrite";
  
export const config = {
    platform: "com.jsm.cherrizbox",
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '67e54a0600249c33af4c',
    databaseId: '67e54bcd003da3d16b3b',
    userCollectionId: '682501f5003c342d6b5a',
    profileCollectionId: '681214cd0017348ba59b',
    videoCollectionId: '67e54c4b0012b5d71cbe',
    photoCollectionId: '67e6e13600234c3bff8b',
    storageId: '67e54f5e001b77aae0cd',
    activeSubscriptionsCollectionId: '6845323f00001bda7f89'
};

export const client = new Client();
client
    .setEndpoint(config.endpoint!)
    .setProject(config.projectId!)
    .setPlatform(config.platform!);

export const avatars = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const createUser = async (email: string, password: string, username: string) => {
    try {
        const newAccount = await account.create(ID.unique(), email, password, username);

        if(!newAccount) throw new Error("Failed to create account");
        const avatarUrl = avatars.getInitials(username);
        await SignIn(email, password);

        const newUser = await databases.createDocument(
            config.databaseId,
            config.userCollectionId,
            ID.unique(),
            {
                creatoraccountid: newAccount.$id,
                creatoremail: email,
                creatorusername: username,
                creatoravatar: avatarUrl
            }
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


// Get all posts (combining videos and photos)
export const getAllPosts = async () => {
    try {
        // Fetch videos
        const videosPromise = databases.listDocuments(
            config.databaseId!,
            config.videoCollectionId!
        );
        
        // Fetch photos
        const photosPromise = databases.listDocuments(
            config.databaseId!,
            config.photoCollectionId!
        );
        
        // Wait for both requests to complete
        const [videos, photos] = await Promise.all([videosPromise, photosPromise]);
        
        // Combine and process the results
        const allPosts = [
            ...videos.documents.map(video => ({...video, type: 'video'})),
            ...photos.documents.map(photo => ({...photo, type: 'photo'}))
        ];
        
        // Sort by creation date (newest first)
        allPosts.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
        
        return allPosts;
    } catch (error) {
        console.error("Error getting all posts:", error);
        // Return empty array instead of throwing error
        return [];
    }
};

export async function login() {
    try {
        const redirectUri = Linking.createURL("/");
  
        const response = await account.createOAuth2Token(
            OAuthProvider.Google,
            redirectUri
        );
        if (!response) throw new Error("Create OAuth2 token failed");
  
        const browserResult = await openAuthSessionAsync(
            response.toString(),
            redirectUri
        );
        if (browserResult.type !== "success")
            throw new Error("Create OAuth2 token failed");
  
        const url = new URL(browserResult.url);
        const secret = url.searchParams.get("secret")?.toString();
        const userId = url.searchParams.get("userId")?.toString();
        if (!secret || !userId) throw new Error("Create OAuth2 token failed");
  
        const session = await account.createSession(userId, secret);
        if (!session) throw new Error("Failed to create session");

        // Get user details after successful login
        const user = await account.get();
        if (!user) throw new Error("Failed to get user details");

        // Check if user already exists in the collection
        const existingUser = await databases.listDocuments(
            config.databaseId,
            config.userCollectionId,
            [Query.equal('creatoraccountid', user.$id)]
        );

        // If user doesn't exist in collection, create new user document
        if (existingUser.documents.length === 0) {
            const avatarUrl = avatars.getInitials(user.name);
            await databases.createDocument(
                config.databaseId,
                config.userCollectionId,
                ID.unique(),
                {
                    creatoraccountid: user.$id,
                    creatoremail: user.email,
                    creatorusername: user.name,
                    creatoravatar: avatarUrl
                }
            );
        }
  
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function logout() {
    try {
        const result = await account.deleteSession("current");
        return result;
    } catch (error) {
        console.error(error);
        return false;
    }
}
export async function SignIn(email: string, password: string) {
    try {
        // First, try to delete any existing session
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

export const uploadProfilePicture = async (file: FileData, previousImageUrl?: string): Promise<{ $id: string; imageUrl: string }> => {
    try {
        // Delete previous image if it exists
        if (previousImageUrl) {
            await deleteFileFromBucket(previousImageUrl);
        }

        // Create a file object from the URI
        const fileToUpload = {
            uri: file.uri,
            name: file.name || 'profile.jpg',
            type: file.type || 'image/jpeg',
            size: 0 // Appwrite will calculate the actual size
        };

        // Upload file to Appwrite Storage
        const response = await storage.createFile(
            config.storageId,
            ID.unique(),
            fileToUpload
        );

        // Get the file's view URL (not preview)
        const imageUrl = storage.getFileView(config.storageId, response.$id).href;
        
        return { $id: response.$id, imageUrl };
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