import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateUserProfile, uploadProfilePicture } from '../../../lib/appwrite';
import { useGlobalContext } from '../../../lib/global-provider';

interface ProfileData {
  userId: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  profileImageUri?: string;
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

const otherRelevantCountries = [
  { name: 'Singapore', code: '+65', flag: '🇸🇬', format: 'XXXX XXXX' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', format: 'XX XXX XXXX' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷', format: 'XXX XXX XXXX' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦', format: 'XX XXX XXXX' },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩', format: 'XXX-XXXX-XXXX' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', format: 'X XXX XXXX' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷', format: 'XX XXXX-XXXX' },
  { name: 'Egypt', code: '+20', flag: '🇪🇬', format: 'XXXX XXX XXX' },
  { name: 'Thailand', code: '+66', flag: '🇹🇭', format: 'XX XXX XXXX' },
  { name: 'Vietnam', code: '+84', flag: '🇻🇳', format: 'XXX XXXX XXX' },
  { name: 'Israel', code: '+972', flag: '🇮🇱', format: 'X-XXX-XXXX' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭', format: 'XX XXX XX XX' },
  { name: 'Sweden', code: '+46', flag: '🇸🇪', format: 'XX-XXX XX XX' },
  { name: 'Norway', code: '+47', flag: '🇳🇴', format: 'XXX XX XXX' },
  { name: 'Denmark', code: '+45', flag: '🇩🇰', format: 'XX XX XX XX' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱', format: 'XX XXX XXXX' },
  { name: 'Belgium', code: '+32', flag: '🇧🇪', format: 'XXX XX XX XX' },
  { name: 'Portugal', code: '+351', flag: '🇵🇹', format: 'XXX XXX XXX' },
  { name: 'Greece', code: '+30', flag: '🇬🇷', format: 'XXX XXX XXXX' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿', format: 'XXX XXX XXX' },
];

const genders = [
  { value: 'male', label: 'Male', icon: '👨' },
  { value: 'female', label: 'Female', icon: '👩' },
  { value: 'other', label: 'Other', icon: '👤' },
];

export default function EditProfile() {
  const router = useRouter();
  const { user: globalUser, profile: globalProfile, setProfile, setProfileImage: setGlobalProfileImage } = useGlobalContext();
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('1');
  const [selectedDay, setSelectedDay] = useState('1');
  const [selectedYear, setSelectedYear] = useState('2000');
  const [selectedGender, setSelectedGender] = useState<typeof genders[0] | null>(null);
  const [localProfileImage, setLocalProfileImage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showOtherCountries, setShowOtherCountries] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Function to format phone number according to country format
  const formatPhoneNumber = (input: string, format: string) => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    if (!digits) return '';
    
    let formatted = '';
    let digitIndex = 0;
    
    for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
      if (format[i] === 'X') {
        formatted += digits[digitIndex];
        digitIndex++;
      } else {
        formatted += format[i];
      }
    }
    
    return formatted;
  };

  const days = Array.from(
    { length: getDaysInMonth(parseInt(selectedMonth), parseInt(selectedYear)) },
    (_, i) => (i + 1).toString()
  );

  useEffect(() => {
    // Populate form with data from Global Context instantly
        if (globalUser) {
          setName(globalUser.name || '');
          setEmail(globalUser.email || '');
    }
    if (globalProfile) {
      setLocalProfileImage(globalProfile.profileImageUri || null);

      if (globalProfile.gender) {
        const genderOption = genders.find(g => g.value === globalProfile.gender);
        setSelectedGender(genderOption || null);
              }

      if (globalProfile.phoneNumber) {
        const phoneData = globalProfile.phoneNumber;
              if (phoneData.startsWith('+')) {
                const country = countries.find(c => phoneData.startsWith(c.code));
                if (country) {
                  setSelectedCountry(country);
                  const phonePart = phoneData.substring(country.code.length);
            setPhoneNumber(formatPhoneNumber(phonePart, country.format));
                }
              } else {
                setPhoneNumber(phoneData);
              }
            }

      if (globalProfile.dateOfBirth) {
        const [year, month, day] = globalProfile.dateOfBirth.split('-');
              setSelectedYear(year);
              setSelectedMonth(month);
              setSelectedDay(day);
            }
          }
  }, [globalUser, globalProfile]);

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
        // Show loading indicator
        setIsUploadingImage(true);
        
        try {
          // Drastically compress and resize the image for profile picture
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
            [{ resize: { width: 200, height: 200 } }], // Resize to 200x200 for better quality
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // Compress to 60% quality
        );

        // Upload the compressed image to Appwrite
        const photoResult = await uploadProfilePicture({
          uri: manipResult.uri,
          type: 'image/jpeg',
          name: 'profile.jpg'
          }, localProfileImage || undefined);
        
        if (photoResult) {
            setLocalProfileImage(photoResult.imageUrl); // update local state
            setGlobalProfileImage(photoResult.imageUrl); // update global context
          // Update profile immediately with the new image URL
          if (globalUser?.$id) {
            await updateUserProfile(globalUser.$id, {
              userId: globalUser.$id,
              profileImageUri: photoResult.imageUrl
            });
          }
          }
        } finally {
          // Hide loading indicator
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

      // Prepare profile data
      const profileData: ProfileData = {
        userId: globalUser.$id,
        dateOfBirth: `${selectedYear}-${selectedMonth}-${selectedDay}`,
        gender: selectedGender?.value || '',
        phoneNumber: phoneNumber ? `${selectedCountry.code}${phoneNumber}` : '',
        ...(localProfileImage && { profileImageUri: localProfileImage }) // Only include if profileImage exists
      };

      // Update profile in Appwrite
      await updateUserProfile(globalUser.$id, profileData);
      
      // Update global profile state
      setProfile({
        ...(globalProfile || {}),
        ...profileData,
        $id: globalProfile?.$id || '',
        $collectionId: globalProfile?.$collectionId || '',
        $databaseId: globalProfile?.$databaseId || '',
        $createdAt: globalProfile?.$createdAt || '',
        $updatedAt: new Date().toISOString(),
        $permissions: globalProfile?.$permissions || [],
      });
      
      // Show success message and trigger haptic feedback
      setShowSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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
          {isUploadingImage ? (
            <View className="w-36 h-36 rounded-full bg-[#1A1A1A] items-center justify-center">
              <Image source={require('../../../assets/icon/loading-icon.png')} style={{ width: 48, height: 48 }} />
              <Text className="text-white text-sm mt-2 font-questrial">Uploading...</Text>
            </View>
          ) : localProfileImage ? (
            <Image 
              source={{ uri: localProfileImage }} 
              className="w-36 h-36 rounded-full"
              style={{ resizeMode: 'cover' }}
            />
          ) : (
            <Text className="text-2xl text-white font-bold">{name?.[0] || 'U'}</Text>
          )}
          {!isUploadingImage && (
          <TouchableOpacity 
            className="absolute bottom-0 right-0"
            onPress={pickImage}
          >
            <Image source={require('../../../assets/icon/edit.png')} className="w-11 h-11" />
          </TouchableOpacity>
          )}
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
              className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 w-24 mr-2 ${
                focusedInput === 'countryCode' ? 'border border-[#FB2355]' : ''
              }`}
              activeOpacity={0.7}
            >
              <Text className="text-white font-questrial text-lg mr-2" style={{ color: 'white' }}>{selectedCountry.flag}</Text>
              <Text className="text-white font-questrial text-lg" style={{ color: 'white' }}>{selectedCountry.code}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowPhoneModal(true)}
              className={`flex-row items-center bg-[#1A1A1A] rounded-lg px-5 py-4 flex-1 ${
                focusedInput === 'phoneNumber' ? 'border border-[#FB2355]' : ''
              }`}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="call-outline" 
                size={24} 
                color={focusedInput === 'phoneNumber' ? '#FB2355' : '#666'} 
                style={{ marginRight: 12 }}
              />
              <Text className="flex-1 text-white font-questrial text-lg" style={{ color: 'white' }}>
                {phoneNumber || 'Enter your phone number'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Gender */}
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
          <View className="flex-1 bg-black/70 justify-end">
            <View className="bg-[#1A1A1A] rounded-t-3xl max-h-[80%]">
              {/* Header */}
              <View className="flex-row justify-between items-center p-6 border-b border-gray-800">
                <Text className="text-white text-2xl font-bold font-questrial">Select Country</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowCountryPicker(false);
                    setShowOtherCountries(false);
                  }}
                  className="w-10 h-10 bg-[#FB2355] rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Countries List */}
              <FlatList
                data={showOtherCountries ? otherRelevantCountries : countries}
                keyExtractor={(item) => item.code + item.name}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-row items-center py-4 px-6 mx-4 mb-2 rounded-xl bg-[#2A2A2A] active:bg-[#FB2355]/20"
                    onPress={() => {
                      setSelectedCountry(item);
                      setShowCountryPicker(false);
                      setShowOtherCountries(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="w-12 h-8 bg-black rounded-lg items-center justify-center mr-4">
                      <Text className="text-white text-lg">{item.flag}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-lg font-questrial font-semibold">{item.name}</Text>
                      <Text className="text-gray-400 text-sm font-questrial">Country Code: {item.code} • {item.format}</Text>
                    </View>
                    <View className="w-8 h-8 bg-[#FB2355] rounded-full items-center justify-center">
                      <Ionicons name="chevron-forward" size={16} color="white" />
                    </View>
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  !showOtherCountries ? (
                    <TouchableOpacity
                      className="flex-row items-center justify-center py-4 mx-4 mb-4 rounded-xl bg-[#FB2355]"
                      onPress={() => setShowOtherCountries(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="earth" size={20} color="white" style={{ marginRight: 8 }} />
                      <Text className="text-white text-lg font-questrial font-semibold">Other</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      className="flex-row items-center justify-center py-4 mx-4 mb-4 rounded-xl bg-[#444]"
                      onPress={() => setShowOtherCountries(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-back" size={20} color="white" style={{ marginRight: 8 }} />
                      <Text className="text-white text-lg font-questrial font-semibold">Back to Main List</Text>
                    </TouchableOpacity>
                  )
                }
              />
            </View>
          </View>
        </Modal>

        {/* Phone Number Modal */}
        <Modal
          visible={showPhoneModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPhoneModal(false)}
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
                    onPress={() => setShowPhoneModal(false)}
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
                    <Text className="text-white text-2xl">{selectedCountry.flag}</Text>
                  </View>
                  <View className="bg-[#2A2A2A] rounded-xl px-4 py-3">
                    <Text className="text-white text-lg font-questrial font-semibold">{selectedCountry.code}</Text>
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
                      value={phoneNumber}
                      onChangeText={(text) => {
                        // Remove formatting to get raw digits
                        const rawDigits = text.replace(/\D/g, '');
                        // Format according to country format
                        const formatted = formatPhoneNumber(rawDigits, selectedCountry.format);
                        setPhoneNumber(formatted);
                      }}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => setShowPhoneModal(false)}
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

                {/* Action Buttons */}
                <View className="flex-row">
                  <TouchableOpacity 
                    onPress={() => setShowPhoneModal(false)}
                    className="flex-1 bg-[#2A2A2A] rounded-xl py-4 items-center mr-2"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white font-questrial font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setShowPhoneModal(false)}
                    className="flex-1 bg-[#22C55E] rounded-xl py-4 items-center ml-2"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white font-questrial font-semibold">Save</Text>
                  </TouchableOpacity>
                </View>

                {/* Info Text */}
                <Text className="text-gray-400 text-xs text-center mt-4 font-questrial">
                  Your phone number will be used for account verification
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
