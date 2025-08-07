import { DeepPartial, Theme } from 'stream-chat-react-native';

// Custom theme for the chat - focused on timestamp visibility
export const getTheme = (): DeepPartial<Theme> => ({
  // Main color palette - modify these to change the overall color scheme
  colors: {
    black: '#1A1A1A',        // Main dark background color
    white: '#FFFFFF',        // Text color on dark backgrounds
    primary: '#FB2355',      // Primary accent color (cherry red)
    grey: '#2A2A2A',         // Secondary background color
    grey_whisper: '#404040', // Tertiary background color
    grey_gainsboro: '#666666', // Medium grey for borders/separators
    grey_light: '#999999',   // Light grey for secondary text
    grey_medium: '#CCCCCC',  // Medium grey for disabled elements
    grey_dark: '#FFFFFF',    // Dark grey (currently white - might be a typo)
    accent_blue: '#FB2355',  // Blue accent (currently using primary red)
    accent_green: '#FB2355', // Green accent (currently using primary red)
    accent_red: '#FB2355',   // Red accent (currently using primary red)
  },
  
  // Message input area styling
  messageInput: {
    container: {
      backgroundColor: '#1A1A1A', // Background of the entire input area
    },
    inputBoxContainer: {
      backgroundColor: '#FFFFFF', // Background of the text input box
    },
    inputBox: {
      color: '#FFFFFF', // Text color in the input box
    },
  },
  
  // Main chat message list area
  messageList: {
    container: {
      backgroundColor: '#DCDEDF', // Main chat background - CHANGE THIS to modify the overall chat background
    },
  },
  
  // Individual message bubble styling
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: '#FFFFFF', // Message bubble background color
        borderWidth: 0,
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: '#FFFFFF', // Text container background (usually same as bubble)
      },
      markdown: {
        text: {
          color: '#1A1A1A', // White text in message bubbles
        },
        paragraph: {
          color: '#1A1A1A', // White text for paragraphs
        },
        strong: {
          color: '#1A1A1A', // White text for bold text
        },
        em: {
          color: '#1A1A1A', // White text for italic text
        },
      },
    },
  },
  
  // Style for quoted reply previews (both in MessageInput header and in chat bubbles)
  reply: {
    container: {
      backgroundColor: '#FFFFFF', // Reply preview background color
      borderWidth: 0,
      borderColor: 'transparent',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    textContainer: {
      backgroundColor: 'transparent', // Text container background for replies
    }
  },
});

// BACKGROUND MODIFICATION GUIDE:
// 
// To change the main chat background:
// - Modify messageList.container.backgroundColor (currently '#2A2A2A')
// 
// To change the message input area background:
// - Modify messageInput.container.backgroundColor (currently '#1A1A1A')
// - Modify messageInput.inputBoxContainer.backgroundColor (currently '#2A2A2A')
// 
// To change message bubble backgrounds:
// - Modify messageSimple.content.containerInner.backgroundColor (currently '#FB2355')
// - Modify messageSimple.content.textContainer.backgroundColor (currently '#FB2355')
// 
// To change reply preview backgrounds:
// - Modify reply.container.backgroundColor (currently '#FB2355')
// 
// To change the overall color scheme:
// - Modify the colors object at the top of the theme
// - Key colors to change: black, grey, grey_whisper for backgrounds