import React from 'react';
import {
    Modal,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Subscriber {
  userName?: string;
  customerEmail?: string;
  createdAt?: string;
  $createdAt?: string;
  renewalDate?: string;
  paymentStatus?: string;
}

interface SubscriberInfoModalProps {
  visible: boolean;
  subscriber: Subscriber | null;
  onClose: () => void;
}

export const SubscriberInfoModal: React.FC<SubscriberInfoModalProps> = ({
  visible,
  subscriber,
  onClose
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <View style={{ 
          backgroundColor: '#18181B', 
          borderRadius: 18, 
          padding: 28, 
          width: '85%', 
          maxWidth: 400, 
          alignItems: 'center', 
          borderWidth: 1, 
          borderColor: '#FB2355' 
        }}>
          <Text style={{ 
            color: 'white', 
            fontFamily: 'Urbanist-Bold', 
            fontSize: 22, 
            marginBottom: 10, 
            textAlign: 'center' 
          }}>
            {subscriber?.userName || subscriber?.customerEmail || 'Subscriber'}
          </Text>
          <Text style={{ 
            color: '#CCCCCC', 
            fontFamily: 'Urbanist-Regular', 
            fontSize: 15, 
            marginBottom: 18, 
            textAlign: 'center' 
          }}>
            {subscriber?.customerEmail && subscriber?.userName ? subscriber.customerEmail : ''}
          </Text>
          <View style={{ width: '100%', marginBottom: 10 }}>
            <Text style={{ 
              color: '#FB2355', 
              fontFamily: 'Urbanist-Bold', 
              fontSize: 15, 
              marginBottom: 2 
            }}>
              Subscription Created
            </Text>
            <Text style={{ 
              color: 'white', 
              fontFamily: 'Urbanist-Regular', 
              fontSize: 15, 
              marginBottom: 8 
            }}>
              {subscriber?.createdAt 
                ? new Date(subscriber.createdAt).toLocaleString() 
                : (subscriber?.$createdAt 
                  ? new Date(subscriber.$createdAt).toLocaleString() 
                  : 'N/A'
                )
              }
            </Text>
            <Text style={{ 
              color: '#FB2355', 
              fontFamily: 'Urbanist-Bold', 
              fontSize: 15, 
              marginBottom: 2 
            }}>
              Renewal Date
            </Text>
            <Text style={{ 
              color: 'white', 
              fontFamily: 'Urbanist-Regular', 
              fontSize: 15, 
              marginBottom: 8 
            }}>
              {subscriber?.renewalDate 
                ? new Date(subscriber.renewalDate).toLocaleString() 
                : 'N/A'
              }
            </Text>
            <Text style={{ 
              color: '#FB2355', 
              fontFamily: 'Urbanist-Bold', 
              fontSize: 15, 
              marginBottom: 2 
            }}>
              Payment Status
            </Text>
            <Text style={{ 
              color: 'white', 
              fontFamily: 'Urbanist-Regular', 
              fontSize: 15, 
              marginBottom: 8 
            }}>
              {subscriber?.paymentStatus || 'N/A'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{ 
              marginTop: 10, 
              backgroundColor: '#FB2355', 
              borderRadius: 10, 
              paddingVertical: 10, 
              paddingHorizontal: 32 
            }}
          >
            <Text style={{ 
              color: 'white', 
              fontFamily: 'Urbanist-Bold', 
              fontSize: 16 
            }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};