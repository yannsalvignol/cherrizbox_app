import { DeepPartial, Theme } from 'stream-chat-react-native';
import { Theme as AppTheme } from './themes/lightTheme';

// Custom theme for the chat - focused on timestamp visibility
export const getTheme = (appTheme: AppTheme): DeepPartial<Theme> => ({
  // Main color palette - now using dynamic theme values
  colors: {
    black: appTheme.background,           // Main background color
    white: 'white',                 // time stamp days color
    primary: appTheme.primary,            // Primary accent color (cherry red)
    grey: appTheme.text,   // time stamp color 
    grey_whisper: appTheme.cardBackground, // Card/bubble background color
    grey_gainsboro: appTheme.border,      // Borders/separators (thread line)
    grey_light: appTheme.textSecondary,   // Secondary text
    grey_medium: appTheme.textTertiary,   // Tertiary/disabled text
    grey_dark: appTheme.text,             // Dark text
    accent_blue: appTheme.primary,        // Blue accent using primary
    accent_green: appTheme.success,       // Green accent for success
    accent_red: appTheme.error,           // Red accent for errors
  },
  
  // Message input area styling
  messageInput: {
    container: {
      backgroundColor: appTheme.background, // Background of the entire input area
    },
    inputBoxContainer: {
      backgroundColor: appTheme.inputBackground, // Background of the text input box
    },
    inputBox: {
      color: 'black', // Text color in the input box
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
        backgroundColor: appTheme.bubbleColor, // Message bubble background color
        borderWidth: 0,
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: appTheme.bubbleColor, // Text container background (usually same as bubble)
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
      // Note: deletedText styling moved to component level
    },
  },
  
  // Style for quoted reply previews (both in MessageInput header and in chat bubbles)
  reply: {
    container: {
      backgroundColor: appTheme.cardBackground, // Reply preview background color
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
// This chat theme now automatically adapts to your app's light/dark theme!
// 
// Theme mappings:
// - Main chat background: appTheme.backgroundTertiary
// - Message input area: appTheme.background + appTheme.cardBackground
// - Message bubbles: appTheme.cardBackground
// - Text colors: appTheme.text
// - Reply previews: appTheme.cardBackground
// 
// Color palette mappings:
// - black: appTheme.background (main backgrounds)
// - white: appTheme.text (text color)
// - grey: appTheme.backgroundSecondary (secondary backgrounds)
// - grey_whisper: appTheme.cardBackground (message bubbles)
// - primary: appTheme.primary (accent color)
// - Success/Error: appTheme.success/appTheme.error
// 
// The theme automatically updates when the user switches between light/dark mode!