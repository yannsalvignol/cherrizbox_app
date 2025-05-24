import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadProfilePicture } from '../../../lib/appwrite';

export default function MyPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleImportPhoto = async () => {
    try {
      setLoading(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
        setLoading(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const uploadResult = await uploadProfilePicture({
          uri: manipResult.uri,
          type: 'image/jpeg',
          name: asset.fileName || 'imported_photo.jpg',
        });
        if (uploadResult && uploadResult.imageUrl) {
          router.push({ pathname: '/my_page2', params: { imageUrl: uploadResult.imageUrl } });
        } else {
          Alert.alert('Error', 'Failed to get uploaded image URL.');
        }
      }
    } catch (error) {
      console.error('Error importing photo:', error);
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1, padding: 24 }}>
        {/* Header */}
        <View style={{ marginTop: 40, marginBottom: 30, alignItems: 'center' }}>
          <Image
            source={require('../../../assets/images/cherry-creator.png')}
            style={{ width: 120, height: 120, marginBottom: 24 }}
            resizeMode="contain"
          />
          <Text style={{ 
            color: '#fff',
            fontSize: 40,
            fontFamily: 'questrial',
            fontWeight: '700',
            textAlign: 'center',
            letterSpacing: 1.2,
            textShadowColor: 'rgba(251,35,85,0.25)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8
          }}>
            Let's start
          </Text>
        </View>

        {/* Main Content */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={handleImportPhoto}
            disabled={loading}
            style={{
              height: 200,
              borderWidth: 2,
              borderColor: '#FB2355',
              borderStyle: 'dashed',
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(251, 35, 85, 0.05)',
              opacity: loading ? 0.5 : 1,
              marginTop: -30
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FB2355" size="large" />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Image
                  source={require('../../../assets/icon/import.png')}
                  style={{ width: 48, height: 48, marginBottom: 16, tintColor: '#FB2355' }}
                  resizeMode="contain"
                />
                <Text style={{ 
                  color: '#FB2355',
                  fontSize: 18,
                  fontFamily: 'questrial',
                  marginBottom: 8
                }}>
                  Drop your photo here
                </Text>
                <Text style={{ 
                  color: '#666',
                  fontSize: 14,
                  fontFamily: 'questrial'
                }}>
                  or tap to browse
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={{ 
            color: '#666',
            fontSize: 14,
            fontFamily: 'questrial',
            textAlign: 'center',
            marginTop: 24,
            lineHeight: 20
          }}>
            For best results, use a photo with{'\n'}
            good lighting and clear details
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
