import { SiteHeader } from "@/components/site-header";

interface GenerateLayoutProps {
  children: React.ReactNode;
}

export default function GenerateLayout({ children }: GenerateLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
