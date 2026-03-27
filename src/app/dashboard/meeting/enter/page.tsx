'use client';

import { ArrowLeft, Video } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function EnterMeetingPage() {
  return (
    <div className="container py-8 max-w-lg">
      <Link href="/dashboard/meeting" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Hub
      </Link>
      <Card className="rounded-[2.5rem] shadow-2xl border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Enter Meeting</CardTitle>
          <CardDescription>Enter the meeting ID provided by the host</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Enter Meeting ID" className="h-14 rounded-2xl bg-muted border-none text-center font-black text-xl tracking-widest" />
        </CardContent>
        <CardFooter>
          <Button className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg">Join Now</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
