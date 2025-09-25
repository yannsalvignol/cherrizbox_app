import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { createChatSubscriptionPaymentIntent } from '../../../lib/chat-subscription';
import { useTheme } from '../../../lib/themes/useTheme';
import StripePaymentSheet from '../StripePaymentSheet';

const { width, height } = Dimensions.get('window');

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlan: (planType: 'monthly' | 'yearly', amount: number) => void;
  creatorName?: string;
  creatorId?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  onSelectPlan,
  creatorName,
  creatorId
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [showStripeSheet, setShowStripeSheet] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ type: 'monthly' | 'yearly'; amount: number } | null>(null);
  const [showSuccessState, setShowSuccessState] = useState(false);
  
  // Animation values
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;

  // Animate success state entrance
  useEffect(() => {
    if (showSuccessState) {
      // Trigger success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reset animation values
      successOpacity.setValue(0);
      successScale.setValue(0.8);
      iconScale.setValue(0);
      featuresOpacity.setValue(0);

      // Staggered animations for smooth entrance
      Animated.sequence([
        // Fade in the container
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Scale in the container
        Animated.timing(successScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon animation (delayed)
      setTimeout(() => {
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 200);

      // Features animation (more delayed)
      setTimeout(() => {
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 600);
    }
  }, [showSuccessState]);

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
          onPress={() => {
            setShowSuccessState(false);
            setShowStripeSheet(false);
            setSelectedPlan(null);
            onClose();
          }}
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
          {showSuccessState ? (
            /* Success State with Animations */
            <Animated.View style={{
              opacity: successOpacity,
              transform: [{ scale: successScale }],
              alignItems: 'center',
              width: '100%',
            }}>
              {/* Success Animation/Icon */}
              <Animated.View style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: '#10b981',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 32,
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
                transform: [{ scale: iconScale }],
              }}>
                <Ionicons name="infinite" size={48} color="white" />
              </Animated.View>

              {/* Success Message */}
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <Text style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: 'white',
                  fontFamily: 'MuseoModerno-Regular',
                  textAlign: 'center',
                  marginBottom: 12,
                }} allowFontScaling={false}>
                  Welcome to Unlimited!
                </Text>
                
                <Text style={{
                  fontSize: 18,
                  color: '#10b981',
                  fontFamily: 'Urbanist-SemiBold',
                  textAlign: 'center',
                  marginBottom: 16,
                }} allowFontScaling={false}>
                  Your chat subscription is now active
                </Text>
                
                <Text style={{
                  fontSize: 16,
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'Urbanist-Regular',
                  textAlign: 'center',
                  lineHeight: 24,
                }} allowFontScaling={false}>
                  You now have unlimited messaging access with all creators.{'\n'}
                  No more daily limits - chat as much as you want!
                </Text>
              </View>

              {/* Features Unlocked */}
              <Animated.View style={{
                width: '100%',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 16,
                padding: 20,
                marginBottom: 32,
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.2)',
                opacity: featuresOpacity,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: '#10b981',
                  fontFamily: 'Urbanist-Bold',
                  marginBottom: 16,
                  textAlign: 'center',
                }} allowFontScaling={false}>
                  ✨ Features Unlocked
                </Text>
                
                {[
                  'Send unlimited messages to any creator',
                  'Share photos, videos, and files without limits',
                  'Access to all chat features',
                  'Priority customer support'
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
                      backgroundColor: '#10b981',
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
                    }} allowFontScaling={false}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </Animated.View>

              {/* Auto-redirect message */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: 'Urbanist-Regular',
                  textAlign: 'center',
                }} allowFontScaling={false}>
                  Returning to home in a moment...
                </Text>
              </View>
            </Animated.View>
          ) : (
            /* Upgrade Plans State */
            <>
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
                }} allowFontScaling={false}>
                  Unlimited Chats
                </Text>
                
                <Text style={{
                  fontSize: 16,
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'Urbanist-Regular',
                  textAlign: 'center',
                  lineHeight: 22,
                }} allowFontScaling={false}>
                  Chat with your favorite creators without limits.{'\n'}
                  No more daily restrictions.
                </Text>
              </View>

              {/* Pricing Cards */}
              <View style={{ width: '100%', gap: 16 }}>
                {/* Monthly Plan */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPlan({ type: 'monthly', amount: 10 });
                    setShowStripeSheet(true);
                  }}
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
                      }} allowFontScaling={false}>
                        Monthly Plan
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontFamily: 'Urbanist-Regular',
                      }} allowFontScaling={false}>
                        Unlimited chats for 1 month
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{
                        fontSize: 28,
                        fontWeight: 'bold',
                        color: 'white',
                        fontFamily: 'Urbanist-Bold',
                      }} allowFontScaling={false}>
                        $10
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontFamily: 'Urbanist-Regular',
                      }} allowFontScaling={false}>
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
                    }} allowFontScaling={false}>
                      BEST DEAL
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPlan({ type: 'yearly', amount: 100 });
                      setShowStripeSheet(true);
                    }}
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
                      }} allowFontScaling={false}>
                        Yearly Plan
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: 'rgba(0, 0, 0, 0.7)',
                        fontFamily: 'Urbanist-Regular',
                        marginBottom: 8,
                      }} allowFontScaling={false}>
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
                        }} allowFontScaling={false}>
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
                        }} allowFontScaling={false}>
                          $120
                        </Text>
                        <Text style={{
                          fontSize: 28,
                          fontWeight: 'bold',
                          color: 'black',
                          fontFamily: 'Urbanist-Bold',
                        }} allowFontScaling={false}>
                          $100
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: 14,
                        color: 'rgba(0, 0, 0, 0.7)',
                        fontFamily: 'Urbanist-Regular',
                      }} allowFontScaling={false}>
                        per year
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: 'rgba(0, 0, 0, 0.6)',
                        fontFamily: 'Urbanist-Regular',
                      }} allowFontScaling={false}>
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
                }} allowFontScaling={false}>
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
                    }} allowFontScaling={false}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
      
      {/* Stripe Payment Sheet for Chat Subscriptions */}
      {selectedPlan && (
        <StripePaymentSheet
          visible={showStripeSheet}
          onClose={() => {
            setShowStripeSheet(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            console.log('✅ [UpgradeModal] Chat subscription payment successful');
            // Hide Stripe sheet and show success state within the modal
            setShowStripeSheet(false);
            setShowSuccessState(true);
            
            // Auto-transition to home after showing success for 3 seconds
            setTimeout(() => {
              setShowSuccessState(false);
              setSelectedPlan(null);
              onClose();
              router.replace('/(root)/(tabs)');
            }, 3000);
          }}
          amount={selectedPlan.amount}
          interval={selectedPlan.type === 'monthly' ? 'month' : 'year'}
          creatorName={creatorName || "Cherrybox Platform"} // Use actual creator name
          creatorId={creatorId} // Pass creator ID for proper payment routing
          currency="usd"
          createIntentFunc={createChatSubscriptionPaymentIntent}
          navigateOnSuccess={false} // We handle navigation ourselves
        />
      )}
    </Modal>
  );
};
