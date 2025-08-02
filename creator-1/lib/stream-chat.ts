import { StreamChat } from "stream-chat";
import { getCurrentUser } from './appwrite';
import { testStreamTokenGeneration } from './test-stream-token';

// Initialize Stream Chat client
export const client = StreamChat.getInstance("xzrue5uj6btx");

// Global connection state
let isConnected = false;
let connectedUserId: string | null = null;

// Token cache interface
interface TokenCache {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

// Global token cache
let tokenCache: TokenCache | null = null;

// Token expiry time: 30 days (in milliseconds)
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Function to check if cached token is valid
const isTokenValid = (cachedToken: TokenCache, userId: string): boolean => {
  const now = Date.now();
  return (
    cachedToken.userId === userId &&
    cachedToken.expiresAt > now
  );
};

// Function to get or generate token
const getOrGenerateToken = async (userId: string): Promise<string> => {
  // Check if we have a valid cached token
  if (tokenCache && isTokenValid(tokenCache, userId)) {
    console.log('✅ Using cached token (expires:', new Date(tokenCache.expiresAt).toLocaleDateString(), ')');
    return tokenCache.token;
  }

  // Generate new token
  console.log('🔄 Generating new token...');
  const tokenResult = await testStreamTokenGeneration();
  if (!tokenResult.success || !tokenResult.token) {
    throw new Error('Failed to generate Stream Chat token');
  }

  // Cache the new token
  const now = Date.now();
  tokenCache = {
    token: tokenResult.token,
    userId: userId,
    createdAt: now,
    expiresAt: now + TOKEN_EXPIRY_MS
  };

  console.log('✅ New token cached (expires:', new Date(tokenCache.expiresAt).toLocaleDateString(), ')');
  return tokenResult.token;
};

// Function to connect user to Stream Chat (only once per session)
export const connectUser = async (userId: string) => {
    try {
        // If already connected to the same user, don't reconnect
        if (isConnected && connectedUserId === userId) {
            console.log('User already connected, skipping reconnection');
            return true;
        }

        // If connected to a different user, disconnect first
        if (isConnected && connectedUserId !== userId) {
            console.log('Disconnecting from previous user');
            try {
                await client.disconnectUser();
            } catch (error) {
                console.log('Error disconnecting previous user:', error);
            }
            isConnected = false;
            connectedUserId = null;
        }

        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error('No current user found');
        }
        
        // Get or generate token using the new caching system
        const token = await getOrGenerateToken(userId);
        
        const userObject = {
            id: userId,
            name: currentUser.name || userId,
            image: currentUser.avatar || undefined,
        };
        await client.connectUser(userObject, token);
        // Optionally, setUser is not needed if connectUser is used
        isConnected = true;
        connectedUserId = userId;
        console.log('User connected successfully');
        return true;
    } catch (error) {
        console.error('Error connecting user to Stream Chat:', error);
        isConnected = false;
        connectedUserId = null;
        return false;
    }
};

// Function to disconnect user from Stream Chat
export const disconnectUser = async () => {
    try {
        await client.disconnectUser();
        isConnected = false;
        connectedUserId = null;
        return true;
    } catch (error) {
        console.error('Error disconnecting user from Stream Chat:', error);
        return false;
    }
};

// Function to check if user is connected
export const isUserConnected = () => {
    return isConnected;
};

// Function to get connected user ID
export const getConnectedUserId = () => {
    return connectedUserId;
};

// Function to clear token cache (useful for testing or manual refresh)
export const clearTokenCache = () => {
    tokenCache = null;
    console.log('🗑️ Token cache cleared');
};

// Function to get token cache info (for debugging)
export const getTokenCacheInfo = () => {
    if (!tokenCache) {
        return { cached: false };
    }
    return {
        cached: true,
        userId: tokenCache.userId,
        createdAt: new Date(tokenCache.createdAt).toLocaleString(),
        expiresAt: new Date(tokenCache.expiresAt).toLocaleString(),
        isValid: isTokenValid(tokenCache, tokenCache.userId)
    };
};

export async function createCreatorChannel(creatorId: string, creatorName: string) {
  try {
    // Create a unique channel ID for this creator
    const channelId = `creator-${creatorId}`;
    
    console.log(`🚀 [createCreatorChannel] Creating channel: ${channelId} for user: ${creatorId}`);
    
    // Create the channel for the creator's group chat
    const channel = client.channel('messaging', channelId, {
      members: [creatorId],
      created_by_id: creatorId
    });

    await channel.create();
    console.log(`✅ [createCreatorChannel] Channel created: ${channelId}`);
    
    // Explicitly add the creator as a member to ensure they're in the channel
    try {
      await channel.addMembers([creatorId]);
      console.log(`✅ [createCreatorChannel] Added creator as member: ${creatorId}`);
    } catch (memberError) {
      console.log(`⚠️ [createCreatorChannel] Member might already be added:`, memberError);
    }
    
    // Create an initial welcome message that will serve as the main thread
    const welcomeMessage = await channel.sendMessage({
      text: `Welcome to ${creatorName}'s group chat! This is where the conversation begins.`,
      user_id: creatorId,
      show_in_channel: true
    });

    console.log(`✅ [createCreatorChannel] Welcome message sent successfully`);
    console.log(`✅ [createCreatorChannel] Channel creation complete: ${channelId}`);
    return channel;
  } catch (error) {
    console.error('❌ [createCreatorChannel] Error creating creator channel:', error);
    throw error;
  }
}

 