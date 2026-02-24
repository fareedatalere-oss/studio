'use client';

import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type AppwriteContextType = {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    config: any | null;
    isLoading: boolean;
    recheckUser: () => Promise<void>;
};

const AppwriteContext = createContext<AppwriteContextType>({ user: null, profile: null, config: null, isLoading: true, recheckUser: async () => {} });

export const useAppwrite = () => {
    return useContext(AppwriteContext);
};

export function AppwriteProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkUser = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch app config first, as it's not user-dependent
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
        isLoading,
        recheckUser: checkUser
    };

    return (
        <AppwriteContext.Provider value={value}>
            {children}
        </AppwriteContext.Provider>
    );
};

export const useUser = () => {
    const { user, profile, config, isLoading, recheckUser } = useAppwrite();
    return { user, profile, config, loading: isLoading, recheckUser };
};
