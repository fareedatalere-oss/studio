'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, PenSquare, Settings, Headset } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = authUser ? doc(firestore, 'users', authUser.uid) : null;
  const { data: userProfile, loading: profileLoading } = useDoc(userDocRef);

  const isLoading = userLoading || profileLoading;

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
        <Avatar className="h-24 w-24">
            <AvatarImage src="https://picsum.photos/seed/avatar/200/200" alt={userProfile?.username} />
            <AvatarFallback>
                {isLoading ? <Skeleton className="h-full w-full rounded-full" /> : (userProfile?.username?.charAt(0).toUpperCase() || authUser?.email?.charAt(0).toUpperCase() || 'U')}
            </AvatarFallback>
        </Avatar>
        
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
