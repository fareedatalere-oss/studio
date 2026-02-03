import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export default function LoanApplicationFramePage() {
  return (
    <div className="relative h-screen">
      <header className="absolute top-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm flex justify-between items-center z-10">
        <h1 className="text-lg font-semibold">Loan Application</h1>
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard">
            <X />
            <span className="sr-only">Close</span>
          </Link>
        </Button>
      </header>
      <iframe
        src="https://aset-group-llp.lsq.app/"
        className="w-full h-full border-0 pt-16"
        title="Loan Application"
      />
    </div>
  );
}
