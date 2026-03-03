'use client';
import Link from 'next/link';
import { Bell, Home, PlaySquare, Store, User, MessageSquare, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPayLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-appwrite';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import client, { databases, DATABASE_ID, COLLECTION_ID_NOTIFICATIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { cn } from '@/lib/utils';

const MANAGER_EMAILS = ['i-paymanagerscare402@gmail.com', 'ipatmanager17@gmail.com'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, profile, loading, proof, recheckUser } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  
  const lastCountRef = useRef(0);

  // Immersive sections logic
  const isImmersive = pathname === '/dashboard/media' || pathname.startsWith('/dashboard/media/music') || pathname.includes('/text');

  useEffect(() => {
    setIsMounted(true);
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);
  
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      toast({ title: "Installing I-Pay...", description: "Adding to home screen." });
    }
  };
  
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const [totalRes, msgRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, [
          Query.equal('userId', user.$id),
          Query.equal('isRead', false),
          Query.limit(1)
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, [
          Query.equal('userId', user.$id),
          Query.equal('isRead', false),
          Query.equal('type', 'message'),
          Query.limit(1)
        ])
      ]);
      
      const newTotal = totalRes.total;
      setUnreadCount(newTotal);
      setUnreadMsgCount(msgRes.total);

      // Trigger "Alarm" pulse if count increased
      if (newTotal > lastCountRef.current) {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 3000);
      }
      lastCountRef.current = newTotal;

    } catch (error) {
      console.error("Failed to fetch unread counts:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUnreadCounts();

      // Refresh on window focus (instant sync when returning to app)
      const handleFocus = () => fetchUnreadCounts();
      window.addEventListener('focus', handleFocus);

      // Real-time subscription for INSTANT alerts
      const topic = `databases.${DATABASE_ID}.collections.${COLLECTION_ID_NOTIFICATIONS}.documents`;
      const unsubscribe = client.subscribe([topic], (response) => {
          const events = response.events || [];
          if (events.some(e => e.includes('.create') || e.includes('.update') || e.includes('.delete'))) {
              const payload = response.payload as any;
              if (payload.userId === user.$id) {
                fetchUnreadCounts();
              }
          }
      });

      return () => {
          unsubscribe();
          window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user, fetchUnreadCounts]);

  useEffect(() => {
    if (proof && !proof.main_switch && user && !MANAGER_EMAILS.includes(user.email.toLowerCase())) {
        router.replace('/');
    }
  }, [proof, user, router]);

  const isAdmin = user && MANAGER_EMAILS.includes(user.email.toLowerCase());
  const isTabOn = (key: string) => (isAdmin || !proof) ? true : proof[key] !== false;

  const handleTabClick = (e: React.MouseEvent, key: string) => {
      if (!isTabOn(key)) {
          e.preventDefault();
          toast({ variant: 'destructive', title: "Not Available", description: "This feature is disabled temporarily." });
      }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {showInstallBanner && !isImmersive && (
        <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-lg sticky top-0 z-[60]">
          <div className="flex items-center gap-3">
            <IPayLogo className="h-8 w-8 rounded-md bg-white p-1" />
            <div>
              <p className="text-xs font-black uppercase tracking-tight">Install I-Pay App</p>
              <p className="text-[10px] opacity-90">Get the native experience on your home screen.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleInstallClick} className="h-8 text-[10px] font-bold uppercase">Install</Button>
            <Button size="icon" variant="ghost" onClick={() => setShowInstallBanner(false)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {!isImmersive && (
        <header className="sticky top-0 z-40 border-b bg-background shadow-sm">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard"><IPayLogo className="h-10 w-10" /></Link>
            </div>
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon" className={cn("relative transition-transform", isPulsing && "scale-110")}>
                <Link href="/dashboard/notifications">
                  <Bell className={cn("h-5 w-5", isPulsing && "text-primary animate-bounce")} />
                   {unreadCount > 0 && (
                    <Badge variant="destructive" className={cn(
                        "absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-[10px] font-bold border-2 border-white",
                        isPulsing && "animate-ping"
                    )}>
                      {unreadCount > 99 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Link href="/dashboard/profile" onClick={(e) => handleTabClick(e, 'tab_profile')}>
                <Avatar className="border-2 border-transparent hover:border-primary">
                  <AvatarImage src={profile?.avatar} />
                  <AvatarFallback>{isMounted && !loading ? (profile?.username?.charAt(0).toUpperCase() || 'U') : null}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </header>
      )}
      
      <main className={cn("flex-1", !isImmersive && "pb-20 md:pb-0")}>{children}</main>

      {!isImmersive && (
        <footer className="fixed bottom-0 z-40 w-full border-t bg-background md:hidden">
          <div className="container grid h-16 grid-cols-5 items-center justify-around text-center">
            <Link href="/dashboard" onClick={(e) => handleTabClick(e, 'tab_home')} className={cn("flex flex-col items-center gap-1", pathname === '/dashboard' ? "text-primary font-bold" : "text-muted-foreground")}>
              <Home className="h-6 w-6" />
              <span className="text-[10px]">Home</span>
            </Link>
            <Link href="/dashboard/chat" onClick={(e) => handleTabClick(e, 'tab_chat')} className={cn("flex flex-col items-center gap-1 relative", pathname.startsWith('/dashboard/chat') ? "text-primary font-bold" : "text-muted-foreground")}>
              <MessageSquare className="h-6 w-6" />
              {unreadMsgCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 right-2 h-4 min-w-4 justify-center p-0.5 rounded-full text-[10px] font-bold border-2 border-white animate-pulse">
                  {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                </Badge>
              )}
              <span className="text-[10px]">Chat</span>
            </Link>
            <Link href="/dashboard/media" onClick={(e) => handleTabClick(e, 'tab_media')} className={cn("flex flex-col items-center gap-1", (pathname === '/dashboard/media' || pathname.startsWith('/dashboard/media/')) ? "text-primary font-bold" : "text-muted-foreground")}>
              <PlaySquare className="h-6 w-6" />
              <span className="text-[10px]">Media</span>
            </Link>
            <Link href="/dashboard/market" onClick={(e) => handleTabClick(e, 'tab_market')} className={cn("flex flex-col items-center gap-1", pathname === '/dashboard/market' ? "text-primary font-bold" : "text-muted-foreground")}>
              <Store className="h-6 w-6" />
              <span className="text-[10px]">Market</span>
            </Link>
            <Link href="/dashboard/profile" onClick={(e) => handleTabClick(e, 'tab_profile')} className={cn("flex flex-col items-center gap-1", pathname.startsWith('/dashboard/profile') ? "text-primary font-bold" : "text-muted-foreground")}>
              <User className="h-6 w-6" />
              <span className="text-[10px]">Profile</span>
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}