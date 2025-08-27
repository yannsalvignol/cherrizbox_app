import { DeepPartial, Theme } from 'stream-chat-react-native';
import { Theme as AppTheme } from './lightTheme';

/**
 * Custom theme configuration for Stream Chat
 * Now uses the app's theme system for consistent theming
 */
export const getChatTheme = (appTheme: AppTheme): DeepPartial<Theme> => ({
  // Base colors used throughout the chat UI
  colors: {
    black: appTheme.background,           // Main app background
    white: 'white',                //day time stamps
    primary: appTheme.primary,            // Brand color - Used for buttons, links, and accents
    grey: appTheme.text,        // time stamps 
    grey_whisper: appTheme.border,        // Used for borders and subtle separators
    grey_gainsboro: appTheme.textTertiary, // Used for subtle text and inactive icons
    grey_light: appTheme.textSecondary,   // Used for secondary text and timestamps
    grey_medium: appTheme.textTertiary,   // Used for tertiary text and disabled states
    grey_dark: appTheme.text,             // Used for text on dark backgrounds
    // Accent colors use theme colors
    accent_blue: appTheme.primary,        // Used where blue would be (links, etc.)
    accent_green: appTheme.success,       // Used where green would be (success states)
    accent_red: appTheme.error,           // Used where red would be (error states)
  },
  // Message input styling - The text input area at the bottom
  messageInput: {
    container: {
      backgroundColor: appTheme.background,  // Theme background for the entire input area
    },
    inputBoxContainer: {
      backgroundColor: appTheme.inputBackground, // Theme input background
      borderRadius: 20,              // Rounded corners
      borderWidth: 1,
      borderColor: appTheme.inputBorder,     // Theme border color
      marginHorizontal: 16,          // Increased horizontal spacing
      marginVertical: 4,             // Reduced vertical spacing
      maxWidth: '85%',               // Limit width to 85% of container
      alignSelf: 'center',           // Center the input box
    },
    inputBox: {
      color: appTheme.inputText,     // Theme text color for user input
      fontSize: 16,                  // Slightly larger text
      paddingHorizontal: 12,         // Add some padding inside the input
      paddingVertical: 8,
    },
  },

  // Message list styling - The chat messages container
  messageList: {
    container: {
      backgroundColor: appTheme.backgroundTertiary, // Theme chat background
      paddingHorizontal: 1,          // Minimal padding to bring messages very close to border
    },
  },

  // Individual message styling
      messageSimple: {
      container: {
        marginLeft: -20,               // Negative margin to extend received messages to the edge
        marginRight: 0,               // Reduced space - bring sent messages closer to the right edge
      },

    content: {
      containerInner: {
        backgroundColor: appTheme.bubbleColor, // Theme message bubble background
        borderWidth: 0,              // No border for clean look
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: appTheme.bubbleColor, // Theme message text area background
      },
      // Markdown styling for rich text in messages
      markdown: {
        text: {
          color: appTheme.text,        // Theme text color
        },
        paragraph: {
          color: appTheme.text,        // Theme text color for paragraphs
        },
        strong: {
          color: appTheme.text,        // Theme text color for bold sections
        },
        em: {
          color: appTheme.text,        // Theme text color for italic sections
        },
      },
    },
  },
  // Poll component styling
  poll: {
    // Main poll container
    container: {
      backgroundColor: appTheme.cardBackground, // Theme card background
      borderRadius: 12,              // Rounded corners
      borderWidth: 1,
      borderColor: appTheme.border,  // Theme border color
      marginVertical: 8,
    } as any,
    // Poll header section
    header: {
      backgroundColor: appTheme.backgroundSecondary, // Theme secondary background
      borderTopLeftRadius: 12,       // Match container corners
      borderTopRightRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    } as any,
    // Poll question/title
    title: {
      color: appTheme.text,          // Theme text color
      fontSize: 16,
      fontWeight: 'bold',
    } as any,
    // Poll description
    subtitle: {
      color: appTheme.textSecondary, // Theme secondary text color
      fontSize: 14,
    } as any,
    // Individual poll option
    option: {
      backgroundColor: appTheme.backgroundSecondary, // Theme secondary background
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 4,
      paddingHorizontal: 16,
      paddingVertical: 12,
    } as any,
    // Poll option text
    optionText: {
      color: appTheme.text,          // Theme text color
      fontSize: 14,
    } as any,
    // Selected poll option
    optionVoted: {
      backgroundColor: appTheme.primary, // Theme primary color for selected option
    } as any,
    // Selected option text
    optionVotedText: {
      color: appTheme.textInverse,   // Theme inverse text color
      fontWeight: 'bold',           // Bold for emphasis
    } as any,
    // Vote button
    button: {
      backgroundColor: appTheme.primary, // Theme primary color for button
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginVertical: 8,
    } as any,
    // Vote button text
    buttonText: {
      color: appTheme.textInverse,   // Theme inverse text color
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
    } as any,
  } as any,
  // Style for quoted reply previews (both in MessageInput header and in chat bubbles)
  reply: {
    // Reply container
    container: {
      backgroundColor: appTheme.backgroundSecondary, // Theme secondary background
      borderWidth: 0,               // No border
      borderColor: 'transparent',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 6,              // Slightly rounded corners
    },
    // Text container within reply
    textContainer: {
      backgroundColor: 'transparent', // Let container color show through
    },
    // Reply preview text
    text: {
      color: appTheme.text,         // Theme text color
      fontSize: 14,
    },
    // Author name in reply
    author: {
      color: appTheme.text,         // Theme text color
      fontSize: 12,
      fontWeight: 'bold',           // Bold for emphasis
    },
  } as any,
});

