import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

const LoadingScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(root)/(tabs)');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <ImageBackground
      source={require('../assets/images/cherry.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.textRow}>
          <Text style={styles.cherrizbox}>Cherrizbox</Text>
          <Text style={styles.dot}>.</Text>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: '66%',
    width: '100%',
    alignItems: 'center',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cherrizbox: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'questrial',
  },
  dot: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white', // purple dot
    fontFamily: 'questrial',
    marginLeft: 2,
    marginBottom: 2,
  },
});

export default LoadingScreen;
