'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreVertical, Search, ShieldAlert, UserX, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases, storage, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_POSTS, COLLECTION_ID_POST_COMMENTS, COLLECTION_ID_TRANSACTIONS, BUCKET_ID_UPLOADS, Query } from '@/lib/appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ManagerUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fetchUsers = useCallback(() => {
    setLoading(true);
    databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID_PROFILES,
        [Query.limit(100), Query.orderDesc('$createdAt')]
    ).then(response => {
        setUsers(response.documents);
    }).catch(error => {
        console.error("Failed to fetch users:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch the list of users.',
        });
    }).finally(() => {
        setLoading(false);
    });
  }, [toast]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuspendToggle = async (user: any) => {
    const isCurrentlyBanned = user.isBanned || false;
    const action = isCurrentlyBanned ? 'Unsuspend' : 'Suspend';
    toast({ title: `${action}ing user...` });

    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, { isBanned: !isCurrentlyBanned });
        toast({ title: `User ${action}ed`, description: `${user.username} has been ${action.toLowerCase()}ed.` });
        fetchUsers(); // Refresh the list
    } catch (error: any) {
        toast({ title: 'Action Failed', description: error.message, variant: 'destructive' });
    }
  };

  const getFileIdFromUrl = (url: string) => {
    try {
        const urlParts = url.split('/files/');
        if (urlParts.length < 2) return null;
        return urlParts[1].split('/view')[0];
    } catch (e) {
        return null;
    }
  };

  const handleDeleteUser = async (user: any) => {
    toast({ title: 'Deleting user and all their data...', description: 'This may take a moment.' });
    try {
        // Delete all posts (and associated media/comments) by the user
        const userPosts = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POSTS, [Query.equal('userId', user.$id)]);
        for (const post of userPosts.documents) {
            if (post.mediaUrl) {
                const fileId = getFileIdFromUrl(post.mediaUrl);
                if (fileId) await storage.deleteFile(BUCKET_ID_UPLOADS, fileId);
            }
            const postComments = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_POST_COMMENTS, [Query.equal('postId', post.$id)]);
            for (const comment of postComments.documents) {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_POST_COMMENTS, comment.$id);
            }
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_POSTS, post.$id);
        }

        // Delete all transactions by the user
        const userTransactions = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, [Query.equal('userId', user.$id)]);
        for (const tx of userTransactions.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_TRANSACTIONS, tx.$id);
        }

        // Finally, delete the user profile document
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id);

        toast({ title: 'User Deleted', description: `${user.username} and all their data have been permanently removed.` });
        fetchUsers(); // Refresh the list
    } catch (error: any) {
         toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
    }
  };


  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const lowercasedQuery = searchQuery.toLowerCase();
    return users.filter(user => 
        user.username?.toLowerCase().includes(lowercasedQuery) ||
        user.email?.toLowerCase().includes(lowercasedQuery) ||
        user.$id?.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery, users]);

  return (
    <div className="container py-8">
      <Card className="rounded-[2.5rem] shadow-xl overflow-hidden border-none">
        <CardHeader className="bg-primary/5 pb-8 text-center">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">I-Pay Users Hub</CardTitle>
          <CardDescription className="font-bold">Total Management of Registered Identities</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search ID, username, or email..."
                    className="pl-11 h-12 rounded-2xl bg-muted border-none shadow-none font-bold"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          <Table>
            <TableHeader>
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="font-black uppercase text-[10px]">User</TableHead>
                <TableHead className="hidden md:table-cell font-black uppercase text-[10px]">Email</TableHead>
                <TableHead className="hidden sm:table-cell font-black uppercase text-[10px]">UID</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px]">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-5 w-24" /></div></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                    <TableRow key={user.$id} className={cn("border-muted/20", user.isBanned && "bg-destructive/5 text-destructive")}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarImage src={user.avatar} alt={user.username} />
                            <AvatarFallback className="font-black bg-muted text-foreground/30">{user.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-xs">@{user.username || 'N/A'}</span>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-medium opacity-70">{user.email || 'N/A'}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-[9px] opacity-40 uppercase">{user.$id}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                            <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-black uppercase text-[10px]">
                            <DropdownMenuItem asChild>
                                <Link href={`/manager/users/view/${user.$id}`} className="flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> Open Record</Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleSuspendToggle(user)} className="flex items-center gap-2">
                                {user.isBanned ? <Check className="h-3.5 w-3.5 text-green-500"/> : <ShieldAlert className="h-3.5 w-3.5 text-destructive"/> }
                                {user.isBanned ? 'Unsuspend' : 'Suspend'}
                            </DropdownMenuItem>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive flex items-center gap-2">
                                        <Trash2 className="h-3.5 w-3.5" /> WIPE USER
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-black uppercase text-center">Master Wipe Command</AlertDialogTitle>
                                        <AlertDialogDescription className="text-center font-bold text-xs">
                                            This will permanently delete {user.username} and all associated cloud assets (Posts, Media, History). This cannot be reversed.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-row gap-2">
                                        <AlertDialogCancel className="flex-1 rounded-xl">Cancel</AlertDialogCancel>
                                        <AlertDialogAction className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl" onClick={() => handleDeleteUser(user)}>Wipe Data</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground font-bold">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
