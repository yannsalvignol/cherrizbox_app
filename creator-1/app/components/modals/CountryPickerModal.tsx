import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface Country {
  name: string;
  code: string;
  flag: string;
  format: string;
}

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  countries: Country[];
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

export const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  visible,
  onClose,
  countries,
  selectedCountry,
  onSelectCountry
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.75)', 
          justifyContent: 'center', 
          alignItems: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <Animated.View style={{
            backgroundColor: 'white',
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
            borderColor: '#676767',
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
                <Ionicons name="globe-outline" size={24} color="#FD6F3E" />
              </View>
              <Text style={{ 
                color: 'black', 
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
                    onSelectCountry(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{
                    backgroundColor: '#676767',
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
                      color: 'black', 
                      fontSize: 16, 
                      fontFamily: 'questrial',
                      fontWeight: '500'
                    }}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: selectedCountry.code === item.code && selectedCountry.name === item.name 
                      ? '#FD6F3E' 
                      : '#676767',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6
                  }}>
                    <Text style={{ 
                      color: selectedCountry.code === item.code && selectedCountry.name === item.name 
                        ? 'black' 
                        : 'white', 
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
                backgroundColor: '#676767', 
                borderRadius: 16, 
                paddingVertical: 16, 
                paddingHorizontal: 32,
                marginTop: 24,
                borderWidth: 1,
                borderColor: '#676767',
                alignSelf: 'center'
              }}
              onPress={onClose}
            >
              <Text style={{ 
                color: 'white', 
                fontSize: 16, 
                fontFamily: 'questrial',
                fontWeight: '500'
              }}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};