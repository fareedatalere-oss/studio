import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RechargeBillsPage() {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Recharge Bills</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Bill payment form will be here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
