'use client';
import Link from 'next/link';
import { Bell, Home, PlaySquare, Store, User, Bot, MessageSquare } from 'lucide-react';
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
 * LABELS: Home, Chat, Media, Market, Profile (Title Case).
 * ICONS: Corrected for professional identity.
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { profile, unreadNotifications, proof } = useUser();
  
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
              <Button asChild variant="ghost" size="icon" className="bg-primary/5 text-primary rounded-full h-8 w-8">
                <Link href="/dashboard/ai-chat"><Bot className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="icon" className="relative h-9 w-9">
                <Link href="/dashboard/notifications">
                  <Bell className="h-4 w-4" />
                   {unreadNotifications > 0 && <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-4 w-4 justify-center p-0 rounded-full text-[8px] font-black border-2 border-white">{unreadNotifications > 9 ? '9+' : unreadNotifications}</Badge>}
                </Link>
              </Button>
              <Link href="/dashboard/profile" onClick={(e) => handleTabClick(e, 'tab_profile')}>
                <Avatar className="h-8 w-8 border-2 border-primary/10">
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
                { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare, key: 'tab_chat' },
                { href: '/dashboard/media', label: 'Media', icon: PlaySquare, key: 'tab_media' },
                { href: '/dashboard/market', label: 'Market', icon: Store, key: 'tab_market' },
                { href: '/dashboard/profile', label: 'Profile', icon: User, key: 'tab_profile' }
            ].map((tab) => (
                <Link key={tab.key} href={tab.href} onClick={(e) => handleTabClick(e, tab.key)} className={cn("flex flex-col items-center gap-0.5 transition-colors", pathname === tab.href ? "text-primary scale-110" : "text-muted-foreground")}>
                    <tab.icon className="h-4 w-4" />
                    <span className="text-[9px] font-bold tracking-tighter">{tab.label}</span>
                </Link>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
