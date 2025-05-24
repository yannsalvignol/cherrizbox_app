import { Ionicons } from '@expo/vector-icons';
import { Query } from 'appwrite';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { config, databases, getCurrentUser } from '../lib/appwrite';

export default function ConfirmDeleteChat() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const user = await getCurrentUser();
      
      if (!user?.$id) {
        throw new Error('User not found');
      }

      // Get all photos for this user
      const response = await databases.listDocuments(
        config.databaseId,
        config.photoCollectionId,
        [
          Query.equal('IdCreator', user.$id)
        ]
      );

      // Delete each photo document
      const deletePromises = response.documents.map(doc => 
        databases.deleteDocument(
          config.databaseId,
          config.photoCollectionId,
          doc.$id
        )
      );

      await Promise.all(deletePromises);
      
      // Navigate to goodbye page after successful deletion
      router.replace('/goodbye');
    } catch (error) {
      console.error('Error deleting chat group:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      <View style={{ flex: 1, padding: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 24, fontFamily: 'questrial' }}>
            Delete Chat Group
          </Text>
        </View>

        {/* Warning Icon */}
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <View style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 40, 
            backgroundColor: '#FF4444', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 20
          }}>
            <Ionicons name="warning" size={40} color="white" />
          </View>
        </View>

        {/* Warning Message */}
        <View style={{ marginBottom: 40 }}>
          <Text style={{ 
            color: 'white', 
            fontSize: 24, 
            fontFamily: 'questrial',
            textAlign: 'center',
            marginBottom: 15
          }}>
            Are you sure you want to delete your chat group?
          </Text>
          <Text style={{ 
            color: '#FF4444', 
            fontSize: 16, 
            fontFamily: 'questrial',
            textAlign: 'center',
            lineHeight: 24
          }}>
            This action cannot be undone. All messages, members, and content will be permanently deleted.
          </Text>
        </View>

        {/* Buttons */}
        <View style={{ gap: 15 }}>
          <TouchableOpacity 
            style={{
              backgroundColor: '#FF4444',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              opacity: isDeleting ? 0.7 : 1
            }}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ 
                color: 'white', 
                fontSize: 18, 
                fontFamily: 'questrial',
                fontWeight: 'bold'
              }}>
                Yes, Delete My Chat Group
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={{
              backgroundColor: '#1A1A1A',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#FB2355'
            }}
            onPress={() => router.back()}
            disabled={isDeleting}
          >
            <Text style={{ 
              color: 'white', 
              fontSize: 18, 
              fontFamily: 'questrial'
            }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 