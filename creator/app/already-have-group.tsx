import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function AlreadyHaveGroup() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.back();
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
        <View style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 40, 
          backgroundColor: '#FD6F3E', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: 20
        }}>
          <Ionicons name="chatbubble-ellipses" size={40} color="white" />
        </View>
        
        <Text style={{ 
          color: 'white', 
          fontSize: 28, 
          fontFamily: 'questrial',
          textAlign: 'center',
          marginBottom: 15
        }}>
          Chat Group Active
        </Text>

        <Text style={{ 
          color: '#FD6F3E', 
          fontSize: 18, 
          fontFamily: 'questrial',
          textAlign: 'center',
          lineHeight: 24
        }}>
          You already have an active chat group.
        </Text>
      </View>
    </SafeAreaView>
  );
} 