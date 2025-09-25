import { Client, Databases, Query } from 'react-native-appwrite';
import { config, getCurrentUser } from './appwrite';

const FUNCTION_ID = process.env.EXPO_PUBLIC_STRIPE_FUNCTION_ID;
const FUNCTION_ENDPOINT = `${config.endpoint}/functions/${FUNCTION_ID}/executions`;
const CHAT_SUBSCRIPTIONS_COLLECTION_ID = process.env.EXPO_PUBLIC_CHAT_SUBSCRIPTIONS_COLLECTION_ID;
const DAILY_LIMITS_COLLECTION_ID = process.env.EXPO_PUBLIC_DAILY_LIMITS_COLLECTION_ID;

// Platform's own Stripe account ID (this is the platform itself, not a creator)
const PLATFORM_STRIPE_ACCOUNT_ID = process.env.EXPO_PUBLIC_PLATFORM_STRIPE_ACCOUNT_ID || 'platform';

const client = new Client()
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!);

const databases = new Databases(client);

interface ChatSubscription {
  $id?: string;
  userId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  planType: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  startDate: string;
  endDate?: string;
  cancelledAt?: string;
  nextBillingDate?: string;
}

// Check if user has an active chat subscription
export async function hasActiveChatSubscription(userId: string): Promise<boolean> {
  try {
    if (!CHAT_SUBSCRIPTIONS_COLLECTION_ID) {
      console.log('📋 [ChatSubscription] Collection ID not configured, assuming no subscription');
      return false;
    }

    const response = await databases.listDocuments(
      config.databaseId!,
      CHAT_SUBSCRIPTIONS_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('status', 'active'),
        Query.limit(1)
      ]
    );

    const hasSubscription = response.documents.length > 0;
    console.log('✅ [ChatSubscription] User subscription status:', { userId, hasSubscription });
    
    return hasSubscription;
  } catch (error) {
    console.error('❌ [ChatSubscription] Error checking subscription status:', error);
    return false;
  }
}

// Get user's active chat subscription details
export async function getActiveChatSubscription(userId: string): Promise<ChatSubscription | null> {
  try {
    if (!CHAT_SUBSCRIPTIONS_COLLECTION_ID) {
      return null;
    }

    const response = await databases.listDocuments(
      config.databaseId!,
      CHAT_SUBSCRIPTIONS_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('status', 'active'),
        Query.limit(1)
      ]
    );

    if (response.documents.length > 0) {
      return response.documents[0] as ChatSubscription;
    }
    
    return null;
  } catch (error) {
    console.error('❌ [ChatSubscription] Error getting subscription details:', error);
    return null;
  }
}

// Cancel chat subscription
export async function cancelChatSubscription(subscriptionId: string) {
  try {
    console.log('🚫 [ChatSubscription] Cancelling chat subscription:', subscriptionId);
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('No active user found');
    }

    if (!FUNCTION_ID || !config.projectId) {
      throw new Error('Function configuration is incomplete');
    }

    const requestBody = {
      path: `/cancel-subscription/${subscriptionId}`,
      email: currentUser.email
    };

    console.log('📡 [ChatSubscription] Sending cancellation request to:', FUNCTION_ENDPOINT);
    
    const response = await fetch(FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': config.projectId,
        'X-Appwrite-User-ID': currentUser.$id
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ChatSubscription] Cancellation failed:', errorText);
      throw new Error(`Failed to cancel subscription: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📋 [ChatSubscription] Cancellation response:', result);

    // Parse the actual response from Appwrite Function's responseBody
    let actualResponse;
    if (result.responseBody) {
      try {
        actualResponse = JSON.parse(result.responseBody);
      } catch (parseError) {
        console.error('❌ [ChatSubscription] Failed to parse response body:', parseError);
        throw new Error('Invalid response format from backend');
      }
    } else {
      actualResponse = result;
    }

    if (!actualResponse.success) {
      throw new Error(actualResponse.error || 'Failed to cancel subscription');
    }

    console.log('✅ [ChatSubscription] Subscription cancelled successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ [ChatSubscription] Error in cancelChatSubscription:', error);
    throw error;
  }
}

export async function createChatSubscriptionPaymentIntent(
  amount: number, 
  interval: string,
  creatorName?: string,
  creatorId?: string,
  currency?: string
): Promise<{ clientSecret: string; stripeAccountId: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('No active user found');
    }

    if (!currentUser.email) {
      throw new Error('User email is required for payment');
    }

    if (!FUNCTION_ID) {
      throw new Error('Function ID is not configured');
    }

    if (!config.projectId) {
      throw new Error('Project ID is not configured');
    }

    // For chat subscriptions, we use a special creator name and ID
    // This will be handled by the backend to route to the platform's account
    const finalCreatorName = creatorName || 'Cherrybox Platform';
    const finalCreatorId = creatorId || PLATFORM_STRIPE_ACCOUNT_ID;
    const finalCurrency = currency || 'usd';
    
    const requestBody = {
      path: `/create-payment-intent?creatorName=${encodeURIComponent(finalCreatorName)}&creatorId=${encodeURIComponent(finalCreatorId)}&price=${amount}&interval=${interval}&email=${encodeURIComponent(currentUser.email)}&currency=${finalCurrency}&isChatSubscription=true`,
      email: currentUser.email
    };

    console.log('💳 [ChatSubscription] Creating payment intent for chat subscription:', {
      amount,
      interval,
      email: currentUser.email,
      currency: finalCurrency
    });

    const response = await fetch(FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': config.projectId,
        'X-Appwrite-User-ID': currentUser.$id
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 [ChatSubscription] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ChatSubscription] Backend error response:', errorText);
      throw new Error(`Function execution failed with status ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('📄 [ChatSubscription] Backend response text:', responseText);

    try {
      const data = JSON.parse(responseText);
      console.log('📦 [ChatSubscription] Parsed response data:', data);
      
      // Check if this is an Appwrite function execution response
      if (data.responseBody) {
        const actualResponse = JSON.parse(data.responseBody);
        console.log('✅ [ChatSubscription] Actual function response:', actualResponse);
        
        if (actualResponse.clientSecret) {
          // For platform subscriptions, stripeAccountId can be null
          return {
            clientSecret: actualResponse.clientSecret,
            stripeAccountId: actualResponse.stripeAccountId || null
          };
        } else {
          throw new Error('Missing client secret in payment response');
        }
      } else if (data.clientSecret) {
        // Direct response (not wrapped by Appwrite)
        return {
          clientSecret: data.clientSecret,
          stripeAccountId: data.stripeAccountId || null
        };
      } else {
        throw new Error('Missing client secret in payment response');
      }
    } catch (parseError) {
      console.error('❌ [ChatSubscription] Failed to parse response:', parseError);
      throw new Error('Failed to process function response');
    }
  } catch (error) {
    console.error('❌ [ChatSubscription] Payment intent creation error:', error);
    if (error instanceof Error) {
      throw new Error(`Chat subscription payment failed: ${error.message}`);
    }
    throw error;
  }
}