/**
 * Brand colors used throughout the app
 * 
 * Color System:
 * - Primary: Cherry Pink (#1A1A1A) - Main brand color
 * - Background: Three-level hierarchy from darkest to lighter
 * - Text: Four-level hierarchy from white to dark grey
 * - Accent: Status colors for different states
 */
export const brandColors = {
  primary: '#1A1A1A',              // Cherry Pink - Main brand color
  
  // Background color hierarchy
  background: {
    primary: '#1A1A1A',           // Darkest - Main app background
    secondary: '#FFFFFF',         // Medium - Container backgrounds
    tertiary: '#404040',          // Lighter - Interactive elements
  },
  
  // Text color hierarchy
  text: {
    primary: '#FFFFFF',           // White - Primary text
    secondary: '#FFFFFF',         // Light grey - Secondary text
    tertiary: '#FFFFFF',         // Medium grey - Tertiary text
    muted: '#FFFFFF',            // Dark grey - Disabled/muted text
  },
  
  // Status/Accent colors
  accent: {
    success: '#00C851',          // Green - Success states
    warning: '#FFD700',          // Yellow - Warning states
    error: '#FF4444',           // Red - Error states
    info: '#4CAF50',            // Green - Information states
  },
} as const;

/**
 * Typography configuration
 * 
 * Font Families:
 * - Questrial: Clean, modern sans-serif for regular text
 * - Urbanist: Contemporary geometric sans-serif for headings and emphasis
 * 
 * Size Scale:
 * Follows an incremental scale suitable for mobile:
 * - xs (10px): Tiny text, footnotes
 * - sm (12px): Small text, captions
 * - md (14px): Body text
 * - lg (16px): Large text, subheadings
 * - xl (18px): Extra large text
 * - xxl (20px): Headings
 * - xxxl (24px): Large headings
 */
export const typography = {
  // Font family definitions
  fontFamily: {
    regular: 'questrial',           // Primary text font
    bold: 'Urbanist-Bold',         // Strong emphasis
    medium: 'Urbanist-Medium',     // Medium emphasis
    semiBold: 'Urbanist-SemiBold', // Moderate emphasis
  },
  
  // Font size scale (in pixels)
  fontSize: {
    xs: 10,    // Tiny text (footnotes, badges)
    sm: 12,    // Small text (captions, metadata)
    md: 14,    // Body text (default size)
    lg: 16,    // Large text (important content)
    xl: 18,    // Extra large (subheadings)
    xxl: 20,   // Double extra large (headings)
    xxxl: 24,  // Triple extra large (main headings)
  },
} as const;