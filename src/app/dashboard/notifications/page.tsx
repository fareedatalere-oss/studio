'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Heart, MessageCircle, UserPlus, Store, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useUser } from '@/hooks/use-appwrite';
import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from 'date-fns';
import { databases, DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, COLLECTION_ID_PROFILES } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_NOTIFICATIONS,
                [
                    Query.equal('userId', user.$id),
                    Query.orderDesc('$createdAt'),
                    Query.limit(50)
                ]
            );

            const notificationsWithProfiles = await Promise.all(response.documents.map(async (notif) => {
                if (notif.type === 'system' || !notif.senderId) {
                    return { ...notif, sender: { username: 'I-Pay Admin', avatar: '' } };
                }
                try {
                    const senderProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_PROFILES, notif.senderId);
                    return { ...notif, sender: senderProfile };
                } catch {
                    return { ...notif, sender: { username: 'User', avatar: '' } };
                }
            }));

            setNotifications(notificationsWithProfiles);

            // Mark all fetched notifications as read
            const unread = response.documents.filter(n => !n.isRead);
            if (unread.length > 0) {
                await Promise.all(unread.map(n => 
                    databases.updateDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, n.$id, { isRead: true })
                ));
            }
        } catch (error: any) {
            console.error("Failed to fetch notifications:", error);
            try {
                 const fallbackResponse = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTION_ID_NOTIFICATIONS,
                    [Query.equal('userId', user.$id), Query.limit(50)]
                );
                setNotifications(fallbackResponse.documents);
            } catch (e) {
                toast({
                    variant: 'destructive',
                    title: 'Sync Error',
                    description: 'Could not load alerts.',
                });
            }
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);
    
    const NotificationIcon = ({ type }: { type: string }) => {
        switch(type) {
            case 'system': return <ShieldCheck className="h-5 w-5 text-primary" />;
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
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-6 w-6 text-primary" />
                        Notifications
                    </CardTitle>
                    <CardDescription>Stay updated with activity on your account.</CardDescription>
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
                                                <span className="font-semibold text-foreground">@{notif.sender?.username || 'System'}</span>
                                                {' '}
                                                <span className="text-muted-foreground">{notif.title ? `${notif.title}: ` : ''}{notif.description}</span>
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                                                {formatDistanceToNow(new Date(notif.$createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <Avatar className="h-10 w-10 border">
                                            <AvatarImage src={notif.sender?.avatar} />
                                            <AvatarFallback>{notif.type === 'system' ? 'A' : (notif.sender?.username?.charAt(0).toUpperCase())}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                       <div className="text-center py-12">
                           <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                           <p className="text-muted-foreground">You have no new notifications.</p>
                       </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
