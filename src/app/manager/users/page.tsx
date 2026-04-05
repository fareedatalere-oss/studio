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
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage all registered users on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search by ID, username, or email..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">User ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    <TableRow key={user.$id} className={cn(user.isBanned && "bg-destructive/10 text-destructive")}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.avatar} alt={user.username} />
                            <AvatarFallback>{user.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username || 'N/A'}</span>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.email || 'N/A'}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{user.$id}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/manager/users/view/${user.$id}`}><Eye className="mr-2 h-4 w-4" />View & Edit User</Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleSuspendToggle(user)}>
                                {user.isBanned ? <UserX className="mr-2 h-4 w-4"/> : <ShieldAlert className="mr-2 h-4 w-4"/> }
                                {user.isBanned ? 'Unsuspend User' : 'Suspend User'}
                            </DropdownMenuItem>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete User
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete {user.username} and all of their data, including posts, comments, and transactions. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => handleDeleteUser(user)}>Delete Permanently</AlertDialogAction>
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
                    <TableCell colSpan={4} className="h-24 text-center">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}