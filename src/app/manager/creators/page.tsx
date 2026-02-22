import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManagerCreatorsPage() {
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Content Creator Management</CardTitle>
          <CardDescription>Manage and review content creators on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A list of content creators, their stats, and management tools would be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
