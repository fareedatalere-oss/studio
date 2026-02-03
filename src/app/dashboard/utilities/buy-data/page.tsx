import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BuyDataPage() {
    return (
        <div className="container py-8">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Buy Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Data purchase form will be here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
