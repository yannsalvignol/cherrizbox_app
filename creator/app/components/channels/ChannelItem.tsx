import {
    type Channel,
    formatLastMessageTime,
    getChannelAvatar,
    getChannelDisplayName
} from '@/lib/index-utils';
import { useTheme } from '@/lib/useTheme';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Image,
    Text,
    TouchableOpacity,
    View
} from 'react-native';



interface ChannelItemProps {
  channel: Channel;
  currentUserId?: string;
  profileImage?: string | null;
  userName?: string;
  userCurrency: string;
  userProfileCache: React.MutableRefObject<Map<string, { 
    name: string; 
    avatar: string; 
    documentId: string; 
    timestamp: number 
  }>>;
  uncollectedTips: Set<string>;
  onChannelPress?: (channelId: string) => void;
  onTipCollected?: (channelId: string) => void;
}

export const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  currentUserId,
  profileImage,
  userName,
  userCurrency,
  userProfileCache,
  uncollectedTips,
  onChannelPress,
  onTipCollected
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const displayName = getChannelDisplayName(channel, currentUserId);
  const avatar = getChannelAvatar(channel, currentUserId, profileImage, userName);
  const isDM = channel.id.startsWith('dm-');
  const isGroupChat = channel.id.startsWith('creator-');
  const hasUnread = channel.unreadCount > 0;
  
  // Animation refs for tip collection
  const coinAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  
  // Check if DM channel has an uncollected tip (persistent) or a recent tip message
  const hasTip = isDM && (
    uncollectedTips.has(channel.id) || 
    (channel.lastMessage && channel.lastMessage.includes('Tip:'))
  );

  // Coin collection animation
  const playTipCollectionAnimation = () => {
    setShowCoinAnimation(true);
    
    // Trigger haptic feedback for satisfying feel
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Reset all animations
    coinAnimations.forEach(anim => anim.setValue(0));
    
    // Create staggered coin animations
    const animations = coinAnimations.map((anim, index) => 
      Animated.sequence([
        Animated.delay(index * 100), // Stagger each coin by 100ms
        Animated.parallel([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ])
    );
    
    // Start all animations
    Animated.parallel(animations).start(() => {
      // Additional subtle haptic when animation completes
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Hide animation after completion
      setTimeout(() => {
        setShowCoinAnimation(false);
      }, 200);
    });
  };

  const clearAppBadge = () => {
    // Clear badge count when opening a chat
    import('@notifee/react-native').then(({ default: notifee }) => {
      notifee.setBadgeCount(0).then(() => {
        console.log('  [Badge] Badge count cleared on chat open');
      }).catch(error => {
        console.log('  [Badge] Failed to clear badge:', error);
      });
    }).catch(error => {
      console.log('  [Badge] Notifee not available:', error);
    });
  };

  const handlePress = async () => {
    // Clear app badge when opening any chat
    clearAppBadge();
    
    // Play tip collection animation if this channel has tips
    if (hasTip) {
      playTipCollectionAnimation();
      // Mark tip as collected
      if (onTipCollected) {
        onTipCollected(channel.id);
      }
      // Small delay to let animation start before navigation
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const targetRoute = `/chat/${channel.id}`;
    
    if (onChannelPress) {
      onChannelPress(channel.id);
    } else {
      router.push(targetRoute as any);
    }
  };

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: isGroupChat ? 16 : 12,
          backgroundColor: isGroupChat ? theme.cardBackground : (hasTip ? 'rgba(40, 158, 65, 0.36)' : theme.cardBackground), // Pale green for tipped DMs
          marginHorizontal: 16,
          marginVertical: isGroupChat ? 4 : 2,
          borderRadius: isGroupChat ? 16 : 8,
          borderWidth: isGroupChat ? 2 : 1,
          borderColor: isGroupChat ? theme.borderDark : (hasTip ? 'rgba(67, 255, 107, 0.16)' : theme.border), // Darker green border for tipped DMs
          shadowColor: isGroupChat ? theme.shadow : 'transparent',
          shadowOffset: isGroupChat ? { width: 0, height: 2 } : { width: 0, height: 0 },
          shadowOpacity: isGroupChat ? 0.3 : 0,
          shadowRadius: isGroupChat ? 8 : 0,
          elevation: isGroupChat ? 8 : 0,
        }}
        onPress={handlePress}
      >
      {/* Avatar */}
      <View style={{
        width: isGroupChat ? 48 : 40,
        height: isGroupChat ? 48 : 40,
        borderRadius: isGroupChat ? 24 : 20,
        backgroundColor: isGroupChat ? theme.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: isGroupChat ? 14 : 10,
        borderWidth: isGroupChat ? 2 : 0,
        borderColor: isGroupChat ? 'transparent' : 'transparent',
      }}>
        {channel.image || (avatar && avatar.startsWith('http')) ? (
          <Image
            source={{ uri: channel.image || avatar }}
            style={{ 
              width: isGroupChat ? 48 : 40, 
              height: isGroupChat ? 48 : 40, 
              borderRadius: isGroupChat ? 24 : 20 
            }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ 
            color: isGroupChat ? theme.textInverse : theme.text, 
            fontSize: isGroupChat ? 18 : 16, 
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold'
          }}>
            {avatar}
          </Text>
        )}
      </View>

      {/* Channel Info */}
      <View style={{ flex: 1 }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: isGroupChat ? 4 : 2 
        }}>
          <Text style={{ 
            color: theme.text, 
            fontSize: isGroupChat ? 18 : 16, 
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold',
            marginRight: isGroupChat ? 8 : 0,
          }}>
            {displayName}
          </Text>
        </View>
        
        <Text style={{ 
          color: hasUnread ? theme.text : (isGroupChat ? theme.text : theme.textTertiary), 
          fontSize: isGroupChat ? 14 : 13,
          fontFamily: hasUnread ? 'Urbanist-Bold' : 'Urbanist-Regular',
        }}>
          {channel.lastMessage || (hasUnread ? `${channel.unreadCount} new message${channel.unreadCount > 1 ? 's' : ''}` : (isGroupChat ? 'Share updates with your fans' : 'No messages yet'))}
        </Text>
        
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginTop: isGroupChat ? 4 : 2 
        }}>
          {!isDM && (
            <Text style={{ 
              color: isGroupChat ? theme.text : theme.textSecondary, 
              fontSize: isGroupChat ? 12 : 11,
              fontFamily: 'Urbanist-Regular',
              fontWeight: isGroupChat ? 'bold' : 'normal',
            }}>
              {channel.memberCount} member{channel.memberCount !== 1 ? 's' : ''}
            </Text>
          )}
          

          
          {channel.lastMessageAt && (
            <Text style={{ 
              color: isGroupChat ? theme.text : theme.text, 
              fontSize: isGroupChat ? 12 : 11,
              fontFamily: 'Urbanist-Regular',
              marginLeft: isDM ? 0 : 8,
              fontWeight: isGroupChat ? 'bold' : 'normal',
            }}>
              {(() => {
                const formattedTime = formatLastMessageTime(channel.lastMessageAt);
                return formattedTime;
              })()}
            </Text>
          )}
          
          {isGroupChat && (
            <View style={{
              width: 8,
              height: 8,
              backgroundColor: theme.text,
              borderRadius: 4,
              marginLeft: 8,
            }} />
          )}
        </View>
      </View>

      {/* Arrow or Unread Count Badge */}
      {channel.unreadCount > 0 ? (
        <View style={{
          backgroundColor: theme.primary,
          borderRadius: 12,
          minWidth: 24,
          height: 24,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 8,
        }}>
          <Text style={{
            color: theme.textInverse,
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'Urbanist-Bold',
          }}>
            {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
          </Text>
        </View>
      ) : (
        <View style={{
          width: isGroupChat ? 24 : 20,
          height: isGroupChat ? 24 : 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ 
            color: isGroupChat ? theme.text : theme.textSecondary, 
            fontSize: isGroupChat ? 16 : 14 
          }}>›</Text>
        </View>
      )}
    </TouchableOpacity>
    
    {/* Animated Coins Overlay */}
    {showCoinAnimation && (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 1000
      }}>
        {coinAnimations.map((anim, index) => {
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -60 - (index * 10)] // Different heights for each coin
          });
          
          const translateX = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, (index - 2) * 15] // Spread coins horizontally
          });
          
          const opacity = anim.interpolate({
            inputRange: [0, 0.8, 1],
            outputRange: [1, 1, 0] // Fade out at the end
          });
          
          const scale = anim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 1.2, 0.8] // Pop in, then shrink slightly
          });
          
          const rotate = anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'] // Spinning coin effect
          });
          
          return (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                transform: [
                  { translateY },
                  { translateX },
                  { scale },
                  { rotate }
                ],
                opacity
              }}
            >
              <Text style={{ 
                fontSize: 24, 
                color: '#FFD700',
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2
              }}>
                 
              </Text>
            </Animated.View>
          );
        })}
        
        {/* Success text that appears after coins */}
        <Animated.View
          style={{
            opacity: coinAnimations[0].interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0, 1]
            }),
            transform: [{
              translateY: coinAnimations[0].interpolate({
                inputRange: [0, 1],
                outputRange: [20, -40]
              })
            }, {
              scale: coinAnimations[0].interpolate({
                inputRange: [0, 0.8, 1],
                outputRange: [0.5, 1.1, 1]
              })
            }]
          }}
        >
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold',
            color: '#4CAF50',
            textAlign: 'center',
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
            fontFamily: 'Urbanist-Bold'
          }}>
            Tip Collected!
          </Text>
        </Animated.View>
      </View>
    )}
  </View>
  );
};