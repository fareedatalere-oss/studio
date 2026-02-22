import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManagerTransactionsPage() {
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>Review and manage all user transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A table of all user transactions would be displayed here for management and review.</p>
        </CardContent>
      </Card>
    </div>
  );
}
