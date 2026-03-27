'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar as CalendarIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, isBefore, startOfDay, parse } from 'date-fns';

export default function MeetingSchedulePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [meetingData, setMeetingData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('pendingMeeting');
    if (!saved) {
      router.replace('/dashboard/meeting/book');
      return;
    }
    setMeetingData(JSON.parse(saved));
  }, [router]);

  const validateDateTime = () => {
    const selectedDateTime = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
    const now = new Date();

    if (isBefore(selectedDateTime, now)) {
      return false;
    }
    return true;
  };

  const handleFinalize = async () => {
    if (!validateDateTime()) {
      toast({ variant: 'destructive', title: 'Invalid Time', description: 'You cannot book a meeting in the past. Please choose a future time.' });
      return;
    }

    setIsSubmitting(true);
    // Mock database save
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      sessionStorage.removeItem('pendingMeeting');
    }, 2000);
  };

  if (showSuccess) {
    return (
      <div className="container py-8 max-w-md text-center">
        <Card className="rounded-[3rem] p-10 shadow-2xl border-none">
          <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Booking Finalized!</h2>
          <p className="text-muted-foreground text-sm font-bold mb-8">Your meeting "{meetingData?.name}" has been scheduled for {format(parse(date, 'yyyy-MM-dd', new Date()), 'PP')} at {time}.</p>
          <Button asChild className="w-full h-14 rounded-full font-black uppercase tracking-widest">
            <Link href="/dashboard/meeting">Done</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" /> Change Details
      </Button>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-center">Set Schedule</CardTitle>
          <CardDescription className="text-center font-bold">Step 2: Time & Date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="bg-muted/30 p-6 rounded-[2rem] flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl">
              <Clock className="text-white h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase opacity-50">Selected Scope</p>
              <p className="font-black text-sm uppercase tracking-tight">{meetingData?.type || 'Personal'} Session</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest opacity-70 flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" /> Select Date
              </Label>
              <Input 
                type="date" 
                min={format(new Date(), 'yyyy-MM-dd')}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-14 rounded-2xl bg-muted/50 border-none px-6 font-black text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest opacity-70 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Select Start Time
              </Label>
              <Input 
                type="time" 
                value={time}
                onChange={e => setTime(e.target.value)}
                className="h-14 rounded-2xl bg-muted/50 border-none px-6 font-black text-lg"
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <div className="p-1 bg-amber-200 rounded-full mt-0.5"><Clock className="h-3 w-3 text-amber-700" /></div>
            <p className="text-[10px] font-bold text-amber-800 leading-tight">
              Meetings must be booked for future times only. General meetings will incur a small automated fee from your balance upon user entry.
            </p>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleFinalize} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Finalize Schedule"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}