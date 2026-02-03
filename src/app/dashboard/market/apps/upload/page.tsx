'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

function AppUploadWarning({ onAccept }: { onAccept: () => void }) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-destructive" />
          Important: App Submission Rules
        </CardTitle>
        <CardDescription>Please read these terms carefully before uploading your application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Warning!</AlertTitle>
          <AlertDescription>
            We take the security of our users very seriously. Uploading fake applications, malware, or any form of malicious software is strictly prohibited and will result in a permanent ban from our platform.
          </AlertDescription>
        </Alert>
        <div className="text-sm text-muted-foreground space-y-2">
            <p>By proceeding, you agree to the following:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>You are the rightful owner or have explicit permission to distribute the application you are uploading.</li>
                <li>Your application does not contain any malicious code, viruses, or spyware.</li>
                <li>All transactions made through the marketplace are subject to a service charge for both the buyer and the seller. This is to maintain the platform and ensure a secure environment.</li>
                <li>Violating these terms will lead to immediate account suspension and potential legal action.</li>
            </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onAccept} className="w-full">I have read and agree to the terms</Button>
      </CardFooter>
    </Card>
  );
}

function AppUploadForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate upload
        setTimeout(() => {
            toast({
                title: "App Submitted",
                description: "Your app is now under review."
            });
            router.push('/dashboard/market');
        }, 1500);
    }

  return (
     <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle>Upload Your App</CardTitle>
            <CardDescription>Fill in the details below to list your application on the marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="appName">App Name</Label>
                    <Input id="appName" placeholder="e.g., I-Pay Connect" required/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select required>
                        <SelectTrigger id="platform">
                            <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="android">Android (.apk, .aab)</SelectItem>
                            <SelectItem value="ios">iOS (.ipa)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="description">App Description</Label>
                    <Textarea id="description" placeholder="Describe what your app does..." required/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="appFile">Application File</Label>
                     <div className="h-32 bg-muted rounded-md flex items-center justify-center cursor-pointer border-2 border-dashed">
                      <div className="text-center text-muted-foreground">
                        <UploadCloud className="mx-auto h-10 w-10" />
                        <p>Click or drag file to upload</p>
                      </div>
                    </div>
                    <Input id="appFile" type="file" className="hidden"/>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Submitting..." : "Submit App for Review"}
                </Button>
            </form>
        </CardContent>
     </Card>
  );
}


export default function UploadAppPage() {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="container py-8">
      <Link href="/dashboard/market" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Market
      </Link>
      
      {!accepted ? (
        <AppUploadWarning onAccept={() => setAccepted(true)} />
      ) : (
        <AppUploadForm />
      )}
    </div>
  );
}
