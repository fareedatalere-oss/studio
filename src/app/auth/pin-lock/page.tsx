'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IPayLogo } from '@/components/icons';
import { useUser } from '@/hooks/use-appwrite';
import { account } from '@/lib/appwrite';
import { Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';

export default function PinLockPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading } = useUser();
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin');
    }
  }, [user, loading, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsVerifying(true);
    
    // Simulate slight delay for security feel
    setTimeout(() => {
        if (pin === profile.pin) {
            sessionStorage.setItem('ipay_pin_verified', 'true');
            toast({ title: 'Welcome Back', description: `Authenticated as @${profile.username}` });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: 'Security Alert', description: 'Incorrect transaction PIN.' });
            setPin('');
            setIsVerifying(false);
        }
    }, 800);
  };

  const handleForgetPin = async () => {
    // Master instruction: Redirect to normal sign in to sign in
    await account.deleteSession('current').catch(() => {});
    sessionStorage.removeItem('ipay_pin_verified');
    localStorage.removeItem('ipay_last_active');
    router.push('/auth/signin');
  };

  if (loading || !profile) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-t-8 border-t-primary shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <LockKeyhole className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Session Locked</CardTitle>
          <CardDescription className="font-bold">Enter your 5-digit PIN to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="*****"
                className="h-16 text-center text-3xl tracking-[1.5rem] font-black bg-muted border-none rounded-2xl"
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg" disabled={isVerifying || pin.length !== 5}>
              {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : 'Unlock App'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pb-10">
            <Button variant="ghost" onClick={handleForgetPin} className="text-xs font-black uppercase text-muted-foreground hover:text-primary">
                Forget PIN? Sign In Again
            </Button>
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground opacity-50 uppercase">
                <ShieldAlert className="h-3 w-3" />
                <span>Protected by I-Pay Security Engine</span>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
