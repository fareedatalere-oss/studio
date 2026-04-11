
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneIncoming, Check, X, PhoneOff, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, Query } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * @fileOverview Universal I-Pay Call Alarm & Notification Engine.
 * RECEIVER SCREEN (Sketch-Aligned): Top "Ringing", Center Icon/Name, Bottom Deny/Accept.
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

    const interval = setInterval(checkIncoming, 2000); 
    return () => clearInterval(interval);
  }, [user, isRinging, isSnoozed]);

  const startRinging = () => {
    setIsRinging(true);
    if (!audioRef.current) {
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
        router.push(`/dashboard/chat/call/${activeMeeting.$id}`);
    }
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-white flex flex-col items-center justify-between py-24 animate-in fade-in duration-500 font-body">
      <div className="text-center">
          <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-pulse">Ringing...</p>
      </div>

      <div className="flex flex-col items-center text-center space-y-6 w-full px-6">
        <div className="relative">
            <Avatar className="h-48 w-48 ring-8 ring-primary/5 shadow-2xl">
                <AvatarImage src={activeMeeting?.callerAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary text-white text-5xl font-black">
                    {activeMeeting?.callerName?.charAt(0) || '?'}
                </AvatarFallback>
            </Avatar>
        </div>
        <div>
            <h2 className="text-black text-2xl font-black tracking-tighter">I-pay system</h2>
            <p className="text-muted-foreground font-bold text-lg mt-1">@{activeMeeting?.callerName}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-12 w-full max-w-sm px-10">
          <div className="flex flex-col items-center gap-3">
              <Button onClick={handleDecline} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl transition-transform active:scale-90 bg-red-500 hover:bg-red-600">
                  <PhoneOff className="h-8 w-8 text-white" />
              </Button>
              <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Deny</span>
          </div>
          <div className="flex flex-col items-center gap-3">
              <Button onClick={handleAccept} size="icon" className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl transition-transform active:scale-90">
                  <PhoneCall className="h-8 w-8 text-white" />
              </Button>
              <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Accept</span>
          </div>
      </div>
    </div>
  );
}
