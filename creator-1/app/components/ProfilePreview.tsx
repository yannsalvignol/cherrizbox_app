import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Image, ImageBackground, Modal, Text, TouchableOpacity, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProfilePreviewProps {
  profileImageUri?: string;
  name: string;
  location?: string;
  bio?: string;
  followerCount?: number;
  monthlyPrice?: number | string;
  yearlyPrice?: number | string;
  state?: string;
  creatorsname?: string;
  topics?: string;
  ProfilesBio?: string;
  creatorpayment?: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  onGoLive?: () => void;
}

const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  profileImageUri,
  name,
  location,
  bio,
  followerCount,
  monthlyPrice,
  yearlyPrice,
  state,
  creatorsname,
  topics,
  ProfilesBio,
  creatorpayment,
  phoneNumber,
  gender,
  dateOfBirth,
  onGoLive,
}) => {
  const [selectedPricing, setSelectedPricing] = useState<'monthly' | 'yearly'>('monthly');
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const getFieldIcon = (fieldName: string) => {
    switch (fieldName) {
      case 'Creator Name':
        return 'person-circle-outline';
      case 'Location':
        return 'location-outline';
      case 'Topics':
        return 'chatbubble-ellipses-outline';
      case 'Bio':
        return 'document-text-outline';
      case 'Subscription Pricing':
        return 'card-outline';
      case 'Profile Picture':
        return 'camera-outline';
      case 'Phone Number':
        return 'call-outline';
      case 'Gender':
        return 'male-female-outline';
      case 'Date of Birth':
        return 'calendar-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const getFieldDescription = (fieldName: string) => {
    switch (fieldName) {
      case 'Creator Name':
        return 'Your unique creator identity';
      case 'Location':
        return 'Where you\'re based';
      case 'Topics':
        return 'What you create content about';
      case 'Bio':
        return 'Tell your story';
      case 'Subscription Pricing':
        return 'Set your monthly/yearly prices';
      case 'Profile Picture':
        return 'Add a profile photo';
      case 'Phone Number':
        return 'Your contact number';
      case 'Gender':
        return 'Your gender identity';
      case 'Date of Birth':
        return 'Your birth date';
      default:
        return 'Required information';
    }
  };

  const handleGoLive = () => {
    // Simply call the parent's onGoLive function which handles all validation
    if (onGoLive) {
      onGoLive();
    }
  };

  // Check if profile is complete
  const isProfileComplete = () => {
    return creatorsname && creatorsname.trim() !== '' &&
           location && location.trim() !== '' &&
           topics && topics.trim() !== '' &&
           ProfilesBio && ProfilesBio.trim() !== '' &&
           creatorpayment && creatorpayment.trim() !== '' &&
           profileImageUri && profileImageUri.trim() !== '' &&
           phoneNumber && phoneNumber.trim() !== '' &&
           gender && gender.trim() !== '' &&
           dateOfBirth && dateOfBirth.trim() !== '';
  };

  return (
    <View style={{ width: '100%', height: SCREEN_HEIGHT }}>
      {/* Go Live button - always show, but handle validation in onGoLive */}
      {state !== 'required' && (
        <View style={{
          position: 'absolute',
          bottom: '32%',
          right: 0,
          zIndex: 200,
          backgroundColor: '#FB2355',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderTopLeftRadius: 20,
          borderBottomLeftRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: 200
        }}>
          <TouchableOpacity
            onPress={handleGoLive}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons 
              name="radio-outline" 
              size={18} 
              color="white" 
              style={{ marginRight: 6 }}
            />
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
              fontFamily: 'questrial',
              textAlign: 'center'
            }}>
              Go Live
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Pending validation message */}
      {state === 'required' && (
        <View style={{
          position: 'absolute',
          bottom: '32%',
          right: 0,
          zIndex: 200,
          backgroundColor: 'rgba(255, 165, 0, 0.9)',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderTopLeftRadius: 20,
          borderBottomLeftRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: 200
        }}>
          <Ionicons 
            name="time-outline" 
            size={18} 
            color="white" 
            style={{ marginRight: 6 }}
          />
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'questrial',
            textAlign: 'center'
          }}>
            Pending validation
          </Text>
        </View>
      )}
      <ImageBackground
        source={profileImageUri ? { uri: profileImageUri } : undefined}
        style={{ width: '100%', height: '100%', borderRadius: 0, overflow: 'hidden', backgroundColor: '#222' }}
        imageStyle={{ borderRadius: 0 }}
        resizeMode="cover"
        blurRadius={0}
      >
        {profileImageUri ? (
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            justifyContent: 'center', 
            alignItems: 'center',
            zIndex: 100
          }}>
            {/* Pencil icon removed - no direct editing from preview */}
          </View>
        ) : (
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            justifyContent: 'center', 
            alignItems: 'center',
            zIndex: 100
          }}>
            <View style={{ alignItems: 'center', paddingHorizontal: 40, marginTop: -100 }}>
              <Ionicons 
                name="images-outline" 
                size={80} 
                color="rgba(255, 255, 255, 0.6)" 
                style={{ marginBottom: 20 }}
              />
              <Text style={{ 
                color: 'white', 
                fontSize: 24, 
                fontWeight: 'bold', 
                textAlign: 'center', 
                marginBottom: 16,
                fontFamily: 'questrial'
              }}>
                No Profile Photo Yet
              </Text>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: 16, 
                textAlign: 'center', 
                marginBottom: 30,
                lineHeight: 24,
                fontFamily: 'questrial'
              }}>
                Swipe up to edit your info and choose a profile picture
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name="arrow-up" 
                  size={24} 
                  color="#FB2355" 
                  style={{ marginRight: 8 }}
                />
                <Text style={{ 
                  color: '#FB2355', 
                  fontSize: 16, 
                  fontWeight: 'bold',
                  fontFamily: 'questrial'
                }}>
                  Swipe Up
                </Text>
              </View>
            </View>
          </View>
        )}
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ width: '97%', height: '31%', backgroundColor: 'rgba(32, 32, 32, 0.92)', borderRadius: 40, padding: 20, alignItems: 'center', marginBottom: 15, alignSelf: 'center' }}>
            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }} numberOfLines={2}>
              {name || 'Your name'}
            </Text>
            <View style={{ alignSelf: 'flex-start', marginTop: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)', paddingBottom: 8 }}>
                <Image source={require('../../assets/icon/localisation.png')} style={{ width: 16, height: 20, tintColor: 'white', marginRight: 10 }} />
                <Text style={{ color: 'white', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                  {location || 'N/A'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 15 }}>
                <View style={{ paddingTop: 10 }}>
                  <Text style={{ color: 'white', fontSize: 24, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                    {followerCount ?? 0}
                  </Text>
                  <Text style={{ color: '#B9B9B9', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 8 }}>
                    followers
                  </Text>
                </View>
                <View>
                  <TouchableOpacity 
                    onPress={() => setSelectedPricing('monthly')}
                    style={{ 
                      borderWidth: selectedPricing === 'monthly' ? 3 : 2,
                      borderColor: selectedPricing === 'monthly' ? 'white' : 'rgba(255,255,255,0.3)',
                      borderRadius: 16,
                      padding: 8,
                      backgroundColor: selectedPricing === 'monthly' ? 'rgba(255,255,255,0.1)' : 'transparent',
                      transform: [{ scale: selectedPricing === 'monthly' ? 1.05 : 1 }]
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                      ${monthlyPrice ?? '--'}
                    </Text>
                    <Text style={{ color: 'white', fontSize: 16, textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 4 }}>
                      per month
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ justifyContent: 'center' }}>
                  <Text style={{ color: '#B9B9B9', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                    or
                  </Text>
                </View>
                <View>
                  <TouchableOpacity 
                    onPress={() => setSelectedPricing('yearly')}
                    style={{ 
                      borderWidth: selectedPricing === 'yearly' ? 3 : 2,
                      borderColor: selectedPricing === 'yearly' ? '#FB2355' : 'rgba(251, 35, 85, 0.3)',
                      borderRadius: 16,
                      padding: 8,
                      backgroundColor: selectedPricing === 'yearly' ? 'rgba(251, 35, 85, 0.1)' : 'transparent',
                      transform: [{ scale: selectedPricing === 'yearly' ? 1.05 : 1 }]
                    }}
                  >
                    <Text style={{ color: '#FB2355', fontSize: 28, fontWeight: 'bold', textShadowColor: 'rgba(251, 35, 85, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }}>
                      ${yearlyPrice ?? '--'}
                    </Text>
                    <Text style={{ color: '#FB2355', fontSize: 16, textShadowColor: 'rgba(251, 35, 85, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 4 }}>
                      per year
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={{ 
                marginTop: 30, 
                backgroundColor: '#FB2355', 
                borderRadius: 20, 
                paddingVertical: 12, 
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ 
                color: 'white', 
                fontSize: 18, 
                fontWeight: 'bold', 
                fontFamily: 'questrial',
                textAlign: 'center',
                flex: 1
              }} numberOfLines={1}>
                {`Join ${name || 'this'}'s box`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
      
      {/* Custom Modal for Missing Fields or Success */}
      <Modal
        visible={showMissingFieldsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMissingFieldsModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20
        }}>
          <View style={{
            backgroundColor: '#1a1a1a',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 20
          }}>
            {missingFields.length > 0 ? (
              // Missing Fields View
              <>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)'
                }}>
                  <View style={{
                    backgroundColor: 'rgba(255, 165, 0, 0.2)',
                    borderRadius: 12,
                    padding: 8,
                    marginRight: 12
                  }}>
                    <Ionicons name="alert-circle" size={24} color="#FFA500" />
                  </View>
                  <Text style={{
                    color: 'white',
                    fontSize: 20,
                    fontWeight: 'bold',
                    fontFamily: 'questrial'
                  }}>
                    Profile Incomplete
                  </Text>
                </View>
                
                <Text style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: 16,
                  marginBottom: 20,
                  fontFamily: 'questrial',
                  lineHeight: 22
                }}>
                  Please complete the following fields before going live:
                </Text>
                
                <View style={{ maxHeight: 300 }}>
                  {missingFields.map((field, index) => (
                    <View key={index} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 165, 0, 0.1)',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 165, 0, 0.3)'
                    }}>
                      <Ionicons 
                        name={getFieldIcon(field) as any} 
                        size={20} 
                        color="#FFA500" 
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: 'white',
                          fontSize: 14,
                          fontWeight: 'bold',
                          fontFamily: 'questrial',
                          marginBottom: 2
                        }}>
                          {field}
                        </Text>
                        <Text style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: 12,
                          fontFamily: 'questrial'
                        }}>
                          {getFieldDescription(field)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                
                <Text style={{
                  color: '#FFA500',
                  fontSize: 14,
                  marginTop: 16,
                  textAlign: 'center',
                  fontFamily: 'questrial',
                  fontWeight: 'bold'
                }}>
                  Swipe up to edit these fields
                </Text>
              </>
            ) : (
              // Success View
              <>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)'
                }}>
                  <View style={{
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderRadius: 12,
                    padding: 8,
                    marginRight: 12
                  }}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  </View>
                  <Text style={{
                    color: 'white',
                    fontSize: 20,
                    fontWeight: 'bold',
                    fontFamily: 'questrial'
                  }}>
                    Profile Submitted!
                  </Text>
                </View>
                
                <Text style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: 16,
                  marginBottom: 20,
                  fontFamily: 'questrial',
                  lineHeight: 22,
                  textAlign: 'center'
                }}>
                  Your profile has been submitted for validation. You will be notified once it's approved.
                </Text>
                
                <View style={{
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(76, 175, 80, 0.3)',
                  alignItems: 'center'
                }}>
                  <Ionicons name="time-outline" size={24} color="#4CAF50" style={{ marginBottom: 8 }} />
                  <Text style={{
                    color: '#4CAF50',
                    fontSize: 14,
                    fontFamily: 'questrial',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    Status: Pending Validation
                  </Text>
                </View>
              </>
            )}
            
            <TouchableOpacity
              style={{
                backgroundColor: missingFields.length > 0 ? '#FFA500' : '#4CAF50',
                borderRadius: 16,
                paddingVertical: 16,
                marginTop: 24,
                alignItems: 'center'
              }}
              onPress={() => setShowMissingFieldsModal(false)}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: 'bold',
                fontFamily: 'questrial'
              }}>
                {missingFields.length > 0 ? 'Got it' : 'Perfect!'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProfilePreview; 