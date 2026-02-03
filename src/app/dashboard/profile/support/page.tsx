'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { ArrowLeft, Mic, Send, X } from 'lucide-react';

export default function SupportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendText = () => {
    setIsLoading(true);
    setTimeout(() => {
      console.log('Support message sent:', textMessage);
      toast({
        title: 'Message Sent',
        description: 'Our support team will get back to you shortly.',
      });
      setTextMessage('');
      setIsLoading(false);
      router.push('/dashboard/profile');
    }, 1000);
  };
  
  const startRecording = () => {
    setIsRecording(true);
    recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
    }, 1000);
  }

  const stopRecording = (send: boolean) => {
    setIsRecording(false);
    if(recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
    }
    
    if (send && recordingTime > 0) {
        setIsLoading(true);
        setTimeout(() => {
            console.log(`Voice note sent, duration: ${formatTime(recordingTime)}`);
            toast({
                title: 'Voice Note Sent',
                description: 'Our support team will review your message.',
            });
            setIsLoading(false);
            router.push('/dashboard/profile');
        }, 1500);
    }
    setRecordingTime(0);
  }
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let timeString = '';
    if (hours > 0) {
        timeString += `${hours.toString().padStart(2, '0')}:`;
    }
    timeString += `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return timeString;
  }

  return (
    <div className="container py-8">
      <Link href="/dashboard/profile" className="flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>We are here to help. Choose your preferred method.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text Message</TabsTrigger>
              <TabsTrigger value="voice">Voice Note</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="pt-4">
              <div className="space-y-4">
                <Textarea
                  placeholder="Describe your issue here..."
                  rows={8}
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                />
                <Button onClick={handleSendText} disabled={isLoading || !textMessage.trim()} className="w-full">
                  {isLoading ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="voice" className="pt-4">
              <div className="flex flex-col items-center justify-center space-y-4 h-48">
                {isRecording ? (
                  <>
                    <p className="text-2xl font-mono">{formatTime(recordingTime)}</p>
                    <div className="flex gap-4">
                      <Button variant="destructive" size="icon" onClick={() => stopRecording(false)}><X /></Button>
                      <Button size="icon" onClick={() => stopRecording(true)} disabled={isLoading}>
                        {isLoading ? '...' : <Send />}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">Press and hold to record (up to 1 hour)</p>
                    <Button
                      size="icon"
                      className="h-20 w-20 rounded-full"
                      onMouseDown={startRecording}
                      onMouseUp={() => stopRecording(true)}
                      onTouchStart={startRecording}
                      onTouchEnd={() => stopRecording(true)}
                      disabled={isLoading}
                    >
                      <Mic className="h-8 w-8" />
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
