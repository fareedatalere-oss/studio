'use client';

import client, { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const usePresence = (user: Models.User<Models.Preferences> | null) => {
    useEffect(() => {
        if (!user || typeof window === 'undefined') return;

        const updateUserPresence = async (isOnline: boolean) => {
            try {
                // Defensive check: only update if the attributes exist in the DB
                // Since we can't check schema dynamically easily, we catch the "Unknown attribute" error
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
                    isOnline,
                    lastSeen: new Date().toISOString(),
                });
            } catch (error: any) {
                // If the error is about missing attributes, we ignore it to prevent crashing
                if (error.message?.includes('Unknown attribute')) {
                    console.warn("Presence attributes (isOnline/lastSeen) not found in Appwrite schema.");
                } else {
                    console.error("Presence update failed", error);
                }
            }
        };

        const handleVisibilityChange = () => {
            updateUserPresence(document.visibilityState === 'visible');
        };

        // Set online immediately
        updateUserPresence(true);

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                updateUserPresence(true);
            }
        }, 45000); // Pulse every 45 seconds

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', () => updateUserPresence(false));

        return () => {
            clearInterval(interval);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
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
        if (typeof window === 'undefined') return;

        try {
            // 1. Fetch Application Configs
            try {
                const [mainConfig, proofConfigDoc] = await Promise.all([
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'main').catch(() => null),
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'proof').catch(() => null)
                ]);
                
                if (mainConfig) setConfig(mainConfig);
                
                if (proofConfigDoc) {
                    if (proofConfigDoc.data && typeof proofConfigDoc.data === 'string') {
                        try {
                            setProof(JSON.parse(proofConfigDoc.data));
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
