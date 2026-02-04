'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Gift, Heart, MessageCircle } from "lucide-react";
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import { useEffect, useMemo } from "react";
import { formatDistanceToNow } from 'date-fns';

const socialNotifications = [
    {
        id: 1,
        type: 'like',
        user: { name: 'John Smith', avatar: 'https://picsum.photos/seed/102/100/100' },
        description: 'liked your photo.',
        createdAt: { toDate: () => new Date(Date.now() - 5 * 60 * 1000) },
    },
    {
        id: 2,
        type: 'comment',
        user: { name: 'Alice Johnson', avatar: 'https://picsum.photos/seed/103/100/100' },
        description: 'commented: "Great post! 🔥"',
        createdAt: { toDate: () => new Date(Date.now() - 30 * 60 * 1000) },
    },
];

export default function NotificationsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const notificationsQuery = useMemo(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
    }, [user, firestore]);

    const { data: systemNotifications, loading } = useCollection(notificationsQuery);

    useEffect(() => {
        if (systemNotifications && systemNotifications.length > 0 && firestore && user) {
            const batch = writeBatch(firestore);
            const unreadNotifs = systemNotifications.filter(n => !n.isRead);
            
            if (unreadNotifs.length > 0) {
                unreadNotifs.forEach(notif => {
                    const notifRef = doc(firestore, 'users', user.uid, 'notifications', notif.id);
                    batch.update(notifRef, { isRead: true });
                });
                batch.commit().catch(console.error);
            }
        }
    }, [systemNotifications, firestore, user]);

    const allNotifications = [...(systemNotifications || []), ...socialNotifications].sort((a, b) => {
        const timeA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
    });
    
    const NotificationIcon = ({ type }: { type: string }) => {
        switch(type) {
            case 'like':
                return <Heart className="h-5 w-5 text-red-500" />;
            case 'comment':
                return <MessageCircle className="h-5 w-5 text-blue-500" />;
            case 'message':
                return <MessageCircle className="h-5 w-5 text-primary" />;
            case 'follow':
                 return <Avatar className="h-5 w-5 border-2 border-green-500" />;
            case 'system':
                return <Gift className="h-5 w-5 text-green-500" />;
            default:
                return <Bell className="h-5 w-5" />;
        }
    }
    
    return (
        <div className="container py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Your recent account activity.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && <p className="text-center text-muted-foreground p-6">Loading...</p>}
                    {!loading && allNotifications.length > 0 ? (
                        <div className="space-y-4">
                            {allNotifications.map(notif => (
                                <div key={notif.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                                    <NotificationIcon type={notif.type} />
                                    <div className="flex-1">
                                        <p className="text-sm">
                                            {notif.user ? (
                                                <>
                                                    <span className="font-semibold">{notif.user.name}</span>
                                                    {' '}
                                                    {notif.description}
                                                </>
                                            ) : (
                                                <>
                                                 <span className="font-semibold">{notif.title}</span>
                                                 {' '}
                                                 {notif.description}
                                                </>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : 'sending...'}
                                        </p>
                                    </div>
                                    {notif.user && (
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={notif.user.avatar} alt={notif.user.name} />
                                            <AvatarFallback>{notif.user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                       !loading && <p className="text-center text-muted-foreground p-6">No new notifications.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
