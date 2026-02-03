import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SchoolPaymentPage() {
    return (
        <div className="container py-8">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>School Payment</CardTitle>
                    <CardDescription>Pay school fees and other educational bills.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">School payment form will be here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
