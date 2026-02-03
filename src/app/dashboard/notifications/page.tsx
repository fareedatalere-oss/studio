import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";


const notifications = [
    {
        id: 1,
        type: 'like',
        user: { name: 'John Smith', avatar: 'https://picsum.photos/seed/102/100/100' },
        content: 'liked your photo.',
        time: '5 minutes ago',
    },
    {
        id: 2,
        type: 'comment',
        user: { name: 'Alice Johnson', avatar: 'https://picsum.photos/seed/103/100/100' },
        content: 'commented: "Great post! 🔥"',
        time: '30 minutes ago',
    },
    {
        id: 3,
        type: 'message',
        user: { name: 'Jane Doe', avatar: 'https://picsum.photos/seed/101/100/100' },
        content: 'sent you a message.',
        time: '1 hour ago',
    },
     {
        id: 4,
        type: 'follow',
        user: { name: 'Bob Williams', avatar: 'https://picsum.photos/seed/104/100/100' },
        content: 'started following you.',
        time: '3 hours ago',
    }
];

export default function NotificationsPage() {
    
    const NotificationIcon = ({ type }: { type: string }) => {
        switch(type) {
            case 'like':
                return <Heart className="h-5 w-5 text-red-500" />;
            case 'comment':
                return <MessageCircle className="h-5 w-5 text-blue-500" />;
            case 'message':
                return <MessageCircle className="h-5 w-5 text-primary" />;
            case 'follow':
                 return <Avatar className="h-5 w-5 border-2 border-green-500"><AvatarImage src="https://picsum.photos/seed/104/100/100" /></Avatar>
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
                    {notifications.length > 0 ? (
                        <div className="space-y-4">
                            {notifications.map(notif => (
                                <div key={notif.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                                    <NotificationIcon type={notif.type} />
                                    <div className="flex-1">
                                        <p className="text-sm">
                                            <span className="font-semibold">{notif.user.name}</span>
                                            {' '}
                                            {notif.content}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{notif.time}</p>
                                    </div>
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={notif.user.avatar} alt={notif.user.name} />
                                        <AvatarFallback>{notif.user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground p-6">No new notifications.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
