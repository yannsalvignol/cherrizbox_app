import React, { createContext, ReactNode, useContext, useEffect } from "react";

import { createCreatorChannel, disconnectStreamChat, initializeStreamChat } from '@/lib/stream-chat';
import { getCurrentUser } from "./appwrite";
import { useAppwrite } from "./useAppwrite";

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: () => void;
}

interface User {
  $id: string;
  name: string;
  email: string;
  avatar: string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export function GlobalProvider({ children }: GlobalProviderProps) {
  const {
    data: user,
    loading,
    refetch,
  } = useAppwrite({
    fn: getCurrentUser,
  });

  const isLogged = !!user;

  // Initialize Stream Chat when user is loaded
  useEffect(() => {
    const initializeChat = async () => {
      if (user) {
        try {
          // Connect the user first
          const client = await initializeStreamChat(
            user.$id,
            user.name,
            user.avatar
          );
          
          // Create their channel
          const channel = await createCreatorChannel(user.$id, user.name);
          
          console.log('Stream Chat initialized:', client);
          console.log('Creator channel created:', channel);
        } catch (error) {
          console.error('Error initializing Stream Chat:', error);
        }
      }
    };

    initializeChat();

    // Cleanup function to disconnect when component unmounts
    return () => {
      if (user) {
        disconnectStreamChat().catch(console.error);
      }
    };
  }, [user]);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        user,
        loading,
        refetch,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context)
    throw new Error("useGlobalContext must be used within a GlobalProvider");

  return context;
};

export default GlobalProvider;