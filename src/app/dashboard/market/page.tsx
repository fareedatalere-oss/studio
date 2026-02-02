import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Search } from 'lucide-react';

export default function MarketPage() {
  return (
    <div className="container py-4">
      <div className="flex justify-end mb-4">
        <Button>Subscribe</Button>
      </div>
      <Tabs defaultValue="apps" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="apps">Apps</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="bookstore">Bookstore</TabsTrigger>
          <TabsTrigger value="upwork">Upwork</TabsTrigger>
        </TabsList>
        
        <TabsContent value="apps" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary">Android</Button>
            <Button variant="secondary">iOS</Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for apps..." className="pl-10" />
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for products..." className="pl-10" />
          </div>
        </TabsContent>

        <TabsContent value="bookstore" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for books..." className="pl-10" />
          </div>
          <Button>Library</Button>
        </TabsContent>

        <TabsContent value="upwork" className="mt-4">
            <Button>
                <ArrowRight className="mr-2 h-4 w-4" /> Go to Upwork
            </Button>
        </TabsContent>

      </Tabs>
    </div>
  );
}
