
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Library, Music, Settings, UploadCloud, ImageIcon, X, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/hooks/use-appwrite';
import { databases, DATABASE_ID, COLLECTION_ID_POSTS, storage, BUCKET_ID_UPLOADS, getAppwriteStorageUrl } from '@/lib/appwrite';
import { ID } from 'appwrite';
import Image from 'next/image';

const musicCategories = ["Hip/rappers", "Traditional song", "English vision", "Indian cemp"];

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
            thumbUrl = getAppwriteStorageUrl(iconUpload.$id);
        }

        const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), audioFile);
        const mediaUrl = getAppwriteStorageUrl(uploadResult.$id);

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
        toast({ title: 'Music Posted!' });
        router.push('/dashboard/media/music');
    } catch (error: any) {
        toast({ title: 'Post Failed', description: error.message, variant: 'destructive' });
        setIsPosting(false);
    }
  };

  if (step === 0) {
      return (
        <div className="container py-8">
            <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm font-black uppercase"><ArrowLeft className="h-4 w-4" /> Back to Media</Link>
            <Card className="w-full max-w-lg mx-auto shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center"><CardTitle className="text-2xl font-black uppercase">Choose Category</CardTitle></CardHeader>
                <CardContent className="grid gap-3">
                    {musicCategories.map((cat) => (
                        <Button key={cat} onClick={() => { setSelectedCategory(cat); setStep(1); }} variant="outline" className="h-16 justify-between text-lg font-bold uppercase group hover:bg-primary hover:text-white">{cat}<ChevronRight className="h-5 w-5 opacity-30 group-hover:opacity-100" /></Button>
                    ))}
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="container py-8">
      <Button onClick={() => setStep(0)} variant="ghost" className="mb-4 font-black uppercase text-xs"><ArrowLeft className="mr-2 h-4 w-4" /> Change Category ({selectedCategory})</Button>
      <Card className="w-full max-w-lg mx-auto shadow-xl border-t-4 border-t-primary">
        <CardHeader><CardTitle className="text-2xl font-black uppercase tracking-tighter">Upload {selectedCategory}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
             <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full h-12 font-bold uppercase text-xs"><UploadCloud className="mr-2 h-4 w-4" /> Upload Audio</Button>
          </div>
          {audioFile && (
            <div className='space-y-6 border-t pt-6'>
                 <div className="bg-muted/30 p-4 rounded-2xl border"><p className="font-bold text-sm truncate">{audioFile.name}</p><audio controls src={URL.createObjectURL(audioFile)} className="w-full mt-4" /></div>
                <div className="space-y-2"><Label className="font-black uppercase text-[10px] opacity-70">Description</Label><Textarea placeholder="Catchy description..." value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl"/></div>
                <div className="space-y-2"><Label className="font-black uppercase text-[10px] opacity-70">Music Icon</Label><div className="flex items-center gap-4"><div className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden relative" onClick={() => iconInputRef.current?.click()}>{iconPreview ? <Image src={iconPreview} alt="Thumbnail" fill className="object-cover" /> : <ImageIcon className="h-6 w-6 opacity-20" />}</div><Button type="button" variant="outline" size="sm" onClick={() => iconInputRef.current?.click()}>Pick Image</Button></div><input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleIconChange} /></div>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*" />
        </CardContent>
        <CardFooter><Button onClick={handlePost} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg" disabled={!audioFile || isPosting}>{isPosting ? <Loader2 className="animate-spin mr-2"/> : 'Post Music'}</Button></CardFooter>
      </Card>
    </div>
  );
}
