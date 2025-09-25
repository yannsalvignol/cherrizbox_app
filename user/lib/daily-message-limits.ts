import { Client, Databases, ID, Query } from 'react-native-appwrite';
import { config } from './appwrite';
import { hasActiveChatSubscription } from './chat-subscription';

// Collection ID for daily message limits
const DAILY_LIMITS_COLLECTION_ID = process.env.EXPO_PUBLIC_DAILY_LIMITS_COLLECTION_ID;

interface DailyMessageLimit {
  $id?: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  totalMessages: number;
  lastMessageAt: string;
  isPaid?: boolean; // Track if user has active subscription
  $createdAt?: string;
  $updatedAt?: string;
}

const client = new Client()
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!);

const databases = new Databases(client);

// Get today's date in YYYY-MM-DD format
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get daily message count for user
export const getDailyMessageLimit = async (
  userId: string
): Promise<{ count: number; canSend: boolean; remaining: number; hasSubscription: boolean }> => {
  try {
    // First check if user has an active subscription
    const hasSubscription = await hasActiveChatSubscription(userId);
    console.log('💳 [DailyLimits] User subscription status:', { userId, hasSubscription });
    
    // If user has subscription, they have unlimited messages but we still track count
    if (hasSubscription) {
      // Still get the message count for tracking purposes
      if (!DAILY_LIMITS_COLLECTION_ID) {
        return { count: 0, canSend: true, remaining: 999999, hasSubscription: true };
      }

      const today = getTodayString();
      const response = await databases.listDocuments(
        config.databaseId!,
        DAILY_LIMITS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('date', today),
          Query.limit(1)
        ]
      );

      let messageCount = 0;
      if (response.documents.length > 0) {
        messageCount = response.documents[0].totalMessages;
      }

      console.log('💳 [DailyLimits] Subscriber message count:', { messageCount, hasSubscription });

      return { 
        count: messageCount, 
        canSend: true, 
        remaining: 999999, // Large number to indicate unlimited
        hasSubscription: true 
      };
    }

    if (!DAILY_LIMITS_COLLECTION_ID) {
      console.error('❌ [DailyLimits] Missing EXPO_PUBLIC_DAILY_LIMITS_COLLECTION_ID');
      return { count: 0, canSend: true, remaining: 5, hasSubscription: false }; // Allow if not configured
    }

    const today = getTodayString();
    console.log('📊 [DailyLimits] Checking daily limit for:', { userId, today });

    // Query for today's record
    const response = await databases.listDocuments(
      config.databaseId!,
      DAILY_LIMITS_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('date', today),
        Query.limit(1)
      ]
    );

    let messageCount = 0;
    
    if (response.documents.length > 0) {
      messageCount = response.documents[0].totalMessages;
      console.log('📋 [DailyLimits] Found existing record:', { messageCount });
    } else {
      console.log('📋 [DailyLimits] No record found for today, starting fresh');
    }

    const remaining = Math.max(0, 5 - messageCount);
    const canSend = messageCount < 5;

    console.log('✅ [DailyLimits] Limit check result:', { 
      count: messageCount, 
      canSend, 
      remaining,
      hasSubscription 
    });

    return { count: messageCount, canSend, remaining, hasSubscription };

  } catch (error) {
    console.error('❌ [DailyLimits] Error checking daily limit:', error);
    // Return permissive values on error to avoid blocking users
    return { count: 0, canSend: true, remaining: 5, hasSubscription: false };
  }
};

// Increment message count for user
export const incrementDailyMessageCount = async (
  userId: string
): Promise<{ success: boolean; newCount: number; hasSubscription: boolean }> => {
  try {
    // Check if user has subscription first
    const hasSubscription = await hasActiveChatSubscription(userId);
    
    // Track message count for both subscribers and non-subscribers (for analytics)
    console.log('💳 [DailyLimits] Tracking message count for user:', { userId, hasSubscription });

    if (!DAILY_LIMITS_COLLECTION_ID) {
      console.error('❌ [DailyLimits] Missing EXPO_PUBLIC_DAILY_LIMITS_COLLECTION_ID');
      return { success: true, newCount: 1, hasSubscription: false }; // Allow if not configured
    }

    const today = getTodayString();
    const now = new Date().toISOString();
    
    console.log('📈 [DailyLimits] Incrementing message count for:', { userId, today });

    // Query for today's record
    const response = await databases.listDocuments(
      config.databaseId!,
      DAILY_LIMITS_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('date', today),
        Query.limit(1)
      ]
    );

    let newCount = 1;

    if (response.documents.length > 0) {
      // Update existing record
      const existingDoc = response.documents[0];
      newCount = existingDoc.totalMessages + 1;
      
      await databases.updateDocument(
        config.databaseId!,
        DAILY_LIMITS_COLLECTION_ID,
        existingDoc.$id,
        {
          totalMessages: newCount,
          lastMessageAt: now
        }
      );
      
      console.log('📊 [DailyLimits] Updated existing record:', { newCount });
    } else {
      // Create new record
      await databases.createDocument(
        config.databaseId!,
        DAILY_LIMITS_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          date: today,
          totalMessages: newCount,
          lastMessageAt: now
        }
      );
      
      console.log('📊 [DailyLimits] Created new record:', { newCount });
    }

    return { success: true, newCount, hasSubscription };

  } catch (error) {
    console.error('❌ [DailyLimits] Error incrementing message count:', error);
    return { success: false, newCount: 0, hasSubscription: false };
  }
};

// Reset daily limits (for testing or admin purposes)
export const resetDailyLimit = async (
  userId: string
): Promise<boolean> => {
  try {
    if (!DAILY_LIMITS_COLLECTION_ID) {
      return true;
    }

    const today = getTodayString();
    
    const response = await databases.listDocuments(
      config.databaseId!,
      DAILY_LIMITS_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('date', today),
        Query.limit(1)
      ]
    );

    if (response.documents.length > 0) {
      await databases.updateDocument(
        config.databaseId!,
        DAILY_LIMITS_COLLECTION_ID,
        response.documents[0].$id,
        {
          totalMessages: 0,
          lastMessageAt: new Date().toISOString()
        }
      );
      
      console.log('🔄 [DailyLimits] Reset daily limit for:', { userId });
    }

    return true;
  } catch (error) {
    console.error('❌ [DailyLimits] Error resetting daily limit:', error);
    return false;
  }
};
