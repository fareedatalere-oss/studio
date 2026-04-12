
'use client';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG } from '@/lib/data-service';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

/**
 * @fileOverview Unified Master Auth & Data Hook.
 * UPDATED: Handle Blocked/Suspended user states.
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
            
            if (prof) {
                // FORCE REDIRECT IF BLOCKED
                if (prof.isBlocked && !pathname.includes('/auth/signin')) {
                    await auth.signOut();
                    toast({ 
                        variant: 'destructive', 
                        title: 'Access Revoked', 
                        description: 'you are blocked by I-pay team contact them for further assistance.' 
                    });
                    router.replace('/auth/signin');
                    return null;
                }

                if (typeof window !== 'undefined') {
                    await updateDoc(doc(db, COLLECTION_ID_PROFILES, uid), {
                        isOnline: true,
                        lastSeen: serverTimestamp()
                    }).catch(() => {});
                }
            }
            return prof;
        } catch (e) { return null; }
    }, [pathname, router]);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser({ $id: firebaseUser.uid, uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName });
                const prof = await fetchProfile(firebaseUser.uid);
                
                if (typeof window !== 'undefined' && prof) {
                    const isAuthPath = pathname.includes('/auth');
                    const isSignupProfile = pathname.includes('/signup/profile');
                    const isMeetingPath = pathname.includes('/meeting/room/') || pathname.includes('/meeting/join/');

                    if (!prof && !isAuthPath && !isSignupProfile && !isMeetingPath) {
                        router.replace('/auth/signup/profile');
                    } else if (prof && isAuthPath && !pathname.includes('/manager')) {
                        router.replace('/dashboard');
                    }
                }
            } else {
                setUser(null);
                setProfile(null);
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
        <UserContext.Provider value={{ user, profile, config, proof, loading: isLoading, recheckUser: recheck }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
