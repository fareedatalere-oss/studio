
'use client';

import Link from 'next/link';
import { ArrowLeft, Video, Users, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MeetingLandingPage() {
  return (
    <div className="container py-8 max-w-2xl">
      <Link href="/dashboard/chat" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Chat
      </Link>

      <div className="space-y-6">
        <header className="text-center space-y-2 mb-10">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
            <Video className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter">Meeting</h1>
          <p className="text-muted-foreground font-medium">Internal Communication Center</p>
        </header>

        <div className="grid gap-4">
          <Button asChild className="h-24 flex items-center justify-between px-8 rounded-3xl group shadow-lg" variant="default">
            <Link href="/dashboard/meeting/book">
              <div className="flex items-center gap-4 text-left">
                <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-widest text-white">Book a Meeting</p>
                  <p className="text-[10px] text-white/80">Generate a new session</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/50" />
            </Link>
          </Button>

          <Button asChild className="h-24 flex items-center justify-between px-8 rounded-3xl group shadow-md" variant="outline">
            <Link href="/dashboard/meeting/enter">
              <div className="flex items-center gap-4 text-left text-foreground">
                <div className="bg-muted p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-widest">Enter a Meeting</p>
                  <p className="text-[10px] text-muted-foreground">Join existing via ID</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 opacity-50" />
            </Link>
          </Button>

          <Button asChild className="h-24 flex items-center justify-between px-8 rounded-3xl group shadow-md" variant="secondary">
            <Link href="/dashboard/meeting/schedules">
              <div className="flex items-center gap-4 text-left">
                <div className="bg-muted p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-widest">View Schedules</p>
                  <p className="text-[10px] text-muted-foreground">Community attendance</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 opacity-50" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
