import { DeepPartial, Theme } from 'stream-chat-react-native';

/**
 * Custom theme configuration for Stream Chat
 * Matches the Cherry app's dark theme with pink accent colors
 * 
 * Color Palette Reference:
 * - #1A1A1A: Very dark grey (almost black) - Main background
 * - #2A2A2A: Dark grey - Secondary background (input boxes, containers)
 * - #404040: Medium grey - Borders and separators
 * - #666666: Light-medium grey - Subtle text and icons
 * - #999999: Medium-light grey - Secondary text
 * - #CCCCCC: Light grey - Tertiary text
 * - #FFFFFF: White - Primary text and icons
 * - #1A1A1A: Cherry Pink - Primary brand color, accents, and highlights
 */
export const getChatTheme = (): DeepPartial<Theme> => ({
  // Base colors used throughout the chat UI
  colors: {
    black: '#1A1A1A',    // Main app background
    white: '#FFFFFF',    // Primary text color
    primary: '#1A1A1A',  // Cherry brand color - Used for buttons, links, and accents
    grey: '#2A2A2A',     // Secondary background - Used for input boxes and containers
    grey_whisper: '#404040',      // Used for borders and subtle separators
    grey_gainsboro: '#666666',    // Used for subtle text and inactive icons
    grey_light: '#999999',        // Used for secondary text and timestamps
    grey_medium: '#CCCCCC',       // Used for tertiary text and disabled states
    grey_dark: '#FFFFFF',         // Used for text on dark backgrounds
    // All accent colors use Cherry Pink for brand consistency
    accent_blue: '#1A1A1A',       // Used where blue would be (links, etc.)
    accent_green: '#1A1A1A',      // Used where green would be (success states)
    accent_red: '#1A1A1A',        // Used where red would be (error states)
  },
  // Message input styling - The text input area at the bottom
  messageInput: {
    container: {
      backgroundColor: '#FFFFFF',    // White background for the entire input area
    },
    inputBoxContainer: {
      backgroundColor: '#F2F2F7',    // Light gray background for the actual input box
      borderRadius: 20,              // Rounded corners
      borderWidth: 1,
      borderColor: '#E5E5EA',        // Subtle border
      marginHorizontal: 16,          // Increased horizontal spacing
      marginVertical: 4,             // Reduced vertical spacing
      maxWidth: '85%',               // Limit width to 85% of container
      alignSelf: 'center',           // Center the input box
    },
    inputBox: {
      color: '#000000',              // Black text for user input
      fontSize: 16,                  // Slightly larger text
      paddingHorizontal: 12,         // Add some padding inside the input
      paddingVertical: 8,
    },
  },

  // Message list styling - The chat messages container
  messageList: {
    container: {
      backgroundColor: '#DCDEDF',    // Dark grey background for the message area
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
        backgroundColor: '#FFFFFF',   // Cherry Pink background for message bubbles
        borderWidth: 0,              // No border for clean look
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: '#FFFFFF',   // Cherry Pink background for text area
      },
      // Markdown styling for rich text in messages
      markdown: {
        text: {
          color: '#1A1A1A',          // White text for better contrast on Cherry Pink
        },
        paragraph: {
          color: '#1A1A1A',          // White text for regular paragraphs
        },
        strong: {
          color: '#1A1A1A',          // White text for bold sections
        },
        em: {
          color: '#1A1A1A',          // White text for italic sections
        },
      },
    },
  },
  // Poll component styling
  poll: {
    // Main poll container
    container: {
      backgroundColor: '#2A2A2A',    // Dark grey background
      borderRadius: 12,              // Rounded corners
      borderWidth: 1,
      borderColor: '#404040',        // Subtle border
      marginVertical: 8,
    } as any,
    // Poll header section
    header: {
      backgroundColor: '#1A1A1A',    // Darker background for header
      borderTopLeftRadius: 12,       // Match container corners
      borderTopRightRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    } as any,
    // Poll question/title
    title: {
      color: '#FFFFFF',              // White text
      fontSize: 16,
      fontWeight: 'bold',
    } as any,
    // Poll description
    subtitle: {
      color: '#CCCCCC',             // Light grey for secondary text
      fontSize: 14,
    } as any,
    // Individual poll option
    option: {
      backgroundColor: '#404040',    // Medium grey for unselected options
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 4,
      paddingHorizontal: 16,
      paddingVertical: 12,
    } as any,
    // Poll option text
    optionText: {
      color: '#FFFFFF',             // White text
      fontSize: 14,
    } as any,
    // Selected poll option
    optionVoted: {
      backgroundColor: '#1A1A1A',    // Cherry Pink for selected option
    } as any,
    // Selected option text
    optionVotedText: {
      color: '#FFFFFF',             // White text
      fontWeight: 'bold',           // Bold for emphasis
    } as any,
    // Vote button
    button: {
      backgroundColor: '#1A1A1A',    // Cherry Pink button
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginVertical: 8,
    } as any,
    // Vote button text
    buttonText: {
      color: '#FFFFFF',             // White text
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
    } as any,
  } as any,
  // Style for quoted reply previews (both in MessageInput header and in chat bubbles)
  reply: {
    // Reply container
    container: {
      backgroundColor: '#FFFFFF',    // Cherry Pink background
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
      color: '#FFFFFF',             // White text
      fontSize: 14,
    },
    // Author name in reply
    author: {
      color: '#FFFFFF',             // White text
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