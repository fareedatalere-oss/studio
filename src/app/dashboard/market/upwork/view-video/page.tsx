'use client';

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ViewVideoPage() {
  const router = useRouter();

  return (
    <div className="relative h-screen w-screen bg-black">
      <header className="absolute top-0 left-0 right-0 p-4 bg-black/50 z-10 flex justify-end">
        <Button onClick={() => router.back()} variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
          <X />
          <span className="sr-only">Close</span>
        </Button>
      </header>
      <main className="h-full w-full flex items-center justify-center">
        <video 
            src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_5MB.mp4" 
            controls 
            autoPlay 
            className="max-h-full max-w-full"
        />
      </main>
    </div>
  );
}
