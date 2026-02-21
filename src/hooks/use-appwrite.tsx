'use client';

import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppwriteContextType = {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    isLoading: boolean;
};

const AppwriteContext = createContext<AppwriteContextType>({ user: null, profile: null, isLoading: true });

export const useAppwrite = () => {
    return useContext(AppwriteContext);
};

export function AppwriteProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
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
                }
            } catch (error) {
                setUser(null);
                setProfile(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkUser();
    }, []);

    return (
        <AppwriteContext.Provider value={{ user, profile, isLoading }}>
            {children}
        </AppwriteContext.Provider>
    );
};

export const useUser = () => {
    const { user, profile, isLoading } = useAppwrite();
    return { user, profile, loading: isLoading };
}
