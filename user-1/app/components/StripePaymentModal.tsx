import {
    CardField,
    useStripe
} from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { initiatePaymentIntent } from '../../lib/subscription';

interface StripePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  interval: 'month' | 'year';
  creatorName: string;
}

const PaymentForm: React.FC<{
  onSuccess: () => void;
  onClose: () => void;
  amount: number;
  interval: 'month' | 'year';
  creatorName: string;
}> = ({ onSuccess, onClose, amount, interval, creatorName }) => {
  const stripe = useStripe();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    createPaymentIntent();
  }, []);

  useEffect(() => {
    if (loading && !clientSecret) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      bounceAnim.setValue(0);
    }
  }, [loading, clientSecret]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      const secret = await initiatePaymentIntent(amount, interval, creatorName);
      setClientSecret(secret);
      console.log('Payment intent created successfully with secret:', secret.substring(0, 20) + '...');
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!stripe || !cardComplete || !clientSecret) {
      console.log('Payment submission blocked:', {
        hasStripe: !!stripe,
        cardComplete,
        hasClientSecret: !!clientSecret
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Starting payment confirmation with client secret:', clientSecret.substring(0, 20) + '...');
      
      // Confirm the payment using the existing client secret
      const result = await stripe.confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      console.log('Payment confirmation result:', result);

      if (result.error) {
        console.error('Payment confirmation error:', result.error);
        setError(result.error.message || 'Payment failed');
      } else {
        console.log('Payment confirmed successfully!');
        // Haptic feedback on iOS at the right moment
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Close the modal first, then navigate to payment success page
        onClose();
        router.push({
          pathname: '/payment-success',
          params: { creatorName }
        });
      }
    } catch (err) {
      console.error('Payment confirmation exception:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sheetContent}>
      <TouchableOpacity onPress={onClose} style={styles.closeButtonAbsoluteSheet}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      <View style={styles.headerSection}>
        <Text style={styles.titleProfessional}>Complete Payment</Text>
        <Text style={styles.subtitleProfessional}>Enter your payment details to continue</Text>
      </View>
      <View style={styles.cardInputSectionProfessional}>
        <Text style={styles.cardLabelProfessional}>Payment Method</Text>
        <CardField
          postalCodeEnabled={false}
          placeholders={{ number: '1234 1234 1234 1234' }}
          cardStyle={{
            ...styles.cardFieldProfessional,
            textColor: '#18181b',
          }}
          style={styles.cardFieldContainerProfessional}
          onCardChange={(cardDetails) => {
            setCardComplete(cardDetails.complete);
          }}
        />
      </View>
      {error && (
        <View style={styles.errorContainerProfessional}>
          <Text style={styles.errorTextProfessional}>{error}</Text>
        </View>
      )}
      <View style={styles.spacer} />
      <View style={styles.amountSectionProfessional}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabelProfessional}>Subscription</Text>
          <Text style={styles.amountValueProfessional}>${amount}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabelProfessional}>Billing Cycle</Text>
          <Text style={styles.amountValueProfessional}>{interval === 'month' ? 'Monthly' : 'Yearly'}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.payButtonProfessional, (!cardComplete || loading) && styles.payButtonDisabledProfessional]}
        onPress={handleSubmit}
        disabled={!cardComplete || loading}
        activeOpacity={0.85}
      >
        <Text style={styles.payButtonTextProfessional}>
          {loading ? 'Processing...' : `Pay $${amount}`}
        </Text>
      </TouchableOpacity>
      <Text style={styles.securityText}>
        Your payment is secured by Stripe
      </Text>
    </View>
  );
};

const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  amount,
  interval,
  creatorName,
}) => {
  const screenHeight = Dimensions.get('window').height;
  const sheetHeight = Math.round(screenHeight * 0.6); // Increased to 70%
  const slideAnim = React.useRef(new Animated.Value(sheetHeight)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(sheetHeight);
    }
  }, [visible]);

  const handleSuccess = () => {
    onSuccess();
  };

  const handleClose = () => {
    onClose();
  };

  // Log the publishable key for debugging
  const publishableKey = "pk_test_51RQyjPBMxMFyUXHbGzFEIYSTdMdY8rajTo0CRJ32cv0SfdnLmvu0ViWjUqC4WGakM35JvcucUHwyS6TImjSrBYDF00a6PPIT7B";
  console.log('Stripe publishable key:', publishableKey ? publishableKey.substring(0, 20) + '...' : 'NOT FOUND');

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.sheetOverlayHalf}>
        <Animated.View style={[styles.bottomSheet, { height: sheetHeight, transform: [{ translateY: slideAnim }] }]}> 
          <View style={styles.sheetHandle} />
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <PaymentForm
              onSuccess={handleSuccess}
              onClose={handleClose}
              amount={amount}
              interval={interval}
              creatorName={creatorName}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  sheetOverlayHalf: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#191A1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
    opacity: 0.25,
  },
  sheetContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  closeButtonAbsoluteSheet: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#888',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  titleProfessional: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'questrial',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitleProfessional: {
    color: '#B9B9B9',
    fontSize: 15,
    fontFamily: 'questrial',
    fontWeight: '500',
  },
  amountSectionProfessional: {
    width: '100%',
    backgroundColor: '#232326',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  amountRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabelProfessional: {
    color: '#B9B9B9',
    fontSize: 15,
    fontFamily: 'questrial',
    fontWeight: '500',
  },
  amountValueProfessional: {
    color: '#FB2355',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
  cardInputSectionProfessional: {
    width: '100%',
    backgroundColor: '#232326',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  cardLabelProfessional: {
    color: '#B9B9B9',
    fontSize: 14,
    fontFamily: 'questrial',
    marginBottom: 8,
    fontWeight: '500',
  },
  cardFieldContainerProfessional: {
    height: 50,
    marginVertical: 8,
  },
  cardFieldProfessional: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  errorContainerProfessional: {
    backgroundColor: '#FF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorTextProfessional: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'questrial',
    textAlign: 'center',
  },
  payButtonProfessional: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#FB2355',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#FB2355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabledProfessional: {
    opacity: 0.5,
  },
  payButtonTextProfessional: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
  securityText: {
    color: '#B9B9B9',
    fontSize: 12,
    fontFamily: 'questrial',
    textAlign: 'center',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  spacer: {
    height: 16,
  },
});

export default StripePaymentModal; 