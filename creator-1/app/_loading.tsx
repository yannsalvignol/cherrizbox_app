import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const LoadingScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(root)/(tabs)');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.background}>
      <Image
        source={require('../assets/images/cherry-creator.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.textRow}>
        <Text style={styles.cherrizbox}>
          Cherrizbox<Text style={styles.dot}>.</Text>
        </Text>
      </View>
      <Text style={styles.creatot}>Creator</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  logo: {
    width: 250,
    height: 250,
  },
  textRow: {
    marginTop: 24,
    alignItems: 'center',
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
    color: '#FB2355',
    fontFamily: 'questrial',
    marginLeft: 2,
    marginBottom: 2,
  },
  creatot: {
    fontSize: 32,
    color: '#FB2355',
    fontFamily: 'questrial',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LoadingScreen;
