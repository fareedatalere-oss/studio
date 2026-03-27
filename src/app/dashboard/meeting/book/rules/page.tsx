'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Mic, Video, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function MeetingRulesPage() {
  const router = useRouter();
  
  const [rules, setRules] = useState({
    allowChat: true,
    allowVoice: true,
    allowVideo: true,
    hideFace: false,
  });

  const [meetingData, setMeetingData] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('pendingMeeting');
    if (!saved) {
      router.replace('/dashboard/meeting/book');
      return;
    }
    setMeetingData(JSON.parse(saved));
  }, [router]);

  const handleNext = () => {
    const updated = { ...meetingData, rules };
    sessionStorage.setItem('pendingMeeting', JSON.stringify(updated));
    router.push('/dashboard/meeting/book/invite');
  };

  const RuleItem = ({ id, label, icon: Icon, description }: any) => (
    <div className="flex items-center justify-between p-4 rounded-3xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-2xl">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-black uppercase text-[10px] tracking-widest leading-none">{label}</p>
          <p className="text-[9px] font-bold text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <Switch 
        checked={rules[id as keyof typeof rules]} 
        onCheckedChange={(v) => setRules({...rules, [id]: v})} 
      />
    </div>
  );

  return (
    <div className="container py-8 max-w-2xl">
      <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8 text-center">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Step 3: Meeting Rules</CardTitle>
          <CardDescription className="font-bold">Define permissions for participants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-8">
          <RuleItem id="allowChat" label="In-Meeting Chat" icon={MessageSquare} description="Allow users to send text messages during the call." />
          <RuleItem id="allowVoice" label="Voice Audio" icon={Mic} description="Allow participants to speak using their microphone." />
          <RuleItem id="allowVideo" label="Real-time Video" icon={Video} description="Enable camera access for live video stream." />
          <RuleItem id="hideFace" label="Force Hide Face" icon={UserX} description="Participants must use avatars; cameras will be restricted." />
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleNext} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl">
            Next: Invitations
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
