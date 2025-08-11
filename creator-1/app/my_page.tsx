import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

export default function MyPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ flex: 1, padding: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ marginRight: 15 }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 24, fontFamily: 'questrial' }}>
            Create Chat Group
          </Text>
        </View>

        {/* Main Content */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ 
            color: 'white', 
            fontSize: 20, 
            fontFamily: 'questrial',
            textAlign: 'center',
            marginBottom: 30
          }}>
            Ready to create your chat group?
          </Text>

          <TouchableOpacity 
            style={{
              backgroundColor: '#FD6F3E',
              padding: 16,
              borderRadius: 12,
              width: '100%',
              alignItems: 'center'
            }}
            onPress={() => router.push('/create-chat-group')}
          >
            <Text style={{ 
              color: 'white', 
              fontSize: 18, 
              fontFamily: 'questrial',
              fontWeight: 'bold'
            }}>
              Create Chat Group
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 