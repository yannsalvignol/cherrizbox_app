import { config, getCurrentUser } from './appwrite';

const FUNCTION_ID = '683ecdc6003c80bf5cfd';
const FUNCTION_ENDPOINT = `${config.endpoint}/functions/${FUNCTION_ID}/executions`;

export async function initiateSubscription() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('No active user found');
    }

    if (!currentUser.email) {
      throw new Error('User email is required for subscription');
    }

    console.log('Initiating subscription with user ID:', currentUser.$id);
    console.log('User email:', currentUser.email);

    const requestBody = {
      path: '/subscribe',
      email: currentUser.email
    };

    console.log('Request body:', JSON.stringify(requestBody));

    const response = await fetch(FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': config.projectId,
        'X-Appwrite-User-ID': currentUser.$id
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    const responseData = await response.text();
    console.log('Response data:', responseData);

    if (response.status === 404) {
      throw new Error('Subscription endpoint not found. Please check if the function is properly deployed.');
    }

    if (!response.ok) {
      throw new Error(`Function execution failed with status ${response.status}`);
    }

    try {
      const data = JSON.parse(responseData);
      
      // Look for the Stripe checkout URL in the location header
      const locationHeader = data.responseHeaders?.find(
        (header: { name: string; value: string }) => header.name === 'location'
      );

      if (locationHeader?.value) {
        console.log('Found Stripe checkout URL:', locationHeader.value);
        return locationHeader.value;
      } else {
        console.error('No location header found in response:', data);
        throw new Error('No checkout URL found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      throw new Error('Failed to process function response');
    }
  } catch (error) {
    console.error('Detailed subscription error:', error);
    if (error instanceof Error) {
      throw new Error(`Subscription failed: ${error.message}`);
    }
    throw error;
  }
} 