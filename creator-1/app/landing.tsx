import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const LandingScreen = () => {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [showNetworkModal, setShowNetworkModal] = useState(false);
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
    { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', type: 'ionicon' },
    { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', type: 'ionicon' },
    { name: 'Twitch', icon: 'logo-twitch', color: '#9146FF', type: 'ionicon' },
    { name: 'X', icon: require('../assets/images/X.png'), color: '#000000', type: 'image' },
  ];

  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network);
    setShowNetworkModal(false);
    setShowUsernameModal(true);
  };

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

            <TouchableOpacity 
              style={styles.networkSelector}
              onPress={() => setShowNetworkModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.networkSelectorText}>
                {selectedNetwork || 'Choose your platform'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="white" />
            </TouchableOpacity>

            {selectedNetwork && (
              <View style={styles.selectedNetworkContainer}>
                <Text style={styles.selectedNetworkText}>
                  Selected: {selectedNetwork}
                </Text>
                <TouchableOpacity onPress={resetSelection} style={styles.changeButton}>
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.ctaButton, !selectedNetwork && styles.disabledButton]}
              onPress={() => setShowUsernameModal(true)}
              activeOpacity={0.8}
              disabled={!selectedNetwork}
            >
              <Text style={styles.ctaButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="white" style={styles.arrowIcon} />
            </TouchableOpacity>

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

             {/* Network Selection Modal */}
       <Modal
         visible={showNetworkModal}
         transparent={true}
         animationType="slide"
         onRequestClose={() => setShowNetworkModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Choose Your Platform</Text>
               <TouchableOpacity onPress={() => setShowNetworkModal(false)}>
                 <Ionicons name="close" size={24} color="white" />
               </TouchableOpacity>
             </View>
             
                          {networks.map((network) => (
               <TouchableOpacity
                 key={network.name}
                 style={styles.networkOption}
                 onPress={() => handleNetworkSelect(network.name)}
                 activeOpacity={0.7}
               >
                 {network.type === 'image' ? (
                   <Image source={network.icon} style={styles.networkImage} />
                 ) : (
                   <Ionicons name={network.icon as any} size={24} color={network.color} />
                 )}
                 <Text style={styles.networkOptionText}>{network.name}</Text>
                 <Ionicons name="chevron-forward" size={20} color="white" />
               </TouchableOpacity>
             ))}
           </View>
         </View>
       </Modal>

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
  networkSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 200,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  networkSelectorText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
  },
  selectedNetworkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    minWidth: 250,
  },
  selectedNetworkText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
  },
  changeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  changeButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
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
  modalTitle: {
    fontSize: 20,
    color: 'white',
    fontFamily: 'Urbanist-Bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  networkOptionText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    flex: 1,
    marginLeft: 15,
  },
  networkImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
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