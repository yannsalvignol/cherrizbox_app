import React from 'react';
import { Text } from 'react-native';
import { ReactionData } from 'stream-chat-react-native';

/**
 * Custom reactions for the chat application
 */
export const customReactions: ReactionData[] = [
  { type: "love", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "❤️") },
  { type: "like", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "👍") },
  { type: "haha", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "😂") },
  { type: "wow", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "😮") },
  { type: "sad", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "😢") },
  { type: "angry", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "😡") },
  { type: "fire", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "🔥") },
  { type: "100", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "💯") },
  { type: "party", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, " ") },
  { type: "skull", Icon: () => React.createElement(Text, { style: { fontSize: 18 } }, "💀") },
];