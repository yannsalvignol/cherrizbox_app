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

  useEffect(() => {
    const connectToStream = async () => {
      if (user) {
        try {
          if (previousUserId.current && previousUserId.current !== user.$id) {
            try {
              await disconnectUser();
              setIsStreamConnected(false);
            } catch (error) {
              console.log('Error disconnecting previous user:', error);
            }
          }
          if (!isStreamConnected || previousUserId.current !== user.$id) {
            const connected = await connectUser(user.$id);
            if (connected) {
              setIsStreamConnected(true);
              previousUserId.current = user.$id;
            } else {
              setIsStreamConnected(false);
            }
          }
        } catch (error) {
          setIsStreamConnected(false);
        }
      } else {
        if (isStreamConnected) {
          try {
            await disconnectUser();
            setIsStreamConnected(false);
            previousUserId.current = null;
          } catch (error) {
            // ignore
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
        refetch: () => refetch({}),
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