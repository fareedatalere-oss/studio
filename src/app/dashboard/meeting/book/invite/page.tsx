'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Link as LinkIcon, Users, Check, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { databases, DATABASE_ID, COLLECTION_ID_PROFILES, Query } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MeetingInvitePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [inviteMethod, setInviteMethod] = useState<'link' | 'list'>('link');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [meetingData, setMeetingData] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('pendingMeeting');
    if (!saved) {
      router.replace('/dashboard/meeting/book');
      return;
    }
    setMeetingData(JSON.parse(saved));
  }, [router]);

  useEffect(() => {
    if (inviteMethod === 'list') {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PROFILES, [Query.limit(100)]);
          setUsers(res.documents);
        } catch (e) {} finally { setLoadingUsers(false); }
      };
      fetchUsers();
    }
  }, [inviteMethod]);

  const handleFinish = () => {
    if (inviteMethod === 'list' && selectedUsers.length === 0) {
      toast({ variant: 'destructive', title: 'Invite someone', description: 'Please select at least one user to invite.' });
      return;
    }
    
    const updated = { ...meetingData, inviteMethod, invitedUsers: selectedUsers };
    sessionStorage.setItem('pendingMeeting', JSON.stringify(updated));
    router.push('/dashboard/meeting/book/confirm');
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
        if (meetingData.type === 'personal' && selectedUsers.length >= 5) {
            toast({ 
                variant: 'destructive', 
                title: 'Limit Reached', 
                description: 'Personal meetings are limited to 5 users.' 
            });
            return;
        }
        setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-8 max-w-2xl">
      <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8 text-center">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Step 4: Invite People</CardTitle>
          <CardDescription className="font-bold">
            {meetingData?.type === 'personal' ? 'Select up to 5 people' : 'Choose participants'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant={inviteMethod === 'link' ? 'default' : 'outline'} 
              className="h-20 rounded-3xl flex-col gap-1 font-black uppercase text-[10px]"
              onClick={() => setInviteMethod('link')}
            >
              <LinkIcon className="h-5 w-5 mb-1" />
              Provide Link
            </Button>
            <Button 
              variant={inviteMethod === 'list' ? 'default' : 'outline'} 
              className="h-20 rounded-3xl flex-col gap-1 font-black uppercase text-[10px]"
              onClick={() => setInviteMethod('list')}
            >
              <Users className="h-5 w-5 mb-1" />
              Invite from App
            </Button>
          </div>

          {inviteMethod === 'link' ? (
            <div className="p-6 rounded-3xl bg-muted/30 border border-dashed text-center">
              <p className="text-xs font-bold text-muted-foreground">
                You will receive a unique meeting link to share with anyone after confirmation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-10 h-12 rounded-2xl bg-muted/50 border-none" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {loadingUsers ? <Loader2 className="animate-spin mx-auto mt-10" /> : filteredUsers.map(user => (
                  <div 
                    key={user.$id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border-2",
                      selectedUsers.includes(user.$id) ? "border-primary bg-primary/5" : "border-transparent bg-muted/20"
                    )}
                    onClick={() => toggleUserSelection(user.$id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10"><AvatarImage src={user.avatar} /><AvatarFallback>{user.username?.charAt(0)}</AvatarFallback></Avatar>
                      <p className="font-bold text-sm">@{user.username}</p>
                    </div>
                    {selectedUsers.includes(user.$id) && <Check className="text-primary h-5 w-5" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleFinish} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl">
            Review & Confirm ({selectedUsers.length})
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}