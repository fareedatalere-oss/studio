'use client';

import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Video, CheckCircle2, Volume2, Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, Query, client, ID } from '@/lib/data-service';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { parseISO, isBefore } from 'date-fns';

/**
 * @fileOverview Master Alarm Engine.
 * FORCE: Persistent continuous ringing for calls even if app is backgrounded.
 * INTENSE: High-frequency vibration and priority notifications.
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
        const hostRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MEETINGS, [
          Query.equal('status', 'pending'),
          Query.equal('hostId', user.$id),
          Query.limit(5)
        ]);

        const inviteRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MEETINGS, [
          Query.equal('status', 'pending'),
          Query.contains('invitedUsers', user.$id),
          Query.limit(5)
        ]);

        const allDocs = [...hostRes.documents, ...inviteRes.documents];
        const now = new Date();

        const target = allDocs.find(m => {
            if (rungIds.current.has(m.$id)) return false;
            
            if (m.hostId === user.$id) {
                if (!m.scheduledAt) return true;
                const schedTime = parseISO(m.scheduledAt);
                return isBefore(schedTime, now);
            }
            
            if (m.invitees?.includes(user.$id)) return true;
            
            return false;
        });
        
        if (target && !isRinging) {
          const isHostAlert = target.hostId === user.$id;
          const callerId = isHostAlert ? user.$id : target.hostId;
          const caller = await databases.getDocument(DATABASE_ID, 'profiles', callerId).catch(() => null);
          
          setActiveCall({ 
            ...target, 
            isHostAlert,
            callerAvatar: caller?.avatar, 
            callerName: caller?.username || (isHostAlert ? 'Chairman' : 'I-Pay User')
          });
          startRinging();
        }
      } catch (e) {}
    };

    const interval = setInterval(checkMeetings, 4000); 
    
    const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents`], response => {
        const payload = response.payload as any;
        if (payload?.$id === activeCall?.$id) {
            if (payload.status === 'ended' || payload.status === 'cancelled') {
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
  }, [user, isRinging, activeCall]);

  const startRinging = () => {
    if (typeof window === 'undefined') return;
    setIsRinging(true);
    
    // FORCE: High-Priority System Push
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(activeCall?.isHostAlert ? 'CHAIRMAN CALL' : 'INCOMING I-PAY CALL', {
            body: activeCall?.isHostAlert ? `Room "${activeCall.name}" is due.` : `Incoming secure line from @${activeCall?.callerName}`,
            icon: '/logo.png',
            tag: 'force-call',
            renotify: true,
            requireInteraction: true 
        });
    }

    // FORCE: Intense Ring Vibration [2s on, 0.5s off]
    if (navigator.vibrate) {
        const pattern = [2000, 500, 2000, 500, 2000, 500];
        navigator.vibrate(pattern);
        vibrationInterval.current = setInterval(() => navigator.vibrate(pattern), 8000);
    }
  };

  const handleDecline = async () => {
    if (activeCall?.$id) rungIds.current.add(activeCall.$id);
    stopRinging(); 
    setActiveCall(null);
  };

  const handleAccept = async () => {
    if (activeCall?.$id) {
        rungIds.current.add(activeCall.$id);
        router.push(`/dashboard/meeting/join/${activeCall.$id}${activeCall.isHostAlert ? '?role=admin' : ''}`);
    }
    stopRinging(); 
    setActiveCall(null);
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-between py-24 animate-in fade-in zoom-in duration-500 font-body overflow-hidden">
      <div className="text-center space-y-2">
          <p className="text-primary font-black uppercase tracking-[0.4em] text-2xl animate-pulse">
            {activeCall?.isHostAlert ? 'Chairman Call' : 'Incoming Hub'}
          </p>
          <div className="flex items-center justify-center gap-2 text-primary/60">
            <Volume2 className="h-4 w-4 animate-bounce" />
            <p className="text-[10px] font-black uppercase tracking-widest">Live Secure Session</p>
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
            <p className="text-muted-foreground font-bold text-xs mt-2 uppercase opacity-60">Identity Setup Required</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-16 w-full max-w-sm px-10">
          <div className="flex flex-col items-center gap-4">
              <Button onClick={handleDecline} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform"><PhoneOff className="h-10 w-10 text-white" /></Button>
              <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-4">
              <Button onClick={handleAccept} size="icon" className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl active:scale-90 transition-transform"><CheckCircle2 className="h-10 w-10 text-white" /></Button>
              <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Enter</span>
          </div>
      </div>
      
      <div className="absolute bottom-10 opacity-20">
          <p className="text-[8px] font-black uppercase tracking-widest">Powered by I-Pay Security Engine</p>
      </div>
    </div>
  );
}
