'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Upload,
  Clapperboard,
  Music,
  Film,
  Type,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Eye,
  Copy,
  Download,
  Share,
  RotateCw,
  MoreVertical,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';

const PostHeader = () => (
  <div className="flex items-center justify-between p-4">
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src="https://picsum.photos/seed/102/100/100" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold">johndoe</p>
        <p className="text-xs text-muted-foreground">Lagos, Nigeria</p>
      </div>
    </div>
    <Button variant="outline" size="sm">
      Follow
    </Button>
  </div>
);

const PostActions = ({
  showDownload,
  showRotate,
}: {
  showDownload?: boolean;
  showRotate?: boolean;
}) => (
  <div className="flex flex-col items-center justify-center gap-4 p-4">
    <Button variant="ghost" size="icon" className="h-10 w-10">
      <Heart className="h-6 w-6" />
      <span className="text-xs">10.5k</span>
    </Button>
    <Button variant="ghost" size="icon" className="h-10 w-10">
      <MessageCircle className="h-6 w-6" />
      <span className="text-xs">1.2k</span>
    </Button>
    <Button variant="ghost" size="icon" className="h-10 w-10">
      <Eye className="h-6 w-6" />
      <span className="text-xs">1.1M</span>
    </Button>
    <Button variant="ghost" size="icon" className="h-10 w-10">
      <Copy className="h-6 w-6" />
      <span className="text-xs">Copy</span>
    </Button>
    {showDownload && (
      <Button variant="ghost" size="icon" className="h-10 w-10">
        <Download className="h-6 w-6" />
        <span className="text-xs">Download</span>
      </Button>
    )}
     <Button variant="ghost" size="icon" className="h-10 w-10">
      <Share className="h-6 w-6" />
      <span className="text-xs">Share</span>
    </Button>
    {showRotate && (
      <Button variant="ghost" size="icon" className="h-10 w-10">
        <RotateCw className="h-6 w-6" />
        <span className="text-xs">Rotate</span>
      </Button>
    )}
  </div>
);

export default function MediaPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-full">
      <Tabs defaultValue="text" className="h-full flex flex-col">
        <header className="sticky top-16 md:top-0 bg-background border-b z-10">
          <div className="container">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
              <TabsTrigger value="films">Films</TabsTrigger>
              <TabsTrigger value="music">Music</TabsTrigger>
            </TabsList>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="text">
            <div className="relative h-[calc(100vh-170px)] bg-blue-900 text-white flex flex-col justify-between">
                <PostHeader />
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <h2 className="text-3xl font-bold">This is a sample text post. It supports multiple lines and will be displayed in the color chosen by the user.</h2>
                </div>
                 <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <PostActions showDownload={false} />
                </div>
                <div className="p-4 text-sm">
                    <p>#sample #textpost #design</p>
                </div>
            </div>
          </TabsContent>
          <TabsContent value="image">
             <div className="relative h-[calc(100vh-170px)] bg-black flex flex-col justify-between">
                <PostHeader />
                <div className="flex-1 flex items-center justify-center">
                    <Image src="https://picsum.photos/seed/media-img/600/800" alt="Post" width={600} height={800} className="max-h-full w-auto object-contain" />
                </div>
                 <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <PostActions showDownload={true} />
                </div>
                <p className="p-4 text-sm text-white bg-black/50">This is a beautiful landscape. #nature #photography</p>
            </div>
          </TabsContent>
          <TabsContent value="reels">
             <div className="relative h-[calc(100vh-170px)] bg-black flex flex-col justify-between">
                <PostHeader />
                <div className="flex-1 flex items-center justify-center">
                    <video src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" controls className="max-h-full w-auto object-contain" />
                </div>
                 <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <PostActions showDownload={true} />
                </div>
                 <p className="p-4 text-sm text-white bg-black/50">Check out this cool reel! #funny #reel</p>
            </div>
          </TabsContent>
          <TabsContent value="films">
            <div className="relative h-[calc(100vh-170px)] bg-black flex flex-col justify-between">
                <PostHeader />
                <div className="flex-1 flex items-center justify-center">
                    <video src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_5MB.mp4" controls className="max-h-full w-auto object-contain" />
                </div>
                 <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <PostActions showDownload={true} showRotate={true} />
                </div>
                 <p className="p-4 text-sm text-white bg-black/50">Movie night! 🍿 #film #cinema</p>
            </div>
          </TabsContent>
          <TabsContent value="music">
             <div className="relative h-[calc(100vh-170px)] bg-gray-800 text-white flex flex-col justify-between items-center text-center">
                <PostHeader />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <Music className="h-32 w-32 mb-4"/>
                    <h2 className="text-2xl font-bold">Awesome Song Title</h2>
                    <p className="text-lg text-muted-foreground">Artist Name</p>
                    <audio controls src="/mock-audio.mp3" className="mt-8 w-full max-w-sm"></audio>
                </div>
                 <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <PostActions showDownload={true} />
                </div>
                 <p className="p-4 text-sm">Vibes ✨ #music #newrelease</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="absolute bottom-24 right-6 md:bottom-6 h-16 w-16 rounded-full bg-accent hover:bg-accent/90"
          >
            <Plus className="h-8 w-8" />
            <span className="sr-only">Add Media</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader>
            <SheetTitle>Create a new post</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Link href="/dashboard/media/upload/text" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <Type />
              <span>Text</span>
            </Link>
            <Link href="/dashboard/media/upload/image" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <ImageIcon />
              <span>Image</span>
            </Link>
            <Link href="/dashboard/media/upload/reels" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <Clapperboard />
              <span>Reels</span>
            </Link>
            <Link href="/dashboard/media/upload/film" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <Film />
              <span>Film</span>
            </Link>
             <Link href="/dashboard/media/upload/music" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-lg p-4 bg-muted hover:bg-muted/80">
              <Music />
              <span>Music</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
