'use client';

import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MeetingSchedulesPage() {
  return (
    <div className="container py-8 max-w-2xl">
      <Link href="/dashboard/meeting" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Hub
      </Link>
      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-center">Upcoming Schedules</CardTitle>
          <CardDescription className="text-center font-bold">Community Attendance & Timing</CardDescription>
        </CardHeader>
        <CardContent className="p-10 text-center space-y-4">
          <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-10 w-10 text-muted-foreground opacity-30" />
          </div>
          <p className="font-black uppercase text-xs tracking-widest text-muted-foreground">No active schedules found.</p>
          <p className="text-sm text-muted-foreground px-4">When community members book general meetings, they will appear here for you to join.</p>
        </CardContent>
      </Card>
    </div>
  );
}
