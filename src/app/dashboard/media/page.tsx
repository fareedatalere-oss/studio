import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function MediaPage() {
  return (
    <div className="relative h-full">
      <header className="sticky top-16 md:top-0 bg-background border-b z-10">
          <div className="container flex h-14 items-center justify-center gap-2">
              <Button variant="ghost">Text</Button>
              <Button variant="ghost">Image</Button>
              <Button variant="ghost">Reels</Button>
              <Button variant="ghost">Films</Button>
              <Button variant="ghost">Music</Button>
          </div>
      </header>
      <div className="container py-8">
        <p className="text-center text-muted-foreground">Media content will appear here.</p>
      </div>
      <Button
        variant="default"
        size="icon"
        className="absolute bottom-24 right-6 md:bottom-6 h-16 w-16 rounded-full bg-accent hover:bg-accent/90"
      >
        <Plus className="h-8 w-8" />
        <span className="sr-only">Add Media</span>
      </Button>
    </div>
  );
}
