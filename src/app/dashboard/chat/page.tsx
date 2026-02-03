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
import { useState } from 'react';

const allUsers = [
  {
    id: 'user1',
    name: 'Jane Doe',
    avatar: 'https://picsum.photos/seed/101/100/100',
    lastMessage: 'Doing great. Just working on the I-Pay app.',
    isRecent: true,
  },
  {
    id: 'user2',
    name: 'John Smith',
    avatar: 'https://picsum.photos/seed/102/100/100',
    lastMessage: 'See you tomorrow!',
    isRecent: true,
  },
  {
    id: 'user3',
    name: 'Alice Johnson',
    avatar: 'https://picsum.photos/seed/103/100/100',
    lastMessage: 'Okay, sounds good.',
    isRecent: false,
  },
    {
    id: 'user4',
    name: 'Bob Williams',
    avatar: 'https://picsum.photos/seed/104/100/100',
    lastMessage: 'Can you send me the file?',
    isRecent: false,
  },
];


export default function ChatPage() {
  const [search, setSearch] = useState('');

  const filteredUsers = allUsers.filter(user => user.name.toLowerCase().includes(search.toLowerCase()));
  const recentUsers = filteredUsers.filter(user => user.isRecent);

  const UserItem = ({ user }: { user: typeof allUsers[0] }) => (
     <div className="flex items-center justify-between">
        <Link href={`/dashboard/chat/${user.id}`} className="flex items-center gap-3 flex-1">
            <Avatar>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <span className="font-semibold">{user.name}</span>
                <p className="text-sm text-muted-foreground truncate">{user.lastMessage}</p>
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
                <Link href={`/dashboard/chat/${user.id}`}>Chat</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Block</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  )

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
            <CardContent className="p-4 space-y-4">
              {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => <UserItem key={user.id} user={user} />)
              ) : (
                <p className="text-center text-muted-foreground p-6">No users found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent">
          <Card>
            <CardContent className="p-4 space-y-4">
               {recentUsers.length > 0 ? (
                  recentUsers.map(user => <UserItem key={user.id} user={user} />)
              ) : (
                <p className="text-center text-muted-foreground p-6">No recent chats.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
