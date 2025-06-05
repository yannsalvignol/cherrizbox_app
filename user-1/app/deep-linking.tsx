import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';

export function useDeepLinking() {
  const router = useRouter();

  useEffect(() => {
    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep links when app is opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    if (url.includes('cherrybox://success')) {
      Alert.alert(
        'Payment Successful!',
        'Your subscription has been activated successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(root)/payment-success')
          }
        ]
      );
    } else if (url.includes('cherrybox://failure')) {
      Alert.alert(
        'Payment Failed',
        'There was an issue processing your payment. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  };
}

// Add default export
export default function DeepLinkingProvider() {
  useDeepLinking();
  return null;
} 