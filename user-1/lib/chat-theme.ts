import { DeepPartial, Theme } from 'stream-chat-react-native';

// Custom theme for the chat - focused on timestamp visibility
export const getTheme = (): DeepPartial<Theme> => ({
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
    },
  },
  messageSimple: {
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
  // Style for quoted reply previews (both in MessageInput header and in chat bubbles)
  reply: {
    container: {
      backgroundColor: '#FB2355',
      borderWidth: 0,
      borderColor: 'transparent',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    textContainer: {
      backgroundColor: 'transparent',
    }
  },
});