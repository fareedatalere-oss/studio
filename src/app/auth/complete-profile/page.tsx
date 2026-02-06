'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { countries } from '@/lib/countries';
import { account, databases } from '@/lib/appwrite';

const COLLECTION_ID_PROFILES = 'profiles';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    country: '',
    username: '',
    pin: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);

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
    setIsProcessing(true);

    try {
      const currentUser = await account.get();

      const profileData = {
        userId: currentUser.$id,
        email: currentUser.email,
        username: formData.username,
        country: formData.country,
        pin: formData.pin,
      };

      await databases.createDocument(
        COLLECTION_ID_PROFILES,
        currentUser.$id,
        profileData
      );

      router.push('/dashboard');

    } catch (error: any) {
        console.error("Profile completion error:", error);
        toast({
            title: 'An error occurred',
            description: error.message,
            variant: 'destructive',
        });
        setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            Just a few more details to get you started.
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
            <Button type="submit" className="w-full" disabled={isProcessing || !formData.country || !formData.username || formData.pin.length !== 5}>
              {isProcessing ? "Saving..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
