'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar as CalendarIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, isBefore, parse, startOfToday } from 'date-fns';

export default function MeetingSchedulePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [meetingData, setMeetingData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('pendingMeeting');
    if (!saved) {
      router.replace('/dashboard/meeting/book');
      return;
    }
    setMeetingData(JSON.parse(saved));
  }, [router]);

  const validateDateTime = () => {
    const now = new Date();
    const selectedDate = parse(date, 'yyyy-MM-dd', new Date());
    const selectedDateTime = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());

    // 1. Check if date is in the past
    if (isBefore(selectedDate, startOfToday())) {
      setError("You cannot book a past date. Please select today or a future date.");
      return false;
    }

    // 2. Check if time is in the past for today
    if (isBefore(selectedDateTime, now)) {
      setError("The selected time has already passed. Please choose a future time.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleFinalize = async () => {
    if (!validateDateTime()) {
      toast({ variant: 'destructive', title: 'Invalid Schedule', description: error });
      return;
    }

    setIsSubmitting(true);
    // Simulate database booking save
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
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Confirmed!</h2>
          <p className="text-muted-foreground text-sm font-bold mb-8">
            Your meeting "{meetingData?.name}" is scheduled for {format(parse(date, 'yyyy-MM-dd', new Date()), 'PP')} at {time}.
          </p>
          <Button asChild className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl">
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
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-center">Final Step: Timing</CardTitle>
          <CardDescription className="text-center font-bold">Choose a future date and time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="bg-muted/30 p-6 rounded-[2rem] flex items-center gap-4 border border-dashed">
            <div className="bg-primary p-3 rounded-2xl">
              <Clock className="text-white h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase opacity-50">Booking Type</p>
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
                className="h-14 rounded-2xl bg-muted/50 border-none px-6 font-black text-lg focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest opacity-70 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Select Time
              </Label>
              <Input 
                type="time" 
                value={time}
                onChange={e => setTime(e.target.value)}
                className="h-14 rounded-2xl bg-muted/50 border-none px-6 font-black text-lg focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-destructive leading-tight">{error}</p>
            </div>
          )}

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <div className="p-1 bg-amber-200 rounded-full mt-0.5"><Clock className="h-3 w-3 text-amber-700" /></div>
            <p className="text-[10px] font-bold text-amber-800 leading-tight">
              Notice: Past times/dates are automatically rejected. General meetings require sufficient wallet balance for entry fees.
            </p>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleFinalize} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirm Schedule"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
