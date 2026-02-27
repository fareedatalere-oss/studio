'use client';

import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const usePresence = (user: Models.User<Models.Preferences> | null) => {
    useEffect(() => {
        if (!user) return;

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
            // Fetch Configs
            try {
                const [mainConfig, proofConfigDoc] = await Promise.all([
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'main'),
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'proof').catch(() => null)
                ]);
                setConfig(mainConfig);
                
                if (proofConfigDoc) {
                    // Check if it's the new stringified format or old attribute format
                    if (proofConfigDoc.data && typeof proofConfigDoc.data === 'string') {
                        try {
                            const parsed = JSON.parse(proofConfigDoc.data);
                            setProof(parsed);
                        } catch (e) {
                            console.error("Failed to parse proof JSON", e);
                            setProof(proofConfigDoc);
                        }
                    } else {
                        setProof(proofConfigDoc);
                    }
                }
            } catch (configError) {
                console.log("Could not fetch app configs.");
            }
            
            try {
                const currentUser = await account.get();
                setUser(currentUser);
                if (currentUser) {
                    const profileDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id);
                    setProfile(profileDoc);
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