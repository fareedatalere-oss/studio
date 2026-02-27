
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Paintbrush, Settings, ShieldCheck, Wallet, Code2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ManagerProfilePage() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const hasBypass = sessionStorage.getItem('manager-profile-bypass') === 'true';
    if (!hasBypass) {
      router.replace('/manager/profile/bypass');
    }
  }, [router]);
  
  const handleLogout = () => {
    sessionStorage.removeItem('manager-profile-bypass');
    sessionStorage.removeItem('manager-creators-bypass');
    sessionStorage.removeItem('manager-settings-bypass');
    sessionStorage.removeItem('manager-proof-bypass');
    toast({ title: 'Logged Out', description: 'You have been logged out of the manager panel.' });
    router.push('/auth/signin');
  };

  const actions = [
    { href: '/manager/project', label: 'Project Export', icon: Code2 },
    { href: '/manager/profile/settings/bypass', label: 'Admin Settings', icon: Settings },
    { href: '/manager/wallet', label: 'Admin Wallet', icon: Wallet },
    { href: '/manager/proof', label: 'Proof Control', icon: ShieldCheck },
    { href: '/manager/profile/logo', label: 'App Logo Edit', icon: Paintbrush },
  ];

  return (
    <div className="container py-8">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader>
          <CardTitle>Manager Profile</CardTitle>
          <CardDescription>Administrative controls and revenue monitoring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            {actions.map(action => (
                <Button asChild key={action.label} variant="outline" className="w-full justify-start gap-3 h-12">
                    <Link href={action.href}>
                        <action.icon className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{action.label}</span>
                    </Link>
                </Button>
            ))}
            <Button onClick={handleLogout} className="w-full justify-start gap-3 h-12 mt-4" variant="destructive">
                <LogOut className="h-5 w-5" />
                <span className="font-semibold">Log Out</span>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
