import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { ID, Query } from 'appwrite';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Keyboard, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Vibration, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config, databases, getUserPhoto, getUserProfile, updateCreatorPayment, updateUserProfile, uploadProfilePicture } from '../../../lib/appwrite';
import { useGlobalContext } from '../../../lib/global-provider';
import ProfilePreview from '../../components/ProfilePreview';

interface ProfileData {
  userId: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  profileImageUri?: string;
  Location: string;
  creatorsname: string;
  topics: string;
  bio: string;
}

const countries = [
  { name: 'United States', code: '+1', flag: '🇺🇸', format: '(XXX) XXX-XXXX' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', format: '(XXX) XXX-XXXX' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', format: 'XXXX XXXXXX' },
  { name: 'France', code: '+33', flag: '🇫🇷', format: 'X XX XX XX XX' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', format: 'XXX XXXXXXX' },
  { name: 'Italy', code: '+39', flag: '🇮🇹', format: 'XXX XXX XXXX' },
  { name: 'Spain', code: '+34', flag: '🇪🇸', format: 'XXX XXX XXX' },
  { name: 'China', code: '+86', flag: '🇨🇳', format: 'XXX XXXX XXXX' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', format: 'XX XXXX XXXX' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷', format: 'XX XXXX XXXX' },
  { name: 'India', code: '+91', flag: '🇮🇳', format: 'XXXXX XXXXX' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', format: 'X XXXX XXXX' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', format: '(XX) XXXXX-XXXX' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽', format: 'XXX XXX XXXX' },
  { name: 'Russia', code: '+7', flag: '🇷🇺', format: 'XXX XXX-XX-XX' },
];

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
];

const genders = [
  { value: 'male', label: 'Male', icon: '👨' },
  { value: 'female', label: 'Female', icon: '👩' },
  { value: 'other', label: 'Other', icon: '👤' },
];

// Trending topics (flattened)
const trendingTopics = [
  "Music", "Gaming", "Sports", "Comedy", "Food", "Travel", "Fashion", "Tech",
  "Movies", "Fitness", "Art", "Science", "History", "Anime", "Photography", "DIY",
  "Health", "Nature", "Coding", "Writing", "Gossip", "Politics", "Space", "Animals", "Cars"
];

export default function EditProfile() {
  const router = useRouter();
  const { user: globalUser, refreshChannelConditions } = useGlobalContext();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('1');
  const [selectedDay, setSelectedDay] = useState('1');
  const [selectedYear, setSelectedYear] = useState('2000');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [selectedGender, setSelectedGender] = useState<typeof genders[0] | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [location, setLocation] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [yearlyPrice, setYearlyPrice] = useState('');
  const [savingPrices, setSavingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [showBioModal, setShowBioModal] = useState(false);
  const [tempBio, setTempBio] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempLocation, setTempLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCreatorNameModal, setShowCreatorNameModal] = useState(false);
  const [tempCreatorName, setTempCreatorName] = useState('');
  const [creatorNameError, setCreatorNameError] = useState<string | null>(null);
  const [checkingCreatorName, setCheckingCreatorName] = useState(false);
  const [showCreatorNameWarning, setShowCreatorNameWarning] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [userPhotoThumbnail, setUserPhotoThumbnail] = useState<string | null>(null);
  const [compressedThumbnail, setCompressedThumbnail] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState<string>('');
  const [photoState, setPhotoState] = useState<string>('');
  const [showPhoneNumberModal, setShowPhoneNumberModal] = useState(false);
  const [tempPhoneNumber, setTempPhoneNumber] = useState('');


  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Function to format phone number according to country format
  const formatPhoneNumber = (digits: string, format: string): string => {
    if (!digits || !format) return digits;
    
    let result = '';
    let digitIndex = 0;
    
    for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
      if (format[i] === 'X') {
        result += digits[digitIndex];
        digitIndex++;
      } else {
        result += format[i];
      }
    }
    
    return result;
  };

  // Function to check if creator name is already taken
  const checkCreatorNameAvailability = async (name: string): Promise<boolean> => {
    if (!name || name.trim() === '') return false;
    
    try {
      setCheckingCreatorName(true);
      setCreatorNameError(null);
      
      const { databases, config } = await import('../../../lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Check if any other user has this creator name
      const existingUsers = await databases.listDocuments(
        config.databaseId,
        config.profileCollectionId,
        [
          Query.equal('creatorsname', name.trim()),
          Query.notEqual('userId', globalUser?.$id || '') // Exclude current user
        ]
      );
      
      return existingUsers.documents.length === 0;
    } catch (error) {
      console.error('Error checking creator name availability:', error);
      return false;
    } finally {
      setCheckingCreatorName(false);
    }
  };

  const days = Array.from(
    { length: getDaysInMonth(parseInt(selectedMonth), parseInt(selectedYear)) },
    (_, i) => (i + 1).toString()
  );

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (globalUser) {
          setName(globalUser.name || '');
          setEmail(globalUser.email || '');
          
          // Load profile data from Appwrite
          const profile = await getUserProfile(globalUser.$id);
          if (profile) {
            // Set profile image if exists
            if (profile.profileImageUri) {
              setProfileImage(profile.profileImageUri);
            }

            // Set gender if exists
            if (profile.gender) {
              const genderOption = genders.find(g => g.value === profile.gender);
              if (genderOption) {
                setSelectedGender(genderOption);
              }
            }

            // Set phone number if exists
            if (profile.phoneNumber) {
              // Extract country code and digits
              const country = countries.find(c => profile.phoneNumber.startsWith(c.code));
              if (country) {
                setSelectedCountry(country);
                setPhoneNumber(profile.phoneNumber.slice(country.code.length));
              } else {
                setPhoneNumber(profile.phoneNumber);
              }
            }

            // Set birth date if exists
            if (profile.dateOfBirth) {
              const [year, month, day] = profile.dateOfBirth.split('-');
              setSelectedYear(year);
              setSelectedMonth(month);
              setSelectedDay(day);
            }

            // Set location if exists
            if (profile.Location) {
              setLocation(profile.Location);
            }

            // Set creator's name if exists
            if (profile.creatorsname) {
              setCreatorName(profile.creatorsname);
            }

            // Check if channel is already created (account_state is 'ok')
            if (globalUser?.$id) {
              try {
                const userDocs = await databases.listDocuments(
                  config.databaseId,
                  config.userCollectionId,
                  [Query.equal('creatoraccountid', globalUser.$id)]
                );
                
                if (userDocs.documents.length > 0) {
                  const userDoc = userDocs.documents[0];
                  if (userDoc.account_state === 'ok') {
                    setShowCreatorNameWarning(true);
                  }
                }
              } catch (error) {
                console.error('Error checking channel status:', error);
              }
            }

            // Set topics if exists
            if (profile.topics) {
              setTopics(
                typeof profile.topics === 'string'
                  ? profile.topics.split(',').map(t => t.trim()).filter(Boolean)
                  : Array.isArray(profile.topics)
                    ? profile.topics
                    : []
              );
            }

            // Set bio if exists
            if (profile.ProfilesBio) {
              setBio(profile.ProfilesBio);
            }

            // Load user's photo from photos collection
            if (globalUser?.$id) {
              const userPhoto = await getUserPhoto(globalUser.$id);
              if (userPhoto && userPhoto.thumbnail) {
                setUserPhotoThumbnail(userPhoto.thumbnail);
                setCompressedThumbnail(userPhoto.compressed_thumbnail);
                setPhotoTitle(userPhoto.title);
                setPhotoState(userPhoto.state || '');
              }
              // Extract pricing from payment attribute
              if (userPhoto && userPhoto.payment) {
                try {
                  const paymentData = JSON.parse(userPhoto.payment);
                  if (paymentData.monthlyPrice) {
                    setMonthlyPrice(paymentData.monthlyPrice.toString());
                  }
                  if (paymentData.yearlyPrice) {
                    setYearlyPrice(paymentData.yearlyPrice.toString());
                  }
                } catch (error) {
                  console.error('Error parsing payment data:', error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [globalUser]);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1,
      });

      if (!result.canceled) {
        setIsUploadingImage(true);
        try {
          // Upload the image to Appwrite (returns both imageUrl and compressedImageUrl)
          const photoResult = await uploadProfilePicture({
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: 'profile.jpg'
          }, profileImage || undefined);
          
          if (photoResult) {
            setProfileImage(photoResult.imageUrl);
            setCompressedThumbnail(photoResult.compressedImageUrl);
            // Update profile immediately with the new image URL and compressed thumbnail
            if (globalUser?.$id) {
              await updateUserProfile(globalUser.$id, {
                userId: globalUser.$id,
                profileImageUri: photoResult.imageUrl,
                compressed_thumbnail: photoResult.compressedImageUrl
              });
              
              // Also update the photos collection with both images
              const userPhoto = await getUserPhoto(globalUser.$id);
              if (userPhoto) {
                // Update existing photo document
                await databases.updateDocument(
                  config.databaseId,
                  config.photoCollectionId,
                  userPhoto.$id,
                  {
                    thumbnail: photoResult.imageUrl,
                    compressed_thumbnail: photoResult.compressedImageUrl,
                    title: creatorName || name || '',
                    prompte: creatorName || name || '',
                    IdCreator: globalUser.$id,
                    payment: JSON.stringify({
                      monthlyPrice: monthlyPrice || '0',
                      yearlyPrice: yearlyPrice || '0'
                    }),
                    PhotosLocation: location,
                    PhotoTopics: topics.join(', '),
                    Bio: bio
                  }
                );
              } else {
                // Create new photo document
                await databases.createDocument(
                  config.databaseId,
                  config.photoCollectionId,
                  ID.unique(),
                  {
                    thumbnail: photoResult.imageUrl,
                    compressed_thumbnail: photoResult.compressedImageUrl,
                    title: creatorName || name || '',
                    prompte: creatorName || name || '',
                    IdCreator: globalUser.$id,
                    payment: JSON.stringify({
                      monthlyPrice: monthlyPrice || '0',
                      yearlyPrice: yearlyPrice || '0'
                    }),
                    PhotosLocation: location,
                    PhotoTopics: topics.join(', '),
                    Bio: bio,
                    currency: selectedCurrency
                  }
                );
              }
            }
          }
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error picking image');
      setIsUploadingImage(false);
    }
  };

  const handleImageUpdate = async (newImageUrl: string, newCompressedImageUrl?: string) => {
    try {
      if (!globalUser?.$id) return;
      
      // Update the local state immediately for UI feedback
      setProfileImage(newImageUrl);
      setCompressedThumbnail(newCompressedImageUrl || null);
      
      // Update the profile image in the profiles collection
      await updateUserProfile(globalUser.$id, {
        userId: globalUser.$id,
        profileImageUri: newImageUrl,
        ...(newCompressedImageUrl ? { compressed_thumbnail: newCompressedImageUrl } : {})
      });
      
      // Also update the photos collection with the same image
      const userPhoto = await getUserPhoto(globalUser.$id);
      if (userPhoto) {
        // Update existing photo document
        await databases.updateDocument(
          config.databaseId,
          config.photoCollectionId,
          userPhoto.$id,
          {
            thumbnail: newImageUrl,
            compressed_thumbnail: newCompressedImageUrl || '',
            title: creatorName || name || '',
            prompte: creatorName || name || '',
            IdCreator: globalUser.$id,
            payment: JSON.stringify({
              monthlyPrice: monthlyPrice || '0',
              yearlyPrice: yearlyPrice || '0'
            }),
            PhotosLocation: location,
            PhotoTopics: topics.join(', '),
                    Bio: bio,
                    currency: selectedCurrency
          }
        );
        // Update local photoTitle state
        setPhotoTitle(creatorName || name || '');
      } else {
        // Create new photo document
        await databases.createDocument(
          config.databaseId,
          config.photoCollectionId,
          ID.unique(),
          {
            thumbnail: newImageUrl,
            compressed_thumbnail: newCompressedImageUrl || '',
            title: creatorName || name || '',
            prompte: creatorName || name || '',
            IdCreator: globalUser.$id,
            payment: JSON.stringify({
              monthlyPrice: monthlyPrice || '0',
              yearlyPrice: yearlyPrice || '0'
            }),
            PhotosLocation: location,
            PhotoTopics: topics.join(', '),
            Bio: bio,
            currency: selectedCurrency
          }
        );
        // Update local photoTitle state
        setPhotoTitle(creatorName || name || '');
      }
    } catch (error) {
      console.error('Error updating photo:', error);
      Alert.alert('Error', 'Failed to update photo in database.');
    }
  };

  const handleUpdateProfile = async () => {
    if (!globalUser?.$id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      setSaving(true);

      // Prepare profile data (only fields in profile collection schema)
      const profileData: any = {
        Location: location,
        creatorsname: creatorName,
        topics: topics.join(', '),
        ProfilesBio: bio,
        phoneNumber: selectedCountry.code + '', // Will append phone number below
        gender: selectedGender?.value || '',
        dateOfBirth: `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`,
      };

      // Add phone number digits if present
      if (typeof phoneNumber === 'string' && phoneNumber.trim() !== '') {
        profileData.phoneNumber = selectedCountry.code + phoneNumber.trim();
      }
      // If profileImage is set, try to get compressed_thumbnail from userPhotoThumbnail
      if (profileImage && compressedThumbnail) {
        profileData.profileImageUri = profileImage;
        profileData.compressed_thumbnail = compressedThumbnail;
      }

      // Update profile in Appwrite
      await updateUserProfile(globalUser.$id, profileData);
      
      // Also update the photos collection with the same information
      try {
        // Get the user's existing photo document
        const userPhoto = await getUserPhoto(globalUser.$id);
        
        // Debug: Check all photos in collection
        try {
          const allPhotos = await databases.listDocuments(
            config.databaseId,
            config.photoCollectionId,
            []
          );
        } catch (debugError) {
          // Debug query failed silently
        }
        
        // Prepare payment data
        const paymentData = {
          monthlyPrice: parseFloat(monthlyPrice) || 0,
          yearlyPrice: parseFloat(yearlyPrice) || 0
        };
        
        // Prepare photo data with all required attributes
        const photoData = {
          thumbnail: profileImage || '',
          compressed_thumbnail: compressedThumbnail || '',
          title: creatorName || name || '',
          prompte: creatorName || name || '',
          IdCreator: globalUser.$id,
          PhotosLocation: location || '',
          payment: JSON.stringify(paymentData),
          PhotoTopics: topics.join(', '),
          Bio: bio || '',
          currency: selectedCurrency
        };
        
        if (userPhoto) {
          // Update existing photo document
          const updatedPhoto = await databases.updateDocument(
            config.databaseId,
            config.photoCollectionId,
            userPhoto.$id,
            photoData
          );
        } else {
          // Create new photo document if it doesn't exist
          const newPhoto = await databases.createDocument(
            config.databaseId,
            config.photoCollectionId,
            ID.unique(),
            photoData
          );
        }
        
        // Update local photoTitle state
        setPhotoTitle(creatorName || name || '');
      } catch (photoError) {
        console.error('Error updating photo collection:', photoError);
        console.error('Photo error details:', JSON.stringify(photoError, null, 2));
        // Don't fail the entire update if photo update fails
      }
      
      // Show success message and trigger haptic feedback
      setSuccessMessage('Profile updated successfully!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(100); // Short vibration for success
      
      // Refresh channel conditions to update the missing info modal on index.tsx
      await refreshChannelConditions();
      
      // Scroll back to preview
      setIsEditMode(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      
      // Hide success message after 2 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);

    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Add this function to calculate the breakdown
  const calculatePriceBreakdown = (price: string) => {
    if (!price) return { storeFee: 0, stripeFee: 0, creatorEarnings: 0 };
    const numPrice = parseFloat(price);
    const storeFee = numPrice * 0.20; // 20% to app store
    const stripeFee = numPrice * 0.029 + 0.30; // Stripe fee: 2.9% + $0.30
    const creatorEarnings = numPrice - storeFee - stripeFee;
    return { storeFee, stripeFee, creatorEarnings };
  };

  // Add function to load existing payment data
  const loadExistingPaymentData = async () => {
    if (!globalUser?.$id) return;
    
    try {
        const existingProfile = await databases.listDocuments(
            config.databaseId,
            config.profileCollectionId,
            [Query.equal('userId', globalUser.$id)]
        );

        if (existingProfile.documents.length > 0) {
            // Load currency from profile
            if (existingProfile.documents[0].currency) {
                setSelectedCurrency(existingProfile.documents[0].currency);
            }
            
            // Load payment data
            if (existingProfile.documents[0].creatorpayment) {
            try {
                const paymentData = JSON.parse(existingProfile.documents[0].creatorpayment);
                setMonthlyPrice(paymentData.monthlyPrice.toString());
                setYearlyPrice(paymentData.yearlyPrice.toString());
            } catch (e) {
                console.error('Error parsing payment data:', e);
                }
            }
        }
    } catch (error) {
        console.error('Error loading payment data:', error);
    }
  };



  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={[]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={[]}>
      {/* Header with back and settings - positioned absolutely to overlap preview */}
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 10,
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 16
      }}>
        <View className="flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Image 
            source={require('../../../assets/icon/back.png')}
            className="w-8 h-8"
            resizeMode="contain"
          />
          <Text style={{ color: 'white', fontSize: 21, marginLeft: 12, fontFamily: 'Nunito-Bold' }}>
              {isEditMode ? 'Edit Profile' : 'Preview'}
          </Text>
        </TouchableOpacity>
        <View className="flex-1" />
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Image 
            source={require('../../../assets/icon/settings.png')}
            className="w-8 h-8"
            resizeMode="contain"
          />
        </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        bounces={true}
        keyboardShouldPersistTaps="handled"
        ref={scrollViewRef}
        scrollEnabled={true}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const screenHeight = Dimensions.get('window').height;
          
          // Immediate snap when scrolling up (stronger effect)
          if (offsetY < screenHeight * 0.3 && isEditMode) {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            setIsEditMode(false);
          }
        }}
        scrollEventThrottle={16}
        onScrollEndDrag={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const screenHeight = Dimensions.get('window').height;
          
          // Always snap when scrolling up (binary effect)
          if (offsetY < screenHeight * 0.5) {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            setIsEditMode(false);
          } else if (offsetY > screenHeight * 0.5) {
            if (!isEditMode) {
              // Snap to edit form when transitioning from preview
              scrollViewRef.current?.scrollTo({ y: screenHeight, animated: true });
              setIsEditMode(true);
            }
          }
        }}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => {
            const screenHeight = Dimensions.get('window').height;
            if (isEditMode) {
              // Go back to preview
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              setIsEditMode(false);
            } else {
              // Go to edit form
              scrollViewRef.current?.scrollTo({ y: screenHeight, animated: true });
              setIsEditMode(true);
            }
          }}
        >
          {/* Profile Preview at the top */}
          <ProfilePreview
            profileImageUri={profileImage || undefined}
            name={photoTitle || ''}
            location={location}
            bio={bio}
            followerCount={0} // Optionally fetch real follower count if needed
            monthlyPrice={monthlyPrice}
            yearlyPrice={yearlyPrice}
            state={photoState}
            creatorsname={creatorName}
            topics={topics.join(', ')}
            ProfilesBio={bio}
            creatorpayment={JSON.stringify({
              monthlyPrice: monthlyPrice || '0',
              yearlyPrice: yearlyPrice || '0'
            })}
            phoneNumber={selectedCountry.code + phoneNumber}
            gender={selectedGender?.value || ''}
            dateOfBirth={`${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`}
            currency={selectedCurrency}
          />
        </TouchableOpacity>
        {/* Edit form section with padding */}
        <View className="px-4 items-center mt-24 mb-4">
        {/* Avatar (moved inside ScrollView) */}
          <View className="w-36 h-36 rounded-full bg-[#1A1A1A] items-center justify-center relative">
            {isUploadingImage ? (
              <View className="w-full h-full items-center justify-center">
                <ActivityIndicator size="large" color="#FB2355" />
              </View>
            ) : profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                className="w-36 h-36 rounded-full"
                style={{ resizeMode: 'cover' }}
              />
            ) : (
              <Text className="text-2xl text-white font-bold">{name?.[0] || 'U'}</Text>
            )}
            <TouchableOpacity 
              className="absolute bottom-0 right-0"
              onPress={pickImage}
              disabled={isUploadingImage}
            >
              <Image 
                source={require('../../../assets/icon/edit.png')} 
                className="w-11 h-11"
                style={{ opacity: isUploadingImage ? 0.5 : 1 }}
              />
            </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className="mt-8">
          {/* Name */}
          <View className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 mb-2 ${
            focusedInput === 'name' ? 'border border-[#FB2355]' : ''
          }`}>
            <Ionicons 
              name="person-outline" 
              size={24} 
              color={focusedInput === 'name' ? '#FB2355' : '#666'} 
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 text-white font-questrial text-lg h-9"
              value={name}
              editable={false}
              style={{ textAlignVertical: 'center', color: 'white', paddingBottom: 12 }}
            />
          </View>

          {/* Birth Date */}
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 mb-2 ${
              focusedInput === 'birthDate' ? 'border border-[#FB2355]' : ''
            }`}
          >
            <Ionicons 
              name="calendar-outline" 
              size={24} 
              color={focusedInput === 'birthDate' ? '#FB2355' : '#666'} 
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 text-white font-questrial text-lg h-9"
              value={`${selectedMonth}/${selectedDay}/${selectedYear}`}
              editable={false}
              style={{ textAlignVertical: 'center', color: 'white', paddingBottom: 12 }}
            />
          </TouchableOpacity>

          {/* Email */}
          <View className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 mb-2 ${
            focusedInput === 'email' ? 'border border-[#FB2355]' : ''
          }`}>
            <Ionicons 
              name="mail-outline" 
              size={24} 
              color={focusedInput === 'email' ? '#FB2355' : '#666'} 
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 text-white font-questrial text-lg h-9"
              value={email}
              editable={false}
              style={{ textAlignVertical: 'center', color: 'white', paddingBottom: 17 }}
            />
          </View>

          {/* Phone Number */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity 
              onPress={() => setShowCountryPicker(true)}
              className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-5 w-24 mr-2 ${
                focusedInput === 'countryCode' ? 'border border-[#FB2355]' : ''
              }`}
              activeOpacity={0.7}
            >
              <Text style={{ color: 'white', fontSize: 20, marginRight: 8 }}>{selectedCountry.flag}</Text>
              <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 16 }}>{selectedCountry.code}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-5 flex-1"
              activeOpacity={0.8}
              onPress={() => {
                setTempPhoneNumber(phoneNumber);
                setShowPhoneNumberModal(true);
              }}
            >
              <Ionicons 
                name="call-outline" 
                size={24} 
                color="#666" 
                style={{ marginRight: 12 }}
              />
              <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 18, flex: 1 }}>
                {phoneNumber ? phoneNumber : 'Enter your phone number'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Gender - Simplified Picker */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              {genders.map((gender) => (
                <TouchableOpacity
                  key={gender.value}
                  onPress={() => setSelectedGender(gender)}
                  style={{
                    backgroundColor: selectedGender?.value === gender.value ? '#FB2355' : '#222',
                    borderRadius: 18,
                    paddingVertical: 12,
                    paddingHorizontal: 0,
                    marginHorizontal: 0,
                    flex: 1,
                    marginRight: gender.value !== 'other' ? 12 : 0,
                    borderWidth: selectedGender?.value === gender.value ? 0 : 1,
                    borderColor: '#444',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ 
                    color: selectedGender?.value === gender.value ? 'white' : '#aaa', 
                    fontFamily: 'questrial', 
                    fontSize: 17,
                    textAlign: 'center',
                  }}>
                    {gender.icon} {gender.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Creator's Name - Modal Style */}
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              className="bg-[#1A1A1A] rounded-lg px-5 py-5 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => {
                setTempCreatorName(creatorName);
                setShowCreatorNameModal(true);
              }}
              disabled={showCreatorNameWarning}
            >
              <Ionicons name="person-circle-outline" size={22} color={showCreatorNameWarning ? "#444" : "#666"} style={{ marginRight: 10 }} />
              <Text style={{ 
                color: showCreatorNameWarning ? '#666' : 'white', 
                fontFamily: 'questrial', 
                fontSize: 18, 
                flex: 1 
              }}>
                {creatorName ? creatorName : 'Enter your creator name'}
              </Text>
              {showCreatorNameWarning ? (
                <View style={{ 
                  backgroundColor: '#FFA500', 
                  borderRadius: 8, 
                  paddingHorizontal: 8, 
                  paddingVertical: 4 
                }}>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 12, 
                    fontFamily: 'questrial',
                    fontWeight: '600'
                  }}>
                    LOCKED
                  </Text>
                </View>
              ) : (
              <Ionicons name="chevron-forward" size={20} color="#666" />
              )}
            </TouchableOpacity>
            
            {/* Warning Message */}
            {showCreatorNameWarning && (
              <View style={{ 
                backgroundColor: 'rgba(255, 165, 0, 0.1)', 
                borderRadius: 12, 
                padding: 12, 
                marginTop: 8,
                borderWidth: 1,
                borderColor: 'rgba(255, 165, 0, 0.3)'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>🔒</Text>
                  <Text style={{ 
                    color: '#FFA500', 
                    fontSize: 14, 
                    fontFamily: 'questrial',
                    flex: 1
                  }}>
                    Creator name cannot be changed once your channel is live. Contact support if needed.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Bio - Modal Style */}
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              className="bg-[#1A1A1A] rounded-lg px-5 py-4 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => {
                setTempBio(bio);
                setShowBioModal(true);
              }}
            >
              <Ionicons name="document-text-outline" size={22} color="#666" style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 18 }}>
                  {bio ? bio : 'Tell us about yourself'}
                </Text>
                {bio && (
                  <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 4 }}>
                    {bio.length}/300 characters
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Location - Modal Style */}
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              className="bg-[#1A1A1A] rounded-lg px-5 py-5 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => {
                setTempLocation(location);
                setShowLocationModal(true);
              }}
            >
              <Ionicons name="location-outline" size={22} color="#666" style={{ marginRight: 10 }} />
              <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 18, flex: 1 }}>
                {location ? location : 'Enter your location'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Topics (Button + Modal) */}
          <View style={{ marginBottom: 16 }}>
           
            <TouchableOpacity
              className="bg-[#1A1A1A] rounded-lg px-5 py-5 mb-2 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => setShowTopicsModal(true)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FB2355" style={{ marginRight: 10 }} />
              <Text style={{ color: 'white', fontFamily: 'questrial', fontSize: 18 }}>
                {topics.length > 0 ? topics.join(', ') : 'Choose topics'}
              </Text>
            </TouchableOpacity>
            <Modal
              visible={showTopicsModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowTopicsModal(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#181818', borderRadius: 24, padding: 24, width: '90%' }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'questrial', marginBottom: 16, textAlign: 'center' }}>
                    Choose your topics
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {trendingTopics.map((topic) => {
                      const selected = topics.includes(topic);
                      return (
                        <TouchableOpacity
                          key={topic}
                          onPress={() => {
                            setTopics((prev) =>
                              prev.includes(topic)
                                ? prev.filter((t) => t !== topic)
                                : [...prev, topic]
                            );
                          }}
                          style={{
                            backgroundColor: selected ? '#FB2355' : '#222',
                            borderRadius: 18,
                            paddingVertical: 7,
                            paddingHorizontal: 16,
                            margin: 4,
                            borderWidth: selected ? 0 : 1,
                            borderColor: '#444',
                          }}
                        >
                          <Text style={{ color: selected ? 'white' : '#aaa', fontFamily: 'questrial', fontSize: 15 }}>
                            {topic}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={{ marginTop: 24, backgroundColor: '#FB2355', borderRadius: 16, paddingVertical: 12 }}
                    onPress={() => setShowTopicsModal(false)}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontFamily: 'questrial', textAlign: 'center', fontWeight: 'bold' }}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            {/* Subscriptions Button */}
            <TouchableOpacity 
              className="bg-[#222] rounded-lg py-4 mb-1 flex-row items-center justify-center"
              activeOpacity={0.8}
              onPress={async () => {
                await loadExistingPaymentData();
                setShowSubscriptionsModal(true);
              }}
            >
              <Ionicons name="card-outline" size={22} color="#FB2355" style={{ marginRight: 10 }} />
              <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'questrial', fontSize: 18 }}>
                Subscriptions
              </Text>
            </TouchableOpacity>
          </View>

          {/* Update Button */}
          <TouchableOpacity 
            className={`bg-[#FB2355] rounded-lg py-4 mt-2 mb-2${!profileImage ? ' opacity-50' : ''}`}
            activeOpacity={0.8}
            onPress={handleUpdateProfile}
            disabled={saving || !profileImage}
          >
            <Text className="text-white text-center font-questrial text-lg">
              {saving ? 'Updating...' : 'Update Profile'}
            </Text>
          </TouchableOpacity>
          {/* Show a message if no profile image */}
          {!profileImage && (
            <Text style={{ color: '#FB2355', textAlign: 'center', marginBottom: 8, fontFamily: 'questrial', fontWeight: '600' }}>
              Please add a profile picture to update your profile.
            </Text>
          )}

          {/* Success Message */}
          {successMessage && (
            <Text className="text-[#4CAF50] text-center mt-2 font-questrial">
                {successMessage}
            </Text>
          )}
        </View>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-[#1A1A1A] rounded-t-3xl p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-xl font-bold">Select Birth Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={30} color="#FB2355" />
                </TouchableOpacity>
              </View>
              <View className="flex-row justify-between">
                {/* Month Picker */}
                <View className="flex-1">
                  <Text className="text-white text-center mb-2">Month</Text>
                  <Picker
                    selectedValue={selectedMonth}
                    onValueChange={(value) => {
                      setSelectedMonth(value);
                      // Reset day if it's invalid for the new month
                      const daysInMonth = getDaysInMonth(parseInt(value), parseInt(selectedYear));
                      if (parseInt(selectedDay) > daysInMonth) {
                        setSelectedDay(daysInMonth.toString());
                      }
                    }}
                    style={{ color: 'white' }}
                    itemStyle={{ color: 'white' }}
                  >
                    {months.map((month) => (
                      <Picker.Item key={month} label={month} value={month} color="white" />
                    ))}
                  </Picker>
                </View>

                {/* Day Picker */}
                <View className="flex-1">
                  <Text className="text-white text-center mb-2">Day</Text>
                  <Picker
                    selectedValue={selectedDay}
                    onValueChange={setSelectedDay}
                    style={{ color: 'white' }}
                    itemStyle={{ color: 'white' }}
                  >
                    {days.map((day) => (
                      <Picker.Item key={day} label={day} value={day} color="white" />
                    ))}
                  </Picker>
                </View>

                {/* Year Picker */}
                <View className="flex-1">
                  <Text className="text-white text-center mb-2">Year</Text>
                  <Picker
                    selectedValue={selectedYear}
                    onValueChange={(value) => {
                      setSelectedYear(value);
                      // Reset day if it's invalid for the new year
                      const daysInMonth = getDaysInMonth(parseInt(selectedMonth), parseInt(value));
                      if (parseInt(selectedDay) > daysInMonth) {
                        setSelectedDay(daysInMonth.toString());
                      }
                    }}
                    style={{ color: 'white' }}
                    itemStyle={{ color: 'white' }}
                  >
                    {years.map((year) => (
                      <Picker.Item key={year} label={year} value={year} color="white" />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Country Picker Modal */}
        <Modal
          visible={showCountryPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowCountryPicker(false)}>
            <View style={{ 
              flex: 1, 
              backgroundColor: 'rgba(0,0,0,0.75)', 
              justifyContent: 'center', 
              alignItems: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <Animated.View style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 24,
                padding: 32,
                width: '90%',
                maxWidth: 400,
                maxHeight: '80%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.3,
                shadowRadius: 40,
                elevation: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
              }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.1)',
                  width: '100%'
                }}>
                  <View style={{
                    backgroundColor: 'rgba(251, 35, 85, 0.1)',
                    borderRadius: 12,
                    padding: 8,
                    marginRight: 12
                  }}>
                    <Ionicons name="globe-outline" size={24} color="#FB2355" />
                  </View>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 20, 
                    fontWeight: '600', 
                    fontFamily: 'questrial',
                    letterSpacing: 0.5
                  }}>Select Country</Text>
                </View>
                
                <FlatList
                  data={countries}
                  keyExtractor={(item) => item.code + item.name}
                  style={{ width: '100%' }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        marginVertical: 2,
                        borderRadius: 16,
                        backgroundColor: selectedCountry.code === item.code && selectedCountry.name === item.name 
                          ? 'rgba(251, 35, 85, 0.1)' 
                          : 'transparent',
                        borderWidth: selectedCountry.code === item.code && selectedCountry.name === item.name ? 1 : 0,
                        borderColor: 'rgba(251, 35, 85, 0.3)',
                      }}
                      onPress={() => {
                        setSelectedCountry(item);
                        setShowCountryPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        padding: 8,
                        marginRight: 16,
                        minWidth: 40,
                        alignItems: 'center'
                      }}>
                        <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ 
                          color: 'white', 
                          fontSize: 16, 
                          fontFamily: 'questrial',
                          fontWeight: '500'
                        }}>
                          {item.name}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: selectedCountry.code === item.code && selectedCountry.name === item.name 
                          ? '#FB2355' 
                          : 'rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6
                      }}>
                        <Text style={{ 
                          color: selectedCountry.code === item.code && selectedCountry.name === item.name 
                            ? 'white' 
                            : 'rgba(255,255,255,0.8)', 
                          fontSize: 14, 
                          fontFamily: 'questrial',
                          fontWeight: '600'
                        }}>
                          {item.code}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
                
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    paddingHorizontal: 32,
                    marginTop: 24,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    alignSelf: 'center'
                  }}
                  onPress={() => setShowCountryPicker(false)}
                >
                  <Text style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    fontSize: 16, 
                    fontFamily: 'questrial',
                    fontWeight: '500'
                  }}>Cancel</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Gender Picker Modal */}
        <Modal
          visible={showGenderPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowGenderPicker(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-[#1A1A1A] rounded-t-3xl p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-xl font-bold">Select Gender</Text>
                <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                  <Ionicons name="close" size={32} color="#FB2355" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={genders}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-row items-center py-3 border-b border-gray-800"
                    onPress={() => {
                      setSelectedGender(item);
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text className="text-white text-xl mr-3">{item.icon}</Text>
                    <Text className="text-white text-lg">{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Subscriptions Modal */}
        <Modal
          visible={showSubscriptionsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSubscriptionsModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#181818', borderRadius: 24, padding: 24, width: '90%', maxHeight: '80%' }}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-xl font-bold">Subscription Pricing</Text>
                <TouchableOpacity onPress={() => setShowSubscriptionsModal(false)}>
                  <Ionicons name="close" size={24} color="#FB2355" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Currency Picker */}
                <View className="mb-4">
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: 'white', fontSize: 18 }}>Currency</Text>
                    {showCreatorNameWarning && (
                      <View style={{ 
                        backgroundColor: '#FFA500', 
                        borderRadius: 8, 
                        paddingHorizontal: 8, 
                        paddingVertical: 4 
                      }}>
                        <Text style={{ 
                          color: 'white', 
                          fontSize: 12, 
                          fontFamily: 'questrial',
                          fontWeight: '600'
                        }}>
                          LOCKED
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ width: '100%' }}>
                    {/* First Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 }}>
                      {currencies.slice(0, 3).map((currency) => (
                        <TouchableOpacity
                          key={currency.code}
                          onPress={() => !showCreatorNameWarning && setSelectedCurrency(currency.code)}
                          disabled={showCreatorNameWarning}
                          style={{
                            backgroundColor: selectedCurrency === currency.code ? '#FB2355' : '#222',
                            borderRadius: 18,
                            paddingVertical: 12,
                            paddingHorizontal: 8,
                            marginHorizontal: 2,
                            flex: 1,
                            borderWidth: selectedCurrency === currency.code ? 0 : 1,
                            borderColor: '#444',
                            alignItems: 'center',
                            opacity: showCreatorNameWarning ? 0.6 : 1,
                          }}
                        >
                          <Text style={{ 
                            color: selectedCurrency === currency.code ? 'white' : '#aaa', 
                            fontFamily: 'questrial', 
                            fontSize: 14,
                            textAlign: 'center',
                          }}>
                            {currency.flag} {currency.code}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Second Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      {currencies.slice(3, 6).map((currency) => (
                        <TouchableOpacity
                          key={currency.code}
                          onPress={() => !showCreatorNameWarning && setSelectedCurrency(currency.code)}
                          disabled={showCreatorNameWarning}
                          style={{
                            backgroundColor: selectedCurrency === currency.code ? '#FB2355' : '#222',
                            borderRadius: 18,
                            paddingVertical: 12,
                            paddingHorizontal: 8,
                            marginHorizontal: 2,
                            flex: 1,
                            borderWidth: selectedCurrency === currency.code ? 0 : 1,
                            borderColor: '#444',
                            alignItems: 'center',
                            opacity: showCreatorNameWarning ? 0.6 : 1,
                          }}
                        >
                          <Text style={{ 
                            color: selectedCurrency === currency.code ? 'white' : '#aaa', 
                            fontFamily: 'questrial', 
                            fontSize: 14,
                            textAlign: 'center',
                          }}>
                            {currency.flag} {currency.code}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* Warning Message for Currency */}
                  {showCreatorNameWarning && (
                    <View style={{ 
                      backgroundColor: 'rgba(255, 165, 0, 0.1)', 
                      borderRadius: 12, 
                      padding: 12, 
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 165, 0, 0.3)'
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>🔒</Text>
                        <Text style={{ 
                          color: '#FFA500', 
                          fontSize: 14, 
                          fontFamily: 'questrial',
                          flex: 1
                        }}>
                          Currency cannot be changed once your channel is live. Contact support if needed.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Monthly Price Input */}
                <View className="mb-4">
                  <Text style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>
                    Monthly Price ({currencies.find(c => c.code === selectedCurrency)?.symbol})
                  </Text>
                  <TextInput
                    className="bg-[#222] rounded-lg px-4 py-3"
                    value={monthlyPrice}
                    onChangeText={setMonthlyPrice}
                    keyboardType="decimal-pad"
                    placeholder="Enter monthly price"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={{ color: 'white' }}
                  />
                  {monthlyPrice && (
                    <View className="mt-2 bg-[#222] rounded-lg p-3">
                      <Text style={{ color: 'white', fontSize: 14 }}>Price Breakdown (Monthly):</Text>
                      <Text style={{ color: 'white', marginTop: 4 }}>Store Fee (20%): {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(monthlyPrice).storeFee.toFixed(2)}</Text>
                      <Text style={{ color: 'white', marginTop: 4 }}>Stripe Fee (2.9% + {currencies.find(c => c.code === selectedCurrency)?.symbol}0.30): {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(monthlyPrice).stripeFee.toFixed(2)}</Text>
                      <Text className="text-[#FB2355] font-bold mt-1">Your Earnings: {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(monthlyPrice).creatorEarnings.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                {/* Yearly Price Input */}
                <View className="mb-4">
                  <Text style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>
                    Yearly Price ({currencies.find(c => c.code === selectedCurrency)?.symbol})
                  </Text>
                  <TextInput
                    className="bg-[#222] rounded-lg px-4 py-3"
                    value={yearlyPrice}
                    onChangeText={setYearlyPrice}
                    keyboardType="decimal-pad"
                    placeholder="Enter yearly price"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={{ color: 'white' }}
                  />
                  {yearlyPrice && (
                    <View className="mt-2 bg-[#222] rounded-lg p-3">
                      <Text style={{ color: 'white', fontSize: 14 }}>Price Breakdown (Yearly):</Text>
                      <Text style={{ color: 'white', marginTop: 4 }}>Store Fee (20%): {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(yearlyPrice).storeFee.toFixed(2)}</Text>
                      <Text style={{ color: 'white', marginTop: 4 }}>Stripe Fee (2.9% + {currencies.find(c => c.code === selectedCurrency)?.symbol}0.30): {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(yearlyPrice).stripeFee.toFixed(2)}</Text>
                      <Text className="text-[#FB2355] font-bold mt-1">Your Earnings: {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(yearlyPrice).creatorEarnings.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                  className={`bg-[#FB2355] rounded-lg py-4 mt-4 ${savingPrices ? 'opacity-50' : ''}`}
                  onPress={async () => {
                    try {
                      setSavingPrices(true);
                      setPriceError(null);
                      setSuccessMessage(null);

                      // Validate prices
                      if (!monthlyPrice || !yearlyPrice) {
                        setPriceError('Please enter both monthly and yearly prices');
                        return;
                      }

                      const monthly = parseFloat(monthlyPrice);
                      const yearly = parseFloat(yearlyPrice);

                      if (isNaN(monthly) || isNaN(yearly)) {
                        setPriceError('Please enter valid prices');
                        return;
                      }

                      if (monthly <= 0 || yearly <= 0) {
                        setPriceError('Prices must be greater than 0');
                        return;
                      }

                      // Save prices and currency to Appwrite
                      if (globalUser?.$id) {
                        await updateCreatorPayment(globalUser.$id, {
                          monthlyPrice: monthly,
                          yearlyPrice: yearly,
                          currency: selectedCurrency
                        });
                        
                        // Refresh channel conditions to update the missing info modal on index.tsx
                        await refreshChannelConditions();
                        
                        // Show success message
                        setSuccessMessage('Prices saved successfully!');
                        // Hide success message after 2 seconds
                        setTimeout(() => {
                          setSuccessMessage(null);
                          setShowSubscriptionsModal(false);
                        }, 2000);
                      }
                    } catch (error) {
                      console.error('Error saving prices:', error);
                      setPriceError(error instanceof Error ? error.message : 'Failed to save prices');
                    } finally {
                      setSavingPrices(false);
                    }
                  }}
                  disabled={savingPrices}
                >
                  <Text className="text-white text-center font-questrial text-lg">
                    {savingPrices ? 'Saving...' : 'Save Prices'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Error Message */}
              {priceError && (
                <Text className="text-red-500 text-center mt-2">
                  {priceError}
                </Text>
              )}

              {/* Success Message */}
              {successMessage && (
                <Text className="text-green-500 text-center mt-2">
                  {successMessage}
                </Text>
              )}
            </View>
          </View>
        </Modal>


        </View>
      </ScrollView>

      {/* Creator Name Modal */}
      <Modal
        visible={showCreatorNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowCreatorNameModal(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.75)', 
            justifyContent: 'center', 
            alignItems: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <Animated.View style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 24,
              padding: 32,
              width: '90%',
              maxWidth: 400,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.3,
              shadowRadius: 40,
              elevation: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
            }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 24,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.1)',
                width: '100%'
              }}>
                <View style={{
                  backgroundColor: 'rgba(251, 35, 85, 0.1)',
                  borderRadius: 12,
                  padding: 8,
                  marginRight: 12
                }}>
                  <Ionicons name="person-circle-outline" size={24} color="#FB2355" />
                </View>
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontWeight: '600', 
                  fontFamily: 'questrial',
                  letterSpacing: 0.5
                }}>Creator Name</Text>
              </View>
              

              
              <TextInput
                style={{
                  backgroundColor: '#2a2a2a',
                  color: 'white',
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: creatorNameError ? '#F44336' : 'rgba(255,255,255,0.1)',
                  marginBottom: 8,
                  width: '100%',
                  textAlign: 'center',
                  fontFamily: 'questrial'
                }}
                value={tempCreatorName}
                onChangeText={(text) => {
                  setTempCreatorName(text);
                  setCreatorNameError(null); // Clear error when user types
                }}
                placeholder="Enter your creator name..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={async () => {
                  Keyboard.dismiss();
                  if (tempCreatorName.trim()) {
                    const isAvailable = await checkCreatorNameAvailability(tempCreatorName);
                    if (isAvailable) {
                  setCreatorName(tempCreatorName);
                  setShowCreatorNameModal(false);
                    } else {
                      setCreatorNameError('This creator name is already taken');
                    }
                  }
                }}
              />
              
              {/* Error Message */}
              {creatorNameError && (
                <Text style={{ 
                  color: '#F44336', 
                  fontSize: 14, 
                  textAlign: 'center', 
                  marginBottom: 16,
                  fontFamily: 'questrial'
                }}>
                  {creatorNameError}
                </Text>
              )}
              
              {/* Loading Indicator */}
              {checkingCreatorName && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <ActivityIndicator size="small" color="#FB2355" style={{ marginRight: 8 }} />
                  <Text style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: 14,
                    fontFamily: 'questrial'
                  }}>
                    Checking availability...
                  </Text>
                </View>
              )}
              
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                width: '100%',
                gap: 12
              }}>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    backgroundColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCreatorNameModal(false);
                  }}
                >
                  <Text style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    fontSize: 16, 
                    fontFamily: 'questrial',
                    fontWeight: '500'
                  }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    backgroundColor: creatorNameError || checkingCreatorName ? '#666' : '#FB2355', 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    alignItems: 'center',
                    shadowColor: '#FB2355',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8
                  }}
                  onPress={async () => {
                    Keyboard.dismiss();
                    if (tempCreatorName.trim() && !checkingCreatorName) {
                      const isAvailable = await checkCreatorNameAvailability(tempCreatorName);
                      if (isAvailable) {
                        Alert.alert(
                          'Important Reminder',
                          'Your creator name cannot be changed once your channel goes live. Make sure you\'re happy with your choice!',
                          [
                            {
                              text: 'Cancel',
                              style: 'cancel'
                            },
                            {
                              text: 'Save Anyway',
                              onPress: () => {
                    setCreatorName(tempCreatorName);
                    setShowCreatorNameModal(false);
                              }
                            }
                          ]
                        );
                      } else {
                        setCreatorNameError('This creator name is already taken');
                      }
                    }
                  }}
                  disabled={!!creatorNameError || checkingCreatorName || !tempCreatorName.trim()}
                >
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 16, 
                    fontFamily: 'questrial', 
                    fontWeight: '600'
                  }}>
                    {checkingCreatorName ? 'Checking...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Bio Modal */}
      <Modal
        visible={showBioModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowBioModal(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.75)', 
            justifyContent: 'center', 
            alignItems: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <Animated.View style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 24,
              padding: 32,
              width: '90%',
              maxWidth: 400,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.3,
              shadowRadius: 40,
              elevation: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
            }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 24,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.1)',
                width: '100%'
              }}>
                <View style={{
                  backgroundColor: 'rgba(251, 35, 85, 0.1)',
                  borderRadius: 12,
                  padding: 8,
                  marginRight: 12
                }}>
                  <Ionicons name="document-text-outline" size={24} color="#FB2355" />
                </View>
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontWeight: '600', 
                  fontFamily: 'questrial',
                  letterSpacing: 0.5
                }}>Edit Bio</Text>
              </View>
              
              <TextInput
                style={{
                  backgroundColor: '#2a2a2a',
                  color: 'white',
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  marginBottom: 8,
                  width: '100%',
                  minHeight: 120,
                  textAlignVertical: 'top',
                  fontFamily: 'questrial'
                }}
                value={tempBio}
                onChangeText={setTempBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                maxLength={300}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  setBio(tempBio);
                  setShowBioModal(false);
                }}
              />
              
              <Text style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: 14, 
                alignSelf: 'flex-end', 
                marginBottom: 24,
                fontFamily: 'questrial'
              }}>{tempBio.length}/300 characters</Text>
              
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                width: '100%',
                gap: 12
              }}>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    backgroundColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowBioModal(false);
                  }}
                >
                  <Text style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    fontSize: 16, 
                    fontFamily: 'questrial',
                    fontWeight: '500'
                  }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    backgroundColor: '#FB2355', 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    alignItems: 'center',
                    shadowColor: '#FB2355',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8
                  }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setBio(tempBio);
                    setShowBioModal(false);
                  }}
                >
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 16, 
                    fontFamily: 'questrial', 
                    fontWeight: '600'
                  }}>Save</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowLocationModal(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.75)', 
            justifyContent: 'center', 
            alignItems: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <Animated.View style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 24,
              padding: 32,
              width: '90%',
              maxWidth: 400,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.3,
              shadowRadius: 40,
              elevation: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
            }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 24,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.1)',
                width: '100%'
              }}>
                <View style={{
                  backgroundColor: 'rgba(251, 35, 85, 0.1)',
                  borderRadius: 12,
                  padding: 8,
                  marginRight: 12
                }}>
                  <Ionicons name="location-outline" size={24} color="#FB2355" />
                </View>
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontWeight: '600', 
                  fontFamily: 'questrial',
                  letterSpacing: 0.5
                }}>Edit Location</Text>
              </View>
              
              <TextInput
                style={{
                  backgroundColor: '#2a2a2a',
                  color: 'white',
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  marginBottom: 24,
                  width: '100%',
                  textAlign: 'center',
                  fontFamily: 'questrial'
                }}
                value={tempLocation}
                onChangeText={setTempLocation}
                placeholder="Enter your location..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  setLocation(tempLocation);
                  setShowLocationModal(false);
                }}
              />
              
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                width: '100%',
                gap: 12
              }}>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    backgroundColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowLocationModal(false);
                  }}
                >
                  <Text style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    fontSize: 16, 
                    fontFamily: 'questrial',
                    fontWeight: '500'
                  }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    backgroundColor: '#FB2355', 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    alignItems: 'center',
                    shadowColor: '#FB2355',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8
                  }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setLocation(tempLocation);
                    setShowLocationModal(false);
                  }}
                >
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 16, 
                    fontFamily: 'questrial', 
                    fontWeight: '600'
                  }}>Save</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

            {/* Phone Number Modal */}
      <Modal
        visible={showPhoneNumberModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhoneNumberModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center">
          <View className="bg-[#1A1A1A] rounded-3xl w-[90%] max-w-md overflow-hidden">
              {/* Header */}
            <View className="bg-gradient-to-r from-[#FB2355] to-[#FF6B9D] p-6">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-2xl font-bold font-questrial">Phone Number</Text>
                  <Text className="text-white/80 text-sm font-questrial mt-1">Enter your contact number</Text>
                </View>
              <TouchableOpacity 
                  onPress={() => setShowPhoneNumberModal(false)}
                  className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
          </View>
            </View>

            {/* Content */}
            <View className="p-6">
              {/* Country Code Display */}
              <View className="flex-row items-center justify-center mb-6">
                <View className="bg-[#2A2A2A] rounded-xl px-4 py-3 mr-3">
                  <Text style={{ color: 'white', fontSize: 24 }}>{selectedCountry.flag}</Text>
                 </View>
                <View className="bg-[#2A2A2A] rounded-xl px-4 py-3">
                  <Text style={{ color: 'white', fontSize: 18, fontFamily: 'questrial', fontWeight: '600' }}>{selectedCountry.code}</Text>
                </View>
               </View>

              {/* Phone Number Input */}
              <View className="mb-6">
                <Text className="text-white text-sm font-questrial mb-3 text-center">Enter your phone number</Text>
                <View className="bg-[#2A2A2A] rounded-xl px-4 py-4 border-2 border-[#FB2355]/30">
                  <TextInput
                    className="text-white text-3xl font-questrial text-center"
                    placeholder={selectedCountry.format}
                    placeholderTextColor="#666"
                    value={tempPhoneNumber}
                    onChangeText={(text) => {
                      // Remove formatting to get raw digits
                      const rawDigits = text.replace(/\D/g, '');
                      // Format according to country format
                      const formatted = formatPhoneNumber(rawDigits, selectedCountry.format);
                      setTempPhoneNumber(formatted);
                    }}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      setPhoneNumber(tempPhoneNumber);
                      setShowPhoneNumberModal(false);
                    }}
                    style={{ 
                      color: 'white',
                      letterSpacing: 2,
                   textAlign: 'center', 
                      fontSize: 28,
                      paddingHorizontal: 20
                    }}
                  />
                 </View>
               </View>

              {/* Save Button */}
               <TouchableOpacity 
                className="bg-[#FB2355] rounded-xl py-4 items-center"
                onPress={() => {
                  setPhoneNumber(tempPhoneNumber);
                  setShowPhoneNumberModal(false);
                }}
              >
                <Text className="text-white text-lg font-questrial font-semibold">Save Phone Number</Text>
               </TouchableOpacity>
           </View>
          </View>
        </View>
       </Modal>


     </SafeAreaView>
   );
 }
