
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Globe, Loader2, Video, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, ID } from '@/lib/appwrite';
import { format, parse } from 'date-fns';

/**
 * @fileOverview Meeting Booking Page.
 * STRICT SCHEDULING: Locked to today's date. Ring immediately if time has passed.
 */

export default function BookMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'personal',
    date: todayStr, // Locked to today
    time: format(new Date(), 'HH:mm'),
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  const handleCreateMeeting = async () => {
    if (!formData.name || !user) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please provide a name for your meeting.' });
      return;
    }

    setIsProcessing(true);
    try {
        const meetingId = ID.unique();
        const generatedLink = `${window.location.origin}/dashboard/meeting/join/${meetingId}`;
        
        // Strict DateTime Construction
        const selectedDateTime = parse(`${formData.date} ${formData.time}`, 'yyyy-MM-dd HH:mm', new Date());
        
        // Calculate Expiry (Personal: 1hr, General: 3hrs)
        const durationHours = formData.type === 'personal' ? 1 : 3;
        const expiryTime = new Date(selectedDateTime.getTime() + durationHours * 60 * 60 * 1000).toISOString();

        const payload = {
            hostId: user.$id,
            name: formData.name,
            description: formData.description,
            type: formData.type,
            status: 'pending',
            meetingLink: generatedLink,
            scheduledAt: selectedDateTime.toISOString(),
            expiresAt: expiryTime,
            createdAt: new Date().toISOString()
        };

        await databases.createDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, payload);
        
        setMeetingLink(generatedLink);
        toast({ title: 'Meeting Link Generated!' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(text);
        toast({ title: `Link copied!` });
    }
  };

  if (meetingLink) {
      return (
        <div className="container py-8 max-w-lg">
            <Card className="rounded-[3rem] shadow-2xl border-none p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>
                <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <CardHeader>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter">Meeting Ready</CardTitle>
                    <CardDescription className="font-bold text-xs">Share this link. Alarm will ring at the set time.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 mt-4">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-left">
                        <Label className="flex items-center gap-2 text-[9px] font-black uppercase text-primary mb-2">
                            Meeting Link
                        </Label>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-mono truncate flex-1 text-primary">{meetingLink}</p>
                            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(meetingLink)} className="shrink-0 h-8 w-8"><Copy className="h-3 w-3" /></Button>
                        </div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Scheduled For</p>
                        <p className="font-bold text-sm">{formData.date} at {formData.time}</p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button asChild variant="ghost" className="font-black uppercase text-[10px] tracking-widest">
                        <Link href="/dashboard/meeting">Return to Hub</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <Link href="/dashboard/meeting" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Hub
      </Link>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-center">Setup Meeting</CardTitle>
          <CardDescription className="text-center font-bold text-xs">Set time for today's session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Date (Today Only)</Label>
                <Input type="date" value={formData.date} readOnly className="h-12 rounded-2xl bg-muted border-none px-4 font-bold opacity-50 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Alarm Time</Label>
                <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="h-12 rounded-2xl bg-muted border-none px-4 font-bold" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Meeting Name</Label>
            <Input 
              placeholder="e.g. Morning Briefing" 
              className="h-12 rounded-2xl bg-muted border-none px-6 font-bold"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Meeting Scope</Label>
            <RadioGroup value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })} className="grid grid-cols-2 gap-4">
              <div className={cn(
                "p-4 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-2",
                formData.type === 'personal' ? "border-primary bg-primary/5" : "border-muted bg-muted/20"
              )} onClick={() => setFormData({ ...formData, type: 'personal' })}>
                <p className="font-black text-xs uppercase tracking-tighter">Personal</p>
                <p className="text-[8px] leading-tight text-muted-foreground font-bold">Max 5 • 1 Hour • Free</p>
                <RadioGroupItem value="personal" className="sr-only" />
              </div>

              <div className={cn(
                "p-4 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-2",
                formData.type === 'general' ? "border-primary bg-primary/5" : "border-muted bg-muted/20"
              )} onClick={() => setFormData({ ...formData, type: 'general' })}>
                <p className="font-black text-xs uppercase tracking-tighter">General</p>
                <p className="text-[8px] leading-tight text-muted-foreground font-bold">Unlimited • 3 Hours</p>
                <RadioGroupItem value="general" className="sr-only" />
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleCreateMeeting} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin" /> : "Generate Meeting Link"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
