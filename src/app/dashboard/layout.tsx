'use client';
import Link from 'next/link';
import { Bell, Home, PlaySquare, Store, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPayLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-user';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MeetingAlarm } from '@/components/meeting-alarm';

/**
 * @fileOverview Master Dashboard Layout.
 * LABELS: Home, Chat, Media, Market, Profile.
 * BADGES: Real-time cumulative counters for Chat and Notifications.
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { profile, unreadNotifications, unreadMessages, proof } = useUser();
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isTabOn = (key: string) => (!proof) ? true : proof[key] !== false;

  const handleTabClick = (e: React.MouseEvent, key: string) => {
      if (!isTabOn(key)) {
          e.preventDefault();
          toast({ variant: 'destructive', title: "Not Available" });
      }
  };

  const isImmersive = pathname.includes('/room/') || pathname.includes('/call/') || pathname.includes('/join/');

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen flex-col font-body bg-background">
      <MeetingAlarm />
      
      {!isImmersive && (
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md h-14">
          <div className="container flex h-full items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard"><IPayLogo className="h-8 w-8" /></Link>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="icon" className="relative h-9 w-9">
                <Link href="/dashboard/notifications">
                  <Bell className="h-4 w-4" />
                   {unreadNotifications > 0 && (
                     <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 rounded-full text-[8px] font-black border-2 border-white shadow-sm">
                       {unreadNotifications > 9 ? '9+' : unreadNotifications}
                     </Badge>
                   )}
                </Link>
              </Button>
              <Link href="/dashboard/profile" onClick={(e) => handleTabClick(e, 'tab_profile')}>
                <Avatar className="h-8 w-8 border-2 border-primary/10 shadow-sm">
                  <AvatarImage src={profile?.avatar} />
                  <AvatarFallback className="text-[10px] font-black">{profile?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </header>
      )}
      
      <main className={cn("flex-1 overflow-y-auto", !isImmersive && "pb-20")}>
        {children}
      </main>

      {!isImmersive && (
        <footer className="fixed bottom-0 z-40 w-full border-t bg-background/95 backdrop-blur-md h-14 shadow-lg">
          <div className="container grid h-full grid-cols-5 items-center justify-around text-center px-2">
            {[
                { href: '/dashboard', label: 'Home', icon: Home, key: 'tab_home' },
                { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare, key: 'tab_chat', badge: unreadMessages },
                { href: '/dashboard/media', label: 'Media', icon: PlaySquare, key: 'tab_media' },
                { href: '/dashboard/market', label: 'Market', icon: Store, key: 'tab_market' },
                { href: '/dashboard/profile', label: 'Profile', icon: User, key: 'tab_profile' }
            ].map((tab) => (
                <Link 
                  key={tab.key} 
                  href={tab.href} 
                  onClick={(e) => handleTabClick(e, tab.key)} 
                  className={cn("flex flex-col items-center gap-0.5 transition-all duration-300 relative", pathname === tab.href ? "text-primary scale-110" : "text-muted-foreground opacity-60")}
                >
                    <tab.icon className="h-4 w-4" />
                    {tab.badge && tab.badge > 0 ? (
                        <Badge variant="destructive" className="absolute -top-1.5 right-1.5 h-3.5 min-w-3.5 flex items-center justify-center p-0 rounded-full text-[7px] font-black border border-white shadow-sm">
                            {tab.badge > 9 ? '9+' : tab.badge}
                        </Badge>
                    ) : null}
                    <span className="text-[10px] font-black tracking-tight">{tab.label}</span>
                </Link>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}