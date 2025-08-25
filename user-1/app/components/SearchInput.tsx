import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Keyboard, Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../lib/themes/useTheme';

interface SearchInputProps {
    onSearch: (query: string) => void;
    onFocus: (focused: boolean) => void;
}

const SearchInput = ({ onSearch, onFocus }: SearchInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [searchText, setSearchText] = useState('');
    const { theme } = useTheme();

    const handleFocus = () => {
        setIsFocused(true);
        onFocus(true);
    };

    const handleBlur = () => {
        // Don't blur if we're interacting with trends
        if (isFocused) {
            return;
        }
        setIsFocused(false);
        onFocus(false);
    };

    const handleBack = () => {
        Keyboard.dismiss();
        setSearchText('');
        onSearch('');
        setIsFocused(false);
        onFocus(false);
    };

    const handleSearch = (text: string) => {
        setSearchText(text);
        onSearch(text);
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isFocused && (
                <TouchableOpacity 
                    onPress={handleBack} 
                    style={{ 
                        marginRight: 12, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        height: 40, 
                        width: 40 
                    }}
                >
                    <Ionicons 
                        name="chevron-back-outline" 
                        size={34} 
                        color={theme.text} 
                    />
                </TouchableOpacity>
            )}
            <View 
                style={{ 
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.cardBackground,
                    paddingHorizontal: 20,
                    borderRadius: 25,
                    paddingVertical: Platform.OS === 'android' ? 12 : 16 
                }}
            >
                <TextInput
                    style={{ 
                        flex: 1,
                        color: theme.text,
                        fontFamily: 'Questrial',
                        fontSize: 16,
                        paddingVertical: Platform.OS === 'android' ? 4 : 4,
                        lineHeight: Platform.OS === 'android' ? 18 : 18,
                        textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
                        includeFontPadding: false
                    }}
                    placeholder="Search ..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchText}
                    onChangeText={handleSearch}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    blurOnSubmit={false}
                    returnKeyType="search"
                />
                <TouchableOpacity onPress={handleFocus} style={{ marginLeft: 8 }}>
                    <Ionicons 
                        name="search-outline" 
                        size={24} 
                        color={theme.textSecondary} 
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SearchInput;
