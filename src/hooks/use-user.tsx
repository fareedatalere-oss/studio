
'use client';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/data-service';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * @fileOverview Unified Master Auth & Data Hook.
 * Hardened to prevent premature redirects and ensure profile visibility.
 */

type UserContextType = {
    user: any | null;
    profile: any | null;
    config: any | null;
    proof: any | null;
    loading: boolean;
    recheckUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({ user: null, profile: null, config: null, proof: null, loading: true, recheckUser: async () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
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
            if (prof && typeof window !== 'undefined') {
                await updateDoc(doc(db, COLLECTION_ID_PROFILES, uid), {
                    isOnline: true,
                    lastSeen: serverTimestamp()
                }).catch(() => {});
            }
            return prof;
        } catch (e) { return null; }
    }, []);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser({ $id: firebaseUser.uid, uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName });
                const prof = await fetchProfile(firebaseUser.uid);
                
                if (typeof window !== 'undefined') {
                    const isAuthPath = pathname.includes('/auth');
                    const isSignupProfile = pathname.includes('/signup/profile');
                    const isMeetingPath = pathname.includes('/meeting/room/') || pathname.includes('/meeting/join/');

                    // ONLY REDIRECT IF LOAD IS FINISHED
                    if (!prof && !isAuthPath && !isSignupProfile && !isMeetingPath) {
                        router.replace('/auth/signup/profile');
                    } else if (prof && isAuthPath) {
                        router.replace('/dashboard');
                    }
                }
            } else {
                setUser(null);
                setProfile(null);
                if (typeof window !== 'undefined') {
                    const isMeetingJoin = pathname.includes('/meeting/join/') || pathname.includes('/meeting/room/');
                    const isAuthPath = pathname.includes('/auth');
                    if (pathname.startsWith('/dashboard') && !isAuthPath && !isMeetingJoin) {
                        router.replace('/auth/signin');
                    }
                }
            }
            setIsLoading(false);
        });

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

    useEffect(() => {
        if (!user?.$id || typeof window === 'undefined') return;
        const interval = setInterval(() => {
            updateDoc(doc(db, COLLECTION_ID_PROFILES, user.$id), { lastSeen: serverTimestamp(), isOnline: true }).catch(() => {});
        }, 30000);
        const setOffline = () => { if(user?.$id) updateDoc(doc(db, COLLECTION_ID_PROFILES, user.$id), { isOnline: false }).catch(() => {}); };
        window.addEventListener('beforeunload', setOffline);
        return () => { clearInterval(interval); window.removeEventListener('beforeunload', setOffline); };
    }, [user]);

    const recheck = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setUser({ $id: currentUser.uid, uid: currentUser.uid, email: currentUser.email });
            await fetchProfile(currentUser.uid);
        }
    };

    return (
        <UserContext.Provider value={{ user, profile, config, proof, loading: isLoading, recheckUser: recheck }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
