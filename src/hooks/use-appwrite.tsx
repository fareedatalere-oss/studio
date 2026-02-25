'use client';

import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// A hook to manage the user's online presence
const usePresence = (user: Models.User<Models.Preferences> | null) => {
    useEffect(() => {
        if (!user) return;

        const updateUserPresence = async (isOnline: boolean) => {
            try {
                // This will fail if the profile is not created yet, which is okay.
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
                    isOnline,
                    lastSeen: new Date().toISOString(),
                });
            } catch (error) {
                // console.log("Could not update presence yet.");
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateUserPresence(true);
            } else {
                updateUserPresence(false);
            }
        };

        // Set online status immediately when the app loads
        updateUserPresence(true);

        // Update lastSeen every minute while the tab is active
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                updateUserPresence(true);
            }
        }, 60 * 1000);

        // Add event listeners for visibility changes
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', () => updateUserPresence(false));

        // Cleanup on unmount
        return () => {
            clearInterval(interval);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', () => updateUserPresence(false));
            // Setting to offline here is a good practice as a final attempt
            if (user) {
                updateUserPresence(false);
            }
        };
    }, [user]);
};

type AppwriteContextType = {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    config: any | null;
    loading: boolean;
    recheckUser: () => Promise<void>;
};

const AppwriteContext = createContext<AppwriteContextType>({ user: null, profile: null, config: null, loading: true, recheckUser: async () => {} });

export const useAppwrite = () => {
    return useContext(AppwriteContext);
};

export function AppwriteProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    usePresence(user); // Activate the presence hook

    const checkUser = useCallback(async () => {
        setIsLoading(true);
        try {
            try {
                const appConfig = await databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'main');
                setConfig(appConfig);
            } catch (configError) {
                console.log("Could not fetch app config, it may not be set.", configError);
                setConfig(null);
            }
            
            const currentUser = await account.get();
            setUser(currentUser);
            if (currentUser) {
                try {
                    const profileDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id);
                    setProfile(profileDoc);
                } catch (profileError) {
                    console.error("Could not fetch user profile", profileError);
                    setProfile(null);
                }
            } else {
                setUser(null);
                setProfile(null);
            }
        } catch (error) {
            setUser(null);
            setProfile(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkUser();
    }, [checkUser]);
    
    const value = {
        user,
        profile,
        config,
        loading: isLoading,
        recheckUser: checkUser
    };

    return (
        <AppwriteContext.Provider value={value}>
            {children}
        </AppwriteContext.Provider>
    );
};

export const useUser = () => {
    const { user, profile, config, loading, recheckUser } = useAppwrite();
    return { user, profile, config, loading, recheckUser };
};
