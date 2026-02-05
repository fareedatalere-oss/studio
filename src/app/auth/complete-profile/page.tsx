'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { countries } from '@/lib/countries';
import { useUser } from '@/hooks/use-appwrite';
import { databases } from '@/lib/appwrite';

// TODO: Replace with your actual Database and Collection IDs from Appwrite
const DATABASE_ID = 'i-pay-db'; // example: '60d5e2d6b3f7e'
const COLLECTION_ID_PROFILES = 'profiles'; // example: '60d5e2f1d8c0f'

export default function CompleteProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();

  const [formData, setFormData] = useState({
    country: '',
    username: '',
    pin: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign up or sign in first.',
        variant: 'destructive',
      });
      router.replace('/auth/signup');
    }
  }, [user, userLoading, router, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
     if (id === 'pin') {
      if (/^\d{0,5}$/.test(value)) {
        setFormData((prev) => ({ ...prev, [id]: value }));
      }
    } else {
        setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, country: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Not authenticated', description: 'No user is signed in.', variant: 'destructive' });
      return;
    }

    if (DATABASE_ID.includes('YOUR_') || COLLECTION_ID_PROFILES.includes('YOUR_')) {
        toast({
            title: "Configuration Needed",
            description: "Please ask your AI assistant to configure the database and collection IDs in src/app/auth/complete-profile/page.tsx before saving your profile.",
            variant: "destructive",
            duration: 9000,
        });
        return;
    }
    
    setIsProcessing(true);

    try {
      const profileData = {
        userId: user.$id,
        email: user.email,
        username: formData.username,
        country: formData.country,
        pin: formData.pin,
      };

      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID_PROFILES,
        user.$id, // Use user's Appwrite ID as document ID
        profileData
      );

      toast({
        title: "Profile Complete!",
        description: "Your account is all set up.",
      });

      router.push('/dashboard');

    } catch (error: any) {
        console.error("Profile completion error:", error);
        toast({
            title: 'An Error Occurred',
            description: error.message || 'Could not complete your profile. Please try again.',
            variant: 'destructive',
        });
    } finally {
      setIsProcessing(false);
    }
  };

  if (userLoading) {
      return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            Just a few more details to get you started. Before saving, ensure your developer has set up the 'profiles' collection in your Appwrite database with the necessary attributes (userId, username, country, pin) and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select onValueChange={handleSelectChange} value={formData.country} required>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. johndoe"
                required
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">5-Digit Transaction PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.pin}
                onChange={handleChange}
                maxLength={5}
                placeholder="e.g. 12345"
                required
                disabled={isProcessing}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
