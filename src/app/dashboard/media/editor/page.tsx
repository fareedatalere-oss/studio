'use client';

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function EditorContent() {
  const searchParams = useSearchParams();
  const backUrl = searchParams.get('back') || '/dashboard/media';

  return (
    <div className="relative h-screen">
      <header className="absolute top-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm flex justify-between items-center z-10">
        <h1 className="text-lg font-semibold">VN Video Editor</h1>
        <Button asChild variant="ghost" size="icon">
          <Link href={backUrl}>
            <X />
            <span className="sr-only">Close Editor</span>
          </Link>
        </Button>
      </header>
      <iframe
        src="https://vlognow.me/"
        className="w-full h-full border-0 pt-16"
        title="VN Video Editor"
      />
    </div>
  );
}

export default function VideoEditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
        <EditorContent />
    </Suspense>
  )
}
