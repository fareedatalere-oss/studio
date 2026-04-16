'use client';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG, COLLECTION_ID_CHATS, COLLECTION_ID_MESSAGES, COLLECTION_ID_NOTIFICATIONS } from '@/lib/data-service';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, onSnapshot, collection, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { cn } from "@/lib/utils";

/**
 * @fileOverview Global Memory Shield.
 * SYNC: Pre-loads all critical data in background to prevent racing.
 * SHADOW: Acts as the master cache for "Recent" and "All" users.
 */

type UserContextType = {
    user: any | null;
    profile: any | null;
    config: any | null;
    proof: any | null;
    loading: boolean;
    allUsers: any[];
    recentChats: any[];
    unreadNotifications: number;
    globalMessages: Record<string, any[]>;
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
    globalMessages: {},
    recheckUser: async () => {} 
});

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [proof, setProof] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [globalMessages, setGlobalMessages] = useState<Record<string, any[]>>({});

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

    const updatePresence = useCallback(async (isOnline: boolean) => {
        if (!auth.currentUser) return;
        const hasNetwork = typeof window !== 'undefined' ? window.navigator.onLine : true;
        const finalStatus = isOnline && hasNetwork;

        try {
            await updateDoc(doc(db, COLLECTION_ID_PROFILES, auth.currentUser.uid), {
                isOnline: finalStatus,
                lastSeen: serverTimestamp()
            });
        } catch (e) {}
    }, []);

    useEffect(() => {
        setIsMounted(true);
        fetchConfig();
        
        let unsubs: any[] = [];

        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const uid = firebaseUser.uid;
                setUser({ $id: uid, uid, email: firebaseUser.email });
                
                unsubs.push(onSnapshot(doc(db, COLLECTION_ID_PROFILES, uid), (snap) => {
                    if (snap.exists()) setProfile({ $id: snap.id, ...snap.data() });
                    setIsLoading(false);
                }));

                unsubs.push(onSnapshot(collection(db, COLLECTION_ID_PROFILES), (snap) => {
                    setAllUsers(snap.docs.map(d => ({ $id: d.id, ...d.data() })));
                }));

                unsubs.push(onSnapshot(collection(db, COLLECTION_ID_CHATS), (snap) => {
                    const chats = snap.docs.map(d => ({ $id: d.id, ...d.data() }));
                    setRecentChats(chats.sort((a: any, b: any) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0)));
                }));

                unsubs.push(onSnapshot(collection(db, COLLECTION_ID_NOTIFICATIONS), (snap) => {
                    const myAlerts = snap.docs.filter(d => d.data().userId === uid && !d.data().isRead);
                    setUnreadNotifications(myAlerts.length);
                }));

                unsubs.push(onSnapshot(collection(db, COLLECTION_ID_MESSAGES), (snap) => {
                    const messagesByChat: Record<string, any[]> = {};
                    snap.docs.forEach(d => {
                        const m = { $id: d.id, ...d.data() };
                        if (!messagesByChat[m.chatId]) messagesByChat[m.chatId] = [];
                        messagesByChat[m.chatId].push(m);
                    });
                    setGlobalMessages(messagesByChat);
                }));

                updatePresence(true);
            } else {
                setUser(null); setProfile(null); setIsLoading(false);
            }
        });

        return () => { 
            unsubAuth(); 
            unsubs.forEach(u => u());
        };
    }, [fetchConfig, updatePresence]);

    return (
        <UserContext.Provider value={{ user, profile, config, proof, loading: isLoading, allUsers, recentChats, unreadNotifications, globalMessages, recheckUser: async () => { await fetchConfig(); } }}>
            <div className={cn("min-h-screen transition-opacity duration-300", isMounted ? "opacity-100" : "opacity-0")}>
                {children}
            </div>
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
