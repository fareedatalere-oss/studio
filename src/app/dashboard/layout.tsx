'use client';
import Link from 'next/link';
import { Bot, Bell, Home, PlaySquare, Store, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPayLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-appwrite';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { account } from '@/lib/appwrite';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading, recheckUser } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
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
  
  // TODO: Re-implement notifications with Appwrite
  const unreadNotifications: any[] = [];

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
                 {unreadNotifications && unreadNotifications.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full">{unreadNotifications.length}</Badge>
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
        <div className="container grid h-16 grid-cols-4 items-center justify-around text-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-primary">
            <Home className="h-6 w-6" />
            <span className="text-xs">Home</span>
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
