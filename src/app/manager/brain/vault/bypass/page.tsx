'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';

const VAULT_PASSWORD = '07068731136';

export default function VaultBypassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password === VAULT_PASSWORD) {
      toast({ title: 'Access Granted', description: 'Entering Knowledge Bank.' });
      sessionStorage.setItem('ipay_ai_vault_access', 'true');
      router.push('/manager/brain/vault');
    } else {
      toast({ title: 'Access Denied', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="text-center bg-primary/5 pb-8 pt-10">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Vault Access</CardTitle>
          <CardDescription className="font-bold text-xs uppercase opacity-60">Knowledge Bank Password</CardDescription>
        </CardHeader>
        <CardContent className="pt-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                inputMode="numeric"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••••••"
                required
                className="h-16 rounded-2xl bg-muted border-none text-center text-3xl tracking-[0.3em] font-black"
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : 'Enter Bank'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
