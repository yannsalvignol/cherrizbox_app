import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreamChat } from "stream-chat";
import { getCurrentUser } from './appwrite';
import { testStreamTokenGeneration } from './test-stream-token';

// Initialize Stream Chat client
export const client = StreamChat.getInstance("xzrue5uj6btx");

// AsyncStorage keys
const STORAGE_KEYS = {
  TOKEN: 'stream_chat_token',
  USER_DOC: 'stream_user_doc',
  CONNECTION_STATE: 'stream_connection_state',
  LAST_CONNECTED_USER: 'stream_last_user',
};

// Global connection state
let isConnected = false;
let connectedUserId: string | null = null;
let connectionPromise: Promise<boolean> | null = null; // Track ongoing connection
let userDocCache: any = null; // Cache user document
let userDocCacheTime: number = 0;
const USER_DOC_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

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

// Save connection state to AsyncStorage
const saveConnectionState = async (userId: string, token: string, userDoc: any) => {
  try {
    const connectionState = {
      userId,
      token,
      userDoc,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.CONNECTION_STATE, JSON.stringify(connectionState)],
      [STORAGE_KEYS.LAST_CONNECTED_USER, userId],
      [`${STORAGE_KEYS.TOKEN}_${userId}`, token],
      [`${STORAGE_KEYS.USER_DOC}_${userId}`, JSON.stringify(userDoc)],
    ]);
    
    console.log('💾 Connection state saved to AsyncStorage');
  } catch (error) {
    console.error('Error saving connection state:', error);
  }
};

// Restore connection state from AsyncStorage
export const restoreConnectionState = async (): Promise<{
  userId: string | null;
  token: string | null;
  userDoc: any | null;
  isValid: boolean;
}> => {
  try {
    const lastUser = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CONNECTED_USER);
    
    if (!lastUser) {
      return { userId: null, token: null, userDoc: null, isValid: false };
    }
    
    const [tokenResult, userDocResult] = await AsyncStorage.multiGet([
      `${STORAGE_KEYS.TOKEN}_${lastUser}`,
      `${STORAGE_KEYS.USER_DOC}_${lastUser}`,
    ]);
    
    const token = tokenResult[1];
    const userDocStr = userDocResult[1];
    
    if (token && userDocStr) {
      const userDoc = JSON.parse(userDocStr);
      
      // Restore to memory cache
      tokenCache = {
        token,
        userId: lastUser,
        createdAt: Date.now(),
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
      };
      
      userDocCache = userDoc;
      userDocCacheTime = Date.now();
      
      console.log('✅ Connection state restored from AsyncStorage');
      return { userId: lastUser, token, userDoc, isValid: true };
    }
    
    return { userId: lastUser, token: null, userDoc: null, isValid: false };
  } catch (error) {
    console.error('Error restoring connection state:', error);
    return { userId: null, token: null, userDoc: null, isValid: false };
  }
};

// Function to check if cached token is valid
const isTokenValid = (cachedToken: TokenCache, userId: string): boolean => {
  const now = Date.now();
  return (
    cachedToken.userId === userId &&
    cachedToken.expiresAt > now
  );
};

// Function to get or generate token
// Helper to get cached user document
const getCachedUserDoc = async (userId: string, forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached doc if still valid
  if (!forceRefresh && userDocCache && userDocCacheTime && 
      (now - userDocCacheTime) < USER_DOC_CACHE_TTL && 
      userDocCache.creatoraccountid === userId) {
    console.log('📦 Using cached user document');
    return userDocCache;
  }
  
  // Fetch fresh user document
  const { databases, config } = await import('./appwrite');
  const { Query } = await import('react-native-appwrite');
  
  const userDocs = await databases.listDocuments(
    config.databaseId,
    config.creatorCollectionId,
    [Query.equal('creatoraccountid', userId)]
  );
  
  if (userDocs.documents.length > 0) {
    userDocCache = userDocs.documents[0];
    userDocCacheTime = now;
    console.log('🔄 User document cached');
    return userDocCache;
  }
  
  return null;
};

