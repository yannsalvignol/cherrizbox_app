import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserProfile, updateUserProfile, uploadProfilePicture } from '../../../lib/appwrite';
import { useGlobalContext } from '../../../lib/global-provider';

interface ProfileData {
  userId: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  profileImageUri?: string;
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
              const countryCode = profile.phoneNumber.substring(0, 2); // Assuming format like "+1"
              const country = countries.find(c => c.code === countryCode);
              if (country) {
                setSelectedCountry(country);
              }
            }

            // Set birth date if exists
            if (profile.dateOfBirth) {
              const [year, month, day] = profile.dateOfBirth.split('-');
              setSelectedYear(year);
              setSelectedMonth(month);
              setSelectedDay(day);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled) {
        // Compress and resize the image
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 250, height: 250 } }], // Resize to 200x200
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // Compress to 10% quality
        );

        // Upload the compressed image to Appwrite
        const photoResult = await uploadProfilePicture({
          uri: manipResult.uri,
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
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error picking image');
    }
  };

  const handleUpdateProfile = async () => {
    if (!globalUser?.$id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      setSaving(true);

      // Prepare profile data
      const profileData: ProfileData = {
        userId: globalUser.$id,
        dateOfBirth: `${selectedYear}-${selectedMonth}-${selectedDay}`,
        gender: selectedGender?.value || '',
        phoneNumber: selectedCountry.code,
        ...(profileImage && { profileImageUri: profileImage }) // Only include if profileImage exists
      };

      // Update profile in Appwrite
      await updateUserProfile(globalUser.$id, profileData);
      
      // Show success message and trigger haptic feedback
      setShowSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Hide success message after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
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

      {/* Avatar */}
      <View className="items-center mt-8 mb-4">
        <View className="w-36 h-36 rounded-full bg-[#1A1A1A] items-center justify-center relative">
          {profileImage ? (
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
          >
            <Image source={require('../../../assets/icon/edit.png')} className="w-11 h-11" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
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
              style={{ textAlignVertical: 'center', color: 'white', paddingBottom: 13 }}
            />
          </TouchableOpacity>

          {/* Update Button */}
          <TouchableOpacity 
            className="bg-[#FB2355] rounded-lg py-4 mt-2 mb-2"
            activeOpacity={0.8}
            onPress={handleUpdateProfile}
            disabled={saving}
          >
            <Text className="text-white text-center font-questrial text-lg">
              {saving ? 'Updating...' : 'Update Profile'}
            </Text>
          </TouchableOpacity>

          {/* Success Message */}
          {showSuccess && (
            <Text style={{ 
              color: '#4CAF50', 
              textAlign: 'center', 
              fontFamily: 'Nunito-Bold',
              fontSize: 12,
              marginBottom: 16,
              marginTop: 4
            }}>
              Update successful !
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
      </ScrollView>
    </SafeAreaView>
  );
}
