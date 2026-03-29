
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { countries } from '@/lib/countries';
import { IPayLogo } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading, recheckUser } = useUser();

  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!userLoading && !user) {
        router.replace('/auth/signup');
    }
  }, [user, userLoading, router]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d{0,5}$/.test(value)) {
      setPin(value);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!username || !country || pin.length !== 5) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Username, country, and a 5-digit PIN are required.',
      });
      return;
    }
    setIsLoading(true);

    try {
        await account.updateName(username);

        // FORCE FIX: Sending ONLY the requested attributes to prevent "Invalid Attribute" errors
        const profileData = {
            username: username,
            country: country,
            pin: pin,
            avatar: ''
        };

        await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID_PROFILES,
            user.$id,
            profileData
        );
        
        sessionStorage.setItem('ipay_pin_verified', 'true');
        localStorage.setItem('ipay_last_active', Date.now().toString());

        await recheckUser();

        toast({
            title: 'Profile Complete!',
            description: 'Welcome to I-Pay.',
        });

        router.push('/dashboard');

    } catch (error: any) {
        console.error("Profile setup error:", error);
        if (error.code === 409 || error.type === 'document_already_exists') {
             sessionStorage.setItem('ipay_pin_verified', 'true');
             router.push('/dashboard');
             return;
        }
        
        toast({
            variant: 'destructive',
            title: 'Setup Failed',
            description: error.message || 'A database error occurred.',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (userLoading || !user) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-background p-4">
              <Loader2 className="animate-spin h-12 w-12 text-primary" />
          </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <IPayLogo className="mx-auto h-12 w-12" />
          <CardTitle className="mt-4 text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Just a few more details to get you set up.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSetup} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                 <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., johndoe"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select onValueChange={setCountry} value={country} required>
                    <SelectTrigger id="country" disabled={isLoading}>
                        <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map((c) => (
                            <SelectItem key={c.value} value={c.label}>
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">5-Digit Transaction PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={handlePinChange}
                maxLength={5}
                placeholder="*****"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !username || !country || pin.length !== 5}>
              {isLoading ? "Saving Profile..." : "Finish Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
