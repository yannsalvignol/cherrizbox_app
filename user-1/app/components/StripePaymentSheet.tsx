import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Text, View } from 'react-native';
import { initiatePaymentIntent } from '../../lib/subscription';

interface StripePaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  interval: 'month' | 'year';
  creatorName: string;
  createIntentFunc?: (amount:number, interval:string, creatorName:string)=>Promise<{clientSecret:string; stripeAccountId:string}>;
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Cherrybox',
        allowsDelayedPaymentMethods: false,
      });
      if (error) {
        Alert.alert('Stripe', error.message);
        onClose();
        return;
      }
      setInitializing(false);
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
        router.push({ pathname: '/payment-success', params: { creatorName } });
      }
    })();
  }, []);

  if (initializing) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <ActivityIndicator size="large" color="#FB2355" />
        <Text style={{color:'white',marginTop:20}}>Preparing payment…</Text>
      </View>
    );
  }
  return null;
};

const StripePaymentSheet: React.FC<StripePaymentSheetProps> = (props) => {
  const { visible, onClose, interval, amount, creatorName } = props;
  const [paymentData, setPaymentData] = useState<{clientSecret:string; stripeAccountId:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);

  const bounceAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const func = props.createIntentFunc ?? initiatePaymentIntent;
    func(amount, interval, creatorName)
      .then(data => {
        setPaymentData(data);
      })
      .catch(err => {
        setErrorMsg(err.message || 'Failed to start payment');
      })
      .finally(() => setLoading(false));
  }, [visible]);

  useEffect(() => {
    if (loading) {
      // Start bouncing animation
      bounceAnim.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.15, duration: 450, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 1, duration: 450, useNativeDriver: true })
        ])
      ).start();
    } else {
      bounceAnim.stopAnimation();
    }
  }, [loading]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center'}}>
        {loading && (
          <Animated.Image
            source={require('../../assets/icon/loading-icon.png')}
            style={{ width: 80, height: 80, transform: [{ scale: bounceAnim }] }}
          />
        )}
        {errorMsg && <Text style={{color:'white'}}>{errorMsg}</Text>}
        {paymentData && (
          <StripeProvider
            publishableKey={PUBLISHABLE_KEY}
            stripeAccountId={paymentData.stripeAccountId}
          >
            <InnerSheet {...props} clientSecret={paymentData.clientSecret} stripeAccountId={paymentData.stripeAccountId} />
          </StripeProvider>
        )}
      </View>
    </Modal>
  );
};

export default StripePaymentSheet; 