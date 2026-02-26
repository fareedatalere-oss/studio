'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Heart, MessageCircle, UserPlus, Store, CreditCard, Loader2 } from "lucide-react";
import { useUser } from '@/hooks/use-appwrite';
import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from 'date-fns';
import { databases, DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, COLLECTION_ID_PROFILES } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function NotificationsPage() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 7-Day Logic: Only fetch notifications from the last 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_NOTIFICATIONS,
                [
                    Query.equal('userId', user.$id),
                    Query.greaterThan('createdAt', sevenDaysAgo),
                    Query.orderDesc('createdAt'),
                    Query.limit(50)
                ]
            );

            // Fetch sender profiles for each notification
            const notificationsWithProfiles = await Promise.all(response.documents.map(async (notif) => {
                try {
                    const senderProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, notif.senderId);
                    return { ...notif, sender: senderProfile };
                } catch {
                    return { ...notif, sender: { username: 'Someone', avatar: '' } };
                }
            }));

            setNotifications(notificationsWithProfiles);

            // Automatically mark all as read when opening the page
            const unread = response.documents.filter(n => !n.isRead);
            if (unread.length > 0) {
                await Promise.all(unread.map(n => 
                    databases.updateDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, n.$id, { isRead: true })
                ));
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);
    
    const NotificationIcon = ({ type }: { type: string }) => {
        switch(type) {
            case 'like': return <Heart className="h-5 w-5 text-red-500" />;
            case 'comment': return <MessageCircle className="h-5 w-5 text-blue-500" />;
            case 'message': return <MessageCircle className="h-5 w-5 text-primary" />;
            case 'follow': return <UserPlus className="h-5 w-5 text-green-500" />;
            case 'market': return <Store className="h-5 w-5 text-orange-500" />;
            case 'payment': return <CreditCard className="h-5 w-5 text-emerald-500" />;
            default: return <Bell className="h-5 w-5" />;
        }
    }
    
    return (
        <div className="container py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Alerts from the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="space-y-4">
                            {notifications.map(notif => (
                                <Link 
                                    key={notif.$id} 
                                    href={notif.link || '#'} 
                                    className="block group"
                                >
                                    <div className={`flex items-start gap-4 p-3 rounded-lg transition-colors group-hover:bg-muted/80 ${!notif.isRead ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-muted/30'}`}>
                                        <div className="mt-1">
                                            <NotificationIcon type={notif.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">
                                                <span className="font-semibold text-foreground">@{notif.sender?.username}</span>
                                                {' '}
                                                <span className="text-muted-foreground">{notif.description}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={notif.sender?.avatar} />
                                            <AvatarFallback>{notif.sender?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                       <div className="text-center py-12">
                           <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                           <p className="text-muted-foreground">No recent activity to show.</p>
                       </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
