
'use client';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/data-service';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

/**
 * @fileOverview Unified Master Auth & Data Hook.
 * MASTER UPDATE: Real-time Profile Listener for Admin changes.
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

    useEffect(() => {
        let unsubProfile: any = null;

        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser({ $id: firebaseUser.uid, uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName });
                
                // FORCE: Real-time Profile Sync
                unsubProfile = onSnapshot(doc(db, COLLECTION_ID_PROFILES, firebaseUser.uid), async (snap) => {
                    if (snap.exists()) {
                        const prof = { $id: snap.id, ...snap.data() } as any;
                        setProfile(prof);

                        // BLOCK CHECK
                        if (prof.isBlocked && !pathname.includes('/auth/signin')) {
                            await auth.signOut();
                            toast({ variant: 'destructive', title: 'Access Revoked', description: 'you are blocked by I-pay team contact them for further assistance.' });
                            router.replace('/auth/signin');
                        }
                    } else {
                        setProfile(null);
                        if (!pathname.includes('/auth') && !pathname.includes('/signup/profile')) {
                            router.replace('/auth/signup/profile');
                        }
                    }
                });

                if (typeof window !== 'undefined') {
                    await updateDoc(doc(db, COLLECTION_ID_PROFILES, firebaseUser.uid), {
                        isOnline: true,
                        lastSeen: serverTimestamp()
                    }).catch(() => {});
                }
            } else {
                setUser(null);
                setProfile(null);
                if (unsubProfile) unsubProfile();
                if (typeof window !== 'undefined' && !pathname.includes('/auth') && pathname.startsWith('/dashboard')) {
                    router.replace('/auth/signin');
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
        return () => { unsubAuth(); if(unsubProfile) unsubProfile(); };
    }, [pathname, router]);

    const recheck = async () => {
        // Logic handled by onSnapshot
    };

    return (
        <UserContext.Provider value={{ user, profile, config, proof, loading: isLoading, recheckUser: recheck }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
