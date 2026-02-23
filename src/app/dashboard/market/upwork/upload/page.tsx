'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UploadCloud, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-appwrite';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_UPWORK_PROFILES, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID } from 'appwrite';

export default function UploadUpworkProfilePage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    // File state
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [certificate, setCertificate] = useState<File | null>(null);
    
    // Control state
    const [isLoading, setIsLoading] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const certificateInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      setter: React.Dispatch<React.SetStateAction<File | null>>,
      previewSetter?: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setter(file);
            if (previewSetter) {
                previewSetter(URL.createObjectURL(file));
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            toast({ variant: 'destructive', title: 'You must be logged in.' });
            return;
        }

        if (!title || !description || !phone || !address || !avatar || !certificate) {
            toast({ variant: 'destructive', title: 'Please fill all fields and upload all required files.' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Creating your profile...', description: 'This may take a moment.' });

        try {
            const [avatarUpload, certificateUpload] = await Promise.all([
                storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), avatar),
                storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), certificate),
            ]);

            const newProfile = {
                name: user.name,
                title,
                description,
                phoneNumber: phone,
                address,
                avatarUrl: getAppwriteStorageUrl(avatarUpload.$id),
                certificateUrl: getAppwriteStorageUrl(certificateUpload.$id),
                sellerId: user.$id // Keeping sellerId for now for potential future use or linking
            };

            await databases.createDocument(DATABASE_ID, COLLECTION_ID_UPWORK_PROFILES, ID.unique(), newProfile);
            
            toast({ title: "Profile Created!", description: "Your Upwork profile is now live on the marketplace." });
            router.push('/dashboard/market?tab=upwork');

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

  return (
     <div className="container py-8">
        <Link href="/dashboard/market/upwork/warning" className="flex items-center gap-2 mb-4 text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Rules
        </Link>
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Create Your Upwork Profile</CardTitle>
                <CardDescription>Fill in the details to showcase your skills.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="avatar">Profile Avatar</Label>
                        <div className="flex items-center gap-4">
                             <div 
                                className="w-24 h-24 bg-muted rounded-full flex items-center justify-center cursor-pointer border border-dashed overflow-hidden"
                                 onClick={() => avatarInputRef.current?.click()}
                            >
                                {avatarPreview ? (
                                    <Image src={avatarPreview} alt="Avatar Preview" width={96} height={96} className="object-cover"/>
                                ) : (
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>Choose Image</Button>
                        </div>
                        <Input id="avatar" type="file" className="hidden" ref={avatarInputRef} onChange={(e) => handleFileChange(e, setAvatar, setAvatarPreview)} accept="image/*" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Professional Background</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Senior Developer, Lawyer" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description of Work (max 200 characters)</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell us about your skills and experience..." required rows={4} maxLength={200}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="certificate">Certificate of Operation</Label>
                        <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => certificateInputRef.current?.click()}>
                            <UploadCloud />
                            {certificate ? certificate.name : 'Upload Certificate'}
                        </Button>
                        <Input id="certificate" type="file" className="hidden" ref={certificateInputRef} onChange={(e) => handleFileChange(e, setCertificate)} required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your contact number" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Your Address</Label>
                        <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="City, Country" required/>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Creating Profile...</> : "Done"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}

    