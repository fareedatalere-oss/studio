'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, Query } from '@/lib/appwrite';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MoreVertical, Search, ShieldAlert, UserX, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const MIN_FOLLOWERS = 10000;

export default function ManagerCreatorsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const hasBypass = sessionStorage.getItem('manager-creators-bypass') === 'true';
    if (!hasBypass) {
      router.replace('/manager/creators/bypass');
      return;
    }

    const fetchCreators = async () => {
      setLoading(true);
      try {
        const response = await databases.listDocuments(
          DATABASE_ID, 
          COLLECTION_ID_PROFILES, 
          [Query.limit(100)]
        );
        
        const eligibleCreators = response.documents.filter(user => (user.followers?.length || 0) >= MIN_FOLLOWERS);
        setCreators(eligibleCreators);

      } catch (error) {
        console.error("Failed to fetch creators:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load content creators.' });
      } finally {
        setLoading(false);
      }
    };
    fetchCreators();
  }, [router, toast]);

  const handleBanToggle = async (user: any) => {
    const isCurrentlyBanned = user.isBanned || false;
    const action = isCurrentlyBanned ? 'Unban' : 'Ban';
    toast({ title: `${action}ning user...`});

    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, {
            isBanned: !isCurrentlyBanned
        });
        setCreators(prev => prev.map(c => c.$id === user.$id ? { ...c, isBanned: !isCurrentlyBanned } : c));
        toast({ title: `User ${action}ned`, description: `${user.username} has been ${action.toLowerCase()}ned.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not ${action.toLowerCase()} user.` });
    }
  };

  const filteredCreators = useMemo(() => {
    if (!searchQuery) return creators;
    const lowercasedQuery = searchQuery.toLowerCase();
    return creators.filter(c =>
      c.username?.toLowerCase().includes(lowercasedQuery) ||
      c.email?.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery, creators]);

  if (loading) {
    return (
        <div className="container py-8 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    )
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Content Creator Management</CardTitle>
          <CardDescription>Review and manage users with over {MIN_FOLLOWERS.toLocaleString()} followers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by username or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {filteredCreators.length > 0 ? (
            <div className="space-y-4">
              {filteredCreators.map(user => (
                <Card key={user.$id} className={user.isBanned ? 'bg-destructive/10 border-destructive' : ''}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">Followers: {(user.followers?.length || 0).toLocaleString()}</p>
                      </div>
                    </div>
                     <div className="text-right">
                         <p className="font-mono font-bold text-lg">₦{user.nairaBalance?.toLocaleString() || '0.00'}</p>
                         <p className="text-xs text-muted-foreground">{user.accountNumber || 'No Account Number'}</p>
                     </div>
                    <AlertDialog>
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical/></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                 <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className={user.isBanned ? 'text-green-600' : 'text-destructive'}>
                                        {user.isBanned ? <UserX className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                        <span>{user.isBanned ? 'Unban User' : 'Ban User'}</span>
                                    </DropdownMenuItem>
                                 </AlertDialogTrigger>
                            </DropdownMenuContent>
                       </DropdownMenu>
                       <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {user.isBanned ? `This will unban ${user.username}, allowing them to use the app normally again.` : `This will ban ${user.username}, restricting their access.`}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleBanToggle(user)} className={user.isBanned ? '' : 'bg-destructive hover:bg-destructive/80'}>
                                    {user.isBanned ? 'Confirm Unban' : 'Confirm Ban'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                       </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10">No creators found matching the criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}