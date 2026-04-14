
'use client';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/data-service';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Unified Master Auth & Data Hook.
 * FORCE: Zero automatic redirects to profile setup. No hydration crashes.
 * SHIELDED: Background data sync for instant loading.
 */

type UserContextType = {
    user: any | null;
    profile: any | null;
    config: any | null;
    proof: any | null;
    loading: boolean;
    recheckUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({ 
    user: null, 
    profile: null, 
    config: null, 
    proof: null, 
    loading: true, 
    recheckUser: async () => {} 
});

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [proof, setProof] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    
    const router = useRouter();
    const pathname = usePathname();

    const fetchConfig = useCallback(async () => {
        try {
            const [pDoc, cDoc] = await Promise.all([
                databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'proof').catch(() => null),
                databases.getDocument(DATABASE_ID, COLLECTION_ID_APP_CONFIG, 'main').catch(() => null)
            ]);
            if (pDoc && pDoc.data) {
                const parsedProof = typeof pDoc.data === 'string' ? JSON.parse(pDoc.data) : pDoc.data;
                setProof(parsedProof);
            }
            if (cDoc) setConfig(cDoc);
        } catch (e) {}
    }, []);

    useEffect(() => {
        setIsMounted(true);
        fetchConfig();
        
        let unsubProfile: any = null;

        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const miniUser = { 
                    $id: firebaseUser.uid, 
                    uid: firebaseUser.uid, 
                    email: firebaseUser.email, 
                    name: firebaseUser.displayName 
                };
                setUser(miniUser);
                
                // 1. Instant Background Fetch
                try {
                    const pDoc = await getDoc(doc(db, COLLECTION_ID_PROFILES, firebaseUser.uid));
                    if (pDoc.exists()) {
                        setProfile({ $id: pDoc.id, ...pDoc.data() });
                    }
                } catch (e) {}

                // 2. Real-time Reactive Sync
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
                    }
                    // MASTER FORCE: Zero automatic redirection here to prevent loops.
                    setIsLoading(false);
                }, (error) => {
                    console.error("Profile sync error:", error);
                    setIsLoading(false);
                });

                // Background Pulse
                setDoc(doc(db, COLLECTION_ID_PROFILES, firebaseUser.uid), {
                    isOnline: true,
                    lastSeen: serverTimestamp()
                }, { merge: true }).catch(() => {});

            } else {
                setUser(null);
                setProfile(null);
                if (unsubProfile) unsubProfile();
                setIsLoading(false);
                
                // Auth protection for dashboard routes
                if (!pathname.includes('/auth') && pathname.startsWith('/dashboard')) {
                    router.replace('/auth/signin');
                }
            }
        });

        return () => { 
            unsubAuth(); 
            if(unsubProfile) unsubProfile(); 
        };
    }, [pathname, router, fetchConfig]);

    const recheck = async () => {
        // Handled by snapshot sync
    };

    if (!isMounted) return null;

    return (
        <UserContext.Provider value={{ user, profile, config, proof, loading: isLoading, recheckUser: recheck }}>
            <div className={cn("min-h-screen transition-opacity duration-500", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                {children}
            </div>
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
