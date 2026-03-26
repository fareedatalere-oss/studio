
'use client';

import client, { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

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
