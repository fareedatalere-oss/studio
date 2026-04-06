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
import { account, databases, DATABASE_ID, COLLECTION_ID_PROFILES, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl, ID } from '@/lib/appwrite';

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
    toast({ title: 'Uploading new avatar...'});

    try {
        const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
        const fileUrl = getAppwriteStorageUrl(uploadResult.$id);

        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, authUser.$id, {
            avatar: fileUrl
        });
        setUserProfile((prev: any) => ({ ...prev, avatar: fileUrl }));
        await recheckUser();
        toast({ title: 'Avatar Updated!', description: 'Your new avatar is now live.' });
    } catch (error: any) {
        console.error("Avatar upload failed:", error);
        toast({ title: 'Upload Failed', description: error.message || 'Could not update your avatar.', variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
        await account.deleteSession('current').catch(() => {});
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        router.push('/auth/signin');
    } catch (error) {
        router.push('/auth/signin');
    }
  };

  const actions = [
    { label: 'Settings', icon: Settings, href: '/dashboard/profile/settings' },
    { label: 'Contact Support', icon: Headset, href: '/dashboard/profile/support' },
    { label: 'My Posts', icon: PenSquare, href: '/dashboard/profile/posts' },
  ];

  if (isLoading) {
      return (
          <div className="container py-8 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Syncing profile...</p>
          </div>
      );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Ads Control Header */}
      <div className="w-full bg-primary/10 border-2 border-primary/20 rounded-[1.5rem] p-3 relative overflow-hidden group">
        <div className="flex items-center gap-3 animate-pulse">
            <Megaphone className="h-4 w-4 text-primary shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest text-primary truncate">
                Ads Control: New Features launching this Friday! Stay tuned.
            </p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-primary shadow-lg">
                <AvatarImage src={userProfile?.avatar} alt={userProfile?.username} />
                <AvatarFallback>
                    {isLoading ? <Skeleton className="h-full w-full rounded-full" /> : (userProfile?.username?.charAt(0).toUpperCase() || authUser?.email?.charAt(0).toUpperCase() || 'U')}
                </AvatarFallback>
            </Avatar>
            <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-7 w-7" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <PenSquare className="h-3 w-3" />
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isUploading} />
        </div>
        
        <div className="text-center">
            {isLoading ? (
                <div className='space-y-2'>
                    <Skeleton className="h-6 w-32 mx-auto" />
                    <Skeleton className="h-3 w-40 mx-auto" />
                </div>
            ) : (
                <>
                    <h1 className="text-xl font-black uppercase tracking-tighter">@{userProfile?.username || 'User'}</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{authUser?.email}</p>
                </>
            )}
        </div>

        <Card className="w-full max-w-md border-none shadow-sm rounded-2xl">
          <CardContent className="flex justify-around p-4 text-center">
            <Link href="/dashboard/profile/connections?tab=followers" className="flex-1">
               {isLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : <p className="font-black text-base">{userProfile?.followers?.length || 0}</p>}
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Followers</p>
            </Link>
            <div className="w-px bg-muted h-8 my-auto"></div>
            <Link href="/dashboard/profile/connections?tab=following" className="flex-1">
               {isLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : <p className="font-black text-base">{userProfile?.following?.length || 0}</p>}
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Following</p>
            </Link>
          </CardContent>
        </Card>

        <div className="w-full max-w-md space-y-2">
          {actions.map((action) => (
            <Button asChild key={action.label} size="sm" variant="outline" className="w-full justify-start gap-3 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest">
                <Link href={action.href}>
                    <action.icon className="h-4 w-4 text-primary" />
                    <span>{action.label}</span>
                </Link>
            </Button>
          ))}
          <Button onClick={handleLogout} className="w-full justify-start gap-3 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest mt-4" variant="destructive" size="sm">
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </Button>
        </div>
      </div>
    </div>
  );
}