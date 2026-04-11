'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneIncoming, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_ATTENDEES, Query } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
        // Only fetch pending meetings that are calls and invite this user
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MEETINGS, [
          Query.equal('status', 'pending'),
          Query.equal('type', 'call'),
          Query.limit(5)
        ]);

        const myIncomingCall = res.documents.find(m => m.invitedUsers?.includes(user.$id));

        if (myIncomingCall) {
          // Fetch caller's profile for the avatar
          const callerProfile = await databases.getDocument(DATABASE_ID, 'profiles', myIncomingCall.hostId).catch(() => null);
          setActiveMeeting({ ...myIncomingCall, callerAvatar: callerProfile?.avatar });
          startRinging();
        }
      } catch (e) {}
    };

    const interval = setInterval(checkMeetings, 4000); 
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
        new Notification("Incoming Call!", {
            body: `I-Pay Call from @${activeMeeting?.hostId}`,
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

  const handleDecline = () => {
    stopRinging();
    setIsSnoozed(true);
    setTimeout(() => setIsSnoozed(false), 30000); 
  };

  const handleEnter = () => {
    stopRinging();
    if (activeMeeting) {
        router.push(`/dashboard/meeting/join/${activeMeeting.$id}`);
    }
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="relative mb-10">
            <div className="h-40 w-48 rounded-full bg-primary/5 animate-ping absolute inset-0 -m-4"></div>
            <Avatar className="h-40 w-40 ring-8 ring-primary ring-offset-4 shadow-2xl">
                <AvatarImage src={activeMeeting?.callerAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary text-white text-4xl font-black">C</AvatarFallback>
            </Avatar>
        </div>

        <h2 className="text-black text-3xl font-black uppercase tracking-tighter mb-2">Incoming Call</h2>
        <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-10">I-Pay Secure End-to-End</p>

        <div className="grid grid-cols-2 gap-6 w-full max-w-[280px]">
            <div className="flex flex-col items-center gap-2">
                <Button onClick={handleEnter} size="icon" className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl">
                    <Check className="h-8 w-8 text-white" />
                </Button>
                <span className="text-[10px] font-black uppercase text-green-600">Accept</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Button onClick={handleDecline} size="icon" className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl">
                    <X className="h-8 w-8 text-white" />
                </Button>
                <span className="text-[10px] font-black uppercase text-red-600">Decline</span>
            </div>
        </div>
      </div>
    </div>
  );
}
