'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, PhoneIncoming, BellRing, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, Query } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';
import { format, parse, isSameMinute } from 'date-fns';

export function MeetingAlarm() {
  const { user } = useUser();
  const router = useRouter();
  const [activeMeeting, setActiveMeeting] = useState<any>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkMeetings = async () => {
      if (isRinging || isSnoozed) return;

      try {
        const now = new Date();
        const dateStr = format(now, 'yyyy-MM-dd');
        const timeStr = format(now, 'HH:mm');

        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MEETINGS, [
          Query.equal('hostId', user.$id),
          Query.equal('date', dateStr),
          Query.equal('time', timeStr),
          Query.equal('status', 'pending')
        ]);

        if (res.documents.length > 0) {
          const meeting = res.documents[0];
          setActiveMeeting(meeting);
          startRinging();
        }
      } catch (e) {}
    };

    const interval = setInterval(checkMeetings, 10000); // Check every minute
    return () => clearInterval(interval);
  }, [user, isRinging, isSnoozed]);

  const startRinging = () => {
    setIsRinging(true);
    if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/941/941-preview.mp3');
        audioRef.current.loop = true;
    }
    audioRef.current.play().catch(() => {});
    
    // Trigger Browser Notification if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("I-Pay Meeting Starting!", {
            body: `Your meeting "${activeMeeting?.name}" is starting now.`,
            icon: "/logo.png"
        });
    }
  };

  const stopRinging = () => {
    setIsRinging(false);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  const handleSnooze = () => {
    stopRinging();
    setIsSnoozed(true);
    setTimeout(() => {
        setIsSnoozed(false);
        if (!activeMeeting?.status.includes('started')) {
            startRinging();
        }
    }, 20000); // 20 Seconds Snooze as requested
  };

  const handleEnter = () => {
    stopRinging();
    if (activeMeeting) {
        databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, activeMeeting.$id, { status: 'started' });
        router.push(`/dashboard/meeting/enter?id=${activeMeeting.$id}`);
    }
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="relative mb-10">
            <div className="h-32 w-32 rounded-full bg-primary/20 animate-ping absolute inset-0"></div>
            <div className="h-32 w-32 rounded-full bg-primary/40 animate-pulse absolute inset-0"></div>
            <div className="h-32 w-32 rounded-full bg-primary flex items-center justify-center relative shadow-2xl">
                <PhoneIncoming className="h-14 w-14 text-white animate-bounce" />
            </div>
        </div>

        <h2 className="text-white text-3xl font-black uppercase tracking-tighter mb-2">Meeting Starting!</h2>
        <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-8">Gaskiya Reminder</p>

        <Card className="bg-white/10 border-white/20 text-white mb-10 w-full rounded-3xl backdrop-blur-md">
            <CardContent className="p-6">
                <p className="font-black text-xl uppercase tracking-tight">{activeMeeting?.name}</p>
                <p className="text-xs opacity-70 mt-2 line-clamp-2">{activeMeeting?.description}</p>
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/10">
                    <div className="flex flex-col items-center">
                        <Clock className="h-4 w-4 opacity-50 mb-1" />
                        <span className="text-[10px] font-bold">{activeMeeting?.time}</span>
                    </div>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex flex-col items-center">
                        <BellRing className="h-4 w-4 opacity-50 mb-1" />
                        <span className="text-[10px] font-bold">Ringing</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 w-full">
            <Button onClick={handleEnter} className="h-16 rounded-full font-black uppercase tracking-widest text-lg bg-green-500 hover:bg-green-600 shadow-2xl">
                <Check className="mr-2 h-6 w-6" /> Enter Meeting
            </Button>
            <Button onClick={handleSnooze} variant="secondary" className="h-14 rounded-full font-black uppercase tracking-widest text-xs bg-white/20 text-white hover:bg-white/30 border-none">
                Remember Me (20s)
            </Button>
        </div>
      </div>
    </div>
  );
}