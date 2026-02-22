import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManagerMediaPage() {
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Media Management</CardTitle>
          <CardDescription>Review and moderate all user-generated media content.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A feed of all user-posted media (text, images, reels, etc.) would be displayed here for moderation.</p>
        </CardContent>
      </Card>
    </div>
  );
}
