import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';

interface SearchInputProps {
    onSearch: (query: string) => void;
    onFocus: (focused: boolean) => void;
}

const SearchInput = ({ onSearch, onFocus }: SearchInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [searchText, setSearchText] = useState('');

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
        <View className="flex-row items-center">
            {isFocused && (
                <TouchableOpacity 
                    onPress={handleBack} 
                    className="mr-3 justify-center items-center"
                    style={{ height: 40, width: 40 }}
                >
                    <Ionicons 
                        name="chevron-back-outline" 
                        size={34} 
                        color="black" 
                    />
                </TouchableOpacity>
            )}
            <View className="flex-1 flex-row items-center bg-[#FFFFFF] px-5 py-4 rounded-full">
                <TextInput
                    className="flex-1 text-black font-['Questrial'] text-base"
                    placeholder="Search ..."
                    placeholderTextColor="black"
                    value={searchText}
                    onChangeText={handleSearch}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    blurOnSubmit={false}
                    returnKeyType="search"
                    style={{ 
                        paddingVertical: 4,
                        color: 'black',
                        lineHeight: 18
                    }}
                />
                <TouchableOpacity onPress={handleFocus} className="ml-2">
                    <Ionicons 
                        name="search-outline" 
                        size={24} 
                        color="black" 
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SearchInput;
