'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { MoreVertical, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChatPage() {
  const { user: currentUser, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [search, setSearch] = useState('');

  // Fetch all users
  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: allUsers, loading: usersLoading } = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!allUsers || !currentUser) return [];
    const searchTerm = search.toLowerCase();
    return allUsers
      .filter(user => user.uid !== currentUser.uid) // Exclude current user
      .filter(user => 
        user.username?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
      );
  }, [allUsers, currentUser, search]);
  
  // This is a placeholder for recent chats logic
  const recentUsers = filteredUsers;

  const isLoading = userLoading || usersLoading;

  const UserItem = ({ user }: { user: any }) => (
     <div className="flex items-center justify-between">
        <Link href={`/dashboard/chat/${user.uid}`} className="flex items-center gap-3 flex-1">
            <Avatar>
              <AvatarImage src={user.avatar || `https://picsum.photos/seed/${user.uid}/100/100`} alt={user.username || user.email} />
              <AvatarFallback>{(user.username || user.email)?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <span className="font-semibold">{user.username || user.email}</span>
                 {user.username && <p className="text-sm text-muted-foreground truncate">{user.email}</p>}
            </div>
        </Link>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
            <DropdownMenuItem asChild>
                <Link href={`/dashboard/chat/${user.uid}`}>Chat</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Block</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  )

  const renderContent = (users: any[]) => {
      if (users.length > 0) {
        return (
            <div className="p-4 space-y-4">
                {users.map(user => <UserItem key={user.id} user={user} />)}
            </div>
        );
      }
      if (!isLoading) {
          return <p className="text-center text-muted-foreground p-6">No users found.</p>
      }
      return null;
  }

  return (
    <div className="container py-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
            placeholder="Search for a user..." 
            className="pl-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {renderContent(filteredUsers)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent">
          <Card>
             <CardContent className="p-0">
               {renderContent(recentUsers)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
