'use client';

import { auth, db } from '@/lib/firebase';
import { COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

    const fetchStaticConfigs = useCallback(async () => {
        try {
            const cachedMain = sessionStorage.getItem('ipay_config_main');
            const cachedProof = sessionStorage.getItem('ipay_config_proof');

            if (cachedMain && cachedProof) {
                setConfig(JSON.parse(cachedMain));
                setProof(JSON.parse(cachedProof));
            } else {
                const [mainSnap, proofSnap] = await Promise.all([
                    getDoc(doc(db, COLLECTION_ID_APP_CONFIG, 'main')),
                    getDoc(doc(db, COLLECTION_ID_APP_CONFIG, 'proof'))
                ]);

                if (mainSnap.exists()) {
                    const data = mainSnap.data();
                    setConfig(data);
                    sessionStorage.setItem('ipay_config_main', JSON.stringify(data));
                }
                if (proofSnap.exists()) {
                    const docData = proofSnap.data();
                    const parsedData = typeof docData.data === 'string' ? JSON.parse(docData.data) : docData.data;
                    setProof(parsedData);
                    sessionStorage.setItem('ipay_config_proof', JSON.stringify(parsedData));
                }
            }
        } catch (e) {
            console.error("Config load error:", e);
        }
    }, []);

    const checkUser = useCallback(async () => {
        if (typeof window === 'undefined') return;

        return onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            
            if (currentUser) {
                try {
                    const profileSnap = await getDoc(doc(db, COLLECTION_ID_PROFILES, currentUser.uid));
                    if (profileSnap.exists()) {
                        setProfile({ ...profileSnap.data(), $id: profileSnap.id });
                    }

                    // SESSION LOCK LOGIC
                    const now = Date.now();
                    const lastActiveStr = localStorage.getItem('ipay_last_active');
                    const pinVerified = sessionStorage.getItem('ipay_pin_verified') === 'true';

                    if (lastActiveStr) {
                        const lastActive = parseInt(lastActiveStr);
                        if (now - lastActive > 3600000) { // 1 Hour inactivity
                            await signOut(auth);
                            localStorage.removeItem('ipay_last_active');
                            sessionStorage.removeItem('ipay_pin_verified');
                            setUser(null);
                            setProfile(null);
                            if (!pathname.includes('/auth')) router.replace('/auth/signin');
                            return;
                        }

                        // Redirect to profile setup if account exists but NO profile doc is found
                        if (!profileSnap.exists() && !pathname.includes('/auth')) {
                            router.replace('/auth/signup/profile');
                            return;
                        }

                        if (!pinVerified && pathname.startsWith('/dashboard') && !pathname.includes('/auth') && !pathname.includes('/receipt')) {
                            router.replace('/auth/pin-lock');
                            return;
                        }
                    }
                    localStorage.setItem('ipay_last_active', now.toString());
                } catch (e) {
                    console.error("Profile fetch error:", e);
                }
            } else {
                if (pathname.startsWith('/dashboard') && !pathname.includes('/auth')) {
                    router.replace('/auth/signin');
                }
            }
            setIsLoading(false);
        });
    }, [router, pathname]);

    useEffect(() => {
        fetchStaticConfigs();
        const unsub = checkUser();
        return () => { if (typeof unsub === 'function') unsub(); };
    }, [checkUser, fetchStaticConfigs]);
    
    const value = {
        user,
        profile,
        config,
        proof,
        loading: isLoading,
        recheckUser: async () => { 
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            const profileSnap = await getDoc(doc(db, COLLECTION_ID_PROFILES, currentUser.uid));
            if (profileSnap.exists()) {
                setProfile({ ...profileSnap.data(), $id: profileSnap.id });
            }
        }
    };

    return (
        <AppwriteContext.Provider value={value}>
            {children}
        </AppwriteContext.Provider>
    );
};

export const useUser = () => useContext(AppwriteContext);