'use client';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG, COLLECTION_ID_CHATS, COLLECTION_ID_NOTIFICATIONS, Query } from '@/lib/data-service';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, onSnapshot, setDoc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

/**
 * @fileOverview Unified Master Data Hub.
 * FORCE: Pre-loads all members, chats, and alerts in background.
 * INSTANT: Renders app shell immediately to prevent white-screen crashes.
 * SHIELDED: Fixed "cn is not defined" error.
 */

type UserContextType = {
    user: any | null;
    profile: any | null;
    config: any | null;
    proof: any | null;
    loading: boolean;
    // Global Data Center (Pre-loaded)
    allUsers: any[];
    recentChats: any[];
    unreadNotifications: number;
    recheckUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({ 
    user: null, 
    profile: null, 
    config: null, 
    proof: null, 
    loading: true, 
    allUsers: [],
    recentChats: [],
    unreadNotifications: 0,
    recheckUser: async () => {} 
});

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [proof, setProof] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    
    // Global State Sync (Master Repositories)
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    
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
        let unsubUsers: any = null;
        let unsubChats: any = null;
        let unsubNotifs: any = null;

        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const uid = firebaseUser.uid;
                setUser({ $id: uid, uid, email: firebaseUser.email });
                
                // 1. Master Profile Sync
                unsubProfile = onSnapshot(doc(db, COLLECTION_ID_PROFILES, uid), (snap) => {
                    if (snap.exists()) {
                        const prof = { $id: snap.id, ...snap.data() } as any;
                        setProfile(prof);
                        if (prof.isBlocked && !pathname.includes('/auth/signin')) {
                            auth.signOut();
                            router.replace('/auth/signin');
                        }
                    }
                    setIsLoading(false);
                });

                // 2. Global Users Pre-load (Background Data Hub)
                unsubUsers = onSnapshot(collection(db, COLLECTION_ID_PROFILES), (snap) => {
                    setAllUsers(snap.docs.map(d => ({ $id: d.id, ...d.data() })));
                });

                // 3. Global Chats Pre-load (Background Data Hub)
                const chatQuery = query(collection(db, COLLECTION_ID_CHATS), where('participants', 'array-contains', uid));
                unsubChats = onSnapshot(chatQuery, (snap) => {
                    const chats = snap.docs.map(d => ({ $id: d.id, ...d.data() }));
                    setRecentChats(chats.sort((a: any, b: any) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0)));
                });

                // 4. Global Alerts Pre-load (Background Data Hub)
                const notifQuery = query(collection(db, COLLECTION_ID_NOTIFICATIONS), where('userId', '==', uid), where('isRead', '==', false));
                unsubNotifs = onSnapshot(notifQuery, (snap) => {
                    setUnreadNotifications(snap.size);
                });

                // Update Presence
                setDoc(doc(db, COLLECTION_ID_PROFILES, uid), { isOnline: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});

            } else {
                setUser(null);
                setProfile(null);
                setIsLoading(false);
                if (unsubProfile) unsubProfile();
                if (unsubUsers) unsubUsers();
                if (unsubChats) unsubChats();
                if (unsubNotifs) unsubNotifs();
                
                if (!pathname.includes('/auth') && pathname.startsWith('/dashboard')) {
                    router.replace('/auth/signin');
                }
            }
        });

        return () => { 
            unsubAuth(); 
            if(unsubProfile) unsubProfile(); 
            if(unsubUsers) unsubUsers(); 
            if(unsubChats) unsubChats(); 
            if(unsubNotifs) unsubNotifs(); 
        };
    }, [pathname, router, fetchConfig]);

    const recheck = async () => { await fetchConfig(); };

    return (
        <UserContext.Provider value={{ user, profile, config, proof, loading: isLoading, allUsers, recentChats, unreadNotifications, recheckUser: recheck }}>
            <div className={cn(
                "min-h-screen bg-background transition-opacity duration-300", 
                isMounted ? "opacity-100" : "opacity-0"
            )}>
                {children}
            </div>
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
