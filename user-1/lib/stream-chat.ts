import { StreamChat } from 'stream-chat';
import { getCurrentUser } from './appwrite';

// Initialize Stream Chat client
export const client = StreamChat.getInstance("xzrue5uj6btx");

// Function to connect user to Stream Chat
export const connectUser = async (userId: string) => {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error('No current user found');
        }

        const token = client.devToken(userId);
        
        await client.connectUser(
            {
                id: userId,
                name: currentUser.name || userId,
                image: currentUser.avatar || undefined,
            },
            token
        );
        return true;
    } catch (error) {
        console.error('Error connecting user to Stream Chat:', error);
        return false;
    }
};

// Function to disconnect user from Stream Chat
export const disconnectUser = async () => {
    try {
        await client.disconnectUser();
        return true;
    } catch (error) {
        console.error('Error disconnecting user from Stream Chat:', error);
        return false;
    }
}; 