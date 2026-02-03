import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import Link from "next/link";

export default function NewsPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm flex items-center justify-between gap-4 p-4 border-b z-10">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search for news..." className="pl-10" />
        </div>
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard">
            <X />
            <span className="sr-only">Close</span>
          </Link>
        </Button>
      </header>
      <main className="flex-1">
        <iframe
          src="https://www.bing.com/news"
          className="w-full h-full border-0"
          title="News from Bing"
        />
      </main>
    </div>
  );
}
