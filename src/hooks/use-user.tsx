'use client';

import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_APP_CONFIG, COLLECTION_ID_CHATS, COLLECTION_ID_MESSAGES, COLLECTION_ID_NOTIFICATIONS } from '@/lib/data-service';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, onSnapshot, collection, updateDoc } from 'firebase/firestore';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { cn } from "@/lib/utils";

/**
 * @fileOverview Global Memory Shield & Presence Engine v4.1.
 * STABILITY: Context value is memoized to prevent infinite re-render loops.
 * PUSH FORCE: Native device notifications for background communications.
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
    unreadMessages: number;
    globalMessages: Record<string, any[]>;
    recheckUser: () => Promise<void>;
    isUserActuallyOnline: (user: any) => boolean;
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
    unreadMessages: 0,
    globalMessages: {},
    recheckUser: async () => {},
    isUserActuallyOnline: () => false
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
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [globalMessages, setGlobalMessages] = useState<Record<string, any[]>>({});

    const lastNotifiedRef = useRef<Set<string>>(new Set());
    const sessionStartTimeRef = useRef(Date.now());

    const showNativeNotification = useCallback((title: string, body: string, link?: string) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            const n = new Notification(title, {
                body,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'ipay-alert',
                renotify: true
            });
            n.onclick = () => {
                window.focus();
                if (link) window.location.href = link;
                n.close();
            };
        }
    }, []);

    const isUserActuallyOnline = useCallback((u: any) => {
        if (!u?.isOnline) return false;
        if (!u?.lastSeen) return false;
        const lastSeenDate = u.lastSeen?.toDate ? u.lastSeen.toDate() : new Date(u.lastSeen);
        const now = new Date();
        return (now.getTime() - lastSeenDate.getTime()) < 180000; 
    }, []);

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
        try {
            await updateDoc(doc(db, COLLECTION_ID_PROFILES, auth.currentUser.uid), {
                isOnline: isOnline,
                lastSeen: serverTimestamp()
            });
        } catch (e) {}
    }, []);

    useEffect(() => {
        setIsMounted(true);
        fetchConfig();
        
        let unsubs: any[] = [];
        let heartbeatInterval: NodeJS.Timeout | null = null;

        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const uid = firebaseUser.uid;
                setUser({ $id: uid, uid, email: firebaseUser.email });
                
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }

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
                    
                    let totalUnread = 0;
                    chats.forEach((c: any) => {
                        totalUnread += (c.unreadCount?.[uid] || 0);
                    });
                    setUnreadMessages(totalUnread);
                }));

                unsubs.push(onSnapshot(collection(db, COLLECTION_ID_NOTIFICATIONS), (snap) => {
                    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    const myAlerts = docs.filter((d: any) => d.userId === uid && !d.isRead);
                    setUnreadNotifications(myAlerts.length);

                    myAlerts.forEach((alert: any) => {
                        const alertTime = alert.createdAt?.seconds ? alert.createdAt.seconds * 1000 : Date.now();
                        if (!lastNotifiedRef.current.has(alert.id) && alertTime > sessionStartTimeRef.current) {
                            lastNotifiedRef.current.add(alert.id);
                            showNativeNotification("I-Pay Alert", alert.description, alert.link);
                        }
                    });
                }));

                unsubs.push(onSnapshot(collection(db, COLLECTION_ID_MESSAGES), (snap) => {
                    const messagesByChat: Record<string, any[]> = {};
                    snap.docs.forEach(d => {
                        const m = { $id: d.id, ...d.data() };
                        if (!messagesByChat[m.chatId]) messagesByChat[m.chatId] = [];
                        messagesByChat[m.chatId].push(m);
                        
                        const msgTime = m.timestamp || (m.createdAt?.seconds ? m.createdAt.seconds * 1000 : Date.now());
                        if (m.senderId !== uid && m.status !== 'read' && !lastNotifiedRef.current.has(m.$id) && msgTime > sessionStartTimeRef.current) {
                            lastNotifiedRef.current.add(m.$id);
                            showNativeNotification("I-Pay", m.text || "Shared a file", `/dashboard/chat/${m.senderId}`);
                        }
                    });
                    setGlobalMessages(messagesByChat);
                }));

                updatePresence(true);
                heartbeatInterval = setInterval(() => updatePresence(true), 60000); 
                
                const handleVisibilityChange = () => {
                    if (document.visibilityState === 'visible') updatePresence(true);
                    else updatePresence(false);
                };
                document.addEventListener('visibilitychange', handleVisibilityChange);

                return () => {
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                }
            } else {
                setUser(null); setProfile(null); setIsLoading(false);
                if (heartbeatInterval) clearInterval(heartbeatInterval);
            }
        });

        return () => { 
            unsubAuth(); 
            unsubs.forEach(u => u());
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [fetchConfig, updatePresence, showNativeNotification]);

    const contextValue = useMemo(() => ({
        user, 
        profile, 
        config, 
        proof, 
        loading: isLoading, 
        allUsers, 
        recentChats, 
        unreadNotifications, 
        unreadMessages, 
        globalMessages, 
        recheckUser: async () => { await fetchConfig(); },
        isUserActuallyOnline
    }), [user, profile, config, proof, isLoading, allUsers, recentChats, unreadNotifications, unreadMessages, globalMessages, fetchConfig, isUserActuallyOnline]);

    return (
        <UserContext.Provider value={contextValue}>
            <div className={cn("min-h-screen transition-opacity duration-300", isMounted ? "opacity-100" : "opacity-0")}>
                {children}
            </div>
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);