import { createPaidContentPaymentIntent, getCurrentUser } from '@/lib/appwrite';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import StripePaymentSheet from '../StripePaymentSheet';

export interface PaidContentPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  contentTitle: string;
  contentId?: string;
  creatorId?: string;
  creatorName?: string;
  imageUrl?: string;
  contentType?: string;
}

const PaidContentPaymentForm: React.FC<{
  onSuccess: () => void;
  onClose: () => void;
  amount: number;
  contentTitle: string;
  contentId?: string;
  creatorId?: string;
  creatorName?: string;
  imageUrl?: string;
  contentType?: string;
  clientSecret: string;
  stripeAccountId: string;
}> = ({ onSuccess, onClose, amount, contentTitle, contentId, creatorId, creatorName, imageUrl, contentType, clientSecret, stripeAccountId }) => {
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async () => {
    if (!confirmPayment || !clientSecret) {
      setError('Payment system not ready');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Confirming paid content payment within new Stripe context...');
      const result = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (result.error) {
        console.error('Payment confirmation error:', result.error);
        setError(result.error.message || 'Payment failed');
      } else {
        console.log('Paid content payment confirmed successfully!');
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onSuccess();
      }
    } catch (err) {
      console.error('Payment confirmation exception:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={paidContentStyles.sheetContent}>
      <TouchableOpacity onPress={onClose} style={paidContentStyles.closeButton}>
        <Text style={paidContentStyles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      
      <View style={paidContentStyles.headerSection}>
        <Text style={paidContentStyles.title}>Unlock Content</Text>
        <Text style={paidContentStyles.subtitle}>{contentTitle}</Text>
      </View>
      
      <View style={paidContentStyles.cardInputSection}>
        <Text style={paidContentStyles.cardLabel}>Payment Method</Text>
        <CardField
          postalCodeEnabled={false}
          placeholders={{ number: '1234 1234 1234 1234' }}
          cardStyle={{
            ...paidContentStyles.cardField,
            textColor: '#18181b',
          }}
          style={paidContentStyles.cardFieldContainer}
          onCardChange={(cardDetails: any) => {
            setCardComplete(cardDetails.complete);
          }}
        />
      </View>
      
      {error && (
        <View style={paidContentStyles.errorContainer}>
          <Text style={paidContentStyles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={paidContentStyles.amountSection}>
        <View style={paidContentStyles.amountRow}>
          <Text style={paidContentStyles.amountLabel}>Content Price</Text>
          <Text style={paidContentStyles.amountValue}>${amount}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          paidContentStyles.payButton,
          (!cardComplete || loading) && paidContentStyles.payButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!cardComplete || loading}
        activeOpacity={0.85}
      >
        <Text style={paidContentStyles.payButtonText}>
          {loading ? 'Processing...' : `Pay $${amount}`}
        </Text>
      </TouchableOpacity>
      
      <Text style={paidContentStyles.securityText}>
        Your payment is secured by Stripe
      </Text>
    </View>
  );
};

export const PaidContentPaymentModal: React.FC<PaidContentPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  amount,
  contentTitle,
  contentId,
  creatorId,
  creatorName,
  imageUrl,
  contentType,
}) => {
  // wrap StripePaymentSheet with custom intent function
  const intentFunc = async () => {
    const user = await getCurrentUser();
    const metadata:any = {
      userId: user?.$id || 'anonymous',
        creatorId,
        creatorName,
      contentId,
      contentType,
      imageUrl,
      paymentType: 'paid_content',
    };
    return await createPaidContentPaymentIntent(amount, 'usd', metadata);
  };

  return (
    <StripePaymentSheet
      visible={visible}
              onClose={onClose}
      onSuccess={onSuccess}
              amount={amount}
      interval={'month'}
      creatorName={creatorName || ''}
      navigateOnSuccess={false}
      createIntentFunc={async () => intentFunc()}
    />
  );
};

// Styles for the payment modal
const paidContentStyles = StyleSheet.create({
  overlay: {
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
  closeButton: {
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
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'questrial',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#B9B9B9',
    fontSize: 15,
    fontFamily: 'questrial',
    fontWeight: '500',
    textAlign: 'center',
  },
  amountSection: {
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
  amountLabel: {
    color: '#B9B9B9',
    fontSize: 15,
    fontFamily: 'questrial',
    fontWeight: '500',
  },
  amountValue: {
    color: '#FD6F3E',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'questrial',
  },
  cardInputSection: {
    width: '100%',
    backgroundColor: '#232326',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  cardLabel: {
    color: '#B9B9B9',
    fontSize: 14,
    fontFamily: 'questrial',
    marginBottom: 8,
    fontWeight: '500',
  },
  cardFieldContainer: {
    height: 50,
    marginVertical: 8,
  },
  cardField: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  errorContainer: {
    backgroundColor: '#FF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'questrial',
    textAlign: 'center',
  },
  payButton: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#FD6F3E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#FD6F3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loaderText: {
    color: '#B9B9B9',
    fontSize: 16,
    fontFamily: 'questrial',
    marginTop: 16,
    textAlign: 'center',
  },
});