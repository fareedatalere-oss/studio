'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, UploadCloud, ImageIcon, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

export default function UploadUpworkProfilePage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [certificate, setCertificate] = useState<File | null>(null);
    const [introVideo, setIntroVideo] = useState<File | null>(null);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const certificateInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      setter: React.Dispatch<React.SetStateAction<File | null>>,
      previewSetter?: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setter(file);
            if (previewSetter) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    previewSetter(loadEvent.target?.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Profile Created!",
                description: "Your Upwork profile is now live on the marketplace.",
                 action: (
                  <ToastAction altText="View" asChild>
                    <Link href="/dashboard/market?tab=upwork">View</Link>
                  </ToastAction>
                ),
            });
            router.push('/dashboard/market?tab=upwork&new_upwork=true');
        }, 1500);
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
                        <Label htmlFor="name">Your Name</Label>
                        <Input id="name" placeholder="e.g., John Doe" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Professional Background</Label>
                        <Input id="title" placeholder="e.g., Senior Developer, Lawyer" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description of Work (max 200 characters)</Label>
                        <Textarea id="description" placeholder="Tell us about your skills and experience..." required rows={4} maxLength={200}/>
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
                        <Label htmlFor="video">Introductory Video (max 5 mins)</Label>
                         <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => videoInputRef.current?.click()}>
                            <Film />
                           {introVideo ? introVideo.name : 'Upload Video'}
                        </Button>
                        <Input id="video" type="file" className="hidden" ref={videoInputRef} onChange={(e) => handleFileChange(e, setIntroVideo)} accept="video/*" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" placeholder="Your contact number" required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Your Address</Label>
                        <Input id="address" placeholder="City, Country" required/>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating Profile..." : "Done"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
