import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../lib/themes/useTheme';

const { width, height } = Dimensions.get('window');

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlan: (planType: 'monthly' | 'yearly', amount: number) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  onSelectPlan
}) => {
  const { theme } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {/* Close Button */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            zIndex: 1000,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <View style={{
          width: width * 0.9,
          maxWidth: 400,
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Image 
              source={require('../../../assets/images/loading-icon.png')}
              style={{
                width: 80,
                height: 80,
                marginBottom: 20,
              }}
              resizeMode="contain"
            />
            
            <Text style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: 'white',
              fontFamily: 'MuseoModerno-Regular',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Unlimited Chats
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: 'Urbanist-Regular',
              textAlign: 'center',
              lineHeight: 22,
            }}>
              Chat with your favorite creators without limits.{'\n'}
              No more daily restrictions.
            </Text>
          </View>

          {/* Pricing Cards */}
          <View style={{ width: '100%', gap: 16 }}>
            {/* Monthly Plan */}
            <TouchableOpacity
              onPress={() => onSelectPlan('monthly', 10)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: 'white',
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 4,
                  }}>
                    Monthly Plan
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: 'Urbanist-Regular',
                  }}>
                    Unlimited chats for 1 month
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{
                    fontSize: 28,
                    fontWeight: 'bold',
                    color: 'white',
                    fontFamily: 'Urbanist-Bold',
                  }}>
                    $10
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: 'Urbanist-Regular',
                  }}>
                    per month
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Yearly Plan - Best Deal */}
            <View style={{ position: 'relative' }}>
              {/* Best Deal Badge */}
              <View style={{
                position: 'absolute',
                top: -12,
                right: 16,
                backgroundColor: 'black',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.primary,
                zIndex: 10,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: theme.primary,
                  fontFamily: 'Urbanist-Bold',
                }}>
                  BEST DEAL
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={() => onSelectPlan('yearly', 100)}
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 16,
                  padding: 20,
                  paddingTop: 28,
                  borderWidth: 2,
                  borderColor: theme.primary,
                  marginTop: 12,
                }}
              >

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: 'black',
                    fontFamily: 'Urbanist-Bold',
                    marginBottom: 4,
                  }}>
                    Yearly Plan
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: 'rgba(0, 0, 0, 0.7)',
                    fontFamily: 'Urbanist-Regular',
                    marginBottom: 8,
                  }}>
                    Unlimited chats for 1 year
                  </Text>
                  <View style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    alignSelf: 'flex-start',
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: 'black',
                      fontFamily: 'Urbanist-Bold',
                    }}>
                      Save $20 (17% off)
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{
                      fontSize: 16,
                      color: 'rgba(0, 0, 0, 0.5)',
                      fontFamily: 'Urbanist-Regular',
                      textDecorationLine: 'line-through',
                      marginRight: 8,
                    }}>
                      $120
                    </Text>
                    <Text style={{
                      fontSize: 28,
                      fontWeight: 'bold',
                      color: 'black',
                      fontFamily: 'Urbanist-Bold',
                    }}>
                      $100
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 14,
                    color: 'rgba(0, 0, 0, 0.7)',
                    fontFamily: 'Urbanist-Regular',
                  }}>
                    per year
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontFamily: 'Urbanist-Regular',
                  }}>
                    ($8.33/month)
                  </Text>
                </View>
              </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Features List */}
          <View style={{
            width: '100%',
            marginTop: 32,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: 20,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: 'white',
              fontFamily: 'Urbanist-Bold',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              What's Included
            </Text>
            
            {[
              'Unlimited messages to all creators',
              'No daily restrictions',
              'Cancel anytime'
            ].map((feature, index) => (
              <View key={index} style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: theme.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
                <Text style={{
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontFamily: 'Urbanist-Regular',
                  flex: 1,
                }}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

        </View>
      </View>
    </Modal>
  );
};
