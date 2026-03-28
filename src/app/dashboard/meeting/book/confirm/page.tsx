'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Clipboard, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { databases, storage, DATABASE_ID, BUCKET_ID_UPLOADS, COLLECTION_ID_MEETINGS, COLLECTION_ID_NOTIFICATIONS, COLLECTION_ID_MESSAGES, COLLECTION_ID_CHATS, MEETING_BOT_ID, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID, Permission, Role } from 'appwrite';
import { useUser } from '@/hooks/use-appwrite';

const getChatId = (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0].substring(0, 15)}_${sortedIds[1].substring(0, 15)}`;
};

function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

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
      
      // 1. Upload Wall Image to Storage
      let finalWallUrl = '';
      if (meetingData.wallUrl && meetingData.wallUrl.startsWith('data:')) {
          const file = dataURLtoFile(meetingData.wallUrl, `meeting-wall-${meetingId}.png`);
          const upload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), file);
          finalWallUrl = getAppwriteStorageUrl(upload.$id);
      }

      const payload = {
        hostId: user.$id,
        name: meetingData.name,
        description: meetingData.description,
        type: meetingData.type,
        wallUrl: finalWallUrl,
        date: meetingData.date,
        time: meetingData.time,
        rules: JSON.stringify(meetingData.rules),
        inviteMethod: meetingData.inviteMethod,
        invitees: meetingData.invitedUsers || [],
        meetingLink: meetingLink,
        status: 'pending'
      };

      // 2. Create Meeting Record
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MEETINGS, meetingId, payload);

      // 3. Process Invitees (Notifications & Chat)
      if (meetingData.inviteMethod === 'list' && meetingData.invitedUsers?.length > 0) {
        for (const inviteeId of meetingData.invitedUsers) {
          // A. Create Secure Notification
          await databases.createDocument(DATABASE_ID, COLLECTION_ID_NOTIFICATIONS, ID.unique(), {
            userId: inviteeId,
            senderId: user.$id,
            type: 'system',
            title: 'Meeting Invite',
            description: `You are invited to "${meetingData.name}" on ${meetingData.date} at ${meetingData.time}.`,
            isRead: false,
            link: `/dashboard/meeting/enter?id=${meetingId}`,
            createdAt: new Date().toISOString()
          }, [
            Permission.read(Role.user(inviteeId)),
            Permission.update(Role.user(inviteeId)),
            Permission.delete(Role.user(inviteeId))
          ]);

          // B. Create Chat Thread & Message
          const inviteeChatId = getChatId(inviteeId, MEETING_BOT_ID);
          const inviteeBotMsg = `Hello! You have a new meeting invitation.\n\nMeeting: ${meetingData.name}\nHost: @${user.name}\nDate: ${meetingData.date}\nTime: ${meetingData.time}\n\nJoin here: ${meetingLink}`;
          
          try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, inviteeChatId, {
                participants: [inviteeId, MEETING_BOT_ID],
                lastMessage: `Invitation: ${meetingData.name}`,
                lastMessageAt: new Date().toISOString()
            });
          } catch (e: any) {
            if (e.code === 404) {
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, inviteeChatId, {
                    participants: [inviteeId, MEETING_BOT_ID],
                    lastMessage: `Invitation: ${meetingData.name}`,
                    lastMessageAt: new Date().toISOString()
                });
            }
          }

          await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
            chatId: inviteeChatId,
            senderId: MEETING_BOT_ID,
            text: inviteeBotMsg,
            status: 'sent'
          });
        }
      }

      // 4. Host System Chat Confirmation
      const hostChatId = getChatId(user.$id, MEETING_BOT_ID);
      const hostSummary = `Meeting Booked Successfully!\n\nName: ${meetingData.name}\nSchedule: ${meetingData.date} @ ${meetingData.time}\nType: ${meetingData.type.toUpperCase()}\n\nYour device will ring automatically at the set time. Gaskiya.`;
      
      try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_CHATS, hostChatId, {
            participants: [user.$id, MEETING_BOT_ID],
            lastMessage: `Booked: ${meetingData.name}`,
            lastMessageAt: new Date().toISOString()
        });
      } catch (e: any) {
        if (e.code === 404) {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_CHATS, hostChatId, {
                participants: [user.$id, MEETING_BOT_ID],
                lastMessage: `Booked: ${meetingData.name}`,
                lastMessageAt: new Date().toISOString()
            });
        }
      }

      await databases.createDocument(DATABASE_ID, COLLECTION_ID_MESSAGES, ID.unique(), {
        chatId: hostChatId,
        senderId: MEETING_BOT_ID,
        text: hostSummary,
        status: 'sent'
      });

      setConfirmedId(meetingId);
      sessionStorage.removeItem('pendingMeeting');
      toast({ title: 'Meeting Confirmed!', description: 'Your friends have been notified via Chat and Alerts.' });

    } catch (error: any) {
      console.error(error);
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
            Meeting is fully scheduled. All participants have been notified in their chat and alerts.
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
              {meetingData?.rules?.allowChat && <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full border border-primary/20 shadow-sm">Chat On</span>}
              {meetingData?.rules?.allowVoice && <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full border border-primary/20 shadow-sm">Voice On</span>}
              {meetingData?.rules?.allowVideo && <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full border border-primary/20 shadow-sm">Video On</span>}
              {meetingData?.rules?.hideFace && <span className="px-3 py-1 bg-destructive/10 text-destructive text-[10px] font-black uppercase rounded-full border border-destructive/20 shadow-sm">Faces Hidden</span>}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-amber-800 leading-tight italic">
              "Gaskiya": By confirming, invitations will be sent instantly to both Chat and Alerts. Your device will ring automatically at the set time.
            </p>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleFinalize} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Processing...</> : "Confirm Meeting"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
