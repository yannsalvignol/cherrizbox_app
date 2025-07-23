import { Client, Databases, Query } from 'react-native-appwrite';
import { config, getCurrentUser } from './appwrite';

const FUNCTION_ID = process.env.EXPO_PUBLIC_FUNCTION_ID;
const FUNCTION_ENDPOINT = `${config.endpoint}/functions/${FUNCTION_ID}/executions`;
const PROFILES_COLLECTION_ID = process.env.EXPO_PUBLIC_PROFILE_COLLECTION_ID;

async function getCreatorId(creatorName: string): Promise<string> {
  try {
    console.log('Looking up creator with name:', creatorName);
    
    if (!config.endpoint || !config.projectId) {
      throw new Error('Appwrite configuration is incomplete');
    }
    
    const client = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId);
    
    const databases = new Databases(client);
    console.log('Querying database:', config.databaseId);
    console.log('Collection:', PROFILES_COLLECTION_ID);
    
    if (!config.databaseId || !PROFILES_COLLECTION_ID) {
      throw new Error('Database configuration is incomplete');
    }
    
    // First try exact match
    let response = await databases.listDocuments(
      config.databaseId,
      PROFILES_COLLECTION_ID,
      [
        Query.equal('creatorsname', creatorName)
      ]
    );

    console.log('Exact match query response:', JSON.stringify(response, null, 2));

    // If no exact match, try case-insensitive search
    if (response.documents.length === 0) {
      console.log('No exact match found, trying case-insensitive search...');
      
      // Get all documents and filter client-side for case-insensitive match
      response = await databases.listDocuments(
        config.databaseId,
        PROFILES_COLLECTION_ID
      );

      const matchingDoc = response.documents.find(doc => 
        doc.creatorsname?.toLowerCase() === creatorName.toLowerCase()
      );

      if (matchingDoc) {
        console.log('Found case-insensitive match:', JSON.stringify(matchingDoc, null, 2));
        return matchingDoc.userId;
      }
    } else if (response.documents.length > 0) {
      console.log('Found exact match:', JSON.stringify(response.documents[0], null, 2));
      return response.documents[0].userId;
    }
    
    // If still no match, log all available creators for debugging
    console.log('Available creators in database:', response.documents.map(doc => ({
      name: doc.creatorsname,
      id: doc.userId
    })));
    
    console.log('No documents found matching creator name:', creatorName);
    throw new Error('Creator not found');
  } catch (error) {
    console.error('Error fetching creator ID:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
} 

export async function cancelSubscription(subscriptionId: string) {
  try {
    console.log('Cancelling subscription:', subscriptionId);
    
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

    console.log('Sending cancellation request to:', FUNCTION_ENDPOINT);
    
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
      console.error('Cancellation failed:', errorText);
      throw new Error(`Failed to cancel subscription: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Cancellation response:', result);

    // Parse the actual response from Appwrite Function's responseBody
    let actualResponse;
    if (result.responseBody) {
      try {
        actualResponse = JSON.parse(result.responseBody);
      } catch (parseError) {
        console.error('Failed to parse response body:', parseError);
        throw new Error('Invalid response format from backend');
      }
    } else {
      actualResponse = result;
    }

    if (!actualResponse.success) {
      throw new Error(actualResponse.error || 'Failed to cancel subscription');
    }

    console.log('Subscription cancelled successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in cancelSubscription:', error);
    throw error;
  }
}

export async function initiatePaymentIntent(amount: number, interval: 'month' | 'year', creatorName: string) {
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

    // Get the creator ID
    const creatorId = await getCreatorId(creatorName);

    const requestBody = {
      path: `/create-payment-intent?creatorName=${encodeURIComponent(creatorName)}&creatorId=${encodeURIComponent(creatorId)}&price=${amount}&interval=${interval}&email=${encodeURIComponent(currentUser.email)}`,
      email: currentUser.email
    };

    console.log('Sending request to backend:', {
      url: FUNCTION_ENDPOINT,
      path: `/create-payment-intent?creatorName=${encodeURIComponent(creatorName)}&creatorId=${encodeURIComponent(creatorId)}&price=${amount}&interval=${interval}&email=${encodeURIComponent(currentUser.email)}`,
      body: requestBody,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': config.projectId,
        'X-Appwrite-User-ID': currentUser.$id
      }
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

    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 404) {
      throw new Error('Payment intent endpoint not found. Please check if the function is properly deployed.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Function execution failed with status ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Backend response text:', responseText);

    try {
      const data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
      
      // Check if this is an Appwrite function execution response
      if (data.responseBody) {
        console.log('Found Appwrite function execution response, extracting responseBody');
        const actualResponse = JSON.parse(data.responseBody);
        console.log('Actual function response:', actualResponse);
        
        if (actualResponse.clientSecret && actualResponse.stripeAccountId) {
          // Return the full object containing clientSecret and stripeAccountId
          return actualResponse;
        } else {
          console.error('Incomplete data in actual response:', actualResponse);
          throw new Error('Incomplete payment data received from server');
        }
      } else if (data.clientSecret && data.stripeAccountId) {
        // Direct response (not wrapped by Appwrite)
        return data;
      } else {
        console.error('Incomplete payment data in response:', data);
        throw new Error('Incomplete payment data received from server');
      }
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      console.error('Raw response was:', responseText);
      throw new Error('Failed to process function response');
    }
  } catch (error) {
    console.error('Payment intent creation error:', error);
    if (error instanceof Error) {
      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
    throw error;
  }
}