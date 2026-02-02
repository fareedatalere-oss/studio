import Link from "next/link";
import { IPayLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <IPayLogo className="h-6 w-6" />
            <span className="font-bold font-headline">I-Pay</span>
          </Link>
        </div>
        {/* Navigation items can be added here */}
      </div>
    </header>
  );
}
