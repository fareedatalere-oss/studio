'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS } from '@/lib/data-service';
import { format, parse } from 'date-fns';
import { doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * @fileOverview Meeting Booking Page.
 * FORCE: Generates GUEST links only. Admin uses the dashboard/alarm to enter via Identity Gate.
 */

export default function BookMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [isMounted, setIsMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'personal',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [guestLink, setGuestLink] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCreateMeeting = async () => {
    if (!formData.name || !user) {
      toast({ variant: 'destructive', title: 'Name Required' });
      return;
    }

    setIsProcessing(true);
    try {
        const meetingId = doc(collection(db, COLLECTION_ID_MEETINGS)).id;
        
        // FORCE: Link is for GUESTS ONLY (no role=admin parameter)
        const generatedGuestLink = `${window.location.origin}/dashboard/meeting/join/${meetingId}`;
        
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const selectedDateTime = parse(`${todayStr} ${formData.time}`, 'yyyy-MM-dd HH:mm', new Date());
        
        const durationHours = formData.type === 'personal' ? 1 : 3;
        const expiryTime = new Date(selectedDateTime.getTime() + durationHours * 60 * 60 * 1000).toISOString();

        const payload = {
            hostId: user.$id,
            name: formData.name,
            description: formData.description,
            type: formData.type,
            status: 'pending',
            meetingLink: generatedGuestLink, 
            scheduledAt: selectedDateTime.toISOString(),
            expiresAt: expiryTime,
            createdAt: new Date().toISOString()
        };

        await databases.createDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, payload);
        setGuestLink(generatedGuestLink);
        toast({ title: 'Meeting Created!' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(text);
        toast({ title: `Guest Link Copied!` });
    }
  };

  if (!isMounted) return null;

  if (guestLink) {
      return (
        <div className="container py-8 max-w-lg">
            <Card className="rounded-[3rem] shadow-2xl border-none p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>
                <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <CardHeader>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Meeting Ready</CardTitle>
                    <CardDescription className="font-bold text-xs uppercase tracking-widest opacity-60">The Guest link below is ready for distribution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 mt-4 text-left">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <Label className="flex items-center gap-2 text-[9px] font-black uppercase text-primary mb-2">Guest Invitation Link</Label>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-mono truncate flex-1 text-primary">{guestLink}</p>
                            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(guestLink)} className="shrink-0 h-8 w-8"><Copy className="h-3.5 w-3.5" /></Button>
                        </div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-2xl">
                        <p className="text-[10px] font-bold text-muted-foreground leading-relaxed italic">
                            "You will be alerted when it's time to join. You will also go through the Identity setup before entering the room."
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="ghost" className="w-full font-black uppercase text-[10px] tracking-widest hover:text-primary transition-colors">
                        <Link href="/dashboard/meeting">Return to hub</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <Link href="/dashboard/meeting" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary transition-all">
        <ArrowLeft className="h-4 w-4" /> Hub
      </Link>
      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8 text-center">
            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Schedule Session</CardTitle>
            <CardDescription className="font-bold text-xs uppercase opacity-60">Setup your digital meeting board</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Event Date</Label>
                <Input type="date" value={formData.date} readOnly className="h-12 rounded-2xl bg-muted border-none px-4 font-bold opacity-50 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Alarm Time</Label>
                <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="h-12 rounded-2xl bg-muted border-none px-4 font-bold" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Meeting Subject</Label>
            <Input placeholder="Enter meeting name..." className="h-12 rounded-2xl bg-muted border-none px-6 font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-4 pt-4 border-t border-dashed">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Visibility Scope</Label>
            <RadioGroup value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })} className="grid grid-cols-2 gap-4">
              <div className={cn("p-5 rounded-[2rem] border-2 cursor-pointer transition-all", formData.type === 'personal' ? "border-primary bg-primary/5" : "bg-muted/20 border-transparent")} onClick={() => setFormData({ ...formData, type: 'personal' })}>
                <p className="font-black text-xs uppercase">Personal</p>
                <p className="text-[8px] font-bold opacity-50 uppercase mt-1">Up to 5 Guests</p>
                <RadioGroupItem value="personal" className="sr-only" />
              </div>
              <div className={cn("p-5 rounded-[2rem] border-2 cursor-pointer transition-all", formData.type === 'general' ? "border-primary bg-primary/5" : "bg-muted/20 border-transparent")} onClick={() => setFormData({ ...formData, type: 'general' })}>
                <p className="font-black text-xs uppercase">General</p>
                <p className="text-[8px] font-bold opacity-50 uppercase mt-1">Public Hub</p>
                <RadioGroupItem value="general" className="sr-only" />
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleCreateMeeting} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirm & Setup Hub"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
