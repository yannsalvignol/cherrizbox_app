import React, { createContext, ReactNode, useContext, useEffect, useRef } from "react";

import { getCurrentUser } from "./appwrite";
import { connectUser, disconnectUser } from "./stream-chat";
import { useAppwrite } from "./useAppwrite";

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: () => void;
  isStreamConnected: boolean;
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

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const {
    data: user,
    loading,
    refetch,
  } = useAppwrite({
    fn: getCurrentUser,
  });

  const [isStreamConnected, setIsStreamConnected] = React.useState(false);
  const previousUserId = useRef<string | null>(null);

  const isLogged = !!user;

  // Connect to Stream Chat when user is loaded
  useEffect(() => {
    const connectToStream = async () => {
      if (user) {
        try {
          // Check if this is a different user than before
          if (previousUserId.current && previousUserId.current !== user.$id) {
            console.log('User changed, disconnecting previous user...');
            try {
              await disconnectUser();
              setIsStreamConnected(false);
            } catch (error) {
              console.log('Error disconnecting previous user:', error);
            }
          }

          // If not connected or user changed, connect
          if (!isStreamConnected || previousUserId.current !== user.$id) {
            console.log('Connecting user to Stream Chat...');
            
            // Connect user (this will create the user if it doesn't exist)
            const connected = await connectUser(user.$id);
            
            if (connected) {
              console.log('Successfully connected to Stream Chat');
              setIsStreamConnected(true);
              previousUserId.current = user.$id;
            } else {
              console.log('Failed to connect to Stream Chat');
            }
          }
        } catch (error) {
          console.error('Error connecting to Stream Chat:', error);
        }
      } else {
        // No user, disconnect if connected
        if (isStreamConnected) {
          console.log('No user found, disconnecting from Stream Chat...');
          try {
            await disconnectUser();
            setIsStreamConnected(false);
            previousUserId.current = null;
          } catch (error) {
            console.log('Error disconnecting:', error);
          }
        }
      }
    };

    connectToStream();
  }, [user, isStreamConnected]);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        user,
        loading,
        refetch,
        isStreamConnected,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context)
    throw new Error("useGlobalContext must be used within a GlobalProvider");

  return context;
};

export default GlobalProvider;