import { ExecutionMethod, Functions } from 'react-native-appwrite';
import { account, client } from './appwrite';

export async function testStreamTokenGeneration() {
    try {
        console.log('Starting token generation test...');

        // First ensure we're logged in
        console.log('Checking current user...');
        const currentUser = await account.get();
        if (!currentUser) {
            throw new Error("User not authenticated");
        }
        console.log('Current user found:', currentUser.$id);

        // Initialize Functions service
        console.log('Initializing Functions service...');
        const functions = new Functions(client);

        // Call the Appwrite function
        console.log('Calling Appwrite function...');
        try {
            const response = await functions.createExecution(
                '685144410010169bde69',
                '', // No need to send session token in body
                false,
                '/generate-token',
                ExecutionMethod.POST,
                {
                    'Content-Type': 'application/json'
                }
            );
            console.log('Function response received:', response);

            if (!response.responseBody) {
                throw new Error('Empty response from function');
            }

            const result = JSON.parse(response.responseBody);
            console.log('Parsed response:', result);

            if (!result.success) {
                throw new Error(result.error || 'Unknown error from function');
            }

            return result;
        } catch (executionError: any) {
            console.error('Function execution error details:', {
                name: executionError?.name,
                message: executionError?.message,
                code: executionError?.code,
                type: executionError?.type,
                response: executionError?.response
            });
            throw new Error(`Function execution failed: ${executionError?.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error testing Stream Chat token generation:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
        throw error;
    }
} 