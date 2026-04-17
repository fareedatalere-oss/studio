'use client';

import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Volume2, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, db, ID, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS } from '@/lib/data-service';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

/**
 * @fileOverview Master Alarm Engine v9.0.
 * SHIELD: Only rings if call is < 30 seconds old to prevent ghost ringing on app load.
 * IDENTITY: Forces Sender Name and Icon with centered Accept/Decline buttons.
 * FORCE: Accept takes users directly to Call Chat Hub.
 */

const getChatId = (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
};

export function MeetingAlarm() {
  const { user } = useUser();
  const router = useRouter();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const vibrationInterval = useRef<NodeJS.Timeout | null>(null);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopRinging = () => {
    setIsRinging(false);
    if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
        vibrationInterval.current = null;
    }
    if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
    }
    if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(0);
    }
  };

  const logMissedCall = async (meeting: any) => {
      if (!user?.$id) return;
      const chatId = getChatId(meeting.hostId, user.$id);
      try {
          await setDoc(doc(collection(db, COLLECTION_ID_MESSAGES)), {
              chatId,
              senderId: meeting.hostId,
              text: "📞 Missed Call",
              status: 'sent',
              timestamp: Date.now(),
              createdAt: serverTimestamp()
          });
          await setDoc(doc(db, COLLECTION_ID_CHATS, chatId), {
              participants: [meeting.hostId, user.$id],
              lastMessage: "📞 Missed Call",
              lastMessageAt: serverTimestamp(),
              [`unreadCount.${user.$id}`]: increment(1)
          }, { merge: true });
      } catch (e) {}
  };

  useEffect(() => {
    if (!user?.$id) return;

    const q = query(
        collection(db, COLLECTION_ID_MEETINGS),
        where('status', '==', 'pending'),
        where('invitedUsers', 'array-contains', user.$id)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const meeting = { $id: change.doc.id, ...change.doc.data() };
                
                // GHOST SHIELD: Prevent old calls or my own calls from ringing
                if (meeting.hostId === user.$id) return;
                
                const meetingCreatedTime = meeting.timestamp || (meeting.createdAt?.seconds ? meeting.createdAt.seconds * 1000 : Date.now());
                const isNewCall = meetingCreatedTime > (sessionStartTime - 30000); 

                if (isNewCall) {
                    const caller = await databases.getDocument(DATABASE_ID, 'profiles', meeting.hostId).catch(() => null);
                    setActiveCall({ 
                        ...meeting, 
                        callerAvatar: caller?.avatar, 
                        callerName: caller?.username || 'I-Pay User'
                    });
                    startRinging(meeting);
                }
            }
        });

        if (snapshot.empty && isRinging) {
            stopRinging();
            setActiveCall(null);
        }
    });

    return () => {
        unsubscribe();
        stopRinging();
    };
  }, [user?.$id, isRinging, sessionStartTime]);

  const startRinging = (meeting: any) => {
    if (typeof window === 'undefined') return;
    setIsRinging(true);
    
    ringTimeoutRef.current = setTimeout(async () => {
        try {
            const meetingRef = doc(db, COLLECTION_ID_MEETINGS, meeting.$id);
            await updateDoc(meetingRef, { status: 'cancelled' });
            await logMissedCall(meeting);
            stopRinging();
            setActiveCall(null);
        } catch (e) {}
    }, 30000);

    if (navigator.vibrate) {
        const pattern = [2000, 500, 2000, 500];
        navigator.vibrate(pattern);
        vibrationInterval.current = setInterval(() => navigator.vibrate(pattern), 6000);
    }
  };

  const handleDecline = async () => {
    if (activeCall?.$id) {
        await updateDoc(doc(db, COLLECTION_ID_MEETINGS, activeCall.$id), { status: 'cancelled' });
        await logMissedCall(activeCall);
    }
    stopRinging(); 
    setActiveCall(null);
  };

  const handleAccept = async () => {
    if (activeCall?.$id) {
        await updateDoc(doc(db, COLLECTION_ID_MEETINGS, activeCall.$id), { 
            status: 'connected',
            activeMode: 'chat'
        });
        router.push(`/dashboard/chat/call/${activeCall.$id}`);
    }
    stopRinging(); 
    setActiveCall(null);
  };

  if (!isRinging || !activeCall) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-between py-24 animate-in fade-in zoom-in duration-500 font-body overflow-hidden">
      <div className="text-center space-y-2">
          <p className="text-primary font-black uppercase tracking-[0.4em] text-2xl animate-pulse">Incoming Call</p>
          <div className="flex items-center justify-center gap-2 text-primary/60">
            <Volume2 className="h-4 w-4 animate-bounce" />
            <p className="text-[10px] font-black uppercase tracking-widest">Secure Handshake</p>
          </div>
      </div>

      <div className="flex flex-col items-center text-center space-y-8 w-full px-6">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150"></div>
            <Avatar className="h-52 w-56 ring-8 ring-primary/5 shadow-2xl relative z-10">
                <AvatarImage src={activeCall.callerAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary text-white text-6xl font-black">{activeCall.callerName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
        </div>
        <div>
            <h2 className="text-black text-4xl font-black tracking-tighter uppercase leading-tight">@{activeCall.callerName}</h2>
            <p className="text-muted-foreground font-bold text-xs mt-2 uppercase opacity-60">Identity Verified</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-12 w-full max-w-sm px-10">
          <div className="flex flex-col items-center gap-4">
              <Button onClick={handleDecline} size="icon" variant="destructive" className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600 active:scale-90 transition-transform"><PhoneOff className="h-10 w-10 text-white" /></Button>
              <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-4">
              <Button onClick={handleAccept} size="icon" className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl active:scale-90 transition-transform"><CheckCircle2 className="h-10 w-10 text-white" /></Button>
              <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Accept</span>
          </div>
      </div>
      
      <div className="absolute bottom-10 opacity-20">
          <p className="text-[8px] font-black uppercase tracking-widest">I-Pay Security Engine Protection</p>
      </div>
    </div>
  );
}