import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Code, FileText, LifeBuoy, ShieldCheck, Users } from 'lucide-react';
import { IPayLogo } from '@/components/icons';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: '/manager/support', label: 'Support', icon: LifeBuoy },
    { href: '/manager/legal', label: 'Legal Check', icon: ShieldCheck },
    { href: '/manager/codes', label: 'Codes', icon: Code },
    { href: '/manager/users', label: 'My Users', icon: Users },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/manager/dashboard" className="flex items-center gap-2">
            <IPayLogo className="h-8 w-8" />
            <span className="font-bold">Manager Panel</span>
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
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
