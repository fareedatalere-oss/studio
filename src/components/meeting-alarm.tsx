'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, PhoneIncoming, BellRing, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, Query } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';
import { format } from 'date-fns';

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

        // Check for both scheduled meetings and instant calls
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MEETINGS, [
          Query.equal('status', 'pending'),
          Query.limit(5)
        ]);

        const myIncoming = res.documents.find(m => 
            (m.hostId === user.$id && m.date === dateStr && m.time === timeStr) || 
            (m.invitedUsers?.includes(user.$id) && m.type === 'call')
        );

        if (myIncoming) {
          setActiveMeeting(myIncoming);
          startRinging();
        }
      } catch (e) {}
    };

    const interval = setInterval(checkMeetings, 5000); // Check every 5 seconds for instant calls
    return () => clearInterval(interval);
  }, [user, isRinging, isSnoozed]);

  const startRinging = () => {
    setIsRinging(true);
    if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/941/941-preview.mp3');
        audioRef.current.loop = true;
    }
    audioRef.current.play().catch(() => {});
    
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(activeMeeting?.type === 'call' ? "Incoming Call!" : "Meeting Starting!", {
            body: activeMeeting?.type === 'call' ? `You have an incoming call: ${activeMeeting?.name}` : `Your meeting "${activeMeeting?.name}" is starting.`,
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
    }, 20000); 
  };

  const handleEnter = () => {
    stopRinging();
    if (activeMeeting) {
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

        <h2 className="text-white text-3xl font-black uppercase tracking-tighter mb-2">
            {activeMeeting?.type === 'call' ? 'Incoming Call' : 'Meeting Alert'}
        </h2>
        <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-8">Gaskiya Secure Link</p>

        <Card className="bg-white/10 border-white/20 text-white mb-10 w-full rounded-3xl backdrop-blur-md">
            <CardContent className="p-6">
                <p className="font-black text-xl uppercase tracking-tight">{activeMeeting?.name}</p>
                <p className="text-xs opacity-70 mt-2 line-clamp-2">{activeMeeting?.description || 'Instant secure connection'}</p>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 w-full">
            <Button onClick={handleEnter} className="h-16 rounded-full font-black uppercase tracking-widest text-lg bg-green-500 hover:bg-green-600 shadow-2xl">
                <Check className="mr-2 h-6 w-6" /> {activeMeeting?.type === 'call' ? 'Pick Up' : 'Enter'}
            </Button>
            <Button onClick={handleSnooze} variant="secondary" className="h-14 rounded-full font-black uppercase tracking-widest text-xs bg-white/20 text-white hover:bg-white/30 border-none">
                Snooze (20s)
            </Button>
        </div>
      </div>
    </div>
  );
}
