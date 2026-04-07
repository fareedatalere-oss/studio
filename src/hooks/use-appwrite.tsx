
'use client';

import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type AppwriteContextType = {
    user: any | null;
    profile: any | null;
    config: any | null;
    proof: any | null;
    loading: boolean;
    recheckUser: () => Promise<void>;
};

const AppwriteContext = createContext<AppwriteContextType>({ user: null, profile: null, config: null, proof: null, loading: true, recheckUser: async () => {} });

export function AppwriteProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [proof, setProof] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const router = useRouter();
    const pathname = usePathname();

    const checkUser = useCallback(async () => {
        if (typeof window === 'undefined') return;

        try {
            const [currentUser, pDoc, cDoc] = await Promise.all([
                account.get().catch(() => null),
                databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'proof').catch(() => null),
                databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'main').catch(() => null)
            ]);

            if (pDoc && pDoc.data) {
                const parsedProof = typeof pDoc.data === 'string' ? JSON.parse(pDoc.data) : pDoc.data;
                setProof(parsedProof);
            }
            if (cDoc) setConfig(cDoc);

            if (currentUser) {
                setUser(currentUser);
                const prof = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id).catch(() => null);
                
                if (prof) {
                    setProfile(prof);
                }

                // SESSION LOCK LOGIC
                const now = Date.now();
                const lastActiveStr = localStorage.getItem('ipay_last_active');
                const pinVerified = sessionStorage.getItem('ipay_pin_verified') === 'true';

                if (lastActiveStr) {
                    const lastActive = parseInt(lastActiveStr);
                    if (now - lastActive > 3600000) { // 1 Hour inactivity
                        await account.deleteSession('current').catch(() => {});
                        localStorage.removeItem('ipay_last_active');
                        sessionStorage.removeItem('ipay_pin_verified');
                        setUser(null);
                        setProfile(null);
                        if (!pathname.includes('/auth')) router.replace('/auth/signin');
                        return;
                    }

                    // Redirect to profile setup if account exists but NO profile doc is found
                    if (!prof && !pathname.includes('/auth')) {
                        router.replace('/auth/signup/profile');
                        return;
                    }

                    if (!pinVerified && pathname.startsWith('/dashboard') && !pathname.includes('/auth') && !pathname.includes('/receipt')) {
                        router.replace('/auth/pin-lock');
                        return;
                    }
                }
                localStorage.setItem('ipay_last_active', now.toString());
            } else {
                setUser(null);
                setProfile(null);
                if (pathname.startsWith('/dashboard') && !pathname.includes('/auth')) {
                    router.replace('/auth/signin');
                }
            }
        } catch (e) {
            console.error("Appwrite check error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [router, pathname]);

    useEffect(() => {
        checkUser();
    }, [checkUser]);
    
    const recheck = async () => {
        const currentUser = await account.get().catch(() => null);
        if (currentUser) {
            setUser(currentUser);
            const prof = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, currentUser.$id).catch(() => null);
            setProfile(prof);
        }
    };

    return (
        <AppwriteContext.Provider value={{ user, profile, config, proof, loading: isLoading, recheckUser: recheck }}>
            {children}
        </AppwriteContext.Provider>
    );
};

export const useUser = () => useContext(AppwriteContext);
