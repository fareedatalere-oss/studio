'use client';

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export default function SchoolPaymentPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm flex items-center justify-between gap-4 p-4 border-b z-10">
        <h1 className="font-semibold">School Payment</h1>
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard">
            <X />
            <span className="sr-only">Close</span>
          </Link>
        </Button>
      </header>
      <main className="flex-1">
        <iframe
          src="https://remita.net/"
          className="w-full h-full border-0"
          title="School Payments with Remita"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </main>
    </div>
  );
}
