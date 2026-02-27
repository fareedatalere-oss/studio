'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, Landmark, Store, PlaySquare, Star, User, Code2, Package } from 'lucide-react';
import { IPayLogo } from '@/components/icons';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: '/manager/users', label: 'Users', icon: Users },
    { href: '/manager/transactions', label: 'Transactions', icon: Landmark },
    { href: '/manager/market/bypass', label: 'Market', icon: Store },
    { href: '/manager/media/bypass', label: 'Media', icon: PlaySquare },
    { href: '/manager/creators/bypass', label: 'Creators', icon: Star },
    { href: '/manager/project', label: 'Project', icon: Code2 },
    { href: '/manager/your-app', label: 'Your App', icon: Package },
    { href: '/manager/profile/bypass', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/manager/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <IPayLogo className="h-8 w-8" />
            <span className="font-bold">Manager Panel</span>
          </Link>
          <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-2">
            {navItems.map((item) => (
              <Button key={item.label} asChild variant="ghost" className="h-9 px-3">
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
