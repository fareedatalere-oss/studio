'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, BrainCircuit } from 'lucide-react';

const BYPASS_CODE = '07038068194';

export default function AiBrainBypassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('ipay_ai_auth_step1') !== 'true') {
        router.replace('/auth/signin');
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (code === BYPASS_CODE) {
      toast({ title: 'Access Granted', description: 'Redirecting to Intelligence Core.' });
      sessionStorage.setItem('ipay_ai_master_access', 'true');
      router.push('/manager/brain');
    } else {
      toast({ title: 'Access Denied', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="text-center bg-muted/50 pb-8 pt-10">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <BrainCircuit className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">AI Brain Bypass</CardTitle>
          <CardDescription className="font-bold text-xs uppercase opacity-60">Identity Step 2</CardDescription>
        </CardHeader>
        <CardContent className="pt-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] opacity-70 ml-1">Secure Bypass Code</Label>
              <Input
                type="password"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="•••••••••••"
                required
                className="h-14 rounded-2xl bg-muted border-none text-center text-2xl tracking-[0.5em] font-black shadow-inner"
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : 'Enter Brain'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { Loader2 } from 'lucide-react';
