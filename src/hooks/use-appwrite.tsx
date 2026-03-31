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
            const [mainConfig, proofConfigDoc] = await Promise.all([
                databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'main').catch(() => null),
                databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'proof').catch(() => null)
            ]);
            
            if (mainConfig) setConfig(mainConfig);
            if (proofConfigDoc) {
                try {
                    setProof(JSON.parse(proofConfigDoc.data));
                } catch (e) {
                    setProof(proofConfigDoc);
                }
            }
            
            // 2. Check Auth State
            const currentUser = await account.get().catch(() => null);
            setUser(currentUser);

            if (currentUser) {
                const profileDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id).catch(() => null);
                setProfile(profileDoc);

                // FORCE PERSISTENCE & PIN LOGIC
                const now = Date.now();
                const lastActiveStr = localStorage.getItem('ipay_last_active');
                const pinVerified = sessionStorage.getItem('ipay_pin_verified') === 'true';

                if (lastActiveStr) {
                    const lastActive = parseInt(lastActiveStr);
                    const diff = now - lastActive;

                    // 1 Hour Rule: Force Logout
                    if (diff > 3600000) {
                        await account.deleteSession('current').catch(() => {});
                        localStorage.removeItem('ipay_last_active');
                        sessionStorage.removeItem('ipay_pin_verified');
                        setUser(null);
                        setProfile(null);
                        if (!pathname.includes('/auth')) router.replace('/auth/signin');
                        return;
                    }

                    // Challenge PIN if user is returning within the hour but hasn't verified this session
                    if (!pinVerified && pathname.startsWith('/dashboard') && !pathname.includes('/auth') && !pathname.includes('/receipt')) {
                        router.replace('/auth/pin-lock');
                        return;
                    }
                }
                
                // Update Activity timestamp to keep session alive
                localStorage.setItem('ipay_last_active', now.toString());
            } else {
                // If not logged in and trying to access dashboard, redirect to signin
                if (pathname.startsWith('/dashboard') && !pathname.includes('/auth')) {
                    router.replace('/auth/signin');
                }
            }
        } catch (error) {
            console.error("Global Auth Error:", error);
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

export const useUser = () => useContext(AppwriteContext);