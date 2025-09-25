import { Ionicons } from '@expo/vector-icons';
import { ID, Query } from 'appwrite';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config, databases, getUserPhoto, getUserProfile, updateCreatorPayment, updateUserProfile, uploadProfilePicture } from '../../../lib/appwrite';
import { useGlobalContext } from '../../../lib/global-provider';
import { useTheme } from '../../../lib/useTheme';
import { BioModal, CountryPickerModal, CreatorNameModal, DatePickerModal, GenderPickerModal, LocationModal, PhoneNumberModal, ProfilePreviewModal, SubscriptionsModal } from '../../components/modals';

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
  const { user: globalUser, refreshChannelConditions, userCurrency, getCachedProfile, preloadProfileData, clearProfileCache } = useGlobalContext();
  const { theme } = useTheme();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
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

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<any>(null);
  const [isSavingAndExiting, setIsSavingAndExiting] = useState(false);
  const outerWheelRotation = useRef(new Animated.Value(0)).current;
  const innerWheelRotation = useRef(new Animated.Value(0)).current;
  const [paymentDataLoaded, setPaymentDataLoaded] = useState(false);
  const [profileDataLoaded, setProfileDataLoaded] = useState(false);

  const [userPhotoThumbnail, setUserPhotoThumbnail] = useState<string | null>(null);
  const [compressedThumbnail, setCompressedThumbnail] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState<string>('');

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
      let cached = null;
      try {
        if (globalUser) {
          setName(globalUser.name || '');
          setEmail(globalUser.email || '');
          
          // Try to use cached profile data first
          cached = getCachedProfile();
          let profile, userPhoto;
          
          if (cached) {
            console.log('✅ [Edit Profile] Using cached profile data');
            profile = cached.profile;
            userPhoto = cached.userPhoto;
            setLoading(false); // Set loading false immediately for cached data
          } else {
            console.log('🔄 [Edit Profile] Loading profile data from API');
            // Load profile data from Appwrite
            [profile, userPhoto] = await Promise.all([
              getUserProfile(globalUser.$id),
              getUserPhoto(globalUser.$id)
            ]);
          }
          
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
                  config.creatorCollectionId,
                  [Query.equal('creatorId', globalUser.$id)]
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
                  ? profile.topics.split(',').map((t: string) => t.trim()).filter(Boolean)
                  : Array.isArray(profile.topics)
                    ? profile.topics
                    : []
              );
            }

            // Set bio if exists
            if (profile.ProfilesBio) {
              setBio(profile.ProfilesBio);
            }

            // Load user's photo from photos collection (use cached userPhoto)
            if (userPhoto && userPhoto.thumbnail) {
              setUserPhotoThumbnail(userPhoto.thumbnail);
              setCompressedThumbnail(userPhoto.compressed_thumbnail);
              setPhotoTitle(userPhoto.title);
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
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        if (!cached) {
          setLoading(false);
        }
        setProfileDataLoaded(true);
      }
    };

    loadUserData();
    loadExistingPaymentData();
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
                    creatorId: globalUser.$id,
                    payment: JSON.stringify({
                      monthlyPrice: monthlyPrice || '0',
                      yearlyPrice: yearlyPrice || '0'
                    }),
                    PhotosLocation: location,
                    PhotoTopics: topics.join(', '),
                    Bio: bio
                  }
                );
                // Also update the public-available photos collection if a document exists for this user (do not create)
                try {
                  if (config.photosAvailableToUsersCollectionId) {
                    const existingPublic = await databases.listDocuments(
                      config.databaseId,
                      config.photosAvailableToUsersCollectionId,
                      [Query.equal('creatorId', globalUser.$id)]
                    );
                    if (existingPublic.documents.length > 0) {
                      await databases.updateDocument(
                        config.databaseId,
                        config.photosAvailableToUsersCollectionId,
                        existingPublic.documents[0].$id,
                        {
                          thumbnail: photoResult.imageUrl,
                          compressed_thumbnail: photoResult.compressedImageUrl,
                          title: creatorName || name || '',
                          prompte: creatorName || name || '',
                          creatorId: globalUser.$id,
                          payment: JSON.stringify({
                            monthlyPrice: monthlyPrice || '0',
                            yearlyPrice: yearlyPrice || '0'
                          }),
                          PhotosLocation: location,
                          PhotoTopics: topics.join(', '),
                          Bio: bio
                        }
                      );
                    }
                  }
                } catch (pubErr) {
                  console.error('Error updating photos available to users (pickImage/update):', pubErr);
                }
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
                    creatorId: globalUser.$id,
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
                // Only update public-available collection if a document already exists (do not create)
                try {
                  if (config.photosAvailableToUsersCollectionId) {
                    const existingPublic = await databases.listDocuments(
                      config.databaseId,
                      config.photosAvailableToUsersCollectionId,
                      [Query.equal('creatorId', globalUser.$id)]
                    );
                    if (existingPublic.documents.length > 0) {
                      await databases.updateDocument(
                        config.databaseId,
                        config.photosAvailableToUsersCollectionId,
                        existingPublic.documents[0].$id,
                        {
                          thumbnail: photoResult.imageUrl,
                          compressed_thumbnail: photoResult.compressedImageUrl,
                          title: creatorName || name || '',
                          prompte: creatorName || name || '',
                          creatorId: globalUser.$id,
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
                } catch (pubErr) {
                  console.error('Error updating photos available to users (pickImage/create):', pubErr);
                }
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
            creatorId: globalUser.$id,
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
        // Also update the public-available photos collection if a document exists (do not create)
        try {
          if (config.photosAvailableToUsersCollectionId) {
            const existingPublic = await databases.listDocuments(
              config.databaseId,
              config.photosAvailableToUsersCollectionId,
              [Query.equal('creatorId', globalUser.$id)]
            );
            if (existingPublic.documents.length > 0) {
              await databases.updateDocument(
                config.databaseId,
                config.photosAvailableToUsersCollectionId,
                existingPublic.documents[0].$id,
                {
                  thumbnail: newImageUrl,
                  compressed_thumbnail: newCompressedImageUrl || '',
                  title: creatorName || name || '',
                  prompte: creatorName || name || '',
                  creatorId: globalUser.$id,
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
        } catch (pubErr) {
          console.error('Error updating photos available to users (handleImageUpdate/update):', pubErr);
        }
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
            creatorId: globalUser.$id,
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
        // Only update public-available collection if a document already exists (do not create)
        try {
          if (config.photosAvailableToUsersCollectionId) {
            const existingPublic = await databases.listDocuments(
              config.databaseId,
              config.photosAvailableToUsersCollectionId,
              [Query.equal('creatorId', globalUser.$id)]
            );
            if (existingPublic.documents.length > 0) {
              await databases.updateDocument(
                config.databaseId,
                config.photosAvailableToUsersCollectionId,
                existingPublic.documents[0].$id,
                {
                  thumbnail: newImageUrl,
                  compressed_thumbnail: newCompressedImageUrl || '',
                  title: creatorName || name || '',
                  prompte: creatorName || name || '',
                  creatorId: globalUser.$id,
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
        } catch (pubErr) {
          console.error('Error updating photos available to users (handleImageUpdate/create):', pubErr);
        }
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
          creatorId: globalUser.$id,
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
          // Also update the public-available photos collection if a document exists (do not create)
          try {
            if (config.photosAvailableToUsersCollectionId) {
              const existingPublic = await databases.listDocuments(
                config.databaseId,
                config.photosAvailableToUsersCollectionId,
                [Query.equal('creatorId', globalUser.$id)]
              );
              if (existingPublic.documents.length > 0) {
                await databases.updateDocument(
                  config.databaseId,
                  config.photosAvailableToUsersCollectionId,
                  existingPublic.documents[0].$id,
                  photoData
                );
              }
            }
          } catch (pubErr) {
            console.error('Error updating photos available to users (handleUpdateProfile/update):', pubErr);
          }
        } else {
          // Create new photo document if it doesn't exist
          const newPhoto = await databases.createDocument(
            config.databaseId,
            config.photoCollectionId,
            ID.unique(),
            photoData
          );
          // Only update public-available collection if a document already exists (do not create)
          try {
            if (config.photosAvailableToUsersCollectionId) {
              const existingPublic = await databases.listDocuments(
                config.databaseId,
                config.photosAvailableToUsersCollectionId,
                [Query.equal('creatorId', globalUser.$id)]
              );
              if (existingPublic.documents.length > 0) {
                await databases.updateDocument(
                  config.databaseId,
                  config.photosAvailableToUsersCollectionId,
                  existingPublic.documents[0].$id,
            photoData
          );
              }
            }
          } catch (pubErr) {
            console.error('Error updating photos available to users (handleUpdateProfile/create):', pubErr);
          }
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
      
      // Force refresh channel conditions to update the missing info modal on index.tsx
      // This will clear cache and fetch fresh data to ensure the modal shows the latest state
      try {
        await refreshChannelConditions(true);
      } catch (refreshError) {
        console.error('Error refreshing channel conditions after profile update:', refreshError);
        // Try once more with a delay in case of temporary network issues
        setTimeout(async () => {
          try {
            await refreshChannelConditions(true);
          } catch (retryError) {
            console.error('Retry failed for refreshing channel conditions:', retryError);
          }
        }, 1000);
      }
      
      // Hide success message after 2 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);

      // Reset original form data to current state after successful save
      setOriginalFormData(captureFormData());

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
    } finally {
        setPaymentDataLoaded(true);
    }
  };

  // Capture original form data baseline only after all initial data has loaded
  useEffect(() => {
    if (!originalFormData && !loading && paymentDataLoaded && profileDataLoaded) {
      setOriginalFormData(normalizeFormData(captureFormData()));
    }
  }, [loading, paymentDataLoaded, profileDataLoaded]);

  // Normalize form data for stable comparisons
  const normalizeFormData = (data: any) => {
    return {
      profileImage: data.profileImage || '',
      location: (data.location || '').trim(),
      creatorName: (data.creatorName || '').trim(),
      topics: (Array.isArray(data.topics) ? data.topics.join(',') : (data.topics || '')).trim(),
      bio: (data.bio || '').trim(),
      phoneNumber: (data.phoneNumber || '').trim(),
      selectedCountry: data.selectedCountry || '',
      selectedGender: data.selectedGender || '',
      selectedMonth: data.selectedMonth || '',
      selectedDay: data.selectedDay || '',
      selectedYear: data.selectedYear || '',
      monthlyPrice: (data.monthlyPrice || '').toString().trim(),
      yearlyPrice: (data.yearlyPrice || '').toString().trim(),
      selectedCurrency: data.selectedCurrency || 'USD',
    };
  };

  // Save prices function for SubscriptionsModal
  const handleSavePrices = async () => {
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

      // Enforce maximum price of 200 for both monthly and yearly
      const cappedMonthly = Math.min(monthly, 9999);
      const cappedYearly = Math.min(yearly, 9999);
      if (cappedMonthly !== monthly) setMonthlyPrice(cappedMonthly.toString());
      if (cappedYearly !== yearly) setYearlyPrice(cappedYearly.toString());

      // Save prices and currency to Appwrite
      if (globalUser?.$id) {
        await updateCreatorPayment(globalUser.$id, {
          monthlyPrice: cappedMonthly,
          yearlyPrice: cappedYearly,
          currency: selectedCurrency
        });
        
        // Force refresh channel conditions to update the missing info modal on index.tsx
        // This will clear cache and fetch fresh data to ensure the modal shows the latest state
        try {
          await refreshChannelConditions(true);
        } catch (refreshError) {
          console.error('Error refreshing channel conditions after pricing update:', refreshError);
          // Try once more with a delay in case of temporary network issues
          setTimeout(async () => {
            try {
              await refreshChannelConditions(true);
            } catch (retryError) {
              console.error('Retry failed for refreshing channel conditions:', retryError);
            }
          }, 1000);
        }
        
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
  };

  // Save creator name function for CreatorNameModal
  const handleSaveCreatorName = async (name: string) => {
    setCreatorName(name);
  };

  // Function to capture current form state
  const captureFormData = () => {
    return normalizeFormData({
      profileImage,
      location,
      creatorName,
      topics: topics.join(','),
      bio,
      phoneNumber,
      selectedCountry: selectedCountry.code,
      selectedGender: selectedGender?.value || '',
      selectedMonth,
      selectedDay,
      selectedYear,
      monthlyPrice,
      yearlyPrice,
      selectedCurrency
    });
  };

  // Function to check if form has unsaved changes
  const checkForUnsavedChanges = () => {
    if (!originalFormData) return false;
    
    const currentData = captureFormData();
    return JSON.stringify(originalFormData) !== JSON.stringify(currentData);
  };

  // Handle back button press with unsaved changes check
  const handleBackPress = () => {
    if (checkForUnsavedChanges()) {
      setShowUnsavedChangesModal(true);
    } else {
      router.back();
    }
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setShowUnsavedChangesModal(false);
    router.back();
  };

  // Handle save and exit
  const handleSaveAndExit = async () => {
    if (!profileImage) {
      // Don't save if no profile image, just show an alert and keep modal open
      Alert.alert(
        'Profile Picture Required',
        'Please add a profile picture before saving your profile.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowUnsavedChangesModal(false);
    setIsSavingAndExiting(true);
    
    // Start rotating wheel animations
    Animated.loop(
      Animated.timing(outerWheelRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
    
    Animated.loop(
      Animated.timing(innerWheelRotation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
    
    try {
      await handleUpdateProfile();
      // Add success vibration feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(100); // Short vibration for success
      
      // Small delay to show success state before navigating
      setTimeout(() => {
        outerWheelRotation.stopAnimation();
        innerWheelRotation.stopAnimation();
        setIsSavingAndExiting(false);
        router.back();
      }, 800);
    } catch (error) {
      console.error('Error in handleSaveAndExit:', error);
      outerWheelRotation.stopAnimation();
      innerWheelRotation.stopAnimation();
      setIsSavingAndExiting(false);
      // Don't navigate back if there was an error
    }
  };



  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }} edges={[]}>
        <View className="flex-1 items-center justify-center">
          <Image 
            source={require('../../../assets/icon/loading-icon.png')} 
            style={{ width: 48, height: 48, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={{ color: theme.text, fontSize: 16, fontFamily: 'Urbanist-Medium' }} allowFontScaling={false}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundTertiary }} edges={[]}>
      {/* Header with back and settings */}
      <View style={{ 
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: theme.backgroundTertiary
      }}>
        <View className="flex-row items-center">
        <TouchableOpacity onPress={handleBackPress} className="flex-row items-center">
          <Ionicons 
            name="chevron-back-outline" 
            size={32} 
            color={theme.text} 
            style={{ marginRight: 4 }}
          />
          <Text style={{ color: theme.text, fontSize: 21, marginLeft: 8, fontFamily: 'Nunito-Bold' }} allowFontScaling={false}>
              Edit Profile
          </Text>
        </TouchableOpacity>
        <View className="flex-1" />
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons 
            name="settings-outline" 
            size={32} 
            color={theme.text}
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
      >
        {/* Edit form section with padding */}
        <View className="px-4 items-center mt-4 mb-4">
        {/* Avatar with Preview Button */}
        <View className="w-full mb-4 relative">
          {/* Centered Profile Picture */}
          <View className="w-36 h-36 rounded-full bg-[#FD6F3E] items-center justify-center relative mx-auto">
            {isUploadingImage ? (
              <View className="w-full h-full items-center justify-center">
                <ActivityIndicator size="large" color="#676767" />
              </View>
            ) : profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                className="w-36 h-36 rounded-full"
                style={{ resizeMode: 'cover' }}
              />
            ) : (
              <Text className="text-2xl font-bold" style={{ color: theme.textInverse }} allowFontScaling={false}>{name?.[0] || 'U'}</Text>
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
          
          {/* Preview Button - Positioned Absolutely */}
          <TouchableOpacity
            onPress={() => setShowPreviewModal(true)}
            style={{
              position: 'absolute',
              left: 16,
              top: '100%',
              transform: [{ translateY: -20 }],
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.borderDark
            }}
          >
            <Ionicons name="eye-outline" size={20} color={theme.primary} />
            <Text style={{ 
              color: theme.text, 
              fontSize: 14, 
              fontFamily: 'questrial',
              marginLeft: 8,
              fontWeight: '600'
            }} allowFontScaling={false}>
              Preview
            </Text>
            </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className="mt-8">
          {/* Name */}
          <View className={`flex-row items-center rounded-lg px-5 py-4 mb-2`} style={{ 
            backgroundColor: theme.cardBackground,
            borderWidth: focusedInput === 'name' ? 1 : 0,
            borderColor: focusedInput === 'name' ? theme.primary : 'transparent'
          }}>
            <Ionicons 
              name="person-outline" 
              size={24} 
              color={focusedInput === 'name' ? theme.primary : theme.textSecondary} 
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 font-questrial text-lg h-9"
              value={name}
              editable={false}
              style={{ textAlignVertical: 'center', color: theme.text, paddingBottom: 12 }}
            />
          </View>

          {/* Birth Date */}
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center rounded-lg px-5 py-4 mb-2"
            style={{ 
              backgroundColor: theme.cardBackground,
              borderWidth: focusedInput === 'birthDate' ? 1 : 0,
              borderColor: focusedInput === 'birthDate' ? theme.primary : 'transparent'
            }}
          >
            <Ionicons 
              name="calendar-outline" 
              size={24} 
              color={focusedInput === 'birthDate' ? theme.primary : theme.textSecondary} 
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 font-questrial text-lg h-9"
              value={`${selectedMonth}/${selectedDay}/${selectedYear}`}
              editable={false}
              style={{ textAlignVertical: 'center', color: theme.text, paddingBottom: 12 }}
            />
          </TouchableOpacity>

          {/* Email */}
          <View className="flex-row items-center rounded-lg px-5 py-4 mb-2" style={{ 
            backgroundColor: theme.cardBackground,
            borderWidth: focusedInput === 'email' ? 1 : 0,
            borderColor: focusedInput === 'email' ? theme.primary : 'transparent'
          }}>
            <Ionicons 
              name="mail-outline" 
              size={24} 
              color={focusedInput === 'email' ? theme.primary : theme.textSecondary} 
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 font-questrial text-lg h-9"
              value={email}
              editable={false}
              style={{ textAlignVertical: 'center', color: theme.text, paddingBottom: 17 }}
            />
          </View>

          {/* Phone Number */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity 
              onPress={() => setShowCountryPicker(true)}
              className="flex-row items-center rounded-lg px-5 py-5 w-24 mr-2"
              style={{ 
                backgroundColor: theme.cardBackground,
                borderWidth: focusedInput === 'countryCode' ? 1 : 0,
                borderColor: focusedInput === 'countryCode' ? theme.primary : 'transparent'
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.text, fontSize: 20, marginRight: 8 }} allowFontScaling={false}>{selectedCountry.flag}</Text>
              <Text style={{ color: theme.text, fontFamily: 'questrial', fontSize: 16 }} allowFontScaling={false}>{selectedCountry.code}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center rounded-lg px-5 py-5 flex-1"
              style={{ backgroundColor: theme.cardBackground }}
              activeOpacity={0.8}
              onPress={() => {
                setTempPhoneNumber(phoneNumber);
                setShowPhoneNumberModal(true);
              }}
            >
              <Ionicons 
                name="call-outline" 
                size={24} 
                color={theme.textSecondary} 
                style={{ marginRight: 12 }}
              />
              <Text style={{ color: theme.text, fontFamily: 'Nunito-Regular', fontSize: 17, flex: 1 }} allowFontScaling={false}>
                {phoneNumber ? phoneNumber : 'Enter phone number'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
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
                      backgroundColor: selectedGender?.value === gender.value ? theme.primary : theme.cardBackground,
                      borderRadius: 18,
                      paddingVertical: 12,
                      paddingHorizontal: 0,
                      marginHorizontal: 0,
                      flex: 1,
                      marginRight: gender.value !== 'other' ? 12 : 0,
                      borderWidth: selectedGender?.value === gender.value ? 1 : 0,
                      borderColor: selectedGender?.value === gender.value ? theme.primary : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                  <Text style={{ 
                    color: selectedGender?.value === gender.value ? theme.textInverse : theme.text, 
                    fontFamily: 'questrial', 
                    fontSize: 17,
                    textAlign: 'center',
                  }} allowFontScaling={false}>
                    {gender.icon} {gender.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Creator's Name - Modal Style */}
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              className="rounded-lg px-5 py-5 flex-row items-center"
              style={{ backgroundColor: theme.cardBackground }}
              activeOpacity={0.8}
              onPress={() => {
                setTempCreatorName(creatorName);
                setShowCreatorNameModal(true);
              }}
              disabled={showCreatorNameWarning}
            >
              <Ionicons name="person-circle-outline" size={22} color={showCreatorNameWarning ? theme.textTertiary : theme.textSecondary} style={{ marginRight: 10 }} />
              <Text style={{ 
                color: showCreatorNameWarning ? theme.textSecondary : theme.text, 
                fontFamily: 'Nunito-Regular', 
                fontSize: 18, 
                flex: 1 
              }} allowFontScaling={false}>
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
                    color: 'black', 
                    fontSize: 12, 
                    fontFamily: 'Urbanist-Light',
                    fontWeight: '600'
                  }} allowFontScaling={false}>
                    LOCKED
                  </Text>
                </View>
              ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
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
                  }} allowFontScaling={false}>
                    Creator name cannot be changed once your channel is live. Contact support if needed.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Bio - Modal Style */}
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              className="rounded-lg px-5 py-4 flex-row items-center"
              style={{ backgroundColor: theme.cardBackground }}
              activeOpacity={0.8}
              onPress={() => {
                setTempBio(bio);
                setShowBioModal(true);
              }}
            >
              <Ionicons name="document-text-outline" size={22} color={theme.textSecondary} style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text style={{ color: theme.text, fontFamily: 'Nunito-Regular', fontSize: 18 }} allowFontScaling={false}>
                  {bio ? bio : 'Tell us about yourself'}
                </Text>
                {bio && (
                  <Text style={{ color: theme.textTertiary, fontSize: 14, marginTop: 4 }} allowFontScaling={false}>
                    {bio.length}/300 characters
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Location - Modal Style */}
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              className="rounded-lg px-5 py-5 flex-row items-center"
              style={{ backgroundColor: theme.cardBackground }}
              activeOpacity={0.8}
              onPress={() => {
                setTempLocation(location);
                setShowLocationModal(true);
              }}
            >
              <Ionicons name="location-outline" size={22} color={theme.textSecondary} style={{ marginRight: 10 }} />
              <Text style={{ color: theme.text, fontFamily: 'Nunito-Regular', fontSize: 18, flex: 1 }} allowFontScaling={false}>
                {location ? location : 'Enter your location'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Topics (Button + Modal) */}
          <View style={{ marginBottom: 16 }}>
           
            <TouchableOpacity
              className="rounded-lg px-5 py-5 mb-2 flex-row items-center"
              style={{ backgroundColor: theme.cardBackground }}
              activeOpacity={0.8}
              onPress={() => setShowTopicsModal(true)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.primary} style={{ marginRight: 10 }} />
              <Text style={{ color: theme.text, fontFamily: 'Nunito-Regular', fontSize: 18 }} allowFontScaling={false}>
                {topics.length > 0 ? (
                  topics.length <= 3 
                    ? topics.join(', ')
                    : `${topics.slice(0, 3).join(', ')}...`
                ) : 'Choose topics'}
              </Text>
            </TouchableOpacity>
            <Modal
              visible={showTopicsModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowTopicsModal(false)}
            >
              <View style={{ flex: 1, backgroundColor: theme.modalOverlay, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: theme.modalBackground, borderRadius: 24, padding: 24, width: '90%' }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'questrial', marginBottom: 16, textAlign: 'center' }} allowFontScaling={false}>
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
                            backgroundColor: selected ? theme.primary : theme.cardBackground,
                            borderRadius: 18,
                            paddingVertical: 7,
                            paddingHorizontal: 16,
                            margin: 4,
                            borderWidth: 1,
                            borderColor: selected ? theme.primary : theme.borderDark,
                          }}
                        >
                          <Text style={{ color: selected ? theme.textInverse : theme.text, fontFamily: 'questrial', fontSize: 15 }} allowFontScaling={false}>
                            {topic}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={{ marginTop: 24, backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 12 }}
                    onPress={() => setShowTopicsModal(false)}
                  >
                    <Text style={{ color: theme.textInverse, fontSize: 16, fontFamily: 'questrial', textAlign: 'center', fontWeight: 'bold' }} allowFontScaling={false}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            {/* Subscriptions Button */}
            <TouchableOpacity 
              className="rounded-lg py-4 mb-1 flex-row items-center justify-center"
              style={{ backgroundColor: theme.cardBackground }}
              activeOpacity={0.8}
              onPress={async () => {
                await loadExistingPaymentData();
                setShowSubscriptionsModal(true);
              }}
            >
              <Ionicons name="card-outline" size={22} color={theme.primary} style={{ marginRight: 10 }} />
              <Text style={{ color: theme.text, textAlign: 'center', fontFamily: 'questrial', fontSize: 18 }} allowFontScaling={false}>
                Subscriptions
              </Text>
            </TouchableOpacity>
          </View>

          {/* Update Button */}
          <TouchableOpacity 
            className="rounded-lg py-4 mt-2 mb-2"
            style={{ 
              backgroundColor: !profileImage ? theme.textTertiary : theme.primary,
              opacity: !profileImage ? 0.5 : 1
            }}
            activeOpacity={0.8}
            onPress={handleUpdateProfile}
            disabled={saving || !profileImage}
          >
            <Text style={{ color: theme.textInverse, textAlign: 'center', fontFamily: 'questrial', fontSize: 18 }} allowFontScaling={false}>
              {saving ? 'Updating...' : 'Update Profile'}
            </Text>
          </TouchableOpacity>
          {/* Show a message if no profile image */}
          {!profileImage && (
            <Text style={{ color: theme.primary, textAlign: 'center', marginBottom: 8, fontFamily: 'questrial', fontWeight: '600' }} allowFontScaling={false}>
              Please add a profile picture to update your profile.
            </Text>
          )}

          {/* Success Message */}
          {successMessage && (
            <Text style={{ color: theme.success, textAlign: 'center', marginTop: 8, fontFamily: 'questrial' }} allowFontScaling={false}>
                {successMessage}
            </Text>
          )}
        </View>

        {/* Date Picker Modal */}
        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          selectedMonth={selectedMonth}
          selectedDay={selectedDay}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onDayChange={setSelectedDay}
          onYearChange={setSelectedYear}
          getDaysInMonth={getDaysInMonth}
        />

        {/* Country Picker Modal */}
        <CountryPickerModal
          visible={showCountryPicker}
          onClose={() => setShowCountryPicker(false)}
          countries={countries}
          selectedCountry={selectedCountry}
          onSelectCountry={setSelectedCountry}
        />

        {/* Gender Picker Modal */}
        <GenderPickerModal
          visible={showGenderPicker}
          onClose={() => setShowGenderPicker(false)}
          genders={genders}
          selectedGender={selectedGender}
          onSelectGender={setSelectedGender}
        />

        {/* Subscriptions Modal */}
        <SubscriptionsModal
          visible={showSubscriptionsModal}
          onClose={() => setShowSubscriptionsModal(false)}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
          monthlyPrice={monthlyPrice}
          setMonthlyPrice={setMonthlyPrice}
          yearlyPrice={yearlyPrice}
          setYearlyPrice={setYearlyPrice}
          savingPrices={savingPrices}
          priceError={priceError}
          successMessage={successMessage}
          showCreatorNameWarning={showCreatorNameWarning}
          currencies={currencies}
          onSave={handleSavePrices}
          calculatePriceBreakdown={calculatePriceBreakdown}
        />


                      </View>
      </ScrollView>

      {/* Creator Name Modal */}
      <CreatorNameModal
        visible={showCreatorNameModal}
        onClose={() => setShowCreatorNameModal(false)}
        tempCreatorName={tempCreatorName}
        setTempCreatorName={setTempCreatorName}
        creatorNameError={creatorNameError}
        setCreatorNameError={setCreatorNameError}
        checkingCreatorName={checkingCreatorName}
        onSave={handleSaveCreatorName}
        checkCreatorNameAvailability={checkCreatorNameAvailability}
      />

      {/* Bio Modal */}
      <BioModal
        visible={showBioModal}
        onClose={() => setShowBioModal(false)}
        tempBio={tempBio}
        setTempBio={setTempBio}
        onSave={setBio}
      />

      {/* Location Modal */}
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        tempLocation={tempLocation}
        setTempLocation={setTempLocation}
        onSave={setLocation}
      />

            {/* Phone Number Modal */}
      <PhoneNumberModal
        visible={showPhoneNumberModal}
        onClose={() => setShowPhoneNumberModal(false)}
        selectedCountry={selectedCountry}
        tempPhoneNumber={tempPhoneNumber}
        setTempPhoneNumber={setTempPhoneNumber}
        onSave={setPhoneNumber}
        formatPhoneNumber={formatPhoneNumber}
      />

      {/* Profile Preview Modal */}
      <ProfilePreviewModal
        visible={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
              profileImageUri={profileImage || undefined}
              name={photoTitle || creatorName || name || ''}
              location={location}
              bio={bio}
              monthlyPrice={monthlyPrice}
              yearlyPrice={yearlyPrice}
        creatorName={creatorName}
              topics={topics.join(', ')}
              phoneNumber={selectedCountry.code + phoneNumber}
        selectedGender={selectedGender}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedDay={selectedDay}
        userCurrency={userCurrency}
        selectedCurrency={selectedCurrency}
      />

      {/* Saving Animation Modal */}
      <Modal
        visible={isSavingAndExiting}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // Prevent closing while saving
      >
          <View style={{ 
            flex: 1, 
          backgroundColor: theme.modalOverlay, 
            justifyContent: 'center', 
            alignItems: 'center',
          paddingHorizontal: 20
        }}>
          <View style={{ 
            backgroundColor: theme.modalBackground, 
            borderRadius: 20, 
            padding: 40, 
              alignItems: 'center',
            minWidth: 200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5
          }}>
            {/* Loading Animation Container */}
              <View style={{ 
              width: 80,
              height: 80,
              justifyContent: 'center',
                alignItems: 'center', 
              marginBottom: 20,
              position: 'relative'
            }}>
              {/* Outer Wheel - Rotating Clockwise */}
              <Animated.View style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderWidth: 3,
                borderColor: '#FD6F3E',
                borderTopColor: 'transparent',
                borderRightColor: 'transparent',
                borderRadius: 40,
                transform: [{
                  rotate: outerWheelRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }]
              }} />
              
              {/* Inner Wheel - Rotating Counter-Clockwise */}
              <Animated.View style={{
                position: 'absolute',
                width: 60,
                height: 60,
                borderWidth: 2,
                borderColor: '#333',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
                borderRadius: 30,
                transform: [{
                  rotate: innerWheelRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['360deg', '0deg']
                  })
                }]
              }} />
              
              {/* Loading Icon in Center */}
              <Image 
                source={require('../../../assets/icon/loading-icon.png')}
                style={{
                  width: 32,
                  height: 32,
                  tintColor: '#666'
                }}
                resizeMode="contain"
              />
            </View>
            
                <Text style={{ 
              color: theme.text, 
              fontSize: 18, 
              fontFamily: 'Nunito-Bold', 
                  textAlign: 'center', 
              marginBottom: 8
                }} allowFontScaling={false}>
              Saving Profile...
                </Text>
            
                  <Text style={{ 
              color: theme.textSecondary, 
                    fontSize: 14,
              fontFamily: 'Nunito-Regular', 
              textAlign: 'center',
              lineHeight: 20
                  }} allowFontScaling={false}>
              Please wait while we update your profile
                  </Text>
                </View>
              </View>
      </Modal>

      {/* Unsaved Changes Modal */}
      <Modal
        visible={showUnsavedChangesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnsavedChangesModal(false)}
      >
          <View style={{ 
            flex: 1, 
          backgroundColor: theme.modalOverlay, 
            justifyContent: 'center', 
            alignItems: 'center',
          paddingHorizontal: 20
            }}>
              <View style={{ 
            backgroundColor: theme.modalBackground, 
                  borderRadius: 16,
            padding: 24, 
                  width: '100%',
            maxWidth: 340
          }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="warning-outline" size={48} color={theme.primary} />
              </View>
            
                <Text style={{ 
                  color: theme.text, 
                  fontSize: 20, 
              fontFamily: 'Nunito-Bold', 
              textAlign: 'center',
              marginBottom: 8
            }} allowFontScaling={false}>
              Unsaved Changes
            </Text>
            
            <Text style={{ 
              color: theme.textSecondary, 
                  fontSize: 16,
              fontFamily: 'Nunito-Regular', 
                  textAlign: 'center',
              marginBottom: 24,
              lineHeight: 22
            }} allowFontScaling={false}>
              You have unsaved changes that will be lost if you leave this page. Do you want to save your changes?
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                onPress={handleDiscardChanges}
                  style={{ 
                    flex: 1, 
                  backgroundColor: theme.backgroundSecondary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center'
                  }}
                >
                  <Text style={{ 
                  color: theme.textSecondary, 
                    fontSize: 16, 
                  fontFamily: 'Nunito-SemiBold'
                }} allowFontScaling={false}>
                  Discard
                </Text>
                </TouchableOpacity>
              
                <TouchableOpacity 
                onPress={handleSaveAndExit}
                  style={{ 
                    flex: 1, 
                  backgroundColor: !profileImage ? theme.textTertiary : theme.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center'
                }}
                disabled={saving || !profileImage}
                >
                  <Text style={{ 
                  color: !profileImage ? theme.textSecondary : theme.textInverse, 
                    fontSize: 16, 
                  fontFamily: 'Nunito-SemiBold'
                }} allowFontScaling={false}>
                  {saving ? 'Saving...' : 'Save & Exit'}
                </Text>
                </TouchableOpacity>
              </View>
            
            {!profileImage && (
              <Text style={{ 
                color: theme.primary, 
                fontSize: 14, 
                fontFamily: 'Nunito-Regular', 
                   textAlign: 'center', 
                marginTop: 12
              }} allowFontScaling={false}>
                Profile picture required to save changes
                 </Text>
            )}
           </View>
        </View>
       </Modal>

     </SafeAreaView>
   );
 }
