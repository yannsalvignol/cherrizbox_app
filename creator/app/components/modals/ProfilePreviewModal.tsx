import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ProfilePreview from '../ProfilePreview';

interface ProfilePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  profileImageUri?: string;
  name: string;
  location: string;
  bio: string;
  monthlyPrice: string;
  yearlyPrice: string;
  creatorName: string;
  topics: string;
  phoneNumber: string;
  selectedGender?: { value: string; label: string; icon: string } | null;
  selectedYear: string;
  selectedMonth: string;
  selectedDay: string;
  userCurrency?: string;
  selectedCurrency: string;
}

export const ProfilePreviewModal: React.FC<ProfilePreviewModalProps> = ({
  visible,
  onClose,
  profileImageUri,
  name,
  location,
  bio,
  monthlyPrice,
  yearlyPrice,
  creatorName,
  topics,
  phoneNumber,
  selectedGender,
  selectedYear,
  selectedMonth,
  selectedDay,
  userCurrency,
  selectedCurrency
}) => {
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="fullScreen"
    >
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        {/* Close button header */}
        <View style={{ 
          position: 'absolute', 
          top: 50, 
          left: 0, 
          right: 0, 
          zIndex: 100,
          paddingHorizontal: 16,
          flexDirection: 'row', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <TouchableOpacity 
            onPress={onClose}
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 20,
              padding: 10
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={{ 
            color: 'white', 
            fontSize: 18, 
            fontFamily: 'Nunito-Bold',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20
          }}>
            Profile Preview
          </Text>
          
          <View style={{ width: 44 }} />
        </View>
        
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 0 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <ProfilePreview
            profileImageUri={profileImageUri}
            name={creatorName || name || ''}
            location={location}
            bio={bio}
            followerCount={0}
            monthlyPrice={monthlyPrice}
            yearlyPrice={yearlyPrice}
            creatorsname={creatorName}
            topics={topics}
            ProfilesBio={bio}
            creatorpayment={JSON.stringify({
              monthlyPrice: monthlyPrice || '0',
              yearlyPrice: yearlyPrice || '0'
            })}
            phoneNumber={phoneNumber}
            gender={selectedGender?.value || ''}
            dateOfBirth={`${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`}
            currency={userCurrency || selectedCurrency}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};