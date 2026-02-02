import Link from 'next/link';
import { Bot, Bell, Home, MessageCircle, PlaySquare, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPayLogo } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
                <IPayLogo className="h-8 w-8" />
            </Link>
            <Button variant="ghost" size="icon">
              <Bot className="h-5 w-5" />
              <span className="sr-only">AI Assistant</span>
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <Avatar>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Bottom Navigation */}
      <footer className="sticky bottom-0 z-40 border-t bg-background md:hidden">
        <div className="container flex h-16 items-center justify-around">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-primary">
            <Home className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="#" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs">Chat</span>
          </Link>
          <Link href="#" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <PlaySquare className="h-6 w-6" />
            <span className="text-xs">Media</span>
          </Link>
          <Link href="#" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Store className="h-6 w-6" />
            <span className="text-xs">Market</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
