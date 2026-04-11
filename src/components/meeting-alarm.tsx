'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneIncoming, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, Query } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * @fileOverview Universal I-Pay Call Alarm & Notification Engine.
 * Pushes incoming calls to the user even if they are outside the app (via background layout).
 */

export function MeetingAlarm() {
  const { user } = useUser();
  const router = useRouter();
  const [activeMeeting, setActiveMeeting] = useState<any>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkIncoming = async () => {
      if (isRinging || isSnoozed) return;

      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MEETINGS, [
          Query.equal('status', 'pending'),
          Query.equal('type', 'call'),
          Query.limit(5)
        ]);

        const myCall = res.documents.find(m => m.invitedUsers?.includes(user.$id));

        if (myCall) {
          const callerProfile = await databases.getDocument(DATABASE_ID, 'profiles', myCall.hostId).catch(() => null);
          setActiveMeeting({ ...myCall, callerAvatar: callerProfile?.avatar, callerName: callerProfile?.username });
          startRinging();
        }
      } catch (e) {}
    };

    // Fast polling for real-time push-like experience
    const interval = setInterval(checkIncoming, 2000); 
    return () => clearInterval(interval);
  }, [user, isRinging, isSnoozed]);

  const startRinging = () => {
    setIsRinging(true);
    if (!audioRef.current) {
        // High-quality generic ringtone
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/941/941-preview.mp3');
        audioRef.current.loop = true;
    }
    audioRef.current.play().catch(() => {});
  };

  const stopRinging = () => {
    setIsRinging(false);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  const handleDecline = async () => {
    if (activeMeeting) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, activeMeeting.$id, { status: 'ended' });
    }
    stopRinging();
    setIsSnoozed(true);
    setTimeout(() => setIsSnoozed(false), 10000); 
  };

  const handleAccept = async () => {
    stopRinging();
    if (activeMeeting) {
        // PICKING UP: Redirect user back to the app and specifically to the call room
        router.push(`/dashboard/meeting/room/${activeMeeting.$id}`);
    }
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center space-y-8 max-w-sm w-full">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping -m-4"></div>
            <Avatar className="h-40 w-40 ring-8 ring-primary ring-offset-4 shadow-2xl">
                <AvatarImage src={activeMeeting?.callerAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary text-white text-4xl font-black">
                    {activeMeeting?.callerName?.charAt(0) || '?'}
                </AvatarFallback>
            </Avatar>
        </div>

        <div className="space-y-2">
            <h2 className="text-black text-2xl font-black uppercase tracking-widest">I-pay system</h2>
            <p className="text-primary font-bold text-lg">Incoming Call...</p>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">@{activeMeeting?.callerName}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 w-full pt-10">
            <div className="flex flex-col items-center gap-2">
                <Button onClick={handleAccept} size="icon" className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl transition-transform active:scale-90">
                    <Check className="h-10 w-10 text-white" />
                </Button>
                <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Accept</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Button onClick={handleDecline} size="icon" className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl transition-transform active:scale-90">
                    <X className="h-10 w-10 text-white" />
                </Button>
                <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Decline</span>
            </div>
        </div>
      </div>
    </div>
  );
}
