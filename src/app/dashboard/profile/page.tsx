
'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, PenSquare, Settings, Headset, Loader2, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, loading: userLoading, recheckUser, profile: userProfileFromHook } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (userProfileFromHook) {
        setUserProfile(userProfileFromHook);
        setProfileLoading(false);
    } else if (!userLoading) {
        setProfileLoading(false);
        if (authUser && !userProfileFromHook) {
            router.replace('/auth/signup/profile');
        }
    }
  }, [userProfileFromHook, userLoading, authUser, router]);

  const isLoading = userLoading || profileLoading;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    
    setIsUploading(true);
    toast({ title: 'Cloudinary Avatar Update...' });

    try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });

        const upload = await uploadToCloudinary(base64);
        if (!upload.success) throw new Error(upload.message);

        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, authUser.$id, {
            avatar: upload.url
        });
        
        await recheckUser();
        toast({ title: 'Profile Updated!' });
    } catch (error: any) {
        toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
        await account.deleteSession('current').catch(() => {});
        toast({ title: 'Logged Out' });
        router.push('/auth/signin');
    } catch (error) {
        router.push('/auth/signin');
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="container py-8 space-y-6">
      <div className="w-full bg-primary/10 border-2 border-primary/20 rounded-[1.5rem] p-3">
        <div className="flex items-center gap-3 animate-pulse">
            <Megaphone className="h-4 w-4 text-primary shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest text-primary truncate">
                Ads Control: New Features launching this Friday!
            </p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-primary shadow-lg">
                <AvatarImage src={userProfile?.avatar} alt={userProfile?.username} />
                <AvatarFallback className="font-black bg-primary text-white">{userProfile?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-7 w-7" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenSquare className="h-3 w-3" />}
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isUploading} />
        </div>
        
        <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">@{userProfile?.username || 'User'}</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{authUser?.email}</p>
        </div>

        <Card className="w-full max-w-md border-none shadow-sm rounded-2xl">
          <CardContent className="flex justify-around p-4 text-center">
            <Link href="/dashboard/profile/connections?tab=followers" className="flex-1">
              <p className="font-black text-base">{userProfile?.followers?.length || 0}</p>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Followers</p>
            </Link>
            <div className="w-px bg-muted h-8 my-auto"></div>
            <Link href="/dashboard/profile/connections?tab=following" className="flex-1">
              <p className="font-black text-base">{userProfile?.following?.length || 0}</p>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Following</p>
            </Link>
          </CardContent>
        </Card>

        <div className="w-full max-w-md space-y-2">
          <Button asChild variant="outline" className="w-full justify-start gap-3 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest"><Link href="/dashboard/profile/settings"><Settings className="h-4 w-4 text-primary" /> Settings</Link></Button>
          <Button asChild variant="outline" className="w-full justify-start gap-3 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest"><Link href="/dashboard/profile/support"><Headset className="h-4 w-4 text-primary" /> Contact Support</Link></Button>
          <Button asChild variant="outline" className="w-full justify-start gap-3 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest"><Link href="/dashboard/profile/posts"><PenSquare className="h-4 w-4 text-primary" /> My Posts</Link></Button>
          <Button onClick={handleLogout} className="w-full justify-start gap-3 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest mt-4" variant="destructive"><LogOut className="h-4 w-4" /> Log Out</Button>
        </div>
      </div>
    </div>
  );
}
