import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManagerDashboardPage() {
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, Manager</CardTitle>
          <CardDescription>This is your central hub for managing the I-Pay application.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Select an option from the header to begin.</p>
        </CardContent>
      </Card>
    </div>
  );
}
