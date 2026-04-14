'use client';

import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Video, CheckCircle2, Volume2, Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, Query, client, ID } from '@/lib/data-service';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { parseISO, differenceInSeconds } from 'date-fns';

/**
 * @fileOverview Master Alarm Engine.
 * FORCE: Enhanced Vibration Loop & Native Push Handshake.
 */

export function MeetingAlarm() {
  const { user } = useUser();
  const router = useRouter();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isRinging, setIsRinging] = useState(false);
  const vibrationInterval = useRef<NodeJS.Timeout | null>(null);
  const rungIds = useRef<Set<string>>(new Set());

  const stopRinging = () => {
    setIsRinging(false);
    if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
        vibrationInterval.current = null;
    }
    if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(0);
    }
  };

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const checkMeetings = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MEETINGS, [
          Query.equal('status', 'pending'),
          Query.limit(10)
        ]);

        const now = new Date();

        // 1. Incoming Call Detection
        const incomingCall = res.documents.find(m => m.type === 'call' && m.invitedUsers?.includes(user.$id));
        
        // 2. Scheduled Meeting Alarm
        const scheduledMeeting = res.documents.find(m => {
            if (m.hostId !== user.$id || rungIds.current.has(m.$id)) return false;
            if (!m.scheduledAt) return false;
            
            const schedTime = parseISO(m.scheduledAt);
            const diffSec = differenceInSeconds(now, schedTime);
            
            // Trigger alarm window
            return diffSec >= -5 && diffSec < 60;
        });

        const target = incomingCall || scheduledMeeting;
        
        if (target && !isRinging && !rungIds.current.has(target.$id)) {
          const callerId = target.hostId === user.$id ? user.$id : target.hostId;
          const caller = await databases.getDocument(DATABASE_ID, 'profiles', callerId).catch(() => null);
          
          setActiveCall({ 
            ...target, 
            isHostAlert: target.hostId === user.$id,
            callerAvatar: caller?.avatar, 
            callerName: caller?.username || (target.hostId === user.$id ? 'Chairman' : 'I-Pay User')
          });
          startRinging();
        }
      } catch (e) {}
    };

    const interval = setInterval(checkMeetings, 3000); 
    
    const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents`], response => {
        const payload = response.payload as any;
        if (payload.status === 'ended' || payload.status === 'cancelled' || payload.status === 'connected') {
            if (payload.$id === activeCall?.$id) {
                stopRinging(); 
                setActiveCall(null);
            }
        }
    });

    return () => { 
        clearInterval(interval); 
        unsub(); 
        if (vibrationInterval.current) clearInterval(vibrationInterval.current);
    };
  }, [user, isRinging, activeCall?.$id]);

  const startRinging = () => {
    if (typeof window === 'undefined') return;
    setIsRinging(true);
    
    // FORCE: Native System Alarm Push
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(activeCall?.isHostAlert ? 'I-Pay: Meeting Now' : 'I-Pay: Incoming Call', {
            body: activeCall?.isHostAlert ? `Session "${activeCall.name}" is starting.` : `Direct call from @${activeCall?.callerName}`,
            icon: '/logo.png',
            tag: 'meeting-alert',
            renotify: true,
            silent: false 
        });
    }

    // FORCE: Intense Native Vibration Pattern
    if (navigator.vibrate) {
        const ringPattern = [2000, 500, 2000, 500, 2000, 1000];
        navigator.vibrate(ringPattern);
        vibrationInterval.current = setInterval(() => {
            navigator.vibrate(ringPattern);
        }, 8000);
    }
  };

  const handleDecline = async () => {
    if (activeCall?.$id && user) {
        rungIds.current.add(activeCall.$id);
        if (activeCall.hostId === user.$id) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, activeCall.$id, { status: 'cancelled' });
        } else {
            const chatId = [user.$id, activeCall.hostId].sort().join('_');
            await databases.createDocument(DATABASE_ID, 'messages', ID.unique(), {
                chatId, senderId: 'system', text: `Missed call from @${activeCall.callerName}`, status: 'sent'
            });
        }
    }
    stopRinging(); 
    setActiveCall(null);
  };

  const handleAccept = async () => {
    if (activeCall?.$id) {
        rungIds.current.add(activeCall.$id);
        if (activeCall.isHostAlert) {
            router.push(`/dashboard/meeting/join/${activeCall.$id}?role=admin`);
        } else {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, activeCall.$id, { status: 'connected' });
            router.push(`/dashboard/chat/call/${activeCall.$id}`);
        }
    }
    stopRinging(); 
    setActiveCall(null);
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-between py-24 animate-in fade-in zoom-in duration-500 font-body overflow-hidden">
      <div className="text-center space-y-2">
          <p className="text-primary font-black uppercase tracking-[0.4em] text-2xl animate-pulse leading-none">
            {activeCall?.isHostAlert ? 'Meeting Now' : 'Incoming Call'}
          </p>
          <div className="flex items-center justify-center gap-2 text-primary/60">
            {activeCall?.isHostAlert ? <Clock className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            <p className="text-[10px] font-black uppercase tracking-widest">
                {activeCall?.isHostAlert ? 'Chairman Alert' : 'Live Secure Line'}
            </p>
          </div>
      </div>

      <div className="flex flex-col items-center text-center space-y-8 w-full px-6">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150"></div>
            <Avatar className="h-56 w-56 ring-8 ring-primary/5 shadow-2xl relative z-10">
                <AvatarImage src={activeCall?.callerAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary text-white text-6xl font-black">{(activeCall?.callerName || '?').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
        </div>
        <div>
            <h2 className="text-black text-3xl font-black tracking-tighter uppercase leading-tight">
                {activeCall?.isHostAlert ? activeCall.name : `@${activeCall?.callerName}`}
            </h2>
            <p className="text-muted-foreground font-bold text-xs mt-2 uppercase opacity-60">
                {activeCall?.isHostAlert ? 'Identity Setup Required' : 'Calling from I-Pay Hub'}
            </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-16 w-full max-w-sm px-10">
          <div className="flex flex-col items-center gap-4">
              <Button onClick={handleDecline} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform"><PhoneOff className="h-10 w-10 text-white" /></Button>
              <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">{activeCall?.isHostAlert ? 'Dismiss' : 'Decline'}</span>
          </div>
          <div className="flex flex-col items-center gap-4">
              <Button onClick={handleAccept} size="icon" className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl active:scale-90 transition-transform"><CheckCircle2 className="h-10 w-10 text-white" /></Button>
              <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Enter Hub</span>
          </div>
      </div>
      
      <div className="absolute bottom-10 flex items-center gap-2 opacity-20">
          <Volume2 className="h-3 w-3" />
          <p className="text-[8px] font-black uppercase tracking-widest">Global Ringing Engine Active</p>
      </div>
    </div>
  );
}
