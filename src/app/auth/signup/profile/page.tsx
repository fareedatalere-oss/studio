
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
  const { user, loading: userLoading } = useUser();

  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!userLoading && !user) {
        toast({
            title: 'Authentication Error',
            description: 'You need to sign up first.',
            variant: 'destructive',
        });
        router.replace('/auth/signup');
    }
  }, [user, userLoading, router, toast]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d{0,5}$/.test(value)) {
      setPin(value);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ title: 'Error', description: 'User not found.', variant: 'destructive'});
        return;
    }

    if (!username || !country || pin.length !== 5) {
      toast({
        title: 'Error',
        description: 'Username, country, and a 5-digit PIN are required.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    try {
        await account.updateName(username);

        // STRICT FIX: Removed 'createdAt' as it was causing "Unknown attribute" errors
        const profileData = {
            username: username,
            country: country,
            pin: pin,
            avatar: '',
            nairaBalance: 0,
            rewardBalance: 0,
            clickCount: 0,
            email: user.email,
            uid: user.$id
        };

        await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID_PROFILES,
            user.$id,
            profileData
        );
        
        sessionStorage.setItem('ipay_pin_verified', 'true');
        localStorage.setItem('ipay_last_active', Date.now().toString());

        toast({
            title: 'Profile Complete!',
            description: 'Welcome to I-Pay.',
        });

        router.push('/dashboard');

    } catch (error: any) {
        console.error("Profile setup error:", error);
        let errorMessage = error.message || 'A critical error occurred.';
        
        if (error.code === 404 && error.message.includes('Collection not found')) {
            errorMessage = 'The profiles collection has not been created in Appwrite.';
        } else if (error.type === 'document_already_exists' || error.code === 409) {
             errorMessage = 'A profile already exists. Redirecting...';
             sessionStorage.setItem('ipay_pin_verified', 'true');
             router.push('/dashboard');
        }
        
        toast({
            title: 'Setup Failed',
            description: errorMessage,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (userLoading || !user) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-background p-4">
              <Card className="w-full max-w-md">
                  <CardHeader>
                       <Skeleton className="h-8 w-48 mx-auto" />
                       <Skeleton className="h-4 w-64 mx-auto" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
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
