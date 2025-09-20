import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function Goodbye() {
  const router = useRouter();

  useEffect(() => {
    // Automatically navigate back to profile after 3 seconds
    const timer = setTimeout(() => {
      router.replace('/(root)/(tabs)/profile');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ 
        flex: 1, 
        padding: 20, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Text style={{ 
          fontSize: 40, 
          marginBottom: 20,
          textAlign: 'center'
        }}>
          😢 👋 💔
        </Text>
        
        <Text style={{ 
          color: 'white', 
          fontSize: 28, 
          fontFamily: 'questrial',
          textAlign: 'center',
          marginBottom: 15
        }}>
          Sad to see you go...
        </Text>

        <Text style={{ 
          color: '#FD6F3E', 
          fontSize: 18, 
          fontFamily: 'questrial',
          textAlign: 'center',
          lineHeight: 24
        }}>
          Your chat group has been deleted.
        </Text>
      </View>
    </SafeAreaView>
  );
} 