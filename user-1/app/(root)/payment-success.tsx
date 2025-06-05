import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PaymentSuccess() {
  const router = useRouter();
  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        <Image
          source={require('../../assets/icon/ok.png')}
          style={styles.icon}
          contentFit="contain"
        />
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.message}>
          Thank you for your subscription. Your account has been upgraded successfully.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(root)/(tabs)')}
        >
          <Text style={styles.buttonText}>Continue to App</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'questrial',
  },
  message: {
    color: '#B9B9B9',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: 'questrial',
  },
  button: {
    backgroundColor: '#FB2355',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'questrial',
  },
}); 