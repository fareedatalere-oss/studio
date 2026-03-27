'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Upload, Users, Shield, Globe, Info, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function BookMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'personal',
    wallUrl: null as string | null,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => setFormData({ ...formData, wallUrl: ev.target?.result as string });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleConfirmBooking = () => {
    if (!formData.name || !formData.wallUrl) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide a name and meeting wall image.' });
      return;
    }
    
    setIsProcessing(true);
    // Store temporarily in session for next step
    sessionStorage.setItem('pendingMeeting', JSON.stringify(formData));
    
    setTimeout(() => {
        router.push('/dashboard/meeting/book/schedule');
    }, 1000);
  };

  return (
    <div className="container py-8 max-w-2xl">
      <Link href="/dashboard/meeting" className="flex items-center gap-2 mb-6 text-sm font-black uppercase text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Cancel
      </Link>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-center">Book a Meeting</CardTitle>
          <CardDescription className="text-center font-bold">Step 1: Meeting Identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Meeting Name</Label>
            <Input 
              placeholder="e.g., Weekly Business Strategy" 
              className="h-12 rounded-2xl bg-muted/50 border-none px-4 font-bold"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Meeting Wall (Image)</Label>
            <div 
              className="h-48 rounded-[2rem] bg-muted/30 border-2 border-dashed border-muted flex flex-col items-center justify-center cursor-pointer overflow-hidden group relative transition-all hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.wallUrl ? (
                <>
                  <Image src={formData.wallUrl} alt="Wall" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white font-black text-xs uppercase">Change Image</p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="bg-primary/10 p-4 rounded-full mb-3 inline-block">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select from device</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Description</Label>
            <Textarea 
              placeholder="What is this meeting about?" 
              className="rounded-2xl bg-muted/50 border-none p-4"
              rows={4}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Meeting Scope</Label>
            <RadioGroup value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })} className="grid grid-cols-2 gap-4">
              <div className={cn(
                "p-4 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-2",
                formData.type === 'personal' ? "border-primary bg-primary/5" : "border-muted bg-muted/20"
              )} onClick={() => setFormData({ ...formData, type: 'personal' })}>
                <div className="flex items-center justify-between">
                  <Users className={cn("h-5 w-5", formData.type === 'personal' ? "text-primary" : "text-muted-foreground")} />
                  <RadioGroupItem value="personal" id="personal" className="sr-only" />
                </div>
                <p className="font-black text-xs uppercase tracking-tighter">Personal</p>
                <p className="text-[9px] leading-tight text-muted-foreground font-bold">4 Users • 1 Hour • Free Booking</p>
              </div>

              <div className={cn(
                "p-4 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-2",
                formData.type === 'general' ? "border-primary bg-primary/5" : "border-muted bg-muted/20"
              )} onClick={() => setFormData({ ...formData, type: 'general' })}>
                <div className="flex items-center justify-between">
                  <Globe className={cn("h-5 w-5", formData.type === 'general' ? "text-primary" : "text-muted-foreground")} />
                  <RadioGroupItem value="general" id="general" className="sr-only" />
                </div>
                <p className="font-black text-xs uppercase tracking-tighter">General</p>
                <p className="text-[9px] leading-tight text-muted-foreground font-bold">Unlimited Users • 3 Hours • Small Entry Fee</p>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-muted/30">
          <Button onClick={handleConfirmBooking} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin" /> : "Confirm Booking"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}