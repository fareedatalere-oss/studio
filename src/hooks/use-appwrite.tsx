'use client';

import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const usePresence = (user: Models.User<Models.Preferences> | null) => {
    useEffect(() => {
        if (!user || typeof document === 'undefined') return;

        const updateUserPresence = async (isOnline: boolean) => {
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
                    isOnline,
                    lastSeen: new Date().toISOString(),
                });
            } catch (error) {}
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateUserPresence(true);
            } else {
                updateUserPresence(false);
            }
        };

        updateUserPresence(true);

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                updateUserPresence(true);
            }
        }, 60 * 1000);

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', () => updateUserPresence(false));

        return () => {
            clearInterval(interval);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', () => updateUserPresence(false));
            updateUserPresence(false);
        };
    }, [user]);
};

type AppwriteContextType = {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    config: any | null;
    proof: any | null;
    loading: boolean;
    recheckUser: () => Promise<void>;
};

const AppwriteContext = createContext<AppwriteContextType>({ user: null, profile: null, config: null, proof: null, loading: true, recheckUser: async () => {} });

export const useAppwrite = () => {
    return useContext(AppwriteContext);
};

export function AppwriteProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [proof, setProof] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    usePresence(user);

    const checkUser = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Application Configs (Global)
            try {
                const [mainConfig, proofConfigDoc] = await Promise.all([
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'main').catch(() => null),
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'proof').catch(() => null)
                ]);
                
                if (mainConfig) setConfig(mainConfig);
                
                if (proofConfigDoc) {
                    if (proofConfigDoc.data && typeof proofConfigDoc.data === 'string') {
                        try {
                            const parsed = JSON.parse(proofConfigDoc.data);
                            setProof(parsed);
                        } catch (e) {
                            setProof(proofConfigDoc);
                        }
                    } else {
                        setProof(proofConfigDoc);
                    }
                }
            } catch (configError) {}
            
            // 2. Check Auth State
            try {
                const currentUser = await account.get();
                setUser(currentUser);
                if (currentUser) {
                    try {
                        const profileDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id);
                        setProfile(profileDoc);
                    } catch (pError: any) {
                        setProfile(null);
                    }
                } else {
                    setUser(null);
                    setProfile(null);
                }
            } catch (authError) {
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
        proof,
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
    const { user, profile, config, proof, loading, recheckUser } = useAppwrite();
    return { user, profile, config, proof, loading, recheckUser };
};
