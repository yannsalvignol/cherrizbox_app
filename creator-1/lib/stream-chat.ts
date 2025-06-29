import { StreamChat } from "stream-chat";
import { getCurrentUser } from './appwrite';
import { testStreamTokenGeneration } from './test-stream-token';

// Initialize Stream Chat client
export const client = StreamChat.getInstance("xzrue5uj6btx");

// Global connection state
let isConnected = false;
let connectedUserId: string | null = null;

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
        const tokenResult = await testStreamTokenGeneration();
        if (!tokenResult.success || !tokenResult.token) {
            throw new Error('Failed to generate Stream Chat token');
        }
        const userObject = {
            id: userId,
            name: currentUser.name || userId,
            image: currentUser.avatar || undefined,
        };
        await client.connectUser(userObject, tokenResult.token);
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

export async function createCreatorChannel(creatorId: string, creatorName: string) {
  try {
    // Create a unique channel ID for this creator
    const channelId = `creator-${creatorId}`;
    
    // Create the channel for the creator's group chat
    const channel = client.channel('messaging', channelId, {
      members: [creatorId],
      created_by_id: creatorId
    });

    await channel.create();
    
    // Create an initial welcome message that will serve as the main thread
    const welcomeMessage = await channel.sendMessage({
      text: `Welcome to ${creatorName}'s group chat! This is where the conversation begins.`,
      user_id: creatorId,
      show_in_channel: true
    });

    console.log('Creator channel created with thread support:', channelId);
    return channel;
  } catch (error) {
    console.error('Error creating creator channel:', error);
    throw error;
  }
}

 