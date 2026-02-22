'use client';

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";
import { Suspense } from 'react';

function EditorContent() {
  const backUrl = '/dashboard/media/upload/music';

  return (
    <div className="relative h-screen">
      <header className="absolute top-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm flex justify-between items-center z-10">
        <h1 className="text-lg font-semibold">BeepBox Music Maker</h1>
        <Button asChild variant="ghost" size="icon">
          <Link href={backUrl}>
            <X />
            <span className="sr-only">Close Editor</span>
          </Link>
        </Button>
      </header>
      <iframe
        src="https://www.beepbox.co/"
        className="w-full h-full border-0 pt-16"
        title="BeepBox Music Maker"
      />
    </div>
  );
}

export default function AudioEditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
        <EditorContent />
    </Suspense>
  )
}
