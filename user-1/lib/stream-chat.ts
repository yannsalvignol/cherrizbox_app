import { StreamChat } from 'stream-chat';
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

        // Get server-side token from our Appwrite function
        const tokenResult = await testStreamTokenGeneration();
        if (!tokenResult.success || !tokenResult.token) {
            throw new Error('Failed to generate Stream Chat token');
        }
        
        // Create user object for Stream Chat
        const userObject = {
                id: userId,
                name: currentUser.name || userId,
                image: currentUser.avatar || undefined,
        };

        // Connect user to Stream Chat (this will create the user if it doesn't exist)
        await client.connectUser(userObject, tokenResult.token);

        // Enable file uploads - setUser requires both user object and token
        client.setUser(userObject, tokenResult.token);

        // Update connection state
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
    
    // Create a custom channel ID for direct messages
    const channelId = `dm-${user1Id}-${user2Id}`;
    console.log('🏗️ Creating channel with custom ID:', channelId);
    console.log('👥 Channel members:', [user1Id, user2Id]);

    const channel = client.channel('messaging', channelId, {
      members: [user1Id, user2Id],
    });

    console.log('📡 Calling channel.create()...');
    await channel.create();
    
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