
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
  const [input, setInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleJoin = async () => {
    let cleanId = input.trim();
    let isAdmin = false;

    // INTELLIGENT LINK PARSING
    try {
        if (cleanId.includes('/join/')) {
            const url = new URL(cleanId.startsWith('http') ? cleanId : `https://${cleanId}`);
            const pathParts = url.pathname.split('/');
            cleanId = pathParts[pathParts.length - 1];
            if (url.searchParams.get('role') === 'admin') {
                isAdmin = true;
            }
        } else if (cleanId.startsWith('http')) {
             const url = new URL(cleanId);
             const pathParts = url.pathname.split('/');
             cleanId = pathParts[pathParts.length - 1];
             if (url.searchParams.get('role') === 'admin') {
                isAdmin = true;
            }
        }
    } catch (e) {
        // Fallback to direct ID
    }

    if (!cleanId) {
        toast({ variant: 'destructive', title: 'Empty ID', description: 'Please paste a link or enter a meeting ID.' });
        return;
    }

    setIsVerifying(true);
    try {
        const meeting = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, cleanId);
        
        if (meeting.status === 'ended') {
            toast({ variant: 'destructive', title: 'Meeting Expired', description: 'This session has already concluded.' });
        } else {
            router.push(`/dashboard/meeting/join/${cleanId}${isAdmin ? '?role=admin' : ''}`);
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Invalid ID', description: 'No active meeting found with this ID.' });
    } finally {
        setIsVerifying(false);
    }
  };

  return (
    <div className="container py-8 max-w-lg">
      <Link href="/dashboard/meeting" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Hub
      </Link>
      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="text-center bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Enter meeting</CardTitle>
          <CardDescription className="font-bold">Paste your ID or Link below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-8">
          <Input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste Link or ID here..." 
            className="h-14 rounded-2xl bg-muted border-none text-center font-bold text-sm focus-visible:ring-1 focus-visible:ring-primary" 
          />
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleJoin} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isVerifying || !input}>
            {isVerifying ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify & Continue</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
