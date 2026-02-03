'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function GetAccountNumberPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    ninBvn: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call to Flutterwave
    console.log('Generating account number with data:', formData);
    
    // Simulate a delay for the API call
    setTimeout(() => {
      const generatedAccountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      
      toast({
        title: 'Success!',
        description: 'A valid account number has been generated.',
      });

      // Redirect to dashboard with the new account number
      router.push(`/dashboard?accountNumber=${generatedAccountNumber}`);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="container py-8">
       <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
         <ArrowLeft className="h-4 w-4" />
         Back to Dashboard
       </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Generate Account Number</CardTitle>
          <CardDescription>
            Provide your details to generate a new account number. Your email is johndoe@example.com.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" value={formData.middleName} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ninBvn">NIN/BVN</Label>
              <Input id="ninBvn" value={formData.ninBvn} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Get Account Number'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
