import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const LandingScreen = () => {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [username, setUsername] = useState('');

  // Handle navigation when user is logged in
  useEffect(() => {
    if (user) {
      router.replace('/(root)/(tabs)');
    }
  }, [user, router]);

  const networks = [
    { name: 'LinkedIn', icon: 'logo-linkedin', color: '#0077B5', type: 'ionicon' },
    { name: 'TikTok', icon: 'musical-notes', color: '#000000', type: 'ionicon' },
    { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', type: 'ionicon' },
    { name: 'X', icon: require('../assets/images/X.png'), color: '#000000', type: 'image' },
  ];



  const handleContinue = () => {
    if (username.trim()) {
      // Generate a 6-digit code
      const socialMediaNumber = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Close the modal
      setShowUsernameModal(false);
      
      // Pass the selected network, username, and generated code to sign-up page
      router.push({
        pathname: '/sign-up',
        params: {
          socialMedia: selectedNetwork,
          socialMediaUsername: username,
          socialMediaNumber: socialMediaNumber
        }
      });
    }
  };

  const handleNetworkSelection = (networkName: string) => {
    setSelectedNetwork(networkName);
    setShowUsernameModal(true);
  };

  const resetSelection = () => {
    setSelectedNetwork('');
    setUsername('');
    setShowUsernameModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header} />
      <ImageBackground
        source={require('../assets/images/cherry.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.topContent}>
                         <View style={styles.textRow}>
               <Text style={styles.cherrizbox}>Cherrizbox</Text>
             </View>
            
            <Text style={styles.subtitle}>
              Welcome to the ultimate creator platform
            </Text>
            
            <Text style={styles.description}>
              Connect, create, and grow with fellow creators in a vibrant community designed just for you.
            </Text>
          </View>

          <View style={styles.bottomContent}>
            <Text style={styles.networkQuestion}>
              Tell us on what network you are a legend:
            </Text>

            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                {networks.map((network) => (
                  <TouchableOpacity
                    key={network.name}
                    onPress={() => handleNetworkSelection(network.name)}
                    style={{
                      backgroundColor: selectedNetwork === network.name ? '#FB2355' : 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 18,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      flex: 1,
                      minWidth: '45%',
                      borderWidth: selectedNetwork === network.name ? 0 : 1,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                    }}
                  >
                    {network.type === 'image' ? (
                      <Image source={network.icon} style={{ width: 20, height: 20, marginRight: 8 }} />
                    ) : (
                      <Ionicons name={network.icon as any} size={20} color={selectedNetwork === network.name ? 'white' : network.color} style={{ marginRight: 8 }} />
                    )}
                    <Text style={{ 
                      color: selectedNetwork === network.name ? 'white' : 'white', 
                      fontFamily: 'Urbanist-Bold', 
                      fontSize: 14,
                      textAlign: 'center',
                    }}>
                      {network.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('/log-in')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
      <View style={styles.footer} />



       {/* Username Input Modal */}
       <Modal
         visible={showUsernameModal}
         transparent={true}
         animationType="slide"
         onRequestClose={() => setShowUsernameModal(false)}
       >
         <KeyboardAvoidingView 
           style={styles.modalOverlay}
           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
         >
           <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
               <TouchableOpacity onPress={() => setShowUsernameModal(false)}>
                 <Ionicons name="close" size={24} color="white" />
               </TouchableOpacity>
             </View>
             
             <Text style={styles.modalSubtitle}>
               Enter your {selectedNetwork} username:
             </Text>

             <TextInput
               style={styles.modalUsernameInput}
               placeholder={`Your ${selectedNetwork} username`}
               placeholderTextColor="rgba(255, 255, 255, 0.7)"
               value={username}
               onChangeText={setUsername}
               autoCapitalize="none"
               autoCorrect={false}
             />

             <TouchableOpacity 
               style={[styles.modalCtaButton, !username.trim() && styles.disabledButton]}
               onPress={handleContinue}
               activeOpacity={0.8}
               disabled={!username.trim()}
             >
               <Text style={styles.modalCtaButtonText}>Continue</Text>
               <Ionicons name="arrow-forward" size={20} color="white" style={styles.arrowIcon} />
             </TouchableOpacity>
           </View>
         </KeyboardAvoidingView>
       </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  header: {
    height: 50,
    backgroundColor: 'black',
  },
  footer: {
    height: 50,
    backgroundColor: 'black',
  },
  topContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  bottomContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 20,
    paddingTop: 180,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  cherrizbox: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'MuseoModerno-Regular',
  },
  subtitle: {
    fontSize: 24,
    color: 'white',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    marginBottom: 30,
  },
  networkQuestion: {
    fontSize: 18,
    color: 'white',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
    marginBottom: 30,
  },

  usernameLabel: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  usernameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    minWidth: 250,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: '#FB2355',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(251, 35, 85, 0.5)',
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    marginRight: 10,
  },
  arrowIcon: {
    marginLeft: 5,
  },
  loginButton: {
    paddingVertical: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    textDecorationLine: 'underline',
    opacity: 0.9,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingTop: 100,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  modalSubtitle: {
    fontSize: 20,
    color: 'white',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalUsernameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
  },
  modalCtaButton: {
    backgroundColor: '#FB2355',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalCtaButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    marginRight: 10,
  },
});

export default LandingScreen; 