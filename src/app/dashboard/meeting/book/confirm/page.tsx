'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Clipboard, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, DATABASE_ID, COLLECTION_ID_MEETINGS, COLLECTION_ID_NOTIFICATIONS, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, MEETING_BOT_ID } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { useUser } from '@/hooks/use-appwrite';

export default function MeetingConfirmPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [meetingData, setMeetingData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('pendingMeeting');
    if (!saved) {
      router.replace('/dashboard/meeting/book');
      return;
    }
    setMeetingData(JSON.parse(saved));
  }, [router]);

  const handleFinalize = async () => {
    if (!user || !meetingData) return;
    setIsSubmitting(true);

    try {
      const meetingId = ID.unique();
      const meetingLink = `${window.location.origin}/dashboard/meeting/enter?id=${meetingId}`;
      
      const payload = {
        hostId: user.$id,
        name: meetingData.name,
        description: meetingData.description,
        type: meetingData.type,
        wallUrl: meetingData.wallUrl || '',
        date: meetingData.date,
        time: meetingData.time,
        rules: JSON.stringify(meetingData.rules),
        inviteMethod: meetingData.inviteMethod,
        invitees: meetingData.invitedUsers || [],
        meetingLink: meetingLink,
        status: 'pending'
      };

      // 1. Create Meeting Record
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, payload);

      // 2. Send Notifications to invitees
      if (meetingData.inviteMethod === 'list') {
        const notifPromises = meetingData.invitedUsers.map((id: string) => 
          databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
            userId: id,
            senderId: user.$id,
            type: 'system',
            title: 'Meeting Invite',
            description: `You're invited to "${meetingData.name}" on ${meetingData.date} at ${meetingData.time}.`,
            isRead: false,
            link: `/dashboard/meeting/enter?id=${meetingId}`,
            createdAt: new Date().toISOString()
          })
        );
        await Promise.all(notifPromises);
      }

      // 3. System Chat Logic: I-Pay Meeting speaks to host
      const chatId = `${user.$id}_${MEETING_BOT_ID}`;
      const chatMsg = `Hello @${user.name}! Your meeting "${meetingData.name}" is booked for ${meetingData.date} at ${meetingData.time}. \n\nType: ${meetingData.type.toUpperCase()}\nDescription: ${meetingData.description}\n\nUse the buttons below to manage this session.`;
      
      try {
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, chatId, {
            participants: [user.$id, MEETING_BOT_ID],
            lastMessage: `Meeting Booked: ${meetingData.name}`,
            lastMessageAt: new Date().toISOString()
        });
      } catch (e) {}

      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
        chatId: chatId,
        senderId: MEETING_BOT_ID,
        text: chatMsg,
        status: 'sent'
      });

      setConfirmedId(meetingId);
      sessionStorage.removeItem('pendingMeeting');
      toast({ title: 'Meeting Confirmed!', description: 'Invitees have been notified.' });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Booking Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/dashboard/meeting/enter?id=${confirmedId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied to clipboard!' });
  };

  if (confirmedId) {
    return (
      <div className="container py-8 max-w-md text-center">
        <Card className="rounded-[3rem] p-10 shadow-2xl border-none overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>
          <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Gaskiya!</h2>
          <p className="text-muted-foreground text-sm font-bold mb-8">
            Meeting is fully scheduled. The system will ring your screen when it's time to start.
          </p>
          
          <div className="p-4 rounded-2xl bg-muted/50 border mb-8 flex items-center justify-between">
            <p className="text-[10px] font-mono truncate mr-4">{window.location.origin}/meeting/{confirmedId}</p>
            <Button size="icon" variant="ghost" onClick={copyLink} className="shrink-0"><Clipboard className="h-4 w-4" /></Button>
          </div>

          <Button asChild className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl">
            <Link href="/dashboard/meeting">Back to Hub</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary" disabled={isSubmitting}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-center">Final Confirmation</CardTitle>
          <CardDescription className="text-center font-bold">Review your meeting summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-[10px] font-black uppercase opacity-50">Date & Time</p>
              <p className="font-black text-sm">{meetingData?.date} @ {meetingData?.time}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-[10px] font-black uppercase opacity-50">Scope</p>
              <p className="font-black text-sm uppercase">{meetingData?.type}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase opacity-50 px-2">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {meetingData?.rules.allowChat && <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full">Chat On</span>}
              {meetingData?.rules.allowVoice && <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full">Voice On</span>}
              {meetingData?.rules.allowVideo && <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full">Video On</span>}
              {meetingData?.rules.hideFace && <span className="px-3 py-1 bg-destructive/10 text-destructive text-[10px] font-black uppercase rounded-full">Faces Hidden</span>}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-amber-800 leading-tight italic">
              "Gaskiya": By confirming, you agree that your wallet will be billed (if General) and invitations will be sent instantly. Your device will ring automatically at the set time.
            </p>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleFinalize} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirm Meeting"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
