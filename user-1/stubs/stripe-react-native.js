// Minimal stubs for web/server bundling to avoid importing native-only modules
// Used only by Metro when platform is 'web' or 'server'.


export const StripeProvider = ({ children }) => children || null;

export const CardField = () => null;

export const useStripe = () => ({
  confirmPayment: async () => ({
    error: null,
    paymentIntent: null,
  }),
});

export default {
  StripeProvider,
  CardField,
  useStripe,
};

