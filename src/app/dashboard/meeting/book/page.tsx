
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Globe, Loader2, Video, Copy, CheckCircle2, Calendar, Clock } from 'lucide-react';
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
import { format, isBefore, startOfToday, parse } from 'date-fns';

export default function BookMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'personal',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  const handleCreateMeeting = async () => {
    if (!formData.name || !user) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide a name for your meeting.' });
      return;
    }

    // Strict Date/Time Logic
    const selectedDate = parse(formData.date, 'yyyy-MM-dd', new Date());
    const selectedDateTime = parse(`${formData.date} ${formData.time}`, 'yyyy-MM-dd HH:mm', new Date());
    
    if (isBefore(selectedDate, startOfToday())) {
        toast({ variant: 'destructive', title: 'Invalid Date', description: 'You cannot choose a past date.' });
        return;
    }

    setIsProcessing(true);
    try {
        const meetingId = ID.unique();
        const generatedLink = `${window.location.origin}/dashboard/meeting/join/${meetingId}`;
        
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
    navigator.clipboard.writeText(text);
    toast({ title: `Link copied!` });
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
                    <CardDescription className="font-bold">Share this link with your participants.</CardDescription>
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
                        <p className="font-bold">{formData.date} at {formData.time}</p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button asChild variant="ghost" className="font-black uppercase text-[10px]">
                        <Link href="/dashboard/meeting">Back to Hub</Link>
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
          <CardDescription className="text-center font-bold">Set date, time and scope</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Date</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-12 rounded-2xl bg-muted border-none px-4 font-bold" />
            </div>
            <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Time</Label>
                <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="h-12 rounded-2xl bg-muted border-none px-4 font-bold" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Meeting Name</Label>
            <Input 
              placeholder="e.g., Team Sync" 
              className="h-12 rounded-2xl bg-muted border-none px-6 font-bold"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Description</Label>
            <Textarea 
              placeholder="What is this meeting about?" 
              className="rounded-2xl bg-muted border-none p-4"
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Meeting Type</Label>
            <RadioGroup value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })} className="grid grid-cols-2 gap-4">
              <div className={cn(
                "p-4 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-2",
                formData.type === 'personal' ? "border-primary bg-primary/5" : "border-muted bg-muted/20"
              )} onClick={() => setFormData({ ...formData, type: 'personal' })}>
                <div className="flex items-center justify-between">
                  <Users className={cn("h-5 w-5", formData.type === 'personal' ? "text-primary" : "text-muted-foreground")} />
                  <RadioGroupItem value="personal" id="personal" className="sr-only" />
                </div>
                <p className="font-black text-xs uppercase tracking-tighter">Personal</p>
                <p className="text-[9px] leading-tight text-muted-foreground font-bold">Max 5 People • 1 Hour • Free</p>
              </div>

              <div className={cn(
                "p-4 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-2",
                formData.type === 'general' ? "border-primary bg-primary/5" : "border-muted bg-muted/20"
              )} onClick={() => setFormData({ ...formData, type: 'general' })}>
                <div className="flex items-center justify-between">
                  <Globe className={cn("h-5 w-5", formData.type === 'general' ? "text-primary" : "text-muted-foreground")} />
                  <RadioGroupItem value="general" id="general" className="sr-only" />
                </div>
                <p className="font-black text-xs uppercase tracking-tighter">General</p>
                <p className="text-[9px] leading-tight text-muted-foreground font-bold">Unlimited • 3 Hours</p>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleCreateMeeting} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin" /> : <><Video className="mr-2 h-5 w-5" /> Generate Meeting Link</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
