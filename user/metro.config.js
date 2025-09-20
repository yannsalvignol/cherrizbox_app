const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require('path');

const config = getDefaultConfig(__dirname);

// Alias native-only Stripe module to a stub on web/server to prevent bundling errors during EAS export
config.resolver = config.resolver || {};
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  "@stripe/stripe-react-native": path.resolve(__dirname, 'stubs/stripe-react-native.js'),
};

module.exports = withNativeWind(config, { input: "./app/global.css" });
