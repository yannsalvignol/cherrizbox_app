import { SubscriberInfoModal } from '@/app/components/modals';
import { useGlobalContext } from '@/lib/global-provider';
import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AudienceTabProps {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

interface Subscriber {
  $id: string;
  customerEmail?: string;
  userName?: string;
  planInterval?: string;
  planAmount?: number;
  createdAt?: string;
  $createdAt?: string;
}

export default function AudienceTab({ refreshing, onRefresh }: AudienceTabProps) {
  const { theme } = useTheme();
  const { user } = useGlobalContext();
  
  const [audience, setAudience] = useState<Subscriber[]>([]);
  const [isLoadingAudience, setIsLoadingAudience] = useState(false);
  const [audienceSearch, setAudienceSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'recent' | 'income_high' | 'income_low'>('recent');
  const [filteredAudience, setFilteredAudience] = useState<Subscriber[]>([]);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);

  const loadAudience = async () => {
    if (!user?.$id) return;
    console.log('👥 [Audience] Starting audience load...');
    setIsLoadingAudience(true);
    try {
      const { databases, config } = await import('@/lib/appwrite');
      const { Query } = await import('react-native-appwrite');
      
      // Use the index on creatorIdactive subscriptions for this creator
      const response = await databases.listDocuments(
        config.databaseId,
        config.activeSubscriptionsCollectionId,
        [
          Query.equal('creatorId', user.$id),
          Query.equal('status', 'active')
        ]
      );
      console.log(` [Audience] Loaded ${response.documents.length} subscribers`);
      setAudience(response.documents as Subscriber[]);
    } catch (error) {
      console.error('   [Audience] Error loading audience:', error);
      setAudience([]);
    } finally {
      setIsLoadingAudience(false);
    }
  };

  // Load audience when component mounts or user changes
  useEffect(() => {
    if (user?.$id) {
      loadAudience();
    }
  }, [user?.$id]);

  // Update filteredAudience when audience, search, or filter changes
  useEffect(() => {
    console.log(`🔍 [Audience] Filtering ${audience.length} subscribers with search: "${audienceSearch}", filter: ${audienceFilter}`);
    let filtered = audience;
    
    // Search filter
    if (audienceSearch.trim()) {
      const search = audienceSearch.trim().toLowerCase();
      filtered = filtered.filter(sub =>
        (sub.customerEmail && sub.customerEmail.toLowerCase().includes(search)) ||
        (sub.userName && sub.userName.toLowerCase().includes(search))
      );
    }
    
    // Sorting
    if (audienceFilter === 'recent') {
      filtered = filtered.slice().sort((a, b) => 
        new Date(b.createdAt || b.$createdAt || 0).getTime() - 
        new Date(a.createdAt || a.$createdAt || 0).getTime()
      );
    } else if (audienceFilter === 'income_high') {
      filtered = filtered.slice().sort((a, b) => (b.planAmount || 0) - (a.planAmount || 0));
    } else if (audienceFilter === 'income_low') {
      filtered = filtered.slice().sort((a, b) => (a.planAmount || 0) - (b.planAmount || 0));
    }
    
    console.log(` [Audience] Filtered to ${filtered.length} subscribers`);
    setFilteredAudience(filtered);
  }, [audience, audienceSearch, audienceFilter]);

  const handleRefresh = async () => {
    await loadAudience();
    if (onRefresh) {
      await onRefresh();
    }
  };

  const renderSubscriberItem = ({ item: sub, index }: { item: Subscriber; index: number }) => (
    <TouchableOpacity
      key={sub.$id || index}
      onPress={() => {
        setSelectedSubscriber(sub);
        setShowSubscriberModal(true);
      }}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.cardBackground,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.borderDark,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 4,
        elevation: 2,
        marginHorizontal: 8,
      }}
    >
      {/* Icon or Initial */}
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        overflow: 'hidden',
      }}>
        <Text style={{ 
          color: theme.text, 
          fontSize: 22, 
          fontWeight: 'bold', 
          fontFamily: 'Urbanist-Bold' 
        }} allowFontScaling={false}>
          {sub.userName ? sub.userName[0]?.toUpperCase() : 
           (sub.customerEmail ? sub.customerEmail[0]?.toUpperCase() : 'U')}
        </Text>
      </View>
      
      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ 
          color: theme.text, 
          fontFamily: 'Urbanist-Bold', 
          fontSize: 17 
        }} allowFontScaling={false}>
          {sub.userName || sub.customerEmail || 'No name'}
        </Text>
        <Text style={{ 
          color: theme.textSecondary, 
          fontFamily: 'Urbanist-Regular', 
          fontSize: 14 
        }} allowFontScaling={false}>
          {sub.customerEmail && sub.userName ? sub.customerEmail : ''}
        </Text>
      </View>
      
      {/* Plan info */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ 
          color: theme.text, 
          fontFamily: 'Urbanist-Bold', 
          fontSize: 14 
        }} allowFontScaling={false}>
          {sub.planInterval ? 
            sub.planInterval.charAt(0).toUpperCase() + sub.planInterval.slice(1) : ''}
        </Text>
        <Text style={{ 
          color: theme.warning, 
          fontFamily: 'Urbanist-Bold', 
          fontSize: 14 
        }} allowFontScaling={false}>
          {sub.planAmount ? `$${(sub.planAmount / 100).toFixed(2)}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginTop: 32,
      paddingHorizontal: 20 
    }}>
      <Ionicons 
        name="people-outline" 
        size={64} 
        color={theme.textTertiary} 
        style={{ marginBottom: 16 }} 
      />
      <Text style={{ 
        color: theme.textTertiary, 
        fontSize: 18, 
        textAlign: 'center',
        fontFamily: 'Urbanist-Bold',
        marginBottom: 8
      }} allowFontScaling={false}>
        No subscribers yet
      </Text>
      <Text style={{ 
        color: theme.textTertiary, 
        fontSize: 14, 
        textAlign: 'center',
        fontFamily: 'Urbanist-Regular',
        lineHeight: 20
      }} allowFontScaling={false}>
        When users subscribe to your content, they'll appear here with their subscription details.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginTop: 32 
    }}>
      <Ionicons 
        name="hourglass-outline" 
        size={48} 
        color={theme.textTertiary} 
        style={{ marginBottom: 12 }}
      />
      <Text style={{ 
        color: theme.text, 
        fontFamily: 'Urbanist-Bold', 
        fontSize: 16 
      }} allowFontScaling={false}>
        Loading subscribers...
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundTertiary }}>
      {/* Fixed Header with Search and Filters */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 }}>
        {/* Search Bar */}
        <View style={{ width: '100%', marginBottom: 12 }}>
          <View style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}>
            <Ionicons name="search" size={20} color={theme.text} style={{ marginRight: 8 }} />
            <TextInput
              style={{
                flex: 1,
                color: theme.text,
                fontFamily: 'Urbanist-Regular',
                fontSize: 16,
                backgroundColor: 'transparent',
                padding: 0,
                letterSpacing: 0.2,
              }}
              placeholder="Search by username or email..."
              placeholderTextColor={theme.textTertiary}
              value={audienceSearch}
              onChangeText={setAudienceSearch}
              autoCapitalize="none"
              autoCorrect={false}
              allowFontScaling={false}
            />
            {audienceSearch.length > 0 && (
              <TouchableOpacity onPress={() => setAudienceSearch('')}>
                <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tags */}
        <View style={{ 
          flexDirection: 'row', 
          marginBottom: 8, 
          width: '100%', 
          justifyContent: 'center', 
          gap: 8 
        }}>
          {[
            { key: 'recent', label: 'Most Recent' },
            { key: 'income_high', label: 'Highest Income' },
            { key: 'income_low', label: 'Lowest Income' },
          ].map(tag => (
            <TouchableOpacity
              key={tag.key}
              onPress={() => setAudienceFilter(tag.key as 'recent' | 'income_high' | 'income_low')}
              style={{
                backgroundColor: audienceFilter === tag.key ? theme.cardBackground : theme.backgroundTertiary,
                borderRadius: 20,
                paddingVertical: 7,
                paddingHorizontal: 16,
                marginHorizontal: 2,
                borderWidth: audienceFilter === tag.key ? 1.5 : 1,
                borderColor: audienceFilter === tag.key ? theme.cardBackground : theme.borderDark,
              }}
            >
              <Text style={{
                color: theme.text,
                fontFamily: audienceFilter === tag.key ? 'Urbanist-Bold' : 'Urbanist-Regular',
                fontSize: 14,
              }} allowFontScaling={false}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Scrollable Content */}
      <FlatList
        data={filteredAudience}
        renderItem={renderSubscriberItem}
        keyExtractor={(item, index) => item.$id || index.toString()}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingBottom: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoadingAudience}
            onRefresh={handleRefresh}
            tintColor={theme.text}
            colors={[theme.text]}
            progressBackgroundColor={theme.backgroundTertiary}
          />
        }
        ListEmptyComponent={isLoadingAudience ? renderLoadingState() : renderEmptyState()}
        showsVerticalScrollIndicator={false}
      />

      {/* Subscriber Info Modal */}
      <SubscriberInfoModal
        visible={showSubscriberModal}
        subscriber={selectedSubscriber}
        onClose={() => {
          setShowSubscriberModal(false);
          setSelectedSubscriber(null);
        }}
      />
    </View>
  );
}
