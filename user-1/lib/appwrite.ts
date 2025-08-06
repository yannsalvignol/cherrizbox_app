import * as Linking from "expo-linking";
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

// Helper to build redirect URI that follows Appwrite mobile guideline
const getAppwriteRedirectUri = () => {
    const scheme = `appwrite-callback-${config.projectId}`;
    return `${scheme}://`;
};
  
export const config = {
    platform: process.env.EXPO_PUBLIC_PLATFORM,
    endpoint: process.env.EXPO_PUBLIC_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_DATABASE_ID,
    userCollectionId: process.env.EXPO_PUBLIC_USER_COLLECTION_ID,
    profileCollectionId: process.env.EXPO_PUBLIC_PROFILE_COLLECTION_ID,
    videoCollectionId: process.env.EXPO_PUBLIC_VIDEO_COLLECTION_ID,
    photoCollectionId: process.env.EXPO_PUBLIC_PHOTO_COLLECTION_ID,
    /**
     * Collection that stores aggregated statistics for each creator (e.g. subscriber counters).
     */
    creatorCollectionId: process.env.EXPO_PUBLIC_CREATOR_COLLECTION_ID,
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
export const functions = new Functions(client);

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
        await ensureUserDocument();
        return true;
    } catch (error) {
        console.error("Google OAuth error:", error);
        return false;
    }
}

