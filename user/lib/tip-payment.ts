import { config } from './appwrite';

export interface TipPaymentData {
  amount: number;
  currency: string;
  userId: string;
  creatorId: string;
  creatorName: string;
  contentId: string;
}

export const createTipPaymentIntent = async (
  amount: number, 
  interval: string, 
  creatorName: string, 
  currency?: string,
  currentChannel?: any,
  userId?: string
) => {
  try {
    // Get the actual creator user ID from the current channel members
    let actualCreatorId = creatorName; // fallback to creator name
    
    if (currentChannel && currentChannel.state?.members) {
      const members = Object.keys(currentChannel.state.members);
      console.log('📋 Channel members:', members);
      console.log('👤 Current user ID:', userId);
      
      // Find the other participant (not the current user)
      const otherMember = members.find(memberId => memberId !== userId);
      if (otherMember) {
        actualCreatorId = otherMember;
        console.log(' Found actual creator ID from channel:', actualCreatorId);
      } else {
        console.log('  Could not find other member, using creator name as fallback:', creatorName);
      }
    } else {
      console.log('  No channel or members available, using creator name as fallback:', creatorName);
    }
    
    // Use the same structure as the working paid content function
    const functionId = process.env.EXPO_PUBLIC_STRIPE_FUNCTION_ID;
    const backendUrl = `${config.endpoint}/functions/${functionId}/executions`;
    
    const requestBody = {
      path: '/create-paid-content-payment-intent',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents for Stripe
        currency: currency || 'usd',
        metadata: {
          userId: userId || 'anonymous',
          creatorId: actualCreatorId, // Use actual creator ID from channel members
          creatorName: creatorName,
          contentId: `tip_${Date.now()}`, // Unique ID for this tip
          contentType: 'tip',
          imageUrl: '', // No image for tips
          paymentType: 'tip'
        }
      })
    };
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': config.projectId || '',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('  Backend error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    
    // Parse the actual response from Appwrite Function's responseBody
    let actualResponse;
    if (data.responseBody) {
      try {
        actualResponse = JSON.parse(data.responseBody);
      } catch (parseError) {
        console.error('  Failed to parse responseBody:', parseError);
        throw new Error('Invalid response format from backend');
      }
    } else {
      actualResponse = data;
    }
    
    if (!actualResponse.success) {
      console.error('  Backend returned success: false');
      throw new Error(actualResponse.error || 'Failed to create payment intent');
    }

    return {
      clientSecret: actualResponse.clientSecret,
      stripeAccountId: actualResponse.stripeAccountId
    };
  } catch (error) {
    console.error('Error creating tip payment intent:', error);
    throw error;
  }
};