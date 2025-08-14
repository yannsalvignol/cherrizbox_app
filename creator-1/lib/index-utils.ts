/**
 * Utility functions for the Index screen
 * Contains pure functions for currency formatting, channel operations, and time formatting
 */

// ===== TYPES =====
export interface Channel {
  id: string;
  type: string;
  lastMessage?: string;
  lastMessageAt?: string;
  memberCount: number;
  members: string[];
  name?: string;
  image?: string;
  memberNames?: { [userId: string]: string };
  memberAvatars?: { [userId: string]: string };
  unreadCount: number;
}

// ===== CURRENCY UTILITIES =====

/**
 * Get currency information including symbol and position
 */
export const getCurrencyInfo = (currencyCode?: string) => {
  const currencyMap: { [key: string]: { symbol: string; position: 'before' | 'after' } } = {
    'USD': { symbol: '$', position: 'before' },
    'CAD': { symbol: 'C$', position: 'before' },
    'AUD': { symbol: 'A$', position: 'before' },
    'MXN': { symbol: '$', position: 'before' },
    'SGD': { symbol: 'S$', position: 'before' },
    'NZD': { symbol: 'NZ$', position: 'before' },
    'EUR': { symbol: '€', position: 'after' },
    'GBP': { symbol: '£', position: 'before' },
    'JPY': { symbol: '¥', position: 'before' },
    'CHF': { symbol: 'CHF', position: 'before' },
    'CNY': { symbol: '¥', position: 'before' },
    'INR': { symbol: '₹', position: 'before' },
    'BRL': { symbol: 'R$', position: 'before' },
    'SEK': { symbol: 'kr', position: 'after' },
    'NOK': { symbol: 'kr', position: 'after' },
    'DKK': { symbol: 'kr', position: 'after' },
  };
  return currencyMap[currencyCode || 'USD'] || { symbol: '$', position: 'before' };
};

/**
 * Format price with currency symbol and position
 */
export const formatPrice = (price: number | string | undefined, currencyCode?: string) => {
  if (price === undefined || price === null) return '--';
  const priceStr = (parseFloat(price.toString()) / 100).toFixed(2);
  const currencyInfo = getCurrencyInfo(currencyCode);
  return currencyInfo.position === 'before' 
    ? `${currencyInfo.symbol}${priceStr}`
    : `${priceStr}${currencyInfo.symbol}`;
};

// ===== CHANNEL UTILITIES =====

/**
 * Get display name for a channel (handles DM channels, creator channels, etc.)
 */
export const getChannelDisplayName = (channel: Channel, currentUserId?: string) => {
  if (channel.name) return channel.name;
  
  // For DM channels, show the other person's name
  if (channel.id.startsWith('dm-') && channel.members.length > 0) {
    const otherMembers = channel.members.filter(memberId => memberId !== currentUserId);
    if (otherMembers.length > 0) {
      const otherMemberId = otherMembers[0];
      const otherMemberName = channel.memberNames?.[otherMemberId];
      const displayName = otherMemberName ? `Chat with ${otherMemberName}` : `Chat with ${otherMemberId}`;
      console.log(`📱 Channel ${channel.id}: ${displayName}`);
      return displayName;
    }
  }
  
  // For creator channels
  if (channel.id.startsWith('creator-')) {
    return 'My Box';
  }
  
  return 'Unnamed Channel';
};

/**
 * Get avatar for a channel (handles DM channels, creator channels, etc.)
 */
export const getChannelAvatar = (
  channel: Channel, 
  currentUserId?: string, 
  profileImage?: string | null,
  userName?: string
) => {
  if (channel.image) return channel.image;
  
  // For DM channels, show the other person's avatar
  if (channel.id.startsWith('dm-') && channel.members.length > 0) {
    const otherMembers = channel.members.filter(memberId => memberId !== currentUserId);
    if (otherMembers.length > 0) {
      const otherMemberId = otherMembers[0];
      const otherMemberAvatar = channel.memberAvatars?.[otherMemberId];
      if (otherMemberAvatar) {
        return otherMemberAvatar; // Return the avatar URL
      }
      // Fallback to first letter of username or ID
      const otherMemberName = channel.memberNames?.[otherMemberId];
      return otherMemberName ? otherMemberName[0]?.toUpperCase() : otherMemberId[0]?.toUpperCase() || 'U';
    }
  }
  
  // For creator channels, show user's profile image or first letter
  if (channel.id.startsWith('creator-')) {
    return profileImage || userName?.[0]?.toUpperCase() || 'U';
  }
  
  return 'C';
};

/**
 * Filter channels based on search query
 */
export const filterChannels = (channelList: Channel[], query: string, currentUserId?: string) => {
  console.log(`🔍 [Search] Filtering ${channelList.length} channels with query: "${query}"`);
  
  if (!query.trim()) {
    console.log('✅ [Search] Empty query, showing all channels');
    return channelList;
  }
  
  const lowercaseQuery = query.toLowerCase().trim();
  const filtered = channelList.filter(channel => {
    // Search in channel name
    if (channel.name && channel.name.toLowerCase().includes(lowercaseQuery)) {
      return true;
    }
    
    // Search in member names for DM channels
    if (channel.id.startsWith('dm-')) {
      const otherMembers = channel.members.filter(memberId => memberId !== currentUserId);
      for (const memberId of otherMembers) {
        const memberName = channel.memberNames?.[memberId];
        if (memberName && memberName.toLowerCase().includes(lowercaseQuery)) {
          return true;
        }
      }
    }
    
    // Search in last message
    if (channel.lastMessage && channel.lastMessage.toLowerCase().includes(lowercaseQuery)) {
      return true;
    }
    
    return false;
  });
  
  console.log(`✅ [Search] Found ${filtered.length} matching channels`);
  return filtered;
};

// ===== TIME UTILITIES =====

/**
 * Format timestamp for last message display
 */
export const formatLastMessageTime = (timestamp?: string) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  if (diffInHours < 48) return 'Yesterday';
  return date.toLocaleDateString();
};

// ===== VALIDATION UTILITIES =====

/**
 * Check if a channel is a DM channel
 */
export const isDMChannel = (channel: Channel): boolean => {
  return channel.id.startsWith('dm-');
};

/**
 * Check if a channel is a creator channel
 */
export const isCreatorChannel = (channel: Channel): boolean => {
  return channel.id.startsWith('creator-');
};

/**
 * Get other members in a DM channel (excluding current user)
 */
export const getOtherMembers = (channel: Channel, currentUserId?: string): string[] => {
  return channel.members.filter(memberId => memberId !== currentUserId);
};

/**
 * Calculate relative time difference in human-readable format
 */
export const getRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};