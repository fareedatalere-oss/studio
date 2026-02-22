'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, Landmark, Store, PlaySquare, Star, User } from 'lucide-react';
import { IPayLogo } from '@/components/icons';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: '/manager/users', label: 'Users', icon: Users },
    { href: '/manager/transactions', label: 'Transactions', icon: Landmark },
    { href: '/manager/market', label: 'Market', icon: Store },
    { href: '/manager/media', label: 'Media', icon: PlaySquare },
    { href: '/manager/creators', label: 'Content Creators', icon: Star },
    { href: '/manager/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/manager/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <IPayLogo className="h-8 w-8" />
            <span className="font-bold">Manager Panel</span>
          </Link>
          <nav className="flex items-center gap-4 overflow-x-auto whitespace-nowrap">
            {navItems.map((item) => (
              <Button key={item.label} asChild variant="ghost">
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-5 w-5" />
                  {item.label}
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
