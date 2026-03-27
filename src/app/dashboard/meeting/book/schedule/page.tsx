'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
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

    if (isBefore(selectedDate, startOfToday())) {
      setError("You cannot book a past date.");
      return false;
    }

    if (isBefore(selectedDateTime, now)) {
      setError("The selected time has already passed.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateDateTime()) {
      toast({ variant: 'destructive', title: 'Invalid Schedule', description: error });
      return;
    }

    setIsSubmitting(true);
    const updated = { ...meetingData, date, time };
    sessionStorage.setItem('pendingMeeting', JSON.stringify(updated));
    router.push('/dashboard/meeting/book/rules');
  };

  return (
    <div className="container py-8 max-w-2xl">
      <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-center">Step 2: Timing</CardTitle>
          <CardDescription className="text-center font-bold">Choose a future date and time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Select Date</Label>
              <Input 
                type="date" 
                min={format(new Date(), 'yyyy-MM-dd')}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-14 rounded-2xl bg-muted/50 border-none px-6 font-black text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Select Time</Label>
              <Input 
                type="time" 
                value={time}
                onChange={e => setTime(e.target.value)}
                className="h-14 rounded-2xl bg-muted/50 border-none px-6 font-black text-lg"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-destructive leading-tight">{error}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleNext} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isSubmitting}>
            Next: Meeting Rules
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
