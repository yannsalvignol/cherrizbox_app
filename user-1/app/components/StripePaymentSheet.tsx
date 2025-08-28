import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Text, View } from 'react-native';
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
  
  // Get merchant ID from config
  const plugins = Constants.expoConfig?.plugins as any[];
  const stripePlugin = plugins?.find(plugin => Array.isArray(plugin) && plugin[0] === '@stripe/stripe-react-native');
  const merchantId = stripePlugin?.[1]?.merchantIdentifier;

  useEffect(() => {
    (async () => {
      // Check if Apple Pay is supported
      const isApplePaySupported = await isPlatformPaySupported();
      console.log('🍎 Apple Pay Support Check:');
      console.log('  - Is Apple Pay Supported:', isApplePaySupported);
      console.log('  - Merchant ID from config:', merchantId);
      console.log('  - Full plugins config:', JSON.stringify(Constants.expoConfig?.plugins, null, 2));
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
  const [errorMsg, setErrorMsg] = useState<string|null>(null);

  // Get merchant ID from config
  const plugins = Constants.expoConfig?.plugins as any[];
  const stripePlugin = plugins?.find(plugin => Array.isArray(plugin) && plugin[0] === '@stripe/stripe-react-native');
  const merchantId = stripePlugin?.[1]?.merchantIdentifier;

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const func = props.createIntentFunc ?? initiatePaymentIntent;
    func(amount, interval, creatorName, currency)
      .then(data => {
        setPaymentData(data);
      })
      .catch(err => {
        setErrorMsg(err.message || 'Failed to start payment');
      })
      .finally(() => setLoading(false));
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center'}}>
        {loading && (
          <CherryLoadingIndicator size={120} />
        )}
        {errorMsg && <Text style={{color:'white'}}>{errorMsg}</Text>}
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