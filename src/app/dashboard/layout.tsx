'use client';
import Link from 'next/link';
import { Bot, Bell, Home, PlaySquare, Store, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPayLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-appwrite';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { account, databases, DATABASE_ID, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading, recheckUser } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      // 7-day Filter Logic: Only count alerts from the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID_NOTIFICATIONS,
        [
          Query.equal('userId', user.$id),
          Query.equal('isRead', false),
          Query.greaterThan('createdAt', sevenDaysAgo),
          Query.limit(1) // We only need the total count
        ]
      );
      setUnreadCount(response.total);
    } catch (error) {
      console.error("Failed to fetch unread notifications count:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();

      // Realtime listener for the badge
      const unsubscribe = account.client.subscribe(
        `databases.${DATABASE_ID}.collections.${COLLECTION_ID_NOTIFICATIONS}.documents`,
        (response) => {
          const payload = response.payload as any;
          if (payload.userId === user.$id) {
            fetchUnreadCount();
          }
        }
      );

      return () => unsubscribe();
    }
  }, [user, fetchUnreadCount]);

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
      {/* Header */}
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
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full">
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
      
      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 z-40 w-full border-t bg-background md:hidden">
        <div className="container grid h-16 grid-cols-5 items-center justify-around text-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-primary">
            <Home className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/dashboard/chat" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <MessageSquare className="h-6 w-6" />
            <span className="text-xs">Chat</span>
          </Link>
          <Link href="/dashboard/media" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <PlaySquare className="h-6 w-6" />
            <span className="text-xs">Media</span>
          </Link>
          <Link href="/dashboard/market" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Store className="h-6 w-6" />
            <span className="text-xs">Market</span>
          </Link>
          <Link href="/dashboard/profile" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <User className="h-6 w-6" />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
