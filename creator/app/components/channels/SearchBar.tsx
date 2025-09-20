import { useTheme } from '@/lib/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface SearchBarProps {
  showSearch: boolean;
  searchQuery: string;
  onSearchToggle: (show: boolean) => void;
  onSearchChange: (text: string) => void;
  onSearchClear: () => void;
  onSearchCancel: () => void;
  hasChannels: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  showSearch,
  searchQuery,
  onSearchToggle,
  onSearchChange,
  onSearchClear,
  onSearchCancel,
  hasChannels
}) => {
  const { theme } = useTheme();
  // Don't render if no channels and search is not active
  if (!hasChannels && !showSearch) return null;

  return (
    <View style={{
      paddingHorizontal: 16,
      paddingVertical: 4,
      backgroundColor: theme.backgroundTertiary,
      borderBottomWidth: showSearch ? 1 : 0,
      borderBottomColor: theme.border,
    }}>
      {showSearch ? (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.cardBackground,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
          <Ionicons name="search" size={20} color={theme.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={{
              flex: 1,
              color: theme.text,
              fontSize: 16,
              fontFamily: 'Urbanist-Regular',
              padding: 0,
            }}
            placeholder="Search chats..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={onSearchClear}>
              <Ionicons name="close-circle" size={20} color={theme.text} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onSearchCancel}
            style={{ marginLeft: 12 }}
          >
            <Text style={{ color: theme.text, fontFamily: 'Urbanist-Bold', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => onSearchToggle(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.cardBackground,
            borderRadius: 10,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="search" size={20} color={theme.textTertiary} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.textTertiary, fontSize: 16, fontFamily: 'Urbanist-Regular' }}>
            Search chats...
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};