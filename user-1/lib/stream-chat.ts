import messaging from '@react-native-firebase/messaging';
import { StreamChat } from 'stream-chat';
import { getCurrentUser, getOrGenerateStreamChatToken } from './appwrite';

// Initialize Stream Chat client
export const client = StreamChat.getInstance("xzrue5uj6btx");

// Global connection state
let isConnected = false;
let connectedUserId: string | null = null;
let pushRegistered = false;
let pushRegistrationInProgress = false;

// Helper function to create consistent DM channel IDs
const createDMChannelId = (userId1: string, userId2: string): string => {
    // Always sort IDs alphabetically to ensure consistent channel IDs
    const sortedIds = [userId1, userId2].sort();
    return `dm-${sortedIds[0]}-${sortedIds[1]}`;
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

        // Get cached token or generate new one
        const token = await getOrGenerateStreamChatToken(userId);
        
        // Create user object for Stream Chat
        const userObject = {
                id: userId,
                name: currentUser.name || userId,
                image: currentUser.avatar || undefined,
        };

        // Connect user to Stream Chat (this will create the user if it doesn't exist)
        await client.connectUser(userObject, token);

        // Enable file uploads - setUser requires both user object and token
        client.setUser(userObject, token);

        // Update connection state
        isConnected = true;
        connectedUserId = userId;
        console.log('User connected successfully');

        // Register device for push notifications with Stream (FCM via Firebase)
        await registerForPushWithStream();

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

// Register device token with Stream using Firebase (works for iOS/Android under FCM)
const registerForPushWithStream = async (): Promise<void> => {
    if (!isConnected || !connectedUserId) return;
    if (pushRegistrationInProgress) return;
    try {
        pushRegistrationInProgress = true;

        await messaging().registerDeviceForRemoteMessages();
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (!enabled) {
            console.log('[Push] Notification permission not granted');
            return;
        }

        const fcmToken = await messaging().getToken();
        if (fcmToken) {
            console.log('[Push] About to register device with FCM token:', fcmToken.substring(0, 20) + '...');
            
            // The error says there's a provider named "cherrrizbox_user" available
            // But it seems the SDK can't properly pass the name, so let's try without any provider specification
            console.log('[Push] Registering device with default Firebase provider...');
            
            try {
                // Try different approaches to work around the provider name issue
                console.log('[Push] Attempting device registration with push_provider_name...');
                
                // The SDK v7 might need a different approach
                // Try passing undefined or null as the provider name
                try {
                    console.log('[Push] Trying with undefined provider name...');
                    await client.addDevice(fcmToken, 'firebase', undefined);
                    pushRegistered = true;
                    console.log('[Push] ✅ Device registered with undefined provider!');
                } catch (e1: any) {
                    console.log('[Push] Undefined provider failed:', e1?.message || e1);
                    
                    try {
                        console.log('[Push] Trying with null provider name...');
                        await client.addDevice(fcmToken, 'firebase', null as any);
                        pushRegistered = true;
                        console.log('[Push] ✅ Device registered with null provider!');
                    } catch (e2: any) {
                        console.log('[Push] Null provider failed:', e2?.message || e2);
                        
                        // Try the two-parameter version
                        try {
                            console.log('[Push] Trying with just token and type...');
                            await client.addDevice(fcmToken, 'firebase');
                            pushRegistered = true;
                            console.log('[Push] ✅ Device registered with two parameters!');
                        } catch (e3: any) {
                            console.log('[Push] Two-parameter registration failed:', e3?.message || e3);
                            
                            // Log the issue for debugging
                            console.log('[Push] ⚠️ IMPORTANT: The SDK is sending an empty provider name.');
                            console.log('[Push] ⚠️ Stream Dashboard has provider named "default".');
                            console.log('[Push] ⚠️ You need to either:');
                            console.log('[Push] ⚠️ 1. Check if there\'s a "Set as default" option in Stream Dashboard');
                            console.log('[Push] ⚠️ 2. Contact Stream support about this SDK issue');
                            throw e3;
                        }
                    }
                }
            } catch (error) {
                console.log('[Push] ❌ Registration failed:', error.message);
                console.log('[Push] Full error:', error);
                
                // Log debug info
                console.log('[Push] Debug info:', {
                    tokenLength: fcmToken.length,
                    tokenPrefix: fcmToken.substring(0, 20),
                    userId: connectedUserId,
                    clientState: client.state.active
                });
                
                throw error;
            }
        } else {
            console.log('[Push] No FCM token available');
        }

        // Handle token refresh
        messaging().onTokenRefresh(async (newToken) => {
            try {
                console.log('[Push] Token refresh - re-registering device...');
                await client.addDevice(newToken, 'firebase');
                console.log('[Push] ✅ Device token refreshed and re-registered');
            } catch (e) {
                console.log('[Push] ❌ Error re-registering refreshed token', e);
            }
        });
    } catch (e) {
        console.log('[Push] Registration error', e);
    } finally {
        pushRegistrationInProgress = false;
    }
};

// Pre-setup channels for all subscribed creators
export const preSetupChannels = async (userId: string, creatorIds: string[]) => {
    try {
        console.log('🚀 Pre-setting up channels for subscribed creators...');
        console.log('📋 Creator IDs to setup:', creatorIds);

        // Check if we're connected to Stream Chat
        if (!isConnected) {
            console.log('⚠️ Not connected to Stream Chat, attempting to connect...');
            const connected = await connectUser(userId);
            if (!connected) {
                throw new Error('Failed to connect to Stream Chat');
            }
        }

        console.log('✅ Stream Chat connection verified for pre-setup');

        const setupPromises = creatorIds.map(async (creatorId) => {
            try {
                console.log(`🏗️ Setting up channels for creator: ${creatorId}`);

                // Setup group channel
                const groupChannelId = `creator-${creatorId}`;
                const groupChannel = client.channel('messaging', groupChannelId);
                
                try {
                    await groupChannel.watch();
                    if (!groupChannel.state.members[userId]) {
                        await groupChannel.addMembers([userId]);
                    }
                    
                    console.log(`✅ Group channel setup successful for creator ${creatorId}:`, {
                        channelId: groupChannel.id,
                        memberCount: Object.keys(groupChannel.state.members).length,
                        messageCount: groupChannel.state.messages ? Object.keys(groupChannel.state.messages).length : 0
                    });
                } catch (groupError) {
                    console.error(`❌ Error setting up group channel for creator ${creatorId}:`, groupError);
                }

                // Setup DM channel with consistent ID format
                const dmChannelId = createDMChannelId(creatorId, userId);
                const dmChannel = client.channel('messaging', dmChannelId);
                
                try {
                    await dmChannel.watch();
                    // Add both creator and user to DM channel
                    const membersToAdd = [];
                    if (!dmChannel.state.members[creatorId]) {
                        membersToAdd.push(creatorId);
                    }
                    if (!dmChannel.state.members[userId]) {
                        membersToAdd.push(userId);
                    }
                    
                    if (membersToAdd.length > 0) {
                        await dmChannel.addMembers(membersToAdd);
                    }
                    
                    console.log(`✅ DM channel setup successful for creator ${creatorId}:`, {
                        channelId: dmChannel.id,
                        memberCount: Object.keys(dmChannel.state.members).length,
                        members: Object.keys(dmChannel.state.members)
                    });
                } catch (dmError) {
                    console.error(`❌ Error setting up DM channel for creator ${creatorId}:`, dmError);
                }

                return { creatorId, success: true };
            } catch (error) {
                console.error(`❌ Error setting up channels for creator ${creatorId}:`, error);
                return { creatorId, success: false, error };
            }
        });

        const results = await Promise.all(setupPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`🎉 Channel pre-setup completed:`, {
            total: creatorIds.length,
            successful: successful.length,
            failed: failed.length
        });

        if (failed.length > 0) {
            console.warn('⚠️ Failed channel setups:', failed);
        }

        return { successful, failed };
    } catch (error) {
        console.error('❌ Error in channel pre-setup:', error);
        throw error;
    }
};

// Create a direct message channel between two users
export async function createDirectMessageChannel(user1Id: string, user2Id: string) {
  try {
    console.log('🔄 Creating direct message channel...');
    console.log('📋 Channel creation details:', {
      user1Id,
      user2Id,
      isConnected,
      connectedUserId
    });

    // Check if we're connected to Stream Chat
    if (!isConnected) {
      console.log('⚠️ Not connected to Stream Chat, attempting to connect...');
      const connected = await connectUser(user1Id);
      if (!connected) {
        throw new Error('Failed to connect to Stream Chat');
      }
    }

    console.log('✅ Stream Chat connection verified');
    
    // Create a custom channel ID for direct messages with consistent format
    const channelId = createDMChannelId(user1Id, user2Id);
    console.log('🏗️ Creating channel with custom ID:', channelId);
    console.log('👥 Channel members:', [user1Id, user2Id]);

    const channel = client.channel('messaging', channelId, {
      members: [user1Id, user2Id],
    });

    console.log('📡 Calling channel.create()...');
    try {
      await channel.create();
    } catch (error: any) {
      // If channel already exists, just watch it instead
      if (error?.message?.includes('already exists') || error?.code === 4) {
        console.log('📺 Channel already exists, watching instead...');
        await channel.watch();
      } else {
        throw error;
      }
    }
    
    console.log('✅ Direct message channel created successfully!');
    console.log('📊 Channel info:', {
      channelId: channel.id,
      channelType: channel.type,
      memberCount: Object.keys(channel.state.members).length,
      members: Object.keys(channel.state.members)
    });

    return channel;
  } catch (error) {
    console.error('❌ Error creating direct message channel:', error);
    console.error('🔍 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Initialize Stream Chat specifically for payment success
export const initializeStreamChatOnPaymentSuccess = async (userId: string) => {
    try {
        console.log('🎉 Initializing Stream Chat after successful payment for user:', userId);

        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error('No current user found');
        }

        // Get or generate cached token (this will generate and cache if not exists)
        const token = await getOrGenerateStreamChatToken(userId);
        console.log('✅ Stream Chat token obtained');

        // Create user object for Stream Chat
        const userObject = {
            id: userId,
            name: currentUser.name || userId,
            image: currentUser.avatar || undefined,
        };

        console.log('🔌 Connecting user to Stream Chat...');
        
        // Connect user to Stream Chat
        await client.connectUser(userObject, token);
        client.setUser(userObject, token);

        // Update connection state
        isConnected = true;
        connectedUserId = userId;

        console.log('✅ Stream Chat initialized successfully after payment!');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Stream Chat on payment success:', error);
        throw error;
    }
}; 