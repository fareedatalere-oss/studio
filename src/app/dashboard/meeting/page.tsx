
'use client';

import Link from 'next/link';
import { ArrowLeft, Video, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MeetingLandingPage() {
  return (
    <div className="container py-8 max-lg">
      <Link href="/dashboard/chat" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Hub
      </Link>

      <div className="space-y-6">
        <header className="text-center space-y-2 mb-10">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">Meeting</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Digital Communication Center</p>
        </header>

        <div className="grid gap-3 max-w-[240px] mx-auto">
          <Button asChild className="h-10 flex items-center justify-between px-5 rounded-xl group shadow-sm transition-all active:scale-95" variant="default">
            <Link href="/dashboard/meeting/book">
              <div className="flex items-center gap-2 text-left">
                <Video className="h-3 w-3 text-white" />
                <p className="font-black tracking-widest text-[8px] text-white">Book a meeting</p>
              </div>
              <ArrowRight className="h-3 w-3 text-white/50" />
            </Link>
          </Button>

          <Button asChild className="h-10 flex items-center justify-between px-5 rounded-xl group shadow-sm transition-all active:scale-95" variant="outline">
            <Link href="/dashboard/meeting/enter">
              <div className="flex items-center gap-2 text-left text-foreground">
                <Users className="h-3 w-3 text-primary" />
                <p className="font-black tracking-widest text-[8px]">Enter meeting</p>
              </div>
              <ArrowRight className="h-3 w-3 opacity-50" />
            </Link>
          </Button>
        </div>
        
        <div className="pt-10 text-center">
            <p className="text-[8px] font-black uppercase text-muted-foreground opacity-30 tracking-[0.4em]">Powered by I-Pay Security Engine</p>
        </div>
      </div>
    </div>
  );
}
