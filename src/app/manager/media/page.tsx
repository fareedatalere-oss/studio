'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { MoreVertical, ShieldAlert, Trash2, EyeOff, Eye, Loader2, UserMinus, UserCheck, ShieldCheck, ShieldX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { databases, DATABASE_ID, COLLECTION_ID_APPS, COLLECTION_ID_PRODUCTS, COLLECTION_ID_BOOKS, COLLECTION_ID_UPWORK_PROFILES, COLLECTION_ID_PROFILES } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const marketCollections = [
    COLLECTION_ID_APPS,
    COLLECTION_ID_PRODUCTS,
    COLLECTION_ID_BOOKS,
    COLLECTION_ID_UPWORK_PROFILES,
];

const MarketItemsManager = ({ collectionId, collectionName }: { collectionId: string, collectionName: string }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, collectionId, [Query.limit(100), Query.orderDesc('$createdAt')]);
            setItems(response.documents);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not load ${collectionName}.` });
        } finally {
            setLoading(false);
        }
    }, [collectionId, collectionName, toast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleUpdate = async (id: string, data: object, successMessage: string) => {
        try {
            await databases.updateDocument(DATABASE_ID, collectionId, id, data);
            toast({ title: 'Success', description: successMessage });
            fetchItems(); // Refresh data
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await databases.deleteDocument(DATABASE_ID, collectionId, id);
            toast({ title: 'Success', description: 'Item permanently deleted.' });
            setItems(prev => prev.filter(item => item.$id !== id));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    if (loading) return <Skeleton className="h-48 w-full" />;

    return (
        <Card>
            <CardContent className="p-4">
                {items.length > 0 ? (
                    <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Seller ID</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.$id} className={cn(item.isBanned && "bg-destructive/10", item.isHidden && "opacity-50")}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="font-mono text-xs">{item.sellerId}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {item.isBanned && <span className="text-xs font-semibold text-destructive">Banned</span>}
                                            {item.isHidden && <span className="text-xs font-semibold text-muted-foreground">Hidden</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleUpdate(item.$id, { isBanned: !item.isBanned }, `Item ${item.isBanned ? 'unbanned' : 'banned'}.`)}>
                                                    {item.isBanned ? <ShieldCheck className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                                    {item.isBanned ? 'Unban' : 'Ban'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdate(item.$id, { isHidden: !item.isHidden }, `Item ${item.isHidden ? 'unhidden' : 'hidden'}.`)}>
                                                    {item.isHidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                                                    {item.isHidden ? 'Unhide' : 'Hide'}
                                                </DropdownMenuItem>
                                                <AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{item.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.$id)} className="bg-destructive hover:bg-destructive/90">Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-center text-muted-foreground p-8">No items found in {collectionName}.</p>}
            </CardContent>
        </Card>
    );
};

const SubscribersManager = () => {
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchSubscribers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PROFILES, [Query.equal('isMarketplaceSubscribed', true), Query.limit(100)]);
            setSubscribers(response.documents);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load subscribers.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSubscribers();
    }, [fetchSubscribers]);

    const handleUpdateUser = async (id: string, data: object, successMessage: string) => {
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, id, data);
            toast({ title: 'Success', description: successMessage });
            fetchSubscribers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };
    
    const handleRemoveSubscription = async (user: any) => {
        toast({ title: 'Processing...', description: `Removing subscription and all posts for ${user.username}. This may take a while.` });
        try {
            // First, revoke subscription
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PROFILES, user.$id, { isMarketplaceSubscribed: false });

            // Then, delete all posts from all market collections
            for (const collectionId of marketCollections) {
                let hasMore = true;
                while (hasMore) {
                    const response = await databases.listDocuments(collectionId, [Query.equal('sellerId', user.$id), Query.limit(25)]);
                    if (response.documents.length > 0) {
                        await Promise.all(response.documents.map(doc => databases.deleteDocument(collectionId, doc.$id)));
                    }
                    hasMore = response.documents.length === 25;
                }
            }
            toast({ title: 'Success', description: `${user.username}'s subscription and all their market posts have been removed.` });
            fetchSubscribers();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: `An error occurred: ${error.message}` });
        }
    };

    if (loading) return <Skeleton className="h-48 w-full" />;

    return (
         <Card>
            <CardContent className="p-4">
                {subscribers.length > 0 ? (
                    <Table>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {subscribers.map(user => (
                                <TableRow key={user.$id} className={cn(user.isBanned && "bg-destructive/10")}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10"><AvatarImage src={user.avatar} /><AvatarFallback>{user.username?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="font-semibold">{user.username}</p>
                                                <p className="text-xs font-mono text-muted-foreground">{user.$id}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.isBanned && <span className="text-xs font-semibold text-destructive">Banned</span>}</TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleUpdateUser(user.$id, { isMarketplaceSubscribed: false }, `${user.username}'s subscription has been revoked.`)}>
                                                    <UserMinus className="mr-2 h-4 w-4" /> Revoke Subscription
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateUser(user.$id, { isBanned: !user.isBanned }, `User ${user.isBanned ? 'unbanned' : 'banned'}.`)}>
                                                     {user.isBanned ? <ShieldCheck className="mr-2 h-4 w-4" /> : <ShieldX className="mr-2 h-4 w-4" />}
                                                     {user.isBanned ? 'Unban User' : 'Ban User'}
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Remove Subscription & Posts</DropdownMenuItem></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all of this user's market posts and revoke their subscription. They will have to pay to subscribe again. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveSubscription(user)} className="bg-destructive hover:bg-destructive/90">Confirm Removal</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-center text-muted-foreground p-8">No subscribed users found.</p>}
            </CardContent>
        </Card>
    )
}

export default function ManagerMediaPage() {
   const router = useRouter();
   const [loading, setLoading] = useState(true);

   useEffect(() => {
    const hasBypass = sessionStorage.getItem('manager-media-bypass') === 'true';
    if (!hasBypass) {
      router.replace('/manager/media/bypass');
    } else {
        setLoading(false);
    }
  }, [router]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Media & Market Management</h1>
        <Tabs defaultValue="apps" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="apps">Apps</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="bookstore">Bookstore</TabsTrigger>
                <TabsTrigger value="upwork">Upwork</TabsTrigger>
                <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            </TabsList>
            <TabsContent value="apps" className="mt-4"><MarketItemsManager collectionId={COLLECTION_ID_APPS} collectionName="Apps" /></TabsContent>
            <TabsContent value="products" className="mt-4"><MarketItemsManager collectionId={COLLECTION_ID_PRODUCTS} collectionName="Products" /></TabsContent>
            <TabsContent value="bookstore" className="mt-4"><MarketItemsManager collectionId={COLLECTION_ID_BOOKS} collectionName="Books" /></TabsContent>
            <TabsContent value="upwork" className="mt-4"><MarketItemsManager collectionId={COLLECTION_ID_UPWORK_PROFILES} collectionName="Upwork Profiles" /></TabsContent>
            <TabsContent value="subscribers" className="mt-4"><SubscribersManager /></TabsContent>
      </Tabs>
    </div>
  );
}

    