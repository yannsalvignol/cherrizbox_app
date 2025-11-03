import { useTheme } from '@/lib/useTheme';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface StripeConnectModalProps {
  visible: boolean;
  stripeConnectUrl: string;
  onClose: () => void;
  onNavigationStateChange: (navState: any) => void;
  onError: (syntheticEvent: any) => void;
  onHttpError: (syntheticEvent: any) => void;
}

export const StripeConnectModal: React.FC<StripeConnectModalProps> = ({
  visible,
  stripeConnectUrl,
  onClose,
  onNavigationStateChange,
  onError,
  onHttpError
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center', 
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.background,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            minHeight: 44
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../../assets/icon/loading-icon.png')}
              style={{ width: 24, height: 24, marginRight: 6, resizeMode: 'contain' }}
            />
            <Text style={{ 
              color: theme.text, 
              fontSize: 16,
              fontWeight: 'bold',
              fontFamily: 'Urbanist-Bold'
            }}>
              Stripe Connect Setup
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 8,
              backgroundColor: theme.backgroundSecondary,
              borderRadius: 6,
              minWidth: 36,
              minHeight: 36,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text style={{ 
              color: theme.text,
              fontSize: 16, 
              fontWeight: 'bold',
              fontFamily: 'Urbanist-Bold'
            }}>
              ✕
            </Text>
          </TouchableOpacity>
          </View>

          {/* WebView */}
          {stripeConnectUrl ? (
            <WebView
              source={{ uri: stripeConnectUrl }}
              style={{ flex: 1, backgroundColor: theme.background }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={{ 
                  flex: 1, 
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: theme.background
                }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={{ 
                    color: theme.textSecondary,
                    fontSize: 16,
                    fontFamily: 'Urbanist-Regular',
                    marginTop: 16
                  }}>
                    Loading Stripe Connect...
                  </Text>
                </View>
              )}
              onNavigationStateChange={onNavigationStateChange}
              onError={onError}
              onHttpError={(syntheticEvent) => {
                // Ignore 404 errors for the return URL - this is expected
                const { nativeEvent } = syntheticEvent;
                if (nativeEvent.statusCode === 404 && nativeEvent.url?.includes('connect-return')) {
                  console.log('   [StripeConnect] Ignoring expected 404 for return URL');
                  return;
                }
                // Pass through other HTTP errors
                onHttpError(syntheticEvent);
              }}
            />
          ) : (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme.background
            }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ 
                color: theme.textSecondary,
                fontSize: 16, 
                fontFamily: 'Urbanist-Regular',
                marginTop: 16
              }}>
                Preparing Stripe Connect...
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};