'use client';

import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/appwrite';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
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

    const fetchProfile = useCallback(async (uid: string) => {
        try {
            const prof = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, uid).catch(() => null);
            setProfile(prof);
            return prof;
        } catch (e) {
            return null;
        }
    }, []);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser({ $id: firebaseUser.uid, uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName });
                const prof = await fetchProfile(firebaseUser.uid);
                
                // Redirection Logic
                if (!prof && !pathname.includes('/auth') && !pathname.includes('/signup/profile')) {
                    router.replace('/auth/signup/profile');
                } else if (prof && pathname === '/auth/signin') {
                    router.replace('/dashboard');
                }
            } else {
                setUser(null);
                setProfile(null);
                if (pathname.startsWith('/dashboard') && !pathname.includes('/auth')) {
                    router.replace('/auth/signin');
                }
            }
            setIsLoading(false);
        });

        // Config & Proof Fetch
        const fetchConfig = async () => {
            try {
                const [pDoc, cDoc] = await Promise.all([
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'proof').catch(() => null),
                    databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'main').catch(() => null)
                ]);
                if (pDoc && pDoc.data) {
                    setProof(typeof pDoc.data === 'string' ? JSON.parse(pDoc.data) : pDoc.data);
                }
                if (cDoc) setConfig(cDoc);
            } catch (e) {}
        };
        fetchConfig();

        return () => unsubAuth();
    }, [pathname, router, fetchProfile]);

    const recheck = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setUser({ $id: currentUser.uid, uid: currentUser.uid, email: currentUser.email });
            await fetchProfile(currentUser.uid);
        }
    };

    return (
        <AppwriteContext.Provider value={{ user, profile, config, proof, loading: isLoading, recheckUser: recheck }}>
            {children}
        </AppwriteContext.Provider>
    );
};

export const useUser = () => useContext(AppwriteContext);
