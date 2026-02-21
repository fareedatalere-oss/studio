'use client';

import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type AppwriteContextType = {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    isLoading: boolean;
    recheckUser: () => Promise<void>;
};

const AppwriteContext = createContext<AppwriteContextType>({ user: null, profile: null, isLoading: true, recheckUser: async () => {} });

export const useAppwrite = () => {
    return useContext(AppwriteContext);
};

export function AppwriteProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkUser = useCallback(async () => {
        setIsLoading(true);
        try {
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
                // Explicitly clear user and profile if no user is found
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
    const { user, profile, isLoading, recheckUser } = useAppwrite();
    return { user, profile, loading: isLoading, recheckUser };
}
