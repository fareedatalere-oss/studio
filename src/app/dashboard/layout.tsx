'use client';
import Link from 'next/link';
import { Bot, Bell, Home, PlaySquare, Store, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPayLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-appwrite';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { account, databases, DATABASE_ID, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, profile, loading, recheckUser } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    try {
      // Simplified unread check to ensure it works even without complex indexes
      const totalRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID_NOTIFICATIONS,
        [
          Query.equal('userId', user.$id),
          Query.equal('isRead', false),
          Query.limit(100)
        ]
      );
      setUnreadCount(totalRes.total);

      // Specific unread message notifications for the chat badge
      const msgRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID_NOTIFICATIONS,
        [
          Query.equal('userId', user.$id),
          Query.equal('isRead', false),
          Query.equal('type', 'message'),
          Query.limit(100)
        ]
      );
      setUnreadMsgCount(msgRes.total);
    } catch (error) {
      console.error("Failed to fetch unread counts:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUnreadCounts();

      const unsubscribe = account.client.subscribe(
        `databases.${DATABASE_ID}.collections.${COLLECTION_ID_NOTIFICATIONS}.documents`,
        (response) => {
          const payload = response.payload as any;
          if (payload.userId === user.$id) {
            fetchUnreadCounts();
          }
        }
      );

      return () => unsubscribe();
    }
  }, [user, fetchUnreadCounts]);

  useEffect(() => {
    if (!loading && profile && profile.isBanned) {
      toast({
        title: 'Account Suspended',
        description: 'Your account has been suspended by an administrator.',
        variant: 'destructive',
        duration: 7000
      });
      account.deleteSession('current');
      recheckUser();
      router.replace('/auth/signin');
    }
  }, [profile, loading, router, toast, recheckUser]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
                <IPayLogo className="h-8 w-8" />
            </Link>
            <Button asChild variant="ghost" size="icon">
              <Link href="/dashboard/ai-chat">
                <Bot className="h-5 w-5" />
                <span className="sr-only">AI Assistant</span>
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/dashboard/notifications">
                <Bell className="h-5 w-5" />
                 {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-[10px]">
                    {unreadCount > 99 ? '9+' : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Link>
            </Button>
            <Link href="/dashboard/profile">
              <Avatar>
                <AvatarImage src={profile?.avatar} />
                <AvatarFallback>
                  {isMounted && !loading ? (profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U') : null}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <footer className="fixed bottom-0 z-40 w-full border-t bg-background md:hidden">
        <div className="container grid h-16 grid-cols-5 items-center justify-around text-center">
          <Link href="/dashboard" className={cn("flex flex-col items-center gap-1", pathname === '/dashboard' ? "text-primary" : "text-muted-foreground")}>
            <Home className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/dashboard/chat" className={cn("flex flex-col items-center gap-1 relative", pathname.startsWith('/dashboard/chat') ? "text-primary" : "text-muted-foreground")}>
            <MessageSquare className="h-6 w-6" />
            {unreadMsgCount > 0 && (
              <Badge variant="destructive" className="absolute top-0 right-2 h-4 min-w-4 justify-center p-0.5 rounded-full text-[10px]">
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </Badge>
            )}
            <span className="text-xs">Chat</span>
          </Link>
          <Link href="/dashboard/media" className={cn("flex flex-col items-center gap-1", pathname === '/dashboard/media' ? "text-primary" : "text-muted-foreground")}>
            <PlaySquare className="h-6 w-6" />
            <span className="text-xs">Media</span>
          </Link>
          <Link href="/dashboard/market" className={cn("flex flex-col items-center gap-1", pathname === '/dashboard/market' ? "text-primary" : "text-muted-foreground")}>
            <Store className="h-6 w-6" />
            <span className="text-xs">Market</span>
          </Link>
          <Link href="/dashboard/profile" className={cn("flex flex-col items-center gap-1", pathname.startsWith('/dashboard/profile') ? "text-primary" : "text-muted-foreground")}>
            <User className="h-6 w-6" />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
