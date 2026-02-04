'use client';

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
import { MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const mockUsers = [
  { id: 'user1', name: 'Jane Doe', email: 'jane.doe@example.com', avatar: 'https://picsum.photos/seed/101/100/100' },
  { id: 'user2', name: 'John Smith', email: 'john.smith@example.com', avatar: 'https://picsum.photos/seed/102/100/100' },
  { id: 'user3', name: 'Alice Johnson', email: 'alice.j@example.com', avatar: 'https://picsum.photos/seed/103/100/100' },
  { id: 'user4', name: 'Bob Williams', email: 'b.williams@example.com', avatar: 'https://picsum.photos/seed/104/100/100' },
];

export default function ManagerUsersPage() {
  const { toast } = useToast();

  const handleAction = (action: string, userName: string) => {
    toast({
      title: 'Action Triggered',
      description: `${action} clicked for user ${userName}.`,
    });
    // In a real app, this would perform the action.
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage all registered users on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAction('View Account', user.name)}>
                          View Account
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('Block', user.name)}>
                          Block
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleAction('Delete', user.name)} className="text-destructive">
                          Delete
                        </DropdownMenuItem>
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
