import { StreamChat } from "stream-chat";

// Initialize the Stream Chat client
const client = StreamChat.getInstance("xzrue5uj6btx");

export const initializeStreamChat = async (userId: string, userName: string, userAvatar: string) => {
  try {
    // Connect the user to Stream Chat
    await client.connectUser(
      {
        id: userId,
        name: userName,
        image: userAvatar,
      },
      client.devToken(userId)
    );
    
    return client;
  } catch (error) {
    console.error("Error connecting to Stream Chat:", error);
    throw error;
  }
};

export async function createCreatorChannel(creatorId: string, creatorName: string) {
  try {
    // Create a unique channel ID for this creator
    const channelId = `creator-${creatorId}`;
    
    // Create the channel with proper permissions
    const channel = client.channel('messaging', channelId, {
      members: [creatorId],
      created_by_id: creatorId,
      // Set up channel permissions
      commands: ['giphy'],
      own_capabilities: ['send-message', 'read', 'write'],
      // Allow all users to read and write messages
      read: ['*'],
      write: ['*'],
      // Make the channel public
      public: true,
      // Allow all users to join
      join: ['*'],
    });

    await channel.create();
    return channel;
  } catch (error) {
    console.error('Error creating creator channel:', error);
    throw error;
  }
}

export const disconnectStreamChat = async () => {
  try {
    await client.disconnectUser();
  } catch (error) {
    console.error("Error disconnecting from Stream Chat:", error);
    throw error;
  }
};

export { client };

 