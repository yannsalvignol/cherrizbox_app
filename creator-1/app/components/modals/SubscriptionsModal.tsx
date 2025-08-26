import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../lib/useTheme';

interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

interface SubscriptionsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  monthlyPrice: string;
  setMonthlyPrice: (price: string) => void;
  yearlyPrice: string;
  setYearlyPrice: (price: string) => void;
  savingPrices: boolean;
  priceError: string | null;
  successMessage: string | null;
  showCreatorNameWarning: boolean;
  currencies: Currency[];
  onSave: () => Promise<void>;
  calculatePriceBreakdown: (price: string) => {
    storeFee: number;
    stripeFee: number;
    creatorEarnings: number;
  };
}

export const SubscriptionsModal: React.FC<SubscriptionsModalProps> = ({
  visible,
  onClose,
  selectedCurrency,
  setSelectedCurrency,
  monthlyPrice,
  setMonthlyPrice,
  yearlyPrice,
  setYearlyPrice,
  savingPrices,
  priceError,
  successMessage,
  showCreatorNameWarning,
  currencies,
  onSave,
  calculatePriceBreakdown
}) => {
  const { theme } = useTheme();
  const clampTo200 = (text: string) => {
    const normalized = (text || '').replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num)) return '';
    const clamped = Math.min(Math.max(num, 0), 200);
    return clamped.toString();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.modalOverlay, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: theme.modalBackground, borderRadius: 24, padding: 24, width: '90%', maxHeight: '80%' }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>Subscription Pricing</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Currency Picker */}
            <View className="mb-4">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: theme.text, fontSize: 18 }}>Currency</Text>
                {showCreatorNameWarning && (
                  <View style={{ 
                    backgroundColor: theme.warning, 
                    borderRadius: 8, 
                    paddingHorizontal: 8, 
                    paddingVertical: 4 
                  }}>
                    <Text style={{ 
                      color: theme.textInverse, 
                      fontSize: 12, 
                      fontFamily: 'questrial',
                      fontWeight: '600'
                    }}>
                      LOCKED
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ width: '100%' }}>
                {/* First Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 }}>
                  {currencies.slice(0, 3).map((currency) => (
                    <TouchableOpacity
                      key={currency.code}
                      onPress={() => !showCreatorNameWarning && setSelectedCurrency(currency.code)}
                      disabled={showCreatorNameWarning}
                      style={{
                        backgroundColor: selectedCurrency === currency.code ? theme.primary : theme.cardBackground,
                        borderRadius: 18,
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        marginHorizontal: 2,
                        flex: 1,
                        borderWidth: 1,
                        borderColor: selectedCurrency === currency.code ? theme.primary : theme.borderDark,
                        alignItems: 'center',
                        opacity: showCreatorNameWarning ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ 
                        color: selectedCurrency === currency.code ? theme.textInverse : theme.text, 
                        fontFamily: 'questrial', 
                        fontSize: 14,
                        textAlign: 'center',
                      }}>
                        {currency.flag} {currency.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Second Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  {currencies.slice(3, 6).map((currency) => (
                    <TouchableOpacity
                      key={currency.code}
                      onPress={() => !showCreatorNameWarning && setSelectedCurrency(currency.code)}
                      disabled={showCreatorNameWarning}
                      style={{
                        backgroundColor: selectedCurrency === currency.code ? theme.primary : theme.cardBackground,
                        borderRadius: 18,
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        marginHorizontal: 2,
                        flex: 1,
                        borderWidth: 1,
                        borderColor: selectedCurrency === currency.code ? theme.primary : theme.borderDark,
                        alignItems: 'center',
                        opacity: showCreatorNameWarning ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ 
                        color: selectedCurrency === currency.code ? theme.textInverse : theme.text, 
                        fontFamily: 'questrial', 
                        fontSize: 14,
                        textAlign: 'center',
                      }}>
                        {currency.flag} {currency.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Warning Message for Currency */}
              {showCreatorNameWarning && (
                <View style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  borderRadius: 12, 
                  padding: 12, 
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.3)'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>🔒</Text>
                    <Text style={{ 
                      color: theme.warning, 
                      fontSize: 14, 
                      fontFamily: 'questrial',
                      flex: 1
                    }}>
                      Currency cannot be changed once your channel is live. Contact support if needed.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Monthly Price Input */}
            <View className="mb-4">
              <Text style={{ color: theme.text, fontSize: 18, marginBottom: 8, fontFamily: 'questrial' }}>
                Monthly Price ({currencies.find(c => c.code === selectedCurrency)?.symbol})
              </Text>
              <TextInput
                value={monthlyPrice}
                onChangeText={setMonthlyPrice}
                keyboardType="decimal-pad"
                placeholder="Enter monthly price"
                placeholderTextColor={theme.inputPlaceholder}
                onEndEditing={({ nativeEvent }) => setMonthlyPrice(clampTo200(nativeEvent.text))}
                style={{ 
                  backgroundColor: theme.inputBackground,
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: theme.borderDark,
                  color: theme.inputText,
                  fontSize: 16,
                  fontFamily: 'questrial',
                  letterSpacing: 0,
                  textAlign: 'center',
                  marginHorizontal: 8
                }}
              />
              {monthlyPrice && (
                <View className="mt-2 rounded-lg p-3" style={{ backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.borderDark }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'questrial' }}>Price Breakdown (Monthly):</Text>
                  <Text style={{ color: theme.text, marginTop: 4, fontFamily: 'questrial' }}>Store Fee (20%): {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(monthlyPrice).storeFee.toFixed(2)}</Text>
                  <Text style={{ color: theme.text, marginTop: 4, fontFamily: 'questrial' }}>Stripe Fee (2.9% + {currencies.find(c => c.code === selectedCurrency)?.symbol}0.30): {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(monthlyPrice).stripeFee.toFixed(2)}</Text>
                  <Text style={{ color: theme.primary, fontWeight: 'bold', marginTop: 4, fontFamily: 'questrial' }}>Your Earnings: {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(monthlyPrice).creatorEarnings.toFixed(2)}</Text>
                </View>
              )}
            </View>

            {/* Yearly Price Input */}
            <View className="mb-4">
              <Text style={{ color: theme.text, fontSize: 18, marginBottom: 8, fontFamily: 'questrial' }}>
                Yearly Price ({currencies.find(c => c.code === selectedCurrency)?.symbol})
              </Text>
              <TextInput
                value={yearlyPrice}
                onChangeText={setYearlyPrice}
                keyboardType="decimal-pad"
                placeholder="Enter yearly price"
                placeholderTextColor={theme.inputPlaceholder}
                onEndEditing={({ nativeEvent }) => setYearlyPrice(clampTo200(nativeEvent.text))}
                style={{ 
                  backgroundColor: theme.inputBackground,
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: theme.borderDark,
                  color: theme.inputText,
                  fontSize: 16,
                  fontFamily: 'questrial',
                  letterSpacing: 0,
                  textAlign: 'center',
                  marginHorizontal: 8
                }}
              />
              {yearlyPrice && (
                <View className="mt-2 rounded-lg p-3" style={{ backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.borderDark }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'questrial' }}>Price Breakdown (Yearly):</Text>
                  <Text style={{ color: theme.text, marginTop: 4, fontFamily: 'questrial' }}>Store Fee (20%): {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(yearlyPrice).storeFee.toFixed(2)}</Text>
                  <Text style={{ color: theme.text, marginTop: 4, fontFamily: 'questrial' }}>Stripe Fee (2.9% + {currencies.find(c => c.code === selectedCurrency)?.symbol}0.30): {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(yearlyPrice).stripeFee.toFixed(2)}</Text>
                  <Text style={{ color: theme.primary, fontWeight: 'bold', marginTop: 4, fontFamily: 'questrial' }}>Your Earnings: {currencies.find(c => c.code === selectedCurrency)?.symbol}{calculatePriceBreakdown(yearlyPrice).creatorEarnings.toFixed(2)}</Text>
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={{ 
                backgroundColor: theme.primary, 
                borderRadius: 8, 
                paddingVertical: 16, 
                marginTop: 16,
                opacity: savingPrices ? 0.5 : 1
              }}
              onPress={onSave}
              disabled={savingPrices}
            >
              <Text style={{ 
                color: theme.textInverse, 
                textAlign: 'center', 
                fontFamily: 'questrial', 
                fontSize: 18 
              }}>
                {savingPrices ? 'Saving...' : 'Save Prices'}
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {priceError && (
              <Text style={{ 
                color: theme.error, 
                textAlign: 'center', 
                marginTop: 12, 
                marginBottom: 8 
              }}>
                {priceError}
              </Text>
            )}

            {/* Success Message */}
            {successMessage && (
              <Text style={{ 
                color: theme.success, 
                textAlign: 'center', 
                marginTop: 12, 
                marginBottom: 8 
              }}>
                {successMessage}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};