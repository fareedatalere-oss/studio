
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Music, Settings, UploadCloud, ImageIcon, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, storage, BUCKET_ID_UPLOADS, ID } from '@/lib/appwrite';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const musicCategories = ["Hip/rappers", "Traditional song", "English version", "Indian cemp"];

export default function UploadMusicPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(0); 
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const { user: authUser, profile: userProfile } = useUser();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
    }
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setIconFile(file);
        setIconPreview(URL.createObjectURL(file));
    }
  };

  const handlePost = async () => {
    if (!audioFile || !authUser || !userProfile || !selectedCategory) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing information.' });
        return;
    }
    setIsPosting(true);
    toast({ title: 'Uploading track...' });
    
    try {
        let thumbUrl = "";
        if (iconFile) {
            const iconUpload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), iconFile);
            thumbUrl = iconUpload.url;
        }

        const audioUpload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), audioFile);
        const mediaUrl = audioUpload.url;

        const encodedDescription = `CAT:${selectedCategory}|ICON:${thumbUrl}|${description}`;

        const newPost = {
            userId: authUser.$id,
            username: userProfile.username,
            userAvatar: userProfile.avatar,
            type: 'music',
            mediaUrl: mediaUrl,
            description: encodedDescription,
            allowComments: allowComments,
            allowDownload: allowDownload,
            likes: [],
            commentCount: 0
        };
        
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
        toast({ title: 'Music Posted!', description: 'Your track is now live in the Music Hub.' });
        router.push('/dashboard/media/music');
    } catch (error: any) {
        toast({ title: 'Post Failed', description: error.message, variant: 'destructive' });
        setIsPosting(false);
    }
  };

  if (step === 0) {
      return (
        <div className="container py-8">
            <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm font-black uppercase text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back to Media
            </Link>
            <Card className="w-full max-w-lg mx-auto shadow-xl rounded-[2rem] overflow-hidden border-none">
                <CardHeader className="bg-primary/5 text-center pb-8">
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Genre Selection</CardTitle>
                    <CardDescription className="font-bold">Choose the category for your track</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 pt-6">
                    {musicCategories.map((cat) => (
                        <Button 
                            key={cat} 
                            onClick={() => { setSelectedCategory(cat); setStep(1); }} 
                            variant="outline" 
                            className="h-16 justify-between text-lg font-bold uppercase tracking-tight group hover:bg-primary hover:text-white rounded-2xl transition-all"
                        >
                            {cat}
                            <ChevronRight className="h-5 w-5 opacity-30 group-hover:opacity-100" />
                        </Button>
                    ))}
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="container py-8">
      <Button onClick={() => setStep(0)} variant="ghost" className="mb-4 font-black uppercase text-[10px] text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" /> Change Category ({selectedCategory})
      </Button>
      <Card className="w-full max-w-lg mx-auto shadow-xl rounded-[2rem] overflow-hidden border-none">
        <CardHeader className="bg-primary/5 pb-6">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-center">Upload {selectedCategory}</CardTitle>
          <CardDescription className="text-center font-bold">Share your audio with the community</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {!audioFile ? (
            <div className="py-10">
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full h-20 rounded-[2rem] font-black uppercase text-[10px] flex-col gap-1 shadow-md">
                    <UploadCloud className="h-8 w-8 text-primary" /> 
                    Choose Audio File
                </Button>
                <p className="text-[10px] text-muted-foreground text-center font-bold mt-4 px-10">MP3, WAV, and AAC supported.</p>
            </div>
          ) : (
            <div className='space-y-6'>
                 <div className="bg-muted/30 p-4 rounded-2xl border-2 border-dashed text-center">
                    <p className="font-bold text-sm truncate">{audioFile.name}</p>
                    <audio controls src={URL.createObjectURL(audioFile)} className="w-full mt-4 h-10" />
                </div>
                
                <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70 tracking-widest">Track Description</Label>
                    <Textarea 
                        placeholder="Write a catchy description..." 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        className="rounded-xl bg-muted/50 border-none min-h-[100px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] opacity-70 tracking-widest">Album Art / Icon</Label>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-24 h-24 bg-muted rounded-[1.5rem] flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden relative shadow-sm" 
                            onClick={() => iconInputRef.current?.click()}
                        >
                            {iconPreview ? <Image src={iconPreview} alt="Thumbnail" fill className="object-cover" /> : <ImageIcon className="h-6 w-6 opacity-20" />}
                        </div>
                        <div className="flex-1 space-y-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => iconInputRef.current?.click()} className="rounded-full h-9 font-black uppercase text-[9px] tracking-widest">
                                Pick Cover Art
                            </Button>
                            <p className="text-[8px] font-bold text-muted-foreground leading-tight italic">Square images look best for music icons.</p>
                        </div>
                    </div>
                    <input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleIconChange} />
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed">
                    <Label className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-50"><Settings className="h-3 w-3" /> Distribution</Label>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <Label htmlFor="allow-comments" className="text-sm font-bold">Allow Comments</Label>
                        <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <Label htmlFor="allow-download" className="text-sm font-bold">Enable Download</Label>
                        <Switch id="allow-download" checked={allowDownload} onCheckedChange={setAllowDownload} />
                    </div>
                </div>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*" />
        </CardContent>
        {audioFile && (
            <CardFooter className="p-6 bg-muted/30">
                <Button onClick={handlePost} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg" disabled={isPosting}>
                    {isPosting ? <Loader2 className="animate-spin" /> : 'Confirm & Post Track'}
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
