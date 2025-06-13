import { Client, Databases, Query } from 'react-native-appwrite';
import { config, getCurrentUser } from './appwrite';

const FUNCTION_ID = '683ecdc6003c80bf5cfd';
const FUNCTION_ENDPOINT = `${config.endpoint}/functions/${FUNCTION_ID}/executions`;
const PROFILES_COLLECTION_ID = '684bdbf90003b8751645';

async function getCreatorId(creatorName: string): Promise<string> {
  try {
    console.log('Looking up creator with name:', creatorName);
    
    const client = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId);
    
    const databases = new Databases(client);
    console.log('Querying database:', config.databaseId);
    console.log('Collection:', PROFILES_COLLECTION_ID);
    
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

export async function initiateSubscription(amount: number, interval: 'month' | 'year', creatorName: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('No active user found');
    }

    if (!currentUser.email) {
      throw new Error('User email is required for subscription');
    }

    // Get the creator ID
    const creatorId = await getCreatorId(creatorName);

    const requestBody = {
      path: `/subscribe?creatorName=${encodeURIComponent(creatorName)}&creatorId=${encodeURIComponent(creatorId)}&price=${amount}&interval=${interval}&email=${encodeURIComponent(currentUser.email)}`,
      email: currentUser.email
    };

    const response = await fetch(FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': config.projectId,
        'X-Appwrite-User-ID': currentUser.$id
      },
      body: JSON.stringify(requestBody)
    });

    if (response.status === 404) {
      throw new Error('Subscription endpoint not found. Please check if the function is properly deployed.');
    }

    if (!response.ok) {
      throw new Error(`Function execution failed with status ${response.status}`);
    }

    try {
      const data = JSON.parse(await response.text());
      
      // Look for the Stripe checkout URL in the location header
      const locationHeader = data.responseHeaders?.find(
        (header: { name: string; value: string }) => header.name === 'location'
      );

      if (locationHeader?.value) {
        return locationHeader.value;
      } else {
        throw new Error('No checkout URL found in response');
      }
    } catch (parseError) {
      throw new Error('Failed to process function response');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Subscription failed: ${error.message}`);
    }
    throw error;
  }
} 

export async function cancelSubscription(subscriptionId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('No active user found');
    }

    const requestBody = {
      path: `/cancel-subscription/${subscriptionId}`,
      email: currentUser.email
    };

    await fetch(FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': config.projectId,
        'X-Appwrite-User-ID': currentUser.$id
      },
      body: JSON.stringify(requestBody)
    });

    return { success: true };
  } catch (error) {
    console.error('Error in cancelSubscription:', error);
    throw error;
  }
}