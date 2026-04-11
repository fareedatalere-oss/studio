
'use client';

import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Video, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, Query, client } from '@/lib/appwrite';
import { useUser } from '@/hooks/use-appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { isBefore } from 'date-fns';

/**
 * @fileOverview Hardened Alarm Engine.
 * SSR FIX: Audio handled strictly client-side.
 * LOGIC: Ring instantly for past times set today. Host only.
 */

export function MeetingAlarm() {
  const { user } = useUser();
  const router = useRouter();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [scheduledMeeting, setScheduledMeeting] = useState<any>(null);
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rungIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const checkIncoming = async () => {
      try {
        const now = new Date();
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MEETINGS, [
          Query.equal('status', 'pending'),
          Query.limit(10)
        ]);

        // 1. Direct Calls
        const incomingCall = res.documents.find(m => m.type === 'call' && m.invitedUsers?.includes(user.$id));
        if (incomingCall && !isRinging && !rungIds.current.has(incomingCall.$id)) {
          const caller = await databases.getDocument(DATABASE_ID, 'profiles', incomingCall.hostId).catch(() => null);
          setActiveCall({ ...incomingCall, callerAvatar: caller?.avatar, callerName: caller?.username });
          startRinging();
          return;
        }

        // 2. Scheduled Meetings (Host Only)
        const myMeeting = res.documents.find(m => 
            m.hostId === user.$id && 
            m.type !== 'call' && 
            isBefore(new Date(m.scheduledAt), now) && 
            m.status === 'pending'
        );

        if (myMeeting && !isRinging && !rungIds.current.has(myMeeting.$id)) {
            setScheduledMeeting(myMeeting);
            startRinging();
        }
      } catch (e) {}
    };

    const interval = setInterval(checkIncoming, 4000); 
    
    const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents`], response => {
        const payload = response.payload as any;
        if ((payload.status === 'ended' || payload.status === 'cancelled' || payload.status === 'connected') && 
            (payload.$id === activeCall?.$id || payload.$id === scheduledMeeting?.$id)) {
            stopRinging();
            setActiveCall(null);
            setScheduledMeeting(null);
        }
    });

    return () => {
        clearInterval(interval);
        unsub();
    };
  }, [user, isRinging, activeCall?.$id, scheduledMeeting?.$id]);

  const startRinging = () => {
    if (typeof window === 'undefined') return;
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
    const id = activeCall?.$id || scheduledMeeting?.$id;
    if (id) {
        rungIds.current.add(id);
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, id, { status: scheduledMeeting ? 'cancelled' : 'ended' });
    }
    stopRinging();
    setActiveCall(null);
    setScheduledMeeting(null);
  };

  const handleAccept = async () => {
    const id = activeCall?.$id || scheduledMeeting?.$id;
    if (id) {
        rungIds.current.add(id);
        if (activeCall) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, id, { status: 'connected' });
            router.push(`/dashboard/chat/call/${id}`);
        } else {
            router.push(`/dashboard/meeting/join/${id}?role=admin`);
        }
    }
    stopRinging();
    setActiveCall(null);
    setScheduledMeeting(null);
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-between py-24 animate-in fade-in duration-500 font-body">
      <div className="text-center">
          <p className="text-primary font-black uppercase tracking-[0.3em] text-xl animate-pulse">Incoming Alert</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">I-Pay Secure Line</p>
          </div>
      </div>

      <div className="flex flex-col items-center text-center space-y-6 w-full px-6">
        <Avatar className="h-48 w-48 ring-8 ring-primary/5 shadow-2xl">
            <AvatarImage src={activeCall?.callerAvatar || scheduledMeeting?.wallUrl} className="object-cover" />
            <AvatarFallback className="bg-primary text-white text-5xl font-black">
                {(activeCall?.callerName || scheduledMeeting?.name || '?').charAt(0)}
            </AvatarFallback>
        </Avatar>
        <div>
            <h2 className="text-black text-2xl font-black tracking-tighter uppercase">
                {activeCall ? `@${activeCall.callerName}` : scheduledMeeting?.name}
            </h2>
            <p className="text-muted-foreground font-bold text-[10px] mt-1 uppercase opacity-60">
                {scheduledMeeting ? 'Meeting Scheduled Start' : 'Private Direct Call'}
            </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-12 w-full max-w-sm px-10">
          <div className="flex flex-col items-center gap-3">
              <Button onClick={handleDecline} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform">
                  <PhoneOff className="h-8 w-8 text-white" />
              </Button>
              <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">
                {scheduledMeeting ? 'Cancel' : 'Deny'}
              </span>
          </div>
          <div className="flex flex-col items-center gap-3">
              <Button onClick={handleAccept} size="icon" className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl active:scale-90 transition-transform">
                  <CheckCircle2 className="h-8 w-8 text-white" />
              </Button>
              <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">
                {scheduledMeeting ? 'Enter' : 'Accept'}
              </span>
          </div>
      </div>
    </div>
  );
}
