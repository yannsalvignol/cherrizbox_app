import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, ImageBackground, Text, TouchableOpacity, View } from 'react-native';

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
  currency?: string;
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
  currency,
  onGoLive,
}) => {
  const [selectedPricing, setSelectedPricing] = useState<'monthly' | 'yearly'>('monthly');

  // Currency mapping with symbol position
  const getCurrencyInfo = (currencyCode?: string) => {
    const currencyMap: { [key: string]: { symbol: string; position: 'before' | 'after' } } = {
      'USD': { symbol: '$', position: 'before' },
      'CAD': { symbol: 'C$', position: 'before' },
      'AUD': { symbol: 'A$', position: 'before' },
      'MXN': { symbol: '$', position: 'before' },
      'SGD': { symbol: 'S$', position: 'before' },
      'NZD': { symbol: 'NZ$', position: 'before' },
      'EUR': { symbol: '€', position: 'after' },
      'GBP': { symbol: '£', position: 'before' },
      'JPY': { symbol: '¥', position: 'before' },
      'CHF': { symbol: 'CHF', position: 'before' },
      'CNY': { symbol: '¥', position: 'before' },
      'INR': { symbol: '₹', position: 'before' },
      'BRL': { symbol: 'R$', position: 'before' },
      'SEK': { symbol: 'kr', position: 'after' },
      'NOK': { symbol: 'kr', position: 'after' },
      
      'DKK': { symbol: 'kr', position: 'after' },
    };
    return currencyMap[currencyCode || 'USD'] || { symbol: '$', position: 'before' };
  };

  const currencyInfo = getCurrencyInfo(currency);
  
  const formatPrice = (price: number | string | undefined) => {
    if (price === undefined || price === null) return '--';
    const priceStr = price.toString();
    return currencyInfo.position === 'before' 
      ? `${currencyInfo.symbol}${priceStr}`
      : `${priceStr}${currencyInfo.symbol}`;
  };







  return (
    <View style={{ width: '100%', height: SCREEN_HEIGHT }}>

      
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
          }} allowFontScaling={false}>
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
              }} allowFontScaling={false}>
                No Profile Photo Yet
              </Text>

            </View>
          </View>
        )}
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ width: '97%', height: '31%', backgroundColor: 'rgba(32, 32, 32, 0.92)', borderRadius: 40, padding: 20, alignItems: 'center', marginBottom: 15, alignSelf: 'center' }}>
            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }} numberOfLines={2} allowFontScaling={false}>
              {name || 'Your name'}
            </Text>
            <View style={{ alignSelf: 'flex-start', marginTop: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)', paddingBottom: 8 }}>
                <Ionicons name="location-sharp" size={20} color="white" style={{ marginRight: 10 }} />
                <Text style={{ color: 'white', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }} allowFontScaling={false}>
                  {location || 'N/A'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 15 }}>
                <View style={{ paddingTop: 10 }}>
                  <Text style={{ color: 'white', fontSize: 24, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }} allowFontScaling={false}>
                    {followerCount ?? 0}
                  </Text>
                  <Text style={{ color: '#B9B9B9', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 8 }} allowFontScaling={false}>
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
                    <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }} allowFontScaling={false}>
                      {formatPrice(monthlyPrice)}
                    </Text>
                    <Text style={{ color: 'white', fontSize: 16, textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 4 }} allowFontScaling={false}>
                      per month
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ justifyContent: 'center' }}>
                  <Text style={{ color: '#B9B9B9', fontSize: 18, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }} allowFontScaling={false}>
                    or
                  </Text>
                </View>
                <View>
                  <TouchableOpacity 
                    onPress={() => setSelectedPricing('yearly')}
                    style={{ 
                      borderWidth: selectedPricing === 'yearly' ? 3 : 2,
                      borderColor: selectedPricing === 'yearly' ? '#FD6F3E' : 'rgba(251, 35, 85, 0.3)',
                      borderRadius: 16,
                      padding: 8,
                      backgroundColor: selectedPricing === 'yearly' ? 'rgba(251, 35, 85, 0.1)' : 'transparent',
                      transform: [{ scale: selectedPricing === 'yearly' ? 1.05 : 1 }]
                    }}
                  >
                    <Text style={{ color: '#FD6F3E', fontSize: 28, fontWeight: 'bold', textShadowColor: 'rgba(251, 35, 85, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial' }} allowFontScaling={false}>
                      {formatPrice(yearlyPrice)}
                    </Text>
                    <Text style={{ color: '#FD6F3E', fontSize: 16, textShadowColor: 'rgba(251, 35, 85, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 8, fontFamily: 'questrial', marginTop: 4 }} allowFontScaling={false}>
                      per year
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={{ 
                marginTop: 30, 
                backgroundColor: '#FD6F3E', 
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
              }} numberOfLines={1} allowFontScaling={false}>
                {`Join ${name || 'this'}'s box`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
      

    </View>
  );
};

export default ProfilePreview; 