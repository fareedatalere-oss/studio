
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
import { MoreVertical, Search, ShieldAlert, UserX, Trash2, Eye, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases, storage, DATABASE_ID, COLLECTION_ID_PROFILES, COLLECTION_ID_POSTS, COLLECTION_ID_POST_COMMENTS, COLLECTION_ID_TRANSACTIONS, BUCKET_ID_UPLOADS, Query } from '@/lib/data-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * @fileOverview Manager Users Page.
 * UPGRADED: Added Suspend, Block, and Delete master logic.
 */

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
    }).catch(() => {
        toast({ variant: 'destructive', title: 'Fetch Error' });
    }).finally(() => {
        setLoading(false);
    });
  }, [toast]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBlockToggle = async (user: any) => {
    const newState = !user.isBlocked;
    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, { isBlocked: newState });
        toast({ title: newState ? 'User Blocked' : 'User Unblocked' });
        fetchUsers();
    } catch (e: any) { toast({ title: 'Fail', description: e.message }); }
  };

  const handleSuspendToggle = async (user: any) => {
    const newState = !user.isSuspended;
    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, { isSuspended: newState });
        toast({ title: newState ? 'User Suspended' : 'User Unsuspended' });
        fetchUsers();
    } catch (e: any) { toast({ title: 'Fail', description: e.message }); }
  };

  const handleDeleteUser = async (user: any) => {
    toast({ title: 'Wiping user data...' });
    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id);
        toast({ title: 'User Deleted Permanently' });
        fetchUsers();
    } catch (e: any) { toast({ title: 'Delete Failed', description: e.message }); }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [searchQuery, users]);

  return (
    <div className="container py-8 max-w-6xl">
      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8 text-center">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Identity Management</CardTitle>
          <CardDescription className="font-bold">Total Control of I-Pay Users</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search user..." className="pl-11 h-12 rounded-2xl bg-muted border-none font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          <Table>
            <TableHeader><TableRow className="border-none"><TableHead className="font-black uppercase text-[10px]">Identity</TableHead><TableHead className="font-black uppercase text-[10px]">Status</TableHead><TableHead className="text-right font-black uppercase text-[10px]">Master Command</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? [1,2,3].map(i => <TableRow key={i}><TableCell><Skeleton className="h-10 w-32"/></TableCell><TableCell><Skeleton className="h-10 w-20"/></TableCell><TableCell><Skeleton className="h-8 w-8 ml-auto"/></TableCell></TableRow>) : filteredUsers.map((u) => (
                <TableRow key={u.$id} className={cn("border-muted/20", u.isBlocked && "bg-destructive/5")}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={u.avatar}/><AvatarFallback className="font-black uppercase">{u.username?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-black text-xs uppercase">@{u.username}</span>
                        <span className="text-[8px] font-bold opacity-50 uppercase">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                        {u.isBlocked && <Badge variant="destructive" className="text-[7px] font-black uppercase h-4">Blocked</Badge>}
                        {u.isSuspended && <Badge variant="outline" className="text-[7px] font-black uppercase h-4 border-primary text-primary">Suspended</Badge>}
                        {!u.isBlocked && !u.isSuspended && <Badge variant="secondary" className="text-[7px] font-black uppercase h-4 text-green-600">Active</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="font-black uppercase text-[10px]">
                        <DropdownMenuItem asChild><Link href={`/manager/users/view/${u.$id}`}><Eye className="mr-2 h-3.5 w-3.5" /> Preview Identity</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBlockToggle(u)} className={u.isBlocked ? "text-green-600" : "text-destructive"}><UserX className="mr-2 h-3.5 w-3.5" /> {u.isBlocked ? 'Unblock User' : 'BLOCK USER'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSuspendToggle(u)}><ShieldAlert className="mr-2 h-3.5 w-3.5" /> {u.isSuspended ? 'Unsuspend' : 'Suspend Postings'}</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive font-black"><Trash2 className="mr-2 h-3.5 w-3.5" /> WIPE ACCOUNT</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem]">
                                <AlertDialogHeader><AlertDialogTitle>Confirm Master Wipe?</AlertDialogTitle><AlertDialogDescription>This will delete @{u.username} permanently. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-2">
                                    <AlertDialogCancel className="flex-1 rounded-xl font-black uppercase">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase" onClick={() => handleDeleteUser(u)}>Wipe Identity</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
