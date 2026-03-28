'use client';

import client, { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type AppwriteContextType = {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    config: any | null;
    proof: any | null;
    loading: boolean;
    recheckUser: () => Promise<void>;
};

const AppwriteContext = createContext<AppwriteContextType>({ user: null, profile: null, config: null, proof: null, loading: true, recheckUser: async () => {} });

export function AppwriteProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [proof, setProof] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const router = useRouter();
    const pathname = usePathname();

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

                        // Master Session Check (1 Hour Rule)
                        const lastActive = localStorage.getItem('ipay_last_active');
                        const now = Date.now();
                        if (lastActive) {
                            const diff = now - parseInt(lastActive);
                            if (diff > 3600000) { // 1 Hour
                                await account.deleteSession('current');
                                localStorage.removeItem('ipay_last_active');
                                setUser(null);
                                setProfile(null);
                                router.push('/auth/signin');
                                return;
                            }
                        }
                        
                        // Update Activity
                        localStorage.setItem('ipay_last_active', now.toString());

                        // PIN Lock Check
                        const pinVerified = sessionStorage.getItem('ipay_pin_verified');
                        if (!pinVerified && pathname.startsWith('/dashboard') && !pathname.includes('/auth')) {
                            router.replace('/auth/pin-lock');
                        }

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
    }, [router, pathname]);

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
    return useContext(AppwriteContext);
};