const getOrGenerateToken = async (userId: string): Promise<string> => {
  // Check if we have a valid cached token in memory
  if (tokenCache && isTokenValid(tokenCache, userId)) {
    console.log('✅ Using memory cached token');
    return tokenCache.token;
  }

  console.log('🔄 Getting Stream Chat token for user:', userId);
  
  // Try to restore from AsyncStorage if not in memory
  try {
    const storedToken = await AsyncStorage.getItem(`${STORAGE_KEYS.TOKEN}_${userId}`);
    if (storedToken) {
      console.log('📱 Found token in AsyncStorage');
      // Restore to memory cache
      const now = Date.now();
      tokenCache = {
        token: storedToken,
        userId: userId,
        createdAt: now,
        expiresAt: now + (365 * 24 * 60 * 60 * 1000)
      };
      return storedToken;
    }
  } catch (error) {
    console.log('Could not restore from AsyncStorage:', error);
  }
  
  try {
    // Get user document (cached or fresh)
    const userDoc = await getCachedUserDoc(userId);
    
    if (userDoc) {
      // Check if we have a stored Stream token
      if (userDoc.streamChatToken) {
        console.log('✅ Found stored token in backend, reusing it');
        
        // Cache the token locally and in AsyncStorage
        const now = Date.now();
        tokenCache = {
          token: userDoc.streamChatToken,
          userId: userId,
          createdAt: now,
          expiresAt: now + (365 * 24 * 60 * 60 * 1000) // 1 year (tokens don't expire)
        };
        
        // Save to AsyncStorage for offline access
        await saveConnectionState(userId, userDoc.streamChatToken, userDoc);
        
        console.log('✅ Backend token cached locally and in AsyncStorage');
        return userDoc.streamChatToken;
      }
    }
    
    // No stored token found, generate a new one
    console.log('🔄 No stored token found, generating new token...');
    const tokenResult = await testStreamTokenGeneration();
    if (!tokenResult.success || !tokenResult.token) {
      throw new Error('Failed to generate Stream Chat token');
    }
    
    // Store the token in the backend for future use
    if (userDoc) {
      console.log('💾 Storing new token in backend for future use...');
      const { databases, config } = await import('./appwrite');
      await databases.updateDocument(
        config.databaseId,
        config.creatorCollectionId,
        userDoc.$id,
        { streamChatToken: tokenResult.token }
      );
      // Update cache
      userDoc.streamChatToken = tokenResult.token;
      console.log('✅ Token stored in backend successfully');
    }
    
    // Cache the new token locally and in AsyncStorage
    const now = Date.now();
    tokenCache = {
      token: tokenResult.token,
      userId: userId,
      createdAt: now,
      expiresAt: now + (365 * 24 * 60 * 60 * 1000) // 1 year
    };
    
    // Save to AsyncStorage
    await saveConnectionState(userId, tokenResult.token, userDoc);
    
    console.log('✅ New token generated, stored in backend and AsyncStorage');
    return tokenResult.token;
  } catch (error) {
    console.error('❌ Error getting/generating token:', error);
    throw error;
  }
};

// Function to connect user to Stream Chat (only once per session)
export const connectUser = async (userId: string) => {
    try {
        // If already connected to the same user, don't reconnect
        if (isConnected && connectedUserId === userId) {
            console.log('✅ User already connected, skipping reconnection');
            return true;
        }
        
        // If there's an ongoing connection attempt, wait for it
        if (connectionPromise && connectedUserId === userId) {
            console.log('⏳ Connection in progress, waiting...');
            return await connectionPromise;
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

        // Start new connection with promise tracking
        connectedUserId = userId;
        connectionPromise = (async () => {
            try {
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
                console.log('✅ User connected successfully');
                return true;
            } catch (error) {
                // Reset on failure
                isConnected = false;
                connectedUserId = null;
                connectionPromise = null;
                throw error;
            }
        })();
        
        return await connectionPromise;
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
export const clearTokenCache = async (clearBackend = false, clearStorage = true) => {
  tokenCache = null;
  console.log('🗑️ Local token cache cleared');
  
  // Clear AsyncStorage
  if (clearStorage && connectedUserId) {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CONNECTION_STATE,
        STORAGE_KEYS.LAST_CONNECTED_USER,
        `${STORAGE_KEYS.TOKEN}_${connectedUserId}`,
        `${STORAGE_KEYS.USER_DOC}_${connectedUserId}`,
      ]);
      console.log('🗑️ AsyncStorage cleared');
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  }
  
  // Optionally clear the token from backend as well
  if (clearBackend && connectedUserId) {
    try {
      const { databases, config } = await import('./appwrite');
      const { Query } = await import('react-native-appwrite');
      
      const userDocs = await databases.listDocuments(
        config.databaseId,
        config.creatorCollectionId,
        [Query.equal('creatoraccountid', connectedUserId)]
      );
      
      if (userDocs.documents.length > 0) {
        await databases.updateDocument(
          config.databaseId,
          config.creatorCollectionId,
          userDocs.documents[0].$id,
          { streamChatToken: null }
        );
        console.log('🗑️ Backend token cleared');
      }
    } catch (error) {
      console.error('Error clearing backend token:', error);
    }
  }
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

// Preload function to warm up caches
export const preloadStreamConnection = async (userId: string) => {
    try {
        console.log('🔥 Preloading Stream connection data...');
        
        // Preload user document and token in parallel
        const [userDoc, currentUser] = await Promise.all([
            getCachedUserDoc(userId, true), // Force refresh on preload
            getCurrentUser()
        ]);
        
        // If we have a stored token, cache it immediately
        if (userDoc?.streamChatToken) {
            const now = Date.now();
            tokenCache = {
                token: userDoc.streamChatToken,
                userId: userId,
                createdAt: now,
                expiresAt: now + (365 * 24 * 60 * 60 * 1000)
            };
            console.log('✅ Token preloaded into cache');
        }
        
        return true;
    } catch (error) {
        console.error('Error preloading Stream connection:', error);
        return false;
    }
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

 