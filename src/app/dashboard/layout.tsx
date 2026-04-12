'use client';
import Link from 'next/link';
import { Bell, Home, PlaySquare, Store, User, X, Bot, Download, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPayLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-user';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { databases, COLLECTION_ID_NOTIFICATIONS, Query, client } from '@/lib/data-service';
import { cn } from '@/lib/utils';
import { MeetingAlarm } from '@/components/meeting-alarm';

/**
 * @fileOverview Unified Dashboard Layout.
 * UPGRADED: Forced Real-time Notification Engine with Audio & Native Push.
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, profile, loading, proof } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  
  const lastCountRef = useRef(0);
  const audioContextUnlocked = useRef(false);

  const isImmersive = 
    pathname.includes('/room/') ||
    pathname.match(/\/dashboard\/chat\/[a-zA-Z0-9_]+/);

  const unlockAudio = () => {
    if (audioContextUnlocked.current) return;
    const silentAudio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-silent-fast-thud-2094.mp3');
    silentAudio.play().then(() => {
        audioContextUnlocked.current = true;
    }).catch(() => {});
  };

  useEffect(() => {
    setIsMounted(true);
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('click', unlockAudio, { once: true });

    return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
        toast({ title: "Install App", description: "Open your browser menu and click 'Add to Home Screen' to download I-Pay." });
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      toast({ title: "Installing I-Pay...", description: "Adding to your device." });
    }
  };
  
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const totalRes = await databases.listDocuments('default', COLLECTION_ID_NOTIFICATIONS, [
        Query.equal('userId', user.$id),
        Query.equal('isRead', false),
        Query.limit(1)
      ]);
      
      const newTotal = totalRes.total;
      setUnreadCount(newTotal);

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
      const nowTime = new Date().getTime();

      const unsub = client.subscribe([`databases.default.collections.${COLLECTION_ID_NOTIFICATIONS}.documents`], (response: any) => {
          const payload = response.payload;
          const isNew = response.events[0].endsWith('.added');
          
          if (payload.userId === user.$id) {
            fetchUnreadCounts();

            // FORCE ALERT LOGIC: Trigger sound and toast for live events
            const recordTime = new Date(payload.$createdAt).getTime();
            if (isNew && recordTime > nowTime - 10000) {
                // 1. Play Ping Sound
                const ping = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
                ping.volume = 0.6;
                ping.play().catch(() => {});

                // 2. Push Native Notification
                if (Notification.permission === 'granted') {
                    new Notification('I-Pay Alert', {
                        body: payload.description,
                        icon: '/logo.png'
                    });
                }

                // 3. Show Master Toast
                toast({
                    title: "Alert Received",
                    description: payload.description,
                    variant: payload.type === 'payment' ? 'default' : 'default',
                });
            }
          }
      });
      return () => unsub();
    }
  }, [user, fetchUnreadCounts, toast, router]);

  const isTabOn = (key: string) => (!proof) ? true : proof[key] !== false;

  const handleTabClick = (e: React.MouseEvent, key: string) => {
      if (!isTabOn(key)) {
          e.preventDefault();
          toast({ variant: 'destructive', title: "Not Available", description: "This feature is disabled temporarily." });
      }
  };

  return (
    <div className="flex min-h-screen flex-col font-body">
      <MeetingAlarm />
      {showInstallBanner && !isImmersive && (
        <div className="bg-primary text-primary-foreground p-2 flex items-center justify-between shadow-2xl sticky top-0 z-[60] border-b-2 border-white/20">
          <div className="flex items-center gap-2">
            <IPayLogo className="h-8 w-8 rounded-lg bg-white p-1" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-tight leading-none">Download App</p>
              <p className="text-[8px] font-bold opacity-90 leading-none mt-0.5">Safe • Fast • Official</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="secondary" onClick={handleInstallClick} className="h-7 px-3 text-[9px] font-black uppercase tracking-widest bg-white text-primary hover:bg-white/90">
                <Download className="h-3 w-3 mr-1" /> Install
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setShowInstallBanner(false)} className="h-7 w-7 opacity-50"><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      {!isImmersive && (
        <header className="sticky top-0 z-40 border-b bg-background shadow-sm h-14">
          <div className="container flex h-full items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard"><IPayLogo className="h-8 w-8" /></Link>
              <Button asChild variant="ghost" size="icon" className="md:flex hidden bg-primary/5 text-primary rounded-full h-7 w-7">
                <Link href="/dashboard/ai-chat" title="AI Assistant"><Bot className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="icon" className={cn("relative transition-transform h-8 w-8", isPulsing && "scale-110")}>
                <Link href="/dashboard/notifications">
                  <Bell className={cn("h-4 w-4", isPulsing && "text-primary animate-bounce")} />
                   {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 justify-center p-0 rounded-full text-[7px] font-bold border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Link href="/dashboard/profile" onClick={(e) => handleTabClick(e, 'tab_profile')}>
                <Avatar className="h-7 w-7 border-2 border-transparent hover:border-primary">
                  <AvatarImage src={profile?.avatar} />
                  <AvatarFallback className="text-[10px]">{isMounted && !loading ? (profile?.username?.charAt(0).toUpperCase() || 'U') : null}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </header>
      )}
      
      <main className={cn("flex-1 overflow-y-auto", !isImmersive && "pb-20 md:pb-6")}>
        {children}
      </main>

      {!isImmersive && (
        <footer className="fixed bottom-0 z-40 w-full border-t bg-background md:hidden shadow-lg h-14">
          <div className="container grid h-full grid-cols-5 items-center justify-around text-center px-2">
            <Link href="/dashboard" onClick={(e) => handleTabClick(e, 'tab_home')} className={cn("flex flex-col items-center gap-0.5", pathname === '/dashboard' ? "text-primary" : "text-muted-foreground")}>
              <Home className="h-4 w-4" />
              <span className="text-[9px] font-bold">Home</span>
            </Link>
            <Link href="/dashboard/chat" onClick={(e) => handleTabClick(e, 'tab_chat')} className={cn("flex flex-col items-center gap-0.5", pathname === '/dashboard/chat' ? "text-primary" : "text-muted-foreground")}>
              <MessageSquare className="h-4 w-4" />
              <span className="text-[9px] font-bold">Chat</span>
            </Link>
            <Link href="/dashboard/media" onClick={(e) => handleTabClick(e, 'tab_media')} className={cn("flex flex-col items-center gap-0.5", (pathname === '/dashboard/media' || pathname.startsWith('/dashboard/media/')) ? "text-primary" : "text-muted-foreground")}>
              <PlaySquare className="h-4 w-4" />
              <span className="text-[9px] font-bold">Media</span>
            </Link>
            <Link href="/dashboard/market" onClick={(e) => handleTabClick(e, 'tab_market')} className={cn("flex flex-col items-center gap-0.5", pathname === '/dashboard/market' ? "text-primary" : "text-muted-foreground")}>
              <Store className="h-4 w-4" />
              <span className="text-[9px] font-bold">Market</span>
            </Link>
            <Link href="/dashboard/profile" onClick={(e) => handleTabClick(e, 'tab_profile')} className={cn("flex flex-col items-center gap-0.5", pathname.startsWith('/dashboard/profile') ? "text-primary" : "text-muted-foreground")}>
              <User className="h-4 w-4" />
              <span className="text-[9px] font-bold">Profile</span>
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
