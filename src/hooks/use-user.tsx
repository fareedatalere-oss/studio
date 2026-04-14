'use client';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/data-service';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, onSnapshot, setDoc } from 'firebase/firestore';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

/**
 * @fileOverview Unified Master Auth & Data Hook.
 * SHIELDED: Corrected ReferenceError: cn is not defined.
 * INSTANT: Loads app shell immediately while syncing data in background.
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

    const isImmersive = pathname?.includes('/room/') || pathname?.includes('/call/') || pathname?.includes('/join/');

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
                
                unsubProfile = onSnapshot(doc(db, COLLECTION_ID_PROFILES, firebaseUser.uid), async (snap) => {
                    if (snap.exists()) {
                        const prof = { $id: snap.id, ...snap.data() } as any;
                        setProfile(prof);

                        if (prof.isBlocked && !pathname.includes('/auth/signin') && !isImmersive) {
                            await auth.signOut();
                            toast({ variant: 'destructive', title: 'Access Revoked' });
                            router.replace('/auth/signin');
                        }
                    }
                    setIsLoading(false);
                });

                setDoc(doc(db, COLLECTION_ID_PROFILES, firebaseUser.uid), {
                    isOnline: true,
                    lastSeen: serverTimestamp()
                }, { merge: true }).catch(() => {});

            } else {
                setUser(null);
                setProfile(null);
                if (unsubProfile) unsubProfile();
                setIsLoading(false);
                
                if (!pathname.includes('/auth') && pathname.startsWith('/dashboard') && !isImmersive) {
                    router.replace('/auth/signin');
                }
            }
        });

        return () => { 
            unsubAuth(); 
            if(unsubProfile) unsubProfile(); 
        };
    }, [pathname, router, fetchConfig, isImmersive]);

    const recheck = async () => { await fetchConfig(); };

    return (
        <UserContext.Provider value={{ user, profile, config, proof, loading: isLoading, recheckUser: recheck }}>
            <div className={cn(
                "min-h-screen bg-background transition-opacity duration-300", 
                isMounted ? "opacity-100" : "opacity-0"
            )}>
                {children}
            </div>
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
