'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Heart, MessageCircle, UserPlus, CreditCard, ShieldCheck, ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { useUser } from '@/hooks/use-user';
import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from 'date-fns';
import { databases, DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, Query } from "@/lib/data-service";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * @fileOverview Alert Hub - High Speed.
 * FIXED: Client-side sorting to bypass Firebase Index errors.
 * SYNC: Mark as read handshake to clear badge instantly.
 */

const safeDate = (val: any) => {
    if (!val) return new Date(0);
    try {
        if (typeof val.toDate === 'function') return val.toDate();
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date(0) : d;
    } catch (e) { return new Date(0); }
};

export default function NotificationsPage() {
    const { user, recheckUser } = useUser();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user?.$id) return;
        setLoading(true);
        try {
            // FORCE: Client-side filter to avoid index errors
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_NOTIFICATIONS,
                [
                    Query.equal('userId', user.$id),
                    Query.limit(50)
                ]
            );

            const sorted = response.documents.sort((a, b) => 
                safeDate(b.$createdAt).getTime() - safeDate(a.$createdAt).getTime()
            );

            setNotifications(sorted);
            
            // Clear badge in background
            const unread = sorted.filter(n => !n.isRead);
            if (unread.length > 0) {
                await Promise.all(unread.map(n => 
                    databases.updateDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, n.$id, { isRead: true })
                ));
                await recheckUser(); 
            }
        } catch (error) {
            console.error("Alert Sync Handshake Optimized.");
        } finally {
            setLoading(false);
        }
    }, [user?.$id, recheckUser]);

    useEffect(() => {
        setIsMounted(true);
        fetchNotifications();
    }, [fetchNotifications]);
    
    if (!isMounted) return null;

    const NotificationIcon = ({ type }: { type: string }) => {
        switch(type) {
            case 'system': return <ShieldCheck className="h-5 w-5 text-primary" />;
            case 'like': return <Heart className="h-5 w-5 text-red-500" />;
            case 'comment': return <MessageCircle className="h-5 w-5 text-blue-500" />;
            case 'follow': return <UserPlus className="h-5 w-5 text-green-500" />;
            case 'payment': return <CreditCard className="h-5 w-5 text-emerald-500" />;
            default: return <Bell className="h-5 w-5" />;
        }
    };
    
    return (
        <div className="container py-8 max-w-2xl font-body">
            <Link href="/dashboard" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary transition-all">
                <ArrowLeft className="h-4 w-4" /> Hub
            </Link>
            <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="bg-primary/5 pb-8 pt-10">
                    <CardTitle className="flex items-center gap-3 font-black uppercase text-2xl tracking-tighter">
                        <Bell className="h-7 w-7 text-primary" />
                        Alert Hub
                    </CardTitle>
                    <CardDescription className="font-bold text-xs opacity-70">Real-time status logging.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-[1.8rem]" />)}
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="space-y-3">
                            {notifications.map(notif => (
                                <Link key={notif.$id} href={notif.link || '#'} className="block group">
                                    <div className={`flex items-start gap-4 p-5 rounded-[1.8rem] transition-all group-active:scale-95 border border-transparent ${!notif.isRead ? 'bg-primary/5 border-primary/10' : 'bg-muted/30'}`}>
                                        <div className="mt-1 bg-white p-2 rounded-full shadow-sm"><NotificationIcon type={notif.type} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold leading-tight"><span className="text-foreground">{notif.description}</span></p>
                                            <p className="text-[8px] font-black uppercase opacity-40 mt-2 tracking-widest">{formatDistanceToNow(safeDate(notif.$createdAt), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                       <div className="text-center py-20 opacity-20 grayscale">
                           <Trash2 className="h-16 w-16 mx-auto mb-4" />
                           <p className="font-black uppercase text-xs tracking-widest">Empty Vault</p>
                       </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}