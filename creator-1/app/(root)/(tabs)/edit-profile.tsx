import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Query } from 'appwrite';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config, databases, getUserProfile, updateCreatorPayment, updateUserProfile, uploadProfilePicture } from '../../../lib/appwrite';
import { useGlobalContext } from '../../../lib/global-provider';

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
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽' },
  { name: 'Russia', code: '+7', flag: '🇷🇺' },
];

const genders = [
  { value: 'male', label: 'Male', icon: '👨' },
  { value: 'female', label: 'Female', icon: '👩' },
  { value: 'other', label: 'Other', icon: '👤' },
  { value: 'unicorn', label: 'Unicorn', icon: '🦄' },
];

// Trending topics (flattened)
const trendingTopics = [
  "Music", "Gaming", "Sports", "Comedy", "Food", "Travel", "Fashion", "Tech",
  "Movies", "Fitness", "Art", "Science", "History", "Anime", "Photography", "DIY",
  "Health", "Nature", "Coding", "Writing", "Gossip", "Politics", "Space", "Animals", "Cars"
];

export default function EditProfile() {
  const router = useRouter();
  const { user: globalUser } = useGlobalContext();
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

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
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
          // Upload the image to Appwrite
          const photoResult = await uploadProfilePicture({
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: 'profile.jpg'
          }, profileImage || undefined);
          
          if (photoResult) {
            setProfileImage(photoResult.imageUrl);
            // Update profile immediately with the new image URL
            if (globalUser?.$id) {
              await updateUserProfile(globalUser.$id, {
                userId: globalUser.$id,
                profileImageUri: photoResult.imageUrl
              });
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

  const handleUpdateProfile = async () => {
    if (!globalUser?.$id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      setSaving(true);

      // Prepare profile data (only fields in profile collection schema)
      const profileData = {
        Location: location,
        creatorsname: creatorName,
        topics: topics.join(', '),
        ProfilesBio: bio,
        phoneNumber: selectedCountry.code + '', // Will append phone number below
        gender: selectedGender?.value || '',
        dateOfBirth: `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`,
      };

      // Add phone number digits if present
      // Find the phone number input value (search for the TextInput for phone number)
      // We'll assume you have a phoneNumber state or can extract it from the input
      if (typeof phoneNumber === 'string' && phoneNumber.trim() !== '') {
        profileData.phoneNumber = selectedCountry.code + phoneNumber.trim();
      }

      // Update profile in Appwrite
      await updateUserProfile(globalUser.$id, profileData);
      
      // Show success message and trigger haptic feedback
      setSuccessMessage('Profile updated successfully!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
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
    if (!price) return { storeFee: 0, platformFee: 0, creatorEarnings: 0 };
    const numPrice = parseFloat(price);
    const storeFee = numPrice * 0.30; // 30% to app store
    const platformFee = numPrice * 0.15; // 15% to Cherrizbox
    const creatorEarnings = numPrice - storeFee - platformFee;
    return { storeFee, platformFee, creatorEarnings };
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

        if (existingProfile.documents.length > 0 && existingProfile.documents[0].creatorpayment) {
            try {
                const paymentData = JSON.parse(existingProfile.documents[0].creatorpayment);
                setMonthlyPrice(paymentData.monthlyPrice.toString());
                setYearlyPrice(paymentData.yearlyPrice.toString());
            } catch (e) {
                console.error('Error parsing payment data:', e);
            }
        }
    } catch (error) {
        console.error('Error loading payment data:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']}>
      {/* Header with back and settings */}
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Image 
            source={require('../../../assets/icon/back.png')}
            className="w-8 h-8"
            resizeMode="contain"
          />
          <Text style={{ color: 'white', fontSize: 21, marginLeft: 12, fontFamily: 'Nunito-Bold' }}>
            Edit Profile
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

      <ScrollView 
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar (moved inside ScrollView) */}
        <View className="items-center mt-8 mb-4">
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
          <View className="flex-row items-center mb-2">
            <TouchableOpacity 
              onPress={() => setShowCountryPicker(true)}
              className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-5 w-24 mr-2 ${
                focusedInput === 'countryCode' ? 'border border-[#FB2355]' : ''
              }`}
              activeOpacity={0.7}
            >
              <Text className="text-white font-questrial text-lg mr-2">{selectedCountry.flag}</Text>
              <Text className="text-white font-questrial text-lg">{selectedCountry.code}</Text>
            </TouchableOpacity>
            <View className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 flex-1 ${
              focusedInput === 'phoneNumber' ? 'border border-[#FB2355]' : ''
            }`}>
              <Ionicons 
                name="call-outline" 
                size={24} 
                color={focusedInput === 'phoneNumber' ? '#FB2355' : '#666'} 
                style={{ marginRight: 12 }}
              />
              <TextInput
                className="flex-1 text-white font-questrial text-lg h-9"
                placeholderTextColor="#666"
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                onFocus={() => setFocusedInput('phoneNumber')}
                onBlur={() => setFocusedInput(null)}
                style={{ textAlignVertical: 'center', color: 'white', paddingBottom: 7 }}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>

          {/* Gender */}
          <TouchableOpacity 
            onPress={() => setShowGenderPicker(true)}
            className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 w-full ${
              focusedInput === 'gender' ? 'border border-[#FB2355]' : ''
            }`}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="person-outline" 
              size={24} 
              color={focusedInput === 'gender' ? '#FB2355' : '#666'} 
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 text-white font-questrial text-lg h-9"
              value={selectedGender?.label || ''}
              placeholder="Select your gender"
              placeholderTextColor="#666"
              editable={false}
              style={{ textAlignVertical: 'center', color: 'white', paddingBottom: 12 }}
            />
          </TouchableOpacity>

          {/* Add extra space after gender field */}
          <View style={{ height: 7 }} />

          {/* Creator's Name */}
          <View className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 mb-2 ${
            focusedInput === 'creatorName' ? 'border border-[#FB2355]' : ''
          }`}>
            <Ionicons 
              name="person-circle-outline" 
              size={24} 
              color={focusedInput === 'creatorName' ? '#FB2355' : '#666'} 
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 text-white font-questrial text-lg h-9"
              value={creatorName}
              onChangeText={setCreatorName}
              placeholder="Creator's Name (public)"
              placeholderTextColor="#666"
              onFocus={() => setFocusedInput('creatorName')}
              onBlur={() => setFocusedInput(null)}
              style={{ textAlignVertical: 'center', color: 'white', paddingBottom: 12 }}
            />
          </View>

          {/* Bio */}
          <TouchableOpacity 
            className={`bg-[#1A1A1A] rounded-lg px-5 py-4 mb-2 ${focusedInput === 'bio' ? 'border border-[#FB2355]' : ''}`}
            onPress={() => {
              setTempBio(bio);
              setShowBioModal(true);
            }}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="document-text-outline"
                size={24}
                color={focusedInput === 'bio' ? '#FB2355' : '#666'}
                style={{ marginRight: 12 }}
              />
              <View className="flex-1">
                <Text className="text-white font-questrial text-lg">
                  {bio ? bio : 'Bio (tell us about yourself)'}
                </Text>
                {bio && (
                  <Text className="text-gray-400 text-sm mt-1">
                    {bio.length}/300 characters
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Bio Modal */}
          <Modal
            visible={showBioModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              Keyboard.dismiss();
              setShowBioModal(false);
            }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                <TouchableWithoutFeedback>
                  <View style={{ backgroundColor: '#181818', borderRadius: 24, padding: 24, width: '90%', maxHeight: '80%' }}>
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-white text-xl font-bold">Edit Bio</Text>
                      <TouchableOpacity 
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowBioModal(false);
                        }}
                      >
                        <Ionicons name="close" size={24} color="#FB2355" />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      className="bg-[#222] text-white rounded-lg px-4 py-3 min-h-[150]"
                      value={tempBio}
                      onChangeText={setTempBio}
                      placeholder="Tell us about yourself..."
                      placeholderTextColor="#666"
                      multiline
                      maxLength={300}
                      style={{ textAlignVertical: 'top' }}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={() => {
                        Keyboard.dismiss();
                        setBio(tempBio);
                        setShowBioModal(false);
                      }}
                    />

                    <Text className="text-gray-400 text-sm mt-2 text-right">
                      {tempBio.length}/300 characters
                    </Text>

                    <View className="flex-row justify-end mt-4 space-x-6">
                      <TouchableOpacity 
                        className="bg-[#333] rounded-lg px-6 py-3"
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowBioModal(false);
                        }}
                      >
                        <Text className="text-white font-questrial">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="bg-[#FB2355] rounded-lg px-6 py-3"
                        onPress={() => {
                          Keyboard.dismiss();
                          setBio(tempBio);
                          setShowBioModal(false);
                        }}
                      >
                        <Text className="text-white font-questrial">Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Location */}
          <TouchableOpacity 
            className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 mb-2 ${
              focusedInput === 'location' ? 'border border-[#FB2355]' : ''
            }`}
            onPress={() => {
              setTempLocation(location);
              setShowLocationModal(true);
            }}
          >
            <Ionicons 
              name="location-outline" 
              size={24} 
              color={focusedInput === 'location' ? '#FB2355' : '#666'} 
              style={{ marginRight: 12 }}
            />
            <View className="flex-1">
              <Text className="text-white font-questrial text-lg">
                {location ? location : 'Location'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Location Modal */}
          <Modal
            visible={showLocationModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              Keyboard.dismiss();
              setShowLocationModal(false);
            }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                <TouchableWithoutFeedback>
                  <View style={{ backgroundColor: '#181818', borderRadius: 24, padding: 24, width: '90%', maxHeight: '80%' }}>
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-white text-xl font-bold">Edit Location</Text>
                      <TouchableOpacity 
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowLocationModal(false);
                        }}
                      >
                        <Ionicons name="close" size={24} color="#FB2355" />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      className="bg-[#222] text-white rounded-lg px-4 py-3"
                      value={tempLocation}
                      onChangeText={setTempLocation}
                      placeholder="Enter your location..."
                      placeholderTextColor="#666"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={() => {
                        Keyboard.dismiss();
                        setLocation(tempLocation);
                        setShowLocationModal(false);
                      }}
                    />

                    <View className="flex-row justify-end mt-4 space-x-6">
                      <TouchableOpacity 
                        className="bg-[#333] rounded-lg px-6 py-3"
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowLocationModal(false);
                        }}
                      >
                        <Text className="text-white font-questrial">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="bg-[#FB2355] rounded-lg px-6 py-3"
                        onPress={() => {
                          Keyboard.dismiss();
                          setLocation(tempLocation);
                          setShowLocationModal(false);
                        }}
                      >
                        <Text className="text-white font-questrial">Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Topics (Button + Modal) */}
          <View className="mb-4">
           
            <TouchableOpacity
              className="bg-[#1A1A1A] rounded-lg px-5 py-4 mb-2 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => setShowTopicsModal(true)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FB2355" style={{ marginRight: 10 }} />
              <Text className="text-white font-questrial text-lg">
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
              <Text className="text-white text-center font-questrial text-lg">
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
          animationType="slide"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-[#1A1A1A] rounded-t-3xl p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-xl font-bold">Select Country</Text>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <Ionicons name="close" size={24} color="#FB2355" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={countries}
                keyExtractor={(item) => item.code + item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-row items-center py-3 border-b border-gray-800"
                    onPress={() => {
                      setSelectedCountry(item);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text className="text-white text-xl mr-3">{item.flag}</Text>
                    <Text className="text-white text-lg flex-1">{item.name}</Text>
                    <Text className="text-white text-lg">{item.code}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
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
                {/* Monthly Price Input */}
                <View className="mb-4">
                  <Text className="text-white text-lg mb-2">Monthly Price ($)</Text>
                  <TextInput
                    className="bg-[#222] text-white rounded-lg px-4 py-3"
                    value={monthlyPrice}
                    onChangeText={setMonthlyPrice}
                    keyboardType="decimal-pad"
                    placeholder="Enter monthly price"
                    placeholderTextColor="#666"
                  />
                  {monthlyPrice && (
                    <View className="mt-2 bg-[#222] rounded-lg p-3">
                      <Text className="text-gray-400 text-sm">Price Breakdown (Monthly):</Text>
                      <Text className="text-white mt-1">Store Fee (30%): ${calculatePriceBreakdown(monthlyPrice).storeFee.toFixed(2)}</Text>
                      <Text className="text-white mt-1">Platform Fee (15%): ${calculatePriceBreakdown(monthlyPrice).platformFee.toFixed(2)}</Text>
                      <Text className="text-[#FB2355] font-bold mt-1">Your Earnings: ${calculatePriceBreakdown(monthlyPrice).creatorEarnings.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                {/* Yearly Price Input */}
                <View className="mb-4">
                  <Text className="text-white text-lg mb-2">Yearly Price ($)</Text>
                  <TextInput
                    className="bg-[#222] text-white rounded-lg px-4 py-3"
                    value={yearlyPrice}
                    onChangeText={setYearlyPrice}
                    keyboardType="decimal-pad"
                    placeholder="Enter yearly price"
                    placeholderTextColor="#666"
                  />
                  {yearlyPrice && (
                    <View className="mt-2 bg-[#222] rounded-lg p-3">
                      <Text className="text-gray-400 text-sm">Price Breakdown (Yearly):</Text>
                      <Text className="text-white mt-1">Store Fee (30%): ${calculatePriceBreakdown(yearlyPrice).storeFee.toFixed(2)}</Text>
                      <Text className="text-white mt-1">Platform Fee (15%): ${calculatePriceBreakdown(yearlyPrice).platformFee.toFixed(2)}</Text>
                      <Text className="text-[#FB2355] font-bold mt-1">Your Earnings: ${calculatePriceBreakdown(yearlyPrice).creatorEarnings.toFixed(2)}</Text>
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

                      // Save prices to Appwrite
                      if (globalUser?.$id) {
                        await updateCreatorPayment(globalUser.$id, {
                          monthlyPrice: monthly,
                          yearlyPrice: yearly
                        });
                        
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
      </ScrollView>
    </SafeAreaView>
  );
}
