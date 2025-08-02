import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ChangeUsernameScreen = () => {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [username, setUsername] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // Handle navigation when user is not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/landing');
    }
  }, [user, router]);

  const networks = [
    { name: 'LinkedIn', icon: 'logo-linkedin', color: '#0077B5', type: 'ionicon', useAtSymbol: false },
    { name: 'TikTok', icon: 'musical-notes', color: '#000000', type: 'ionicon', useAtSymbol: true },
    { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', type: 'ionicon', useAtSymbol: false },
    { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', type: 'ionicon', useAtSymbol: true },
    { name: 'Twitch', icon: 'logo-twitch', color: '#9146FF', type: 'ionicon', useAtSymbol: true },
    { name: 'X', icon: require('../assets/images/X.png'), color: '#000000', type: 'image', useAtSymbol: true },
  ];

  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network);
    setShowUsernameModal(true);
  };

  const handleContinue = async () => {
    if (selectedNetwork && username.trim() && user?.$id) {
      try {
        // Generate a new 6-digit code
        const socialMediaNumber = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Import Appwrite functions
        const { databases, config } = await import('@/lib/appwrite');
        const { Query } = await import('react-native-appwrite');
        
        // Find the user document
        const userDocs = await databases.listDocuments(
          config.databaseId,
          config.userCollectionId,
          [Query.equal('creatoraccountid', user.$id)]
        );
        
        if (userDocs.documents.length > 0) {
          const userDocId = userDocs.documents[0].$id;
          
          // Update the user's social media information
          await databases.updateDocument(
            config.databaseId,
            config.userCollectionId,
            userDocId,
            {
              social_media: selectedNetwork,
              social_media_username: username.trim(),
              social_media_number: socialMediaNumber,
              social_media_number_correct: false, // Reset verification status
              account_state: 'required' // Reset account state
            }
          );
          
          console.log('✅ Social media information updated successfully');
          
          // Navigate back to the main screen
          router.replace('/(root)/(tabs)');
        } else {
          console.error('❌ User document not found');
          // Handle error - maybe show an alert
        }
      } catch (error) {
        console.error('❌ Error updating social media information:', error);
        // Handle error - maybe show an alert
      }
    }
  };

  const resetSelection = () => {
    setSelectedNetwork('');
    setUsername('');
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
            

          </View>

          <View style={styles.bottomContent}>
            <Text style={styles.networkQuestion}>
              Choose your social media platform:
            </Text>

            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                {networks.map((network) => (
                  <TouchableOpacity
                    key={network.name}
                    onPress={() => setSelectedNetwork(network.name)}
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



            {selectedNetwork && (
              <TouchableOpacity
                style={styles.usernameButton}
                onPress={() => setShowUsernameModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.usernameButtonText}>
                  {username ? `@${username}` : `Enter your ${selectedNetwork} username`}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </TouchableOpacity>
            )}




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

             <Text style={styles.modalTitle}>
               Enter your {selectedNetwork} username
             </Text>

             <View style={styles.modalInputContainer}>
               {(() => {
                 const selectedNetworkData = networks.find(n => n.name === selectedNetwork);
                 const useAtSymbol = selectedNetworkData?.useAtSymbol;
                 
                 return (
                   <>
                     {useAtSymbol && (
                       <Text style={styles.modalAtSymbol}>@</Text>
                     )}
                     <TextInput
                       style={[styles.modalInput, useAtSymbol && styles.modalInputWithAt]}
                       placeholder={useAtSymbol ? `username` : `Your ${selectedNetwork} username`}
                       placeholderTextColor="rgba(255, 255, 255, 0.7)"
                       value={username}
                       onChangeText={setUsername}
                       autoCapitalize="none"
                       autoCorrect={false}
                       autoFocus
                     />
                   </>
                 );
               })()}
             </View>

             <TouchableOpacity
               style={[styles.modalButton, !username.trim() && styles.modalButtonDisabled]}
               onPress={() => {
                 if (username.trim()) {
                   handleContinue();
                 }
               }}
               disabled={!username.trim()}
             >
               <Text style={styles.modalButtonText}>Update Username</Text>
               <Ionicons name="arrow-forward" size={20} color="white" style={styles.modalArrowIcon} />
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
    justifyContent: 'flex-start',
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
    paddingTop: 20,
    marginBottom: 20,
  },
  bottomContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 20,
    paddingTop: 0,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
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
    fontSize: 16,
    color: 'white',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },


  usernameButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 250,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  usernameButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    flex: 1,
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
  backButton: {
    paddingVertical: 10,
  },
    backButtonText: {
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
    textAlign: 'center',
    marginBottom: 30,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  modalAtSymbol: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    marginRight: 12,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 25,
    color: 'white',
    fontSize: 18,
    fontFamily: 'Urbanist-Medium',
    minWidth: 250,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalInputWithAt: {
    minWidth: 220,
  },
  modalButton: {
    backgroundColor: '#FB2355',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FB2355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalButtonDisabled: {
    backgroundColor: 'rgba(251, 35, 85, 0.5)',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    marginRight: 10,
  },
  modalArrowIcon: {
    marginLeft: 5,
  },

 });

export default ChangeUsernameScreen; 