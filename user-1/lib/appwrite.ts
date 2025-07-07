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
    platform: process.env.EXPO_PUBLIC_PLATFORM,
    endpoint: process.env.EXPO_PUBLIC_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_DATABASE_ID,
    userCollectionId: process.env.EXPO_PUBLIC_USER_COLLECTION_ID,
    profileCollectionId: process.env.EXPO_PUBLIC_PROFILE_COLLECTION_ID,
    videoCollectionId: process.env.EXPO_PUBLIC_VIDEO_COLLECTION_ID,
    photoCollectionId: process.env.EXPO_PUBLIC_PHOTO_COLLECTION_ID,
    storageId: process.env.EXPO_PUBLIC_STORAGE_ID,
    activeSubscriptionsCollectionId: process.env.EXPO_PUBLIC_ACTIVE_SUBSCRIPTIONS_COLLECTION_ID,
    cancelledSubscriptionsCollectionId: process.env.EXPO_PUBLIC_CANCELLED_SUBSCRIPTIONS_COLLECTION_ID,
    paidContentPurchasesCollectionId: process.env.EXPO_PUBLIC_PAID_CONTENT_PURCHASES_COLLECTION_ID
};

// Validate that all required environment variables are set
const validateConfig = () => {
    const requiredVars = [
        'platform', 'endpoint', 'projectId', 'databaseId', 
        'userCollectionId', 'profileCollectionId', 'videoCollectionId',
        'photoCollectionId', 'storageId', 'activeSubscriptionsCollectionId',
        'cancelledSubscriptionsCollectionId'
    ];
    
    const missingVars = requiredVars.filter(varName => !config[varName as keyof typeof config]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file.`);
    }
};

// Validate config on import
validateConfig();

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
            config.databaseId!,
            config.userCollectionId!,
            ID.unique(),
            {
                accountId: newAccount.$id,
                email,
                username,
                avatar: avatarUrl
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
        allPosts.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
        
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
            config.databaseId!,
            config.profileCollectionId!,
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
export const updateUserProfile = async (userId: string, data: ProfileData): Promise<any> => {
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
            config.databaseId!,
            config.profileCollectionId!,
            [Query.equal('userId', userId)]
        );

        console.log("Existing profile:", existingProfile);

        // If there's a profile image URL, also update the user's avatar in the user collection
        if (data.profileImageUri) {
            try {
                // Find the user document in the user collection
                const userDocuments = await databases.listDocuments(
                    config.databaseId!,
                    config.userCollectionId!,
                    [Query.equal('accountId', currentUser.$id)]
                );

                if (userDocuments.documents.length > 0) {
                    // Update the avatar field in the user collection
                    await databases.updateDocument(
                        config.databaseId!,
                        config.userCollectionId!,
                        userDocuments.documents[0].$id,
                        {
                            avatar: data.profileImageUri
                        }
                    );
                    console.log("User avatar updated in user collection:", data.profileImageUri);
                }
            } catch (avatarError) {
                console.error("Error updating user avatar:", avatarError);
                // Don't throw error for avatar update, continue with profile update
            }
        }

        if (existingProfile.documents.length > 0) {
            // Update existing profile
            const updatedProfile = await databases.updateDocument(
                config.databaseId!,
                config.profileCollectionId!,
                existingProfile.documents[0].$id,
                {
                    ...data,
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
                config.databaseId!,
                config.profileCollectionId!,
                ID.unique(),
                {
                    ...data,
                    $permissions: [
                        `read("user:${userId}")`,
                        `write("user:${userId}")`
                    ]
                }
            );
            console.log("New profile created:", newProfile);
            return newProfile;
        }
    } catch (error: unknown) {
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
            await storage.deleteFile(config.storageId!, fileId);
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
            config.storageId!,
            ID.unique(),
            fileToUpload
        );

        // Get the file's view URL (not preview)
        const imageUrl = storage.getFileView(config.storageId!, response.$id).href;
        
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

export const getSubscriptionCount = async (creatorName: string): Promise<number> => {
    try {
        const subscriptions = await databases.listDocuments(
            config.databaseId!,
            config.activeSubscriptionsCollectionId!,
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
            config.databaseId!,
            config.activeSubscriptionsCollectionId!,
            [
                Query.equal('userId', userId),
                Query.equal('creatorName', creatorName)
            ]
        );
        
        // Check if there's an active subscription
        const hasActiveSubscription = subscriptions.documents.some(sub => 
            sub.status === 'active' && 
            (!sub.endsAt || new Date(sub.endsAt) > new Date())
        );
        
        return hasActiveSubscription;
    } catch (error) {
        console.error("Error checking subscription:", error);
        return false;
    }
};

// Add a new function to check subscription status
export const getSubscriptionStatus = async (userId: string, creatorName: string): Promise<{ isSubscribed: boolean; isCancelled: boolean }> => {
    try {
        const subscriptions = await databases.listDocuments(
            config.databaseId!,
            config.activeSubscriptionsCollectionId!,
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

export const getUserSubscriptions = async (userId: string) => {
    try {
        const subscriptions = await databases.listDocuments(
            config.databaseId!,
            config.activeSubscriptionsCollectionId!,
            [Query.equal('userId', userId)]
        );
        
        return subscriptions.documents;
    } catch (error) {
        console.error("Error getting user subscriptions:", error);
        return [];
    }
};

export const deleteExpiredSubscriptions = async (userId: string) => {
    try {
        const subscriptions = await databases.listDocuments(
            config.databaseId!,
            config.activeSubscriptionsCollectionId!,
            [Query.equal('userId', userId)]
        );
        
        // Find expired subscriptions
        const expiredSubscriptions = subscriptions.documents.filter(sub => 
            sub.endsAt && new Date(sub.endsAt) < new Date()
        );
        
        // Get all stripeSubscriptionIds from expired subscriptions
        const expiredStripeIds = expiredSubscriptions.map(sub => sub.stripeSubscriptionId);
        
        // Find all subscriptions (active and cancelled) that share these stripeSubscriptionIds
        const subscriptionsToDelete = subscriptions.documents.filter(sub => 
            expiredStripeIds.includes(sub.stripeSubscriptionId)
        );

        // First, copy all subscriptions to Cancelled_subscriptions collection
        const copyPromises = subscriptionsToDelete.map(sub => {
            // Only copy relevant fields
            const subscriptionData = {
                userId: sub.userId,
                stripeCustomerId: sub.stripeCustomerId,
                stripeSubscriptionId: sub.stripeSubscriptionId,
                status: sub.status,
                createdAt: sub.createdAt,
                billingCycleAnchor: sub.billingCycleAnchor,
                customerEmail: sub.customerEmail,
                creatorName: sub.creatorName,
                creatorAccountId: sub.creatorAccountId,
                endsAt: sub.endsAt,
                planCurrency: sub.planCurrency,
                planInterval: sub.planInterval,
                cancelledAt: new Date().toISOString(),
                renewalDate: sub.renewalDate,
                planAmount: sub.planAmount,
                customerName: sub.customerName,
                paymentStatus: sub.paymentStatus,
                amountTotal: sub.amountTotal,
                amountSubtotal: sub.amountSubtotal
            };

            return databases.createDocument(
                config.databaseId!,
                config.cancelledSubscriptionsCollectionId!,
                ID.unique(),
                subscriptionData,
                [
                    `read("user:${userId}")`,
                    `write("user:${userId}")`
                ]
            );
        });

        // Wait for all copies to complete
        await Promise.all(copyPromises);

        // Then create an array of delete promises
        const deletePromises = subscriptionsToDelete.map(sub => 
            databases.deleteDocument(
                config.databaseId!,
                config.activeSubscriptionsCollectionId!,
                sub.$id
            )
        );

        // Execute all deletions simultaneously
        await Promise.all(deletePromises);
        
        return subscriptionsToDelete.length;
    } catch (error) {
        console.error("Error deleting expired subscriptions:", error);
        return 0;
    }
};

export const getCreatorIdByName = async (creatorName: string): Promise<string | null> => {
    try {
        console.log('🔍 getCreatorIdByName called with:', creatorName);
        
        // Query the photos collection to find the creator's IdCreator
        const photos = await databases.listDocuments(
            config.databaseId!,
            config.photoCollectionId!,
            [Query.equal('title', creatorName)]
        );
        
        console.log('📊 Found photos:', photos.documents.length);
        console.log('📋 Photo details:', photos.documents.map(p => ({
            idCreator: p.IdCreator,
            title: p.title,
            creatorsname: p.creatorsname
        })));
        
        if (photos.documents.length > 0) {
            const creatorId = photos.documents[0].IdCreator;
            console.log('✅ Returning creator ID from photos collection (IdCreator):', creatorId);
            return creatorId;
        }
        
        console.log('❌ No creator found with title in photos collection:', creatorName);
        return null;
    } catch (error) {
        console.error("❌ Error getting creator ID from photos collection:", error);
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
        console.log('🚀 Starting createPaidContentPaymentIntent...');
        
        // Use the same function endpoint logic as your existing setup
        const FUNCTION_ID = process.env.EXPO_PUBLIC_FUNCTION_ID;
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
            console.error('❌ Missing EXPO_PUBLIC_FUNCTION_ID');
            throw new Error('EXPO_PUBLIC_FUNCTION_ID is not configured. Please set your function ID in environment variables.');
        }

        if (!config.endpoint) {
            console.error('❌ Missing config.endpoint');
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
        
        console.log('⏳ Making fetch request...');
        
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': config.projectId!,
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
            console.error('❌ Response not OK, reading error text...');
            const errorText = await response.text();
            console.error('❌ Backend error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        console.log('✅ Response OK, parsing JSON...');
        const data = await response.json();
        console.log('📊 Backend response data:', data);
        
        // Parse the actual response from Appwrite Function's responseBody
        let actualResponse;
        if (data.responseBody) {
            try {
                actualResponse = JSON.parse(data.responseBody);
                console.log('📋 Parsed responseBody:', actualResponse);
            } catch (parseError) {
                console.error('❌ Failed to parse responseBody:', parseError);
                throw new Error('Invalid response format from backend');
            }
        } else {
            actualResponse = data;
        }
        
        if (!actualResponse.success) {
            console.error('❌ Backend returned success: false');
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
            config.databaseId!,
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
            config.databaseId!,
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