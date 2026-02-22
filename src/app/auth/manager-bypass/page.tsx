'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const CORRECT_NAME = 'Ipaymanager';
const CORRECT_CLASS = '08162810155/07048468458';
const CORRECT_ID = 'Fahad0121';

export default function ManagerBypassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [managerClass, setManagerClass] = useState('');
  const [managerId, setManagerId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (name === CORRECT_NAME && managerClass === CORRECT_CLASS && managerId === CORRECT_ID) {
      toast({
        title: 'Access Granted',
        description: 'Welcome to the Manager Dashboard.',
      });
      router.push('/manager/dashboard');
    } else {
      toast({
        title: 'Access Denied',
        description: 'One or more bypass codes are incorrect.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-destructive">
            <ShieldAlert className="h-8 w-8" />
            Manager Security Check
          </CardTitle>
          <CardDescription>Please enter the bypass codes to proceed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>High Security Area!</AlertTitle>
            <AlertDescription>
              This is one of our powerful security layers. Unauthorized bypassing can lead to serious issues. If you have arrived here by mistake, GO BACK. Contact{' '}
              <a href="mailto:Ipayapp166@gmail.com" className="underline">
                Ipayapp166@gmail.com
              </a>{' '}
              if you believe this is an error.
            </AlertDescription>
          </Alert>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bypass-name">Name</Label>
              <Input
                id="bypass-name"
                type="password"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bypass-class">Class</Label>
              <Input
                id="bypass-class"
                type="password"
                value={managerClass}
                onChange={(e) => setManagerClass(e.target.value)}
                required
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="bypass-id">Manager ID</Label>
              <Input
                id="bypass-id"
                type="password"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Enter Dashboard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