export async function loginWithApple() {
    try {
        const redirectUri = getAppwriteRedirectUri();
        const scheme = `appwrite-callback-${config.projectId}://`;
        console.log("[Apple OAuth] redirectUri:", redirectUri);

        const loginUrl = await account.createOAuth2Session(
            OAuthProvider.Apple,
            redirectUri,
            redirectUri,
            ["name", "email"]
        );

        const loginUrlObjApple = loginUrl as URL;
        console.log("[Apple OAuth] loginUrl:", loginUrlObjApple.toString());
        if (!loginUrl) throw new Error("Failed to create Apple OAuth2 token");

        const browserResult = await openAuthSessionAsync(loginUrlObjApple.toString(), scheme);
        console.log("[Apple OAuth] browserResult:", browserResult);
        if (browserResult.type !== "success") throw new Error("Apple OAuth flow was cancelled or failed");

        const url = new URL(browserResult.url);
        const secret = url.searchParams.get("secret")?.toString();
        const userId = url.searchParams.get("userId")?.toString();
        console.log("[Apple OAuth] Parsed secret present:", !!secret, "userId present:", !!userId);
        if (!secret || !userId) throw new Error("Missing Apple OAuth credentials in redirect URL");

        await account.createSession(userId, secret);
        console.log("[Apple OAuth] Session created successfully for user", userId);
        await ensureUserDocument();
        return true;
    } catch (error) {
        console.error("Apple OAuth error:", error);
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
        // Fetch from the USERS collection via accountId
        const users = await databases.listDocuments(
            config.databaseId!,
            config.userCollectionId!,
            [Query.equal('accountId', userId), Query.limit(1)]
        );

        if (users.documents.length > 0) {
            return users.documents[0];
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

// Update user profile (now writes directly to the Users collection)
export const updateUserProfile = async (userId: string, data: ProfileData): Promise<any> => {
    try {
        console.log("Updating profile for user:", userId);
        console.log("Update data:", data);

        // Verify current user is authenticated
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error("User not authenticated");
        }

        // Find the user document in the USERS collection via accountId
        const existingUserDocs = await databases.listDocuments(
            config.databaseId!,
            config.userCollectionId!,
            [Query.equal('accountId', userId), Query.limit(1)]
        );

        if (existingUserDocs.documents.length === 0) {
            throw new Error("User document not found in users collection");
        }

        const userDocId = existingUserDocs.documents[0].$id;

        // Prepare the fields to update (only include those present in data)
        const fieldsToUpdate: any = {};
        if (data.dateOfBirth !== undefined) fieldsToUpdate.dateOfBirth = data.dateOfBirth;
        if (data.gender !== undefined) fieldsToUpdate.gender = data.gender;
        if (data.phoneNumber !== undefined) fieldsToUpdate.phoneNumber = data.phoneNumber;
        if (data.profileImageUri !== undefined) fieldsToUpdate.profileImageUri = data.profileImageUri;

        const updatedUser = await databases.updateDocument(
            config.databaseId!,
            config.userCollectionId!,
            userDocId,
            fieldsToUpdate
        );

        console.log("User document updated successfully:", updatedUser);
        return updatedUser;
    } catch (error: unknown) {
        console.error("Error updating user profile:", error);
        if (error instanceof Error) {
            throw new Error(error.message || "Failed to update profile");
        }
        throw new Error("Failed to update profile");
    }
};

export const deleteFileFromBucket = async (fileUrl: string) => {
    try {
        const fileId = fileUrl.split('/files/')[1].split('/view')[0];
        if (!fileId) {
            console.error("Could not extract fileId from URL:", fileUrl);
            return;
        }
            await storage.deleteFile(config.storageId!, fileId);
        console.log("Successfully deleted file:", fileId);
    } catch (error: any) {
        // Appwrite throws a 404 error if the file doesn't exist, which is fine.
        // We can safely ignore it and log other errors.
        if (error.code === 404) {
            console.log("File not found, which is okay. Proceeding.");
        } else {
            console.error("Error deleting file:", error);
            // We don't re-throw here because failing to delete an old picture
            // shouldn't prevent a new one from being uploaded.
        }
    }
};

export async function requestPasswordRecovery(email: string) {
  try {
    // This now uses the exact same, proven method as our Google Auth login.
    const redirectUrl = Linking.createURL('/password-reset');

    console.log(`[requestPasswordRecovery] Sending recovery with redirectUrl: ${redirectUrl}`);

    const promise = await account.createRecovery(
      email,
      redirectUrl
    );

    console.log("Password recovery request sent successfully:", promise);
    return promise;
    } catch (error) {
    console.error("Error requesting password recovery:", error);
    throw new Error((error as Error).message);
  }
}

export const codeBasedPasswordReset = async (email: string) => {
    const FUNCTION_ID = process.env.EXPO_PUBLIC_REQUEST_PASSWORD_RESET_FUNCTION_ID;
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
    const FUNCTION_ID = process.env.EXPO_PUBLIC_VERIFY_PASSWORD_RESET_FUNCTION_ID;
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

// Send verification email using Appwrite function
export const sendVerificationEmailViaFunction = async (email: string, code: string) => {
    console.log(`📧 [sendVerificationEmailViaFunction] Starting email verification process`);
    console.log(`📧 [sendVerificationEmailViaFunction] Email: ${email}, Code: ${code}`);
    
    const FUNCTION_ID = process.env.EXPO_PUBLIC_SEND_SIGNUP_EMAIL_FUNCTION_ID;
    if (!FUNCTION_ID) {
        console.log(`❌ [sendVerificationEmailViaFunction] Function ID not configured`);
        throw new Error('Send signup email function ID not set');
    }
    
    console.log(`✅ [sendVerificationEmailViaFunction] Function ID found: ${FUNCTION_ID}`);
    
    const requestBody = JSON.stringify({ email, code });
    console.log(`📤 [sendVerificationEmailViaFunction] Request body: ${requestBody}`);
    
    try {
        console.log(`🚀 [sendVerificationEmailViaFunction] Executing Appwrite function...`);
        const execution = await functions.createExecution(
            FUNCTION_ID,
            requestBody,
            false,
            '/send-verification-email',
            ExecutionMethod.POST,
            { 'Content-Type': 'application/json' }
        );
        
        console.log(`📥 [sendVerificationEmailViaFunction] Function execution completed`);
        console.log(`📊 [sendVerificationEmailViaFunction] Execution status: ${execution.status}`);
        console.log(`📊 [sendVerificationEmailViaFunction] Response body: ${execution.responseBody}`);
        
        if (execution.status === 'failed') {
            console.log(`❌ [sendVerificationEmailViaFunction] Function execution failed`);
            let errorResponse;
            try {
                errorResponse = JSON.parse(execution.responseBody);
                console.log(`📋 [sendVerificationEmailViaFunction] Parsed error response:`, errorResponse);
            } catch (parseError) {
                const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
                console.log(`❌ [sendVerificationEmailViaFunction] Failed to parse error response: ${errorMessage}`);
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
            console.log(`❌ [sendVerificationEmailViaFunction] Failed to parse response body: ${errorMessage}`);
            throw new Error('Failed to send verification email - invalid response format.');
        }
        
        if (!responseBody.success) {
            console.log(`❌ [sendVerificationEmailViaFunction] Response indicates failure:`, responseBody);
            throw new Error(responseBody.error || 'Failed to send verification email.');
        }
        
        console.log(`✅ [sendVerificationEmailViaFunction] Email verification process completed successfully`);
        return responseBody;
        
    } catch (error) {
        console.log(`💥 [sendVerificationEmailViaFunction] Error during function execution:`, error);
        if (error instanceof Error) {
            throw new Error(`Email verification failed: ${error.message}`);
        }
        throw new Error('Email verification failed with unknown error.');
    }
};


// Complete Password Recovery
export const completePasswordRecovery = async (userId: string, secret: string, password: string):Promise<any> => {
    try {
        console.log(`[completePasswordRecovery] Attempting to reset password for userId: ${userId}`);
        const result = await account.updateRecovery(userId, secret, password);
        console.log(`[completePasswordRecovery] Successfully completed password recovery for userId: ${userId}`, result);
        return result;
    } catch (error: unknown) {
        console.error(`[completePasswordRecovery] Error completing password recovery for userId: ${userId}`, error);
        if (error instanceof Error) {
            throw new Error(error.message || "Failed to complete password recovery.");
        }
        throw new Error("Failed to complete password recovery.");
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
        console.log(`👥 [FollowerCount] Getting count for creator: ${creatorName}`);
        
        // Import dataCache dynamically to avoid circular dependency
        const { dataCache } = await import('./data-cache');
        
        // Check cache first
        const cachedCount = dataCache.getFollowerCount(creatorName);
        if (cachedCount !== null) {
            console.log(`✅ [FollowerCount] Cache HIT - ${cachedCount} followers`);
            return cachedCount;
        }

        console.log(`❌ [FollowerCount] Cache MISS - querying database...`);

        if (!config.creatorCollectionId) {
            console.warn('⚠️ [FollowerCount] creatorCollectionId is not configured; falling back to 0 followers');
            return 0;
        }

        const creators = await databases.listDocuments(
            config.databaseId!,
            config.creatorCollectionId!,
            [
                Query.equal('creators_public_name', creatorName),
                Query.limit(1)
            ]
        );

        if (creators.documents.length === 0) {
            console.log(`📊 [FollowerCount] Creator not found in database`);
            dataCache.setFollowerCount(creatorName, 0);
            return 0; // creator not found
        }

        const doc = creators.documents[0] as any;
        const monthly = typeof doc.number_of_monthly_subscribers === 'number' ? doc.number_of_monthly_subscribers : 0;
        const yearly  = typeof doc.number_of_yearly_subscriptions === 'number' ? doc.number_of_yearly_subscriptions : 0;
        const totalCount = monthly + yearly;

        console.log(`📊 [FollowerCount] Database result: ${monthly} monthly + ${yearly} yearly = ${totalCount} total`);

        // Cache the result for 5 minutes
        dataCache.setFollowerCount(creatorName, totalCount);
        console.log(`💾 [FollowerCount] Cached result for 5 minutes`);
        
        return totalCount;
    } catch (error) {
        console.error("❌ [FollowerCount] Error getting subscription count:", error);
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
            stripeAccountId: actualResponse.stripeAccountId, // Add the creator's Stripe account ID
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

        console.log('💾 [RecordPurchase] Purchase recorded successfully');
        
        // Immediately invalidate the cache for this purchase to ensure fresh data
        try {
            const { dataCache } = await import('./data-cache');
            dataCache.delete(`purchase_${userId}_${contentId}`);
            console.log('✅ [RecordPurchase] Cache invalidated for future checks');
        } catch (cacheError) {
            console.warn('⚠️ [RecordPurchase] Failed to invalidate cache:', cacheError);
        }

        return purchaseRecord;
    } catch (error) {
        console.error('Error recording paid content purchase:', error);
        throw error;
    }
};

// Check if user has purchased specific content (with caching)
export const checkPaidContentPurchase = async (userId: string, contentId: string): Promise<boolean> => {
    try {
        console.log(`🛒 [PurchaseCheck] Checking purchase: userId=${userId.substring(0, 8)}..., contentId=${contentId}`);
        
        // Import dataCache dynamically to avoid circular dependency
        const { dataCache } = await import('./data-cache');
        
        // Check cache first
        const cacheKey = `purchase_${userId}_${contentId}`;
        const cachedResult = dataCache.getPurchaseStatus(userId, contentId);
        if (cachedResult !== null) {
            console.log(`✅ [PurchaseCheck] Cache HIT - user ${cachedResult ? 'HAS' : 'has NOT'} purchased content`);
            return cachedResult;
        }

        console.log(`❌ [PurchaseCheck] Cache MISS - querying database...`);

        if (!config.paidContentPurchasesCollectionId) {
            console.log("⚠️ [PurchaseCheck] Paid content purchases collection ID not configured");
            return false;
        }

        const response = await databases.listDocuments(
            config.databaseId!,
            config.paidContentPurchasesCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('contentId', contentId)
            ]
        );

        const hasPurchased = response.documents.length > 0;
        console.log(`📊 [PurchaseCheck] Database result: ${hasPurchased ? 'PURCHASED' : 'NOT PURCHASED'} (${response.documents.length} records)`);
        
        // Cache the result for 2 minutes
        dataCache.setPurchaseStatus(userId, contentId, hasPurchased);
        console.log(`💾 [PurchaseCheck] Cached result for 2 minutes`);
        
        return hasPurchased;
    } catch (error) {
        console.error('❌ [PurchaseCheck] Error checking paid content purchase:', error);
        return false;
    }
};

// Get purchased content based on filters
export const getPurchasedContent = async (
    userId: string, 
    contentType?: string, 
    creatorId?: string
) => {
    try {
        const queries = [Query.equal('userId', userId)];
        
        // Add content type filter if specified
        if (contentType) {
            queries.push(Query.equal('contentType', contentType));
        }
        
        // Add creator filter if specified
        if (creatorId) {
            queries.push(Query.equal('creatorId', creatorId));
        }
        
        const response = await databases.listDocuments(
            config.databaseId!,
            '686a99d3002ec49567b3', // Paid content purchases collection ID
            queries
        );
        
        return response.documents;
    } catch (error) {
        console.error('Error fetching purchased content:', error);
        return [];
    }
};

// Function to upload file to Appwrite storage
export const uploadFileToAppwrite = async (fileUri: string, fileName: string, mimeType?: string): Promise<string> => {
  try {
    console.log('📤 Starting file upload to Appwrite...');
    console.log('📁 File URI:', fileUri);
    console.log('📄 File Name:', fileName);
    console.log('🏷️ MIME Type:', mimeType);

    // We need to import FileSystem dynamically to avoid circular dependencies
    const FileSystem = await import('expo-file-system');

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist at the specified URI');
    }

    console.log('📊 File Info:', fileInfo);

    // Create a unique file ID
    const fileId = ID.unique();
    console.log('🆔 Generated File ID:', fileId);

    // Create file object for upload
    const fileToUpload = {
      name: fileName,
      type: mimeType || 'application/octet-stream',
      size: fileInfo.size || 0,
      uri: fileUri,
    };

    console.log('📦 File to upload:', fileToUpload);

    // Upload to Appwrite storage
    console.log('⬆️ Uploading to storage bucket:', config.storageId);
    const uploadedFile = await storage.createFile(
      config.storageId!,
      fileId,
      fileToUpload
    );

    console.log('✅ File uploaded successfully:', uploadedFile);

    // Get the file URL
    const fileUrl = storage.getFileView(config.storageId!, uploadedFile.$id);
    console.log('🔗 File URL:', fileUrl);

    return fileUrl.toString();
  } catch (error) {
    console.error('❌ Error uploading file to Appwrite:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export async function ensureUserDocument() {
  const user = await account.get();
  const userId = user.$id;
  const email = user.email;
  const username = user.name || user.email?.split('@')[0] || 'User';

  // Check if user document exists
  const existing = await databases.listDocuments(
    config.databaseId!,
    config.userCollectionId!,
    [Query.equal('accountId', userId)]
  );
  if (existing.documents.length > 0) return existing.documents[0];

  // Create user document
  return await databases.createDocument(
    config.databaseId!,
    config.userCollectionId!,
    ID.unique(),
    {
      accountId: userId,
      email,
      username,
      avatar: avatars.getInitials(username),
    }
  );
}