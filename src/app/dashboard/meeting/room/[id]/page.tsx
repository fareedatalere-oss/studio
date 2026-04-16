'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    PhoneOff, Loader2, Camera, 
    Video, Mic, MicOff, X,
    MonitorPlay, Send, MessageSquare, Trash2, Check, XCircle, Volume2, Layout, ImageIcon, Film, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, client, Query, ID, COLLECTION_ID_MESSAGES } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { uploadToCloudinary } from '@/app/actions/cloudinary';

const COLLECTION_ID_ATTENDEES = 'meetingAttendees';

export default function MeetingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useUser();
    const { toast } = useToast();
    const meetingId = params.id as string;
    
    const selfVideoRef = useRef<HTMLVideoElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const privateChatEndRef = useRef<HTMLDivElement>(null);

    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    const [privateChatPartner, setPrivateChatPartner] = useState<any>(null);
    const [privateMessages, setPrivateMessages] = useState<any[]>([]);
    const [privateInput, setPrivateInput] = useState('');

    const mySetup = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem(`meeting_guest_${meetingId}`);
        return saved ? JSON.parse(saved) : null;
    }, [meetingId]);

    const isAdmin = mySetup?.isHost === true || user?.$id === meeting?.hostId;

    const fetchMeeting = useCallback(async () => {
        try {
            const docData = await databases.getDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId);
            setMeeting(docData);
            if (docData.status === 'ended' || docData.status === 'cancelled') {
                router.replace('/dashboard/meeting');
            }
        } catch (e) {} finally { setLoading(false); }
    }, [meetingId, router]);

    const fetchAttendees = useCallback(async () => {
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ATTENDEES, [
                Query.equal('meetingId', meetingId),
                Query.limit(100)
            ]);
            setParticipants(res.documents.filter(doc => doc.status === 'approved'));
            setRequests(res.documents.filter(doc => doc.status === 'waiting'));
        } catch (e) {}
    }, [meetingId]);

    const fetchPrivateMessages = useCallback(async () => {
        if (!privateChatPartner || !user?.$id) return;
        const chatId = [user.$id, privateChatPartner.userId].sort().join('_') + '_' + meetingId;
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_MESSAGES, [
                Query.equal('chatId', chatId),
                Query.orderAsc('$createdAt'),
                Query.limit(50)
            ]);
            setPrivateMessages(res.documents);
        } catch (e) {}
    }, [privateChatPartner, user?.$id, meetingId]);

    useEffect(() => {
        if (privateChatPartner) {
            fetchPrivateMessages();
            const unsub = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MESSAGES}.documents`], response => {
                const payload = response.payload as any;
                const chatId = [user?.$id, privateChatPartner.userId].sort().join('_') + '_' + meetingId;
                if (payload && payload.chatId === chatId) fetchPrivateMessages();
            });
            return () => unsub();
        }
    }, [privateChatPartner, fetchPrivateMessages, user?.$id, meetingId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        fetchMeeting();
        fetchAttendees();
        
        const unsubMeeting = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_MEETINGS}.documents`], response => {
            const payload = response.payload as any;
            if (payload?.$id === meetingId) {
                if (payload.status === 'ended' || payload.status === 'cancelled') router.replace('/dashboard/meeting');
                else setMeeting(payload);
            }
        });

        const unsubAttendees = client.subscribe([`databases.${DATABASE_ID}.collections.${COLLECTION_ID_ATTENDEES}.documents`], response => {
            const payload = response.payload as any;
            if (payload && payload.meetingId === meetingId) fetchAttendees();
        });

        if (mySetup?.useCamera && navigator?.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: mySetup.facingMode || 'user' }, audio: true }).then(stream => {
                if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
            }).catch(() => {});
        }

        return () => { unsubMeeting(); unsubAttendees(); };
    }, [meetingId, fetchMeeting, fetchAttendees, router, mySetup]);

    const handleAction = async (requestId: string, status: 'approved' | 'declined') => {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ATTENDEES, requestId, { status });
    };

    const handleEndMeeting = async () => {
        if (isAdmin) await databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { status: 'ended' });
        router.replace('/dashboard/meeting');
    };

    const handleSendPrivate = async () => {
        if (!privateInput.trim() || !privateChatPartner || !user?.$id) return;
        const txt = privateInput.trim();
        setPrivateInput('');
        const chatId = [user.$id, privateChatPartner.userId].sort().join('_') + '_' + meetingId;
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
            chatId, senderId: user.$id, text: txt, status: 'sent', meetingId
        });
    };

    if (loading || !meeting) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    const isPersonal = meeting.type === 'personal';

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden relative font-body">
            <header className="p-4 pt-12 flex justify-between items-center bg-black/50 border-b border-white/5 z-50">
                <div className="flex-1">
                    <h1 className="font-black uppercase text-xs tracking-widest text-primary truncate">{meeting.name}</h1>
                </div>
                {isAdmin && !isPersonal && (
                    <div className="flex gap-2 mx-4">
                        <Button onClick={() => databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { activeView: 'board' })} size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white/5"><Layout className="h-4 w-4" /></Button>
                        <Button onClick={() => mediaInputRef.current?.click()} size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white/5"><MonitorPlay className="h-4 w-4" /></Button>
                    </div>
                )}
                <Button onClick={handleEndMeeting} size="sm" variant="destructive" className="h-9 rounded-full font-black uppercase text-[9px] px-6 shadow-lg">
                    {isAdmin ? 'End Hub' : 'Out'}
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-6 scrollbar-visible">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 max-w-6xl mx-auto py-10">
                    {participants.map(p => (
                        <div key={p.$id} className="flex flex-col items-center gap-2 group relative">
                            <div 
                                className={cn("relative rounded-full border-2 p-0.5 h-20 w-20 transition-all cursor-pointer hover:scale-105", p.isHost ? "border-yellow-500" : "border-primary/40")}
                                onClick={() => p.userId !== user?.$id && setPrivateChatPartner(p)}
                            >
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={p.avatar === 'live_stream' ? undefined : p.avatar} className="object-cover" />
                                    <AvatarFallback className="font-black bg-muted text-[10px]">{p.name?.charAt(0)}</AvatarFallback>
                                    {p.useCamera && p.userId === user?.$id && (
                                        <video ref={selfVideoRef} autoPlay muted playsInline className={cn("absolute inset-0 h-full w-full object-cover rounded-full", p.facingMode === 'user' && "scale-x-[-1]")} />
                                    )}
                                </Avatar>
                                {isAdmin && !p.isHost && (
                                    <button onClick={(e) => { e.stopPropagation(); handleAction(p.$id, 'declined'); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                                )}
                            </div>
                            <p className="font-black text-[8px] opacity-80 uppercase text-center truncate w-full tracking-tighter">@{p.name}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* BOARD OVERLAY */}
            {!isPersonal && meeting.activeView === 'board' && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
                    <Card className="w-full max-w-sm h-[40vh] flex flex-col rounded-[2.5rem] bg-white text-black overflow-hidden">
                        <header className="p-4 border-b flex justify-between items-center"><span className="font-black uppercase text-[10px]">Board</span><Button variant="ghost" onClick={() => databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { activeView: 'none' })}><X /></Button></header>
                        <div className="flex-1 p-6">
                            {isAdmin ? <Textarea className="h-full border-none shadow-none text-lg font-bold" value={meeting.boardText} onChange={e => databases.updateDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, { boardText: e.target.value })} /> : <div className="text-lg font-bold">{meeting.boardText || 'Waiting...'}</div>}
                        </div>
                    </Card>
                </div>
            )}

            {/* PRIVATE CHAT OVERLAY */}
            {privateChatPartner && (
                <div className="absolute bottom-20 left-0 right-0 z-[400] flex justify-center p-4">
                    <Card className="w-full max-w-md h-[45vh] flex flex-col rounded-[2.5rem] overflow-hidden bg-white text-black shadow-2xl">
                        <header className="p-4 bg-primary text-white flex justify-between items-center">
                            <div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarImage src={privateChatPartner.avatar}/></Avatar><p className="font-black uppercase text-[9px]">{privateChatPartner.name}</p></div>
                            <Button variant="ghost" onClick={() => setPrivateChatPartner(null)}><X className="h-4 w-4"/></Button>
                        </header>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-3">
                                {privateMessages.map(m => (
                                    <div key={m.$id} className={cn("flex flex-col", m.senderId === user?.$id ? "items-end" : "items-start")}>
                                        <div className={cn("p-3 rounded-2xl text-xs font-bold max-w-[85%]", m.senderId === user?.$id ? "bg-primary text-white" : "bg-muted")}>{m.text}</div>
                                    </div>
                                ))}
                                <div ref={privateChatEndRef} />
                            </div>
                        </ScrollArea>
                        <footer className="p-3 border-t flex gap-2">
                            <Input value={privateInput} onChange={e => setPrivateInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendPrivate()} placeholder="Message..." className="h-10 rounded-xl" />
                            <Button onClick={handleSendPrivate} size="icon" className="h-10 w-10 rounded-full"><Send className="h-4 w-4"/></Button>
                        </footer>
                    </Card>
                </div>
            )}

            <footer className="p-6 border-t bg-black/80 flex items-center justify-between z-[90]">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary p-0.5"><AvatarImage src={profile?.avatar} /></Avatar>
                    <div className="text-left"><p className="text-[10px] font-black uppercase text-primary">Identity Feed</p><p className="text-[8px] font-bold opacity-50 uppercase">Live Master Sync</p></div>
                </div>
            </footer>
        </div>
    );
}