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
 * SHIELDED: Extreme Hydration Guarding to prevent "Client-side exception".
 * FORCED: Background sync for instant page loads without redirect loops.
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
    const [isMounted, setIsMounted] = useState(false);
    
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        setIsMounted(true);
        let unsubProfile: any = null;

        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser({ $id: firebaseUser.uid, uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName });
                
                // FORCE: Real-time Profile Sync with Extreme Null-Safety
                unsubProfile = onSnapshot(doc(db, COLLECTION_ID_PROFILES, firebaseUser.uid), async (snap) => {
                    if (snap.exists()) {
                        const prof = { $id: snap.id, ...snap.data() } as any;
                        setProfile(prof);

                        // BLOCK CHECK
                        if (prof.isBlocked && !pathname.includes('/auth/signin')) {
                            await auth.signOut();
                            toast({ variant: 'destructive', title: 'Access Revoked', description: 'Account restricted by I-Pay Security.' });
                            router.replace('/auth/signin');
                        }
                    } else {
                        setProfile(null);
                        // Only redirect if we are SURE we aren't in the auth flow already
                        if (!pathname.includes('/auth') && !pathname.startsWith('/dashboard/meeting/join')) {
                            router.replace('/auth/signup/profile');
                        }
                    }
                    setIsLoading(false);
                }, (err) => {
                    console.error("Profile listen error:", err);
                    setIsLoading(false);
                });

                // Update Online Status
                updateDoc(doc(db, COLLECTION_ID_PROFILES, firebaseUser.uid), {
                    isOnline: true,
                    lastSeen: serverTimestamp()
                }).catch(() => {});
            } else {
                setUser(null);
                setProfile(null);
                if (unsubProfile) unsubProfile();
                setIsLoading(false);
                
                // Protected route handling
                if (!pathname.includes('/auth') && pathname.startsWith('/dashboard')) {
                    router.replace('/auth/signin');
                }
            }
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

        return () => { 
            unsubAuth(); 
            if(unsubProfile) unsubProfile(); 
        };
    }, [pathname, router]);

    const recheck = async () => {
        // Real-time snapshot handles updates automatically
    };

    if (!isMounted) return null;

    return (
        <UserContext.Provider value={{ user, profile, config, proof, loading: isLoading, recheckUser: recheck }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
