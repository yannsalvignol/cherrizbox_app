import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { initiatePaymentIntent } from '../../lib/subscription';
import { CherryLoadingIndicator } from './CherryLoadingIndicator';
let StripeProvider: any, useStripe: any;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stripe = require('@stripe/stripe-react-native');
  StripeProvider = stripe.StripeProvider;
  useStripe = stripe.useStripe;
} else {
  StripeProvider = ({ children }: any) => children || null;
  useStripe = () => ({
    initPaymentSheet: async () => ({ error: { message: 'unsupported' } }),
    presentPaymentSheet: async () => ({ error: { message: 'unsupported' } }),
    isPlatformPaySupported: async () => false,
  });
}

interface StripePaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  interval: 'month' | 'year';
  creatorName: string;
  currency?: string;
  createIntentFunc?: (amount:number, interval:string, creatorName:string, currency?:string)=>Promise<{clientSecret:string; stripeAccountId:string}>;
  /**
   * When true (default) the component will navigate to /payment-success after a successful payment.
   * Pass false to suppress navigation (e.g. for in-chat purchases that should stay on the same screen).
   */
  navigateOnSuccess?: boolean;
}

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY as string;

const InnerSheet: React.FC<StripePaymentSheetProps & {clientSecret: string; stripeAccountId: string}> = ({
  onClose,
  onSuccess,
  clientSecret,
  stripeAccountId,
  amount,
  interval,
  creatorName,
  navigateOnSuccess
}) => {
  const { initPaymentSheet, presentPaymentSheet, isPlatformPaySupported } = useStripe();
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);
  
  // Get merchant ID from config - use the merchant ID directly from app.json
  const merchantId = 'merchant.com.yannsalvignol.cherripay';

  useEffect(() => {
    (async () => {
      // Check if Apple Pay is supported
      const isApplePaySupported = await isPlatformPaySupported();
      console.log('🍎 Apple Pay Support Check:');
      console.log('  - Is Apple Pay Supported:', isApplePaySupported);
      console.log('  - Merchant ID from config:', merchantId);
      console.log('  - Stripe Account ID:', stripeAccountId);
      console.log('  - Apple Pay enabled in config:', !!merchantId);
      
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Cherrybox',
        allowsDelayedPaymentMethods: false,
        returnURL: 'com.yannsalvignol.cherripay://payment-return',
        applePay: {
          merchantCountryCode: 'US',
        },
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: true,
        },
      });
      if (error) {
        Alert.alert('Stripe', error.message);
        onClose();
        return;
      }
      setInitializing(false);
      console.log('💳 Presenting payment sheet...');
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        // If user explicitly cancelled the sheet, just close silently
        const errCode = (presentError as any).code ?? '';
        if (errCode === 'Canceled' || errCode === 'Canceled' || presentError.message.toLowerCase().includes('cancel')) {
          onClose();
          return;
        }
        Alert.alert('Payment', presentError.message);
        onClose();
        return;
      }
      onSuccess();
      if (navigateOnSuccess !== false) {
        router.replace({ pathname: '/payment-success', params: { creatorName } });
      }
    })();
  }, []);

  if (initializing) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <ActivityIndicator size="large" color="#FD6F3E" />
        <Text style={{color:'white',marginTop:20}}>Preparing payment…</Text>
      </View>
    );
  }
  return null;
};

const StripePaymentSheet: React.FC<StripePaymentSheetProps> = (props) => {
  const { visible, onClose, interval, amount, creatorName, currency } = props;
  const [paymentData, setPaymentData] = useState<{clientSecret:string; stripeAccountId:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Get merchant ID from config - use the merchant ID directly from app.json
  const merchantId = 'merchant.com.yannsalvignol.cherripay';

  const retryPayment = () => {
    setShowErrorModal(false);
    setLoading(true);
    setPaymentData(null);
    
    const func = props.createIntentFunc ?? initiatePaymentIntent;
    func(amount, interval, creatorName, currency)
      .then(data => {
        setPaymentData(data);
      })
      .catch(err => {
        console.log('Payment intent creation failed:', err);
        setShowErrorModal(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!visible) {
      setPaymentData(null);
      setShowErrorModal(false);
      return;
    }
    retryPayment();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center'}}>
        {loading && (
          <CherryLoadingIndicator size={120} />
        )}
        
        {/* Custom Error Modal */}
        {showErrorModal && (
          <View style={{
            width: '85%',
            maxWidth: 350,
            backgroundColor: '#1A1A1A',
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10
          }}>
            {/* Error Icon */}
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#FD6F3E',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <Text style={{ fontSize: 28, color: 'white' }}>⚠️</Text>
            </View>
            
            {/* Title */}
            <Text style={{
              color: 'white',
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 8
            }}>
              Connection Issue
            </Text>
            
            {/* Message */}
            <Text style={{
              color: '#B0B0B0',
              fontSize: 16,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 24
            }}>
              Unable to process payment due to poor network connection. Please check your internet and try again.
            </Text>
            
            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#333',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center'
                }}
                onPress={() => {
                  setShowErrorModal(false);
                  onClose();
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FD6F3E',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center'
                }}
                onPress={retryPayment}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {paymentData && (
          <StripeProvider
            publishableKey={PUBLISHABLE_KEY}
            stripeAccountId={paymentData.stripeAccountId}
            merchantIdentifier={merchantId}
          >
            <InnerSheet {...props} clientSecret={paymentData.clientSecret} stripeAccountId={paymentData.stripeAccountId} />
          </StripeProvider>
        )}
      </View>
    </Modal>
  );
};

export default StripePaymentSheet; 