
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

const musicCategories = ["Hip/rappers", "Gargajiya", "English vision", "Indian cemp"];

export default function UploadMusicPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(0); // 0: Category, 1: Files
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
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
          toast({
              variant: 'destructive',
              title: 'File too large',
              description: 'Audio files should be under 50MB.'
          });
          return;
      }
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
        toast({ variant: 'destructive', title: 'Error', description: 'Missing information or category.' });
        return;
    }
    setIsPosting(true);
    toast({ title: 'Uploading track...' });
    
    try {
        let thumbnailUrl = "";
        if (iconFile) {
            const iconUpload = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), iconFile);
            thumbnailUrl = getAppwriteStorageUrl(iconUpload.$id);
        }

        const uploadResult = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), audioFile);
        const mediaUrl = getAppwriteStorageUrl(uploadResult.$id);

        const newPost = {
            userId: authUser.$id,
            username: userProfile.username,
            userAvatar: userProfile.avatar,
            type: 'music',
            category: selectedCategory,
            mediaUrl: mediaUrl,
            thumbnailUrl: thumbnailUrl,
            description: description,
            allowComments: allowComments,
            allowDownload: allowDownload,
            likes: [],
            commentCount: 0,
            createdAt: new Date().toISOString()
        };
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_POSTS, ID.unique(), newPost);
        toast({ title: 'Music Posted!', description: `Your track has been added to ${selectedCategory}.` });
        router.push('/dashboard/media/music');
        
    } catch (error: any) {
        console.error("Post creation failed:", error);
        toast({ title: 'Post Failed', description: error.message || 'Could not upload your music.', variant: 'destructive' });
        setIsPosting(false);
    }
  };

  if (step === 0) {
      return (
        <div className="container py-8">
            <Link href="/dashboard/media" className="flex items-center gap-2 mb-4 text-sm font-black uppercase">
                <ArrowLeft className="h-4 w-4" /> Back to Media
            </Link>
            <Card className="w-full max-w-lg mx-auto shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Choose Category</CardTitle>
                    <CardDescription>Select the genre for your music track</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                    {musicCategories.map((cat) => (
                        <Button 
                            key={cat} 
                            onClick={() => { setSelectedCategory(cat); setStep(1); }}
                            variant="outline" 
                            className="h-16 justify-between text-lg font-bold uppercase tracking-tight group hover:bg-primary hover:text-white"
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
      <Button onClick={() => setStep(0)} variant="ghost" className="mb-4 font-black uppercase text-xs">
        <ArrowLeft className="mr-2 h-4 w-4" /> Change Category ({selectedCategory})
      </Button>
      <Card className="w-full max-w-lg mx-auto shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Upload {selectedCategory}</CardTitle>
          <CardDescription>Share your track (up to 16 minutes).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
             <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full h-12 font-bold uppercase text-xs">
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload Audio
            </Button>
             <Button asChild variant="outline" className="w-full h-12 font-bold uppercase text-xs">
               <Link href="/dashboard/media/editor/audio">
                <Library className="mr-2 h-4 w-4" />
                Library
               </Link>
            </Button>
          </div>
          
          {audioFile && (
            <div className='space-y-6 border-t pt-6'>
                 <div className="bg-muted/30 p-4 rounded-2xl border">
                    <div className='flex items-center gap-3'>
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Music className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-bold text-sm truncate max-w-[200px]">{audioFile.name}</p>
                            <p className="text-[10px] uppercase font-black opacity-50">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <audio controls src={URL.createObjectURL(audioFile)} className="w-full mt-4" />
                </div>
                
                <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Track Description</Label>
                    <Textarea
                        placeholder="Add a catchy description for your track..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="rounded-xl"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest opacity-70">Music Icon (Thumbnail)</Label>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed overflow-hidden relative shadow-inner"
                            onClick={() => iconInputRef.current?.click()}
                        >
                            {iconPreview ? (
                                <div className="relative w-full h-full group">
                                    <Image src={iconPreview} alt="Thumbnail" fill className="object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="text-white h-6 w-6" onClick={(e) => { e.stopPropagation(); setIconFile(null); setIconPreview(null); }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-2 text-muted-foreground">
                                    <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-20" />
                                    <span className="text-[8px] uppercase font-black">Add Icon</span>
                                </div>
                            )}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => iconInputRef.current?.click()}>Upload from Device</Button>
                    </div>
                    <input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleIconChange} />
                </div>

                 <div className="space-y-4 pt-4 border-t">
                    <Label className="flex items-center font-black uppercase text-[10px] tracking-widest opacity-70"><Settings className="mr-2 h-3 w-3" /> Permissions</Label>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="allow-comments" className="text-sm font-semibold">Allow Comments</Label>
                        <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="allow-download" className="text-sm font-semibold">Enable Downloads</Label>
                        <Switch id="allow-download" checked={allowDownload} onCheckedChange={setAllowDownload} />
                    </div>
                 </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="audio/*"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handlePost} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg" disabled={!audioFile || isPosting}>
             {isPosting ? <><Loader2 className="animate-spin mr-2 h-5 w-5"/> Uploading...</> : 'Post Music'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
