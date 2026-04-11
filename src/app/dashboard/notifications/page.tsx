'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Heart, MessageCircle, UserPlus, Store, CreditCard, ShieldCheck } from "lucide-react";
import { useUser } from '@/hooks/use-appwrite';
import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from 'date-fns';
import { databases, DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, COLLECTION_ID_PROFILES, Query } from "@/lib/appwrite";
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

            // Mark unread as read
            const unread = response.documents.filter(n => !n.isRead);
            if (unread.length > 0) {
                await Promise.all(unread.map(n => 
                    databases.updateDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, n.$id, { isRead: true })
                ));
            }
        } catch (error: any) {
            console.error("Failed to fetch notifications:", error);
            toast({
                variant: 'destructive',
                title: 'Sync Error',
                description: 'Could not load alerts.',
            });
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
            <Card className="rounded-[2rem] shadow-xl overflow-hidden border-none">
                <CardHeader className="bg-primary/5 pb-6">
                    <CardTitle className="flex items-center gap-2 font-black uppercase text-xl tracking-tighter">
                        <Bell className="h-6 w-6 text-primary" />
                        Alert Center
                    </CardTitle>
                    <CardDescription className="font-bold">Real-time platform activity.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="space-y-4">
                            {notifications.map(notif => (
                                <Link 
                                    key={notif.$id} 
                                    href={notif.link || '#'} 
                                    className="block group"
                                >
                                    <div className={`flex items-start gap-4 p-4 rounded-2xl transition-all group-active:scale-95 ${!notif.isRead ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-muted/30'}`}>
                                        <div className="mt-1">
                                            <NotificationIcon type={notif.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold">
                                                <span className="text-primary">@{notif.sender?.username || 'System'}</span>
                                                {' '}
                                                <span className="text-foreground">{notif.description}</span>
                                            </p>
                                            <p className="text-[9px] font-black uppercase opacity-50 mt-1">
                                                {formatDistanceToNow(new Date(notif.$createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                            <AvatarImage src={notif.sender?.avatar} />
                                            <AvatarFallback className="font-black bg-muted text-foreground/30">{notif.type === 'system' ? 'A' : (notif.sender?.username?.charAt(0).toUpperCase())}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                       <div className="text-center py-20 opacity-20 grayscale">
                           <Bell className="h-16 w-16 mx-auto mb-4" />
                           <p className="font-black uppercase text-xs tracking-widest">No Alerts Found</p>
                       </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
