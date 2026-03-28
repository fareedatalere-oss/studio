
'use client';

import { useState } from 'react';
import { ArrowLeft, Video, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';

export default function EnterMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [meetingId, setMeetingId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleJoin = async () => {
    let cleanId = meetingId.trim();
    if (cleanId.includes('?id=')) {
        cleanId = cleanId.split('?id=')[1];
    }

    if (!cleanId) return;

    setIsVerifying(true);
    try {
        const meeting = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, cleanId);
        
        if (meeting.status === 'ended') {
            toast({ variant: 'destructive', title: 'Meeting Expired', description: 'This session has already ended.' });
        } else if (meeting.status === 'pending') {
            // Take them to the lobby/landing page
            router.push(`/dashboard/meeting/room/${cleanId}`);
        } else {
            // Meeting is 'started', go straight in
            router.push(`/dashboard/meeting/room/${cleanId}`);
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Invalid ID', description: 'Could not find a meeting with this ID.' });
    } finally {
        setIsVerifying(false);
    }
  };

  return (
    <div className="container py-8 max-w-lg">
      <Link href="/dashboard/meeting" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Hub
      </Link>
      <Card className="rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Enter Meeting</CardTitle>
          <CardDescription>Paste your meeting ID or Link here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            value={meetingId}
            onChange={e => setMeetingId(e.target.value)}
            placeholder="Paste ID or Link..." 
            className="h-14 rounded-2xl bg-muted border-none text-center font-bold text-lg" 
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleJoin} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isVerifying || !meetingId}>
            {isVerifying ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2" /> Verify & Join</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
