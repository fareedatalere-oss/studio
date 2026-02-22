'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardHat, LogOut, Paintbrush, Settings } from 'lucide-react';
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
    // Clear all manager session tokens
    sessionStorage.removeItem('manager-profile-bypass');
    sessionStorage.removeItem('manager-creators-bypass');
    sessionStorage.removeItem('manager-settings-bypass');
    toast({ title: 'Logged Out', description: 'You have been logged out of the manager panel.' });
    router.push('/auth/signin');
  };

  const actions = [
    { href: '/manager/profile/settings/bypass', label: 'Admin Settings', icon: Settings },
    { href: '#', label: 'Project (coming soon)', icon: HardHat, disabled: true },
    { href: '#', label: 'Wallet (coming soon)', icon: HardHat, disabled: true },
    { href: '/manager/profile/logo', label: 'App Logo Edit', icon: Paintbrush },
  ];

  return (
    <div className="container py-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Manager Profile</CardTitle>
          <CardDescription>Manage your administrative settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            {actions.map(action => (
                <Button asChild key={action.label} variant="outline" className="w-full justify-start gap-3" disabled={action.disabled}>
                    <Link href={action.href}>
                        <action.icon className="h-5 w-5" />
                        <span>{action.label}</span>
                    </Link>
                </Button>
            ))}
            <Button onClick={handleLogout} className="w-full justify-start gap-3" variant="destructive">
                <LogOut className="h-5 w-5" />
                <span>Log Out</span>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
