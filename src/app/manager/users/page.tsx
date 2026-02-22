'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreVertical, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

export default function ManagerUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID_PROFILES,
        [Query.limit(100), Query.orderDesc('$createdAt')] // Get latest 100 users
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

  const handleAction = (action: string, userName: string) => {
    toast({
      title: 'Action Triggered',
      description: `${action} clicked for user ${userName}. (This is a placeholder).`,
    });
    // In a real app, this would perform the action.
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
                    <TableRow key={user.$id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.avatar} alt={user.username} />
                            <AvatarFallback>{user.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username || 'N/A'}</span>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{user.$id}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAction('View User', user.username)}>
                            View User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction('Suspend User', user.username)}>
                            Suspend User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction('Delete User', user.username)} className="text-destructive">
                            Delete User
                            </DropdownMenuItem>
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
