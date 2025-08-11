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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row',
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: 'black',
          borderBottomWidth: 1,
          borderBottomColor: '#333333'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../../assets/icon/loading-icon.png')}
              style={{ width: 32, height: 32, marginRight: 8, resizeMode: 'contain' }}
            />
            <Text style={{ 
              color: 'white', 
              fontSize: 18,
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
              backgroundColor: '#333333',
              borderRadius: 8
            }}
          >
            <Text style={{ 
              color: 'white',
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
            style={{ flex: 1, backgroundColor: 'white' }}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={{ 
                flex: 1, 
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'white'
              }}>
                <ActivityIndicator size="large" color="#FD6F3E" />
                <Text style={{ 
                  color: '#666666',
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
            onHttpError={onHttpError}
          />
        ) : (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'white'
          }}>
            <ActivityIndicator size="large" color="#FD6F3E" />
            <Text style={{ 
              color: '#666666',
              fontSize: 16, 
              fontFamily: 'Urbanist-Regular',
              marginTop: 16
            }}>
              Preparing Stripe Connect...
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};