'use client';

import { useState } from 'react';
import { ArrowLeft, Video, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview Meeting Entry Page.
 * PRODUCTION HARDENING: Robust Link Parsing for Vercel URLs and Role detection.
 */

export default function EnterMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleJoin = async () => {
    const rawInput = (input || '').trim();
    if (!rawInput) {
        toast({ variant: 'destructive', title: 'Input Required', description: 'Please paste a link or enter a meeting ID.' });
        return;
    }

    setIsVerifying(true);
    
    try {
        let cleanId = '';
        let isAdmin = false;

        // 1. Better URL Parser for any I-Pay meeting link format
        if (rawInput.includes('/') || rawInput.includes('?') || rawInput.startsWith('http')) {
            try {
                // Ensure URL protocol for parser
                const urlStr = rawInput.startsWith('http') ? rawInput : `https://${rawInput}`;
                const url = new URL(urlStr);
                
                // Extract last path segment as the ID
                const pathParts = url.pathname.split('/').filter(Boolean);
                cleanId = pathParts[pathParts.length - 1] || '';
                
                // Check if it's an admin link
                if (url.searchParams.get('role') === 'admin') isAdmin = true;
            } catch (e) {
                // Fallback: Just look for a UUID-like string
                const idMatch = rawInput.match(/[a-zA-Z0-9_-]{10,}/);
                cleanId = idMatch ? idMatch[0] : rawInput;
            }
        } else {
            // Raw ID input
            cleanId = rawInput;
        }

        if (!cleanId || cleanId.length < 5) {
            throw new Error("Could not extract a valid Meeting ID. Please check your link.");
        }

        // 2. Database verification with descriptive error
        const meeting = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, cleanId);
        
        if (meeting.status === 'ended' || meeting.status === 'cancelled') {
            toast({ 
                variant: 'destructive', 
                title: 'Session Inactive', 
                description: 'This meeting is no longer active or has been concluded.' 
            });
        } else {
            // SUCCESS: Route to the join screen
            router.push(`/dashboard/meeting/join/${cleanId}${isAdmin ? '?role=admin' : ''}`);
        }
    } catch (error: any) {
        const errorMsg = error.message || "We could not find an active meeting with that ID. Verify the link.";
        console.error("Verification Error:", errorMsg);
        toast({ 
            variant: 'destructive', 
            title: 'Invalid Meeting', 
            description: errorMsg 
        });
    } finally {
        setIsVerifying(false);
    }
  };

  return (
    <div className="container py-8 max-w-lg">
      <Link href="/dashboard/meeting" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary transition-all">
        <ArrowLeft className="h-4 w-4" /> Hub
      </Link>
      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="text-center bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Enter meeting</CardTitle>
          <CardDescription className="font-bold text-xs">Paste your Chairman or Guest link below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-8">
          <div className="relative">
            <Input 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Paste Link or ID here..." 
                className="h-16 rounded-2xl bg-muted border-none text-center font-bold text-sm focus-visible:ring-1 focus-visible:ring-primary shadow-inner" 
            />
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-blue-700 leading-tight">
                "Pasting a full link automatically detects if you are the Admin or a Guest."
            </p>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleJoin} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isVerifying || !input}>
            {isVerifying ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Join Session</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
