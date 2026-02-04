'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, PenSquare, Settings, Headset } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadToCloudinary } from '@/app/actions/upload';


export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const userDocRef = authUser ? doc(firestore, 'users', authUser.uid) : null;
  const { data: userProfile, loading: profileLoading } = useDoc(userDocRef);

  const isLoading = userLoading || profileLoading;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userDocRef) return;
    
    setIsUploading(true);
    toast({ title: 'Uploading new avatar...'});

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const fileDataUri = reader.result as string;
            const result = await uploadToCloudinary(fileDataUri);
            if (result.success && result.url) {
                await updateDoc(userDocRef, { avatar: result.url });
                toast({ title: 'Avatar Updated!', description: 'Your new avatar is now live.' });
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        };
        reader.onerror = (error) => {
            throw error;
        }
    } catch (error) {
        console.error("Avatar upload failed:", error);
        toast({ title: 'Upload Failed', description: 'Could not update your avatar.', variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleLogout = () => {
    // In a real app, you would also call signOut from firebase/auth
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    router.push('/auth/signin');
  };

  const mockStats = {
    followers: 1200,
    following: 340,
    likes: '10.5k',
  };

  const actions = [
    { label: 'Settings', icon: Settings, href: '/dashboard/profile/settings' },
    { label: 'Contact Support', icon: Headset, href: '/dashboard/profile/support' },
    { label: 'Post', icon: PenSquare, href: '/dashboard/media' },
  ];

  return (
    <div className="container py-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-primary">
                <AvatarImage src={userProfile?.avatar} alt={userProfile?.username} />
                <AvatarFallback>
                    {isLoading ? <Skeleton className="h-full w-full rounded-full" /> : (userProfile?.username?.charAt(0).toUpperCase() || authUser?.email?.charAt(0).toUpperCase() || 'U')}
                </AvatarFallback>
            </Avatar>
            <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <PenSquare className="h-4 w-4" />
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isUploading} />
        </div>
        
        <div className="text-center">
            {isLoading ? (
                <div className='space-y-2'>
                    <Skeleton className="h-8 w-32 mx-auto" />
                    <Skeleton className="h-4 w-40 mx-auto" />
                </div>
            ) : (
                <>
                    <h1 className="text-2xl font-bold">@{userProfile?.username || 'New User'}</h1>
                    <p className="text-sm text-muted-foreground">{authUser?.email}</p>
                </>
            )}
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="flex justify-around p-4 text-center">
            <Link href="/dashboard/profile/connections?tab=followers" className="flex-1">
              <p className="font-bold text-lg">{mockStats.followers.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </Link>
            <Link href="/dashboard/profile/connections?tab=following" className="flex-1">
              <p className="font-bold text-lg">{mockStats.following.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </Link>
            <div>
              <p className="font-bold text-lg">{mockStats.likes}</p>
              <p className="text-sm text-muted-foreground">Likes</p>
            </div>
          </CardContent>
        </Card>

        <div className="w-full max-w-md space-y-2">
          {actions.map((action) => (
            <Button asChild key={action.label} className="w-full justify-start gap-3">
                <Link href={action.href}>
                    <action.icon className="h-5 w-5" />
                    <span>{action.label}</span>
                </Link>
            </Button>
          ))}
          <Button onClick={handleLogout} className="w-full justify-start gap-3" variant="destructive">
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </Button>
        </div>
      </div>
    </div>
  );
}
