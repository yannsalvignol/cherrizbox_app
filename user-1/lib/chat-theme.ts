import { DeepPartial, Theme } from 'stream-chat-react-native';
import { Theme as AppTheme } from './themes/lightTheme';

// Custom theme for the chat - focused on timestamp visibility and dynamic theming
export const getTheme = (appTheme: AppTheme): DeepPartial<Theme> => ({
  // Main color palette - using dynamic app theme colors
  colors: {
    black: appTheme.background,           // Main background color
    white: appTheme.text,                 // Text color
    primary: appTheme.primary,            // Primary accent color
    grey: appTheme.backgroundSecondary,   // Secondary background color
    grey_whisper: appTheme.cardBackground, // Card background color
    grey_gainsboro: appTheme.border,      // Border color
    grey_light: appTheme.textSecondary,   // Secondary text color
    grey_medium: appTheme.textTertiary,   // Tertiary text color
    grey_dark: appTheme.text,             // Dark text color
    accent_blue: appTheme.primary,        // Blue accent using primary
    accent_green: appTheme.success,       // Green accent using success color
    accent_red: appTheme.error,           // Red accent using error color
  },
  
  // Message input area styling
  messageInput: {
    container: {
      backgroundColor: appTheme.backgroundSecondary, // Background of the entire input area
    },
    inputBoxContainer: {
      backgroundColor: appTheme.background, // Background of the text input box - different from container
      borderWidth: 1,
      borderColor: appTheme.border,
      borderRadius: 20,
    },
    inputBox: {
      color: appTheme.text, // Text color in the input box
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  },
  
  // Main chat message list area
  messageList: {
    container: {
      backgroundColor: appTheme.backgroundTertiary, // Main chat background
    },
  },
  
  // Individual message bubble styling
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: appTheme.bubblecolor, // Message bubble background color
        borderWidth: 0,
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: appTheme.bubblecolor, // Text container background (usually same as bubble)
      },
      markdown: {
        text: {
          color: appTheme.text, // Text in message bubbles
        },
        paragraph: {
          color: appTheme.text, // Text for paragraphs
        },
        strong: {
          color: appTheme.text, // Text for bold text
        },
        em: {
          color: appTheme.text, // Text for italic text
        },
      },
    },
  },
  
  // Style for quoted reply previews (both in MessageInput header and in chat bubbles)
  reply: {
    container: {
      backgroundColor: appTheme.background, // Reply preview background color
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

// DYNAMIC THEMING GUIDE:
// 
// This chat theme now automatically adapts to the app's current theme (light/dark mode).
// The theme is passed as a parameter and all colors are dynamically mapped:
// 
// Main backgrounds:
// - Chat background: appTheme.backgroundTertiary
// - Message input: appTheme.backgroundSecondary
// - Input box: appTheme.cardBackground
// - Message bubbles: appTheme.cardBackground
// 
// Text colors:
// - Primary text: appTheme.text
// - Secondary text: appTheme.textSecondary
// - Input text: appTheme.text
// 
// Accent colors:
// - Primary: appTheme.primary
// - Success: appTheme.success  
// - Error: appTheme.error
// 
// To use this theme, call: getTheme(currentAppTheme) where currentAppTheme
// is obtained from the useTheme() hook.
// - Key colors to change: black, grey, grey_whisper for backgrounds