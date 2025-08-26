import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CherryLoadingIndicator } from '../components/CherryLoadingIndicator';

export default function Delete() {
  const router = useRouter();
  const { success } = useLocalSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);

  // Prevent back navigation completely
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        return true; // Prevent going back
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription?.remove();
    }, [])
  );

  useEffect(() => {
    // Check if success parameter is passed
    if (success === 'true') {
      setShowSuccess(true);
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        // Clear all navigation history and go to login
        router.dismissAll();
        router.replace('/log-in');
      }, 3000);
    }
  }, [router, success]);

  if (showSuccess) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          paddingHorizontal: 32
        }}>
          {/* Success Icon */}
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#4CAF50',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 40
          }}>
            <Ionicons name="checkmark" size={60} color="white" />
          </View>
          
          {/* Success message */}
          <Text style={{
            color: 'white',
            fontSize: 24,
            fontFamily: 'Urbanist-Bold',
            textAlign: 'center',
            marginBottom: 16
          }}>
            Account Deleted Successfully
          </Text>
          
          <Text style={{
            color: '#CCCCCC',
            fontSize: 16,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center',
            lineHeight: 24,
            marginBottom: 32
          }}>
            Your account has been completely deleted and all subscriptions have been cancelled.
          </Text>

          <Text style={{
            color: '#888888',
            fontSize: 14,
            fontFamily: 'Urbanist-Regular',
            textAlign: 'center'
          }}>
            Redirecting to login...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingHorizontal: 32
      }}>
        {/* Big Cherry Loading Indicator */}
        <CherryLoadingIndicator size={120} />
        
        {/* Deletion in progress text */}
        <Text style={{
          color: 'white',
          fontSize: 24,
          fontFamily: 'Urbanist-Bold',
          textAlign: 'center',
          marginTop: 40,
          marginBottom: 16
        }}>
          Deleting Account
        </Text>
        
        <Text style={{
          color: '#CCCCCC',
          fontSize: 16,
          fontFamily: 'Urbanist-Regular',
          textAlign: 'center',
          lineHeight: 24
        }}>
          We're cancelling your subscriptions and removing your data. This may take a few moments.
        </Text>
      </View>
    </SafeAreaView>
  );
}
