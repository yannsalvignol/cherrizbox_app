import { DeepPartial, Theme } from 'stream-chat-react-native';

/**
 * Custom theme configuration for Stream Chat
 * Matches the Cherry app's dark theme with pink accent colors
 */
export const getChatTheme = (): DeepPartial<Theme> => ({
  colors: {
    black: '#1A1A1A',
    white: '#FFFFFF',
    primary: '#FB2355',
    grey: '#2A2A2A',
    grey_whisper: '#404040',
    grey_gainsboro: '#666666',
    grey_light: '#999999',
    grey_medium: '#CCCCCC',
    grey_dark: '#FFFFFF',
    accent_blue: '#FB2355',
    accent_green: '#FB2355',
    accent_red: '#FB2355',
  },
  messageInput: {
    container: {
      backgroundColor: '#1A1A1A',
    },
    inputBoxContainer: {
      backgroundColor: '#2A2A2A',
    },
    inputBox: {
      color: '#FFFFFF',
    },
  },
  messageList: {
    container: {
      backgroundColor: '#2A2A2A',
      paddingHorizontal: 1, // Minimal padding to bring messages very close to border
    },
  },
  messageSimple: {
    container: {
      marginLeft: -20, // Even closer to left border for received messages
      marginRight: 32, // Keep right margin for sent messages
    },
    content: {
      containerInner: {
        backgroundColor: '#FB2355',
        borderWidth: 0,
        borderColor: 'transparent',
      },
      textContainer: {
        backgroundColor: '#FB2355',
      },
      markdown: {
        text: {
          color: '#FFFFFF', // White text in message bubbles
        },
        paragraph: {
          color: '#FFFFFF', // White text for paragraphs
        },
        strong: {
          color: '#FFFFFF', // White text for bold text
        },
        em: {
          color: '#FFFFFF', // White text for italic text
        },
      },
    },
  },
  // Poll-specific theming - using proper theme structure
  poll: {
    container: {
      backgroundColor: '#2A2A2A',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#404040',
      marginVertical: 8,
    } as any,
    header: {
      backgroundColor: '#1A1A1A',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    } as any,
    title: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    } as any,
    subtitle: {
      color: '#CCCCCC',
      fontSize: 14,
    } as any,
    option: {
      backgroundColor: '#404040',
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 4,
      paddingHorizontal: 16,
      paddingVertical: 12,
    } as any,
    optionText: {
      color: '#FFFFFF',
      fontSize: 14,
    } as any,
    optionVoted: {
      backgroundColor: '#FB2355',
    } as any,
    optionVotedText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    } as any,
    button: {
      backgroundColor: '#FB2355',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginVertical: 8,
    } as any,
    buttonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
    } as any,
  } as any,
});

/**
 * Brand colors used throughout the app
 */
export const brandColors = {
  primary: '#FB2355',
  background: {
    primary: '#1A1A1A',
    secondary: '#2A2A2A',
    tertiary: '#404040',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#CCCCCC',
    tertiary: '#999999',
    muted: '#666666',
  },
  accent: {
    success: '#00C851',
    warning: '#FFD700',
    error: '#FF4444',
    info: '#4CAF50',
  },
} as const;

/**
 * Typography configuration
 */
export const typography = {
  fontFamily: {
    regular: 'questrial',
    bold: 'Urbanist-Bold',
    medium: 'Urbanist-Medium',
    semiBold: 'Urbanist-SemiBold',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
  },
} as const;