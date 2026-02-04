import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Code } from 'lucide-react';

export default function ManagerCodesPage() {
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Application Codes</CardTitle>
          <CardDescription>Access and manage the application's source code.</CardDescription>
        </CardHeader>
        <CardContent>
            <Alert>
                <Code className="h-4 w-4" />
                <AlertTitle>Code Management</AlertTitle>
                <AlertDescription>
                    This section is intended for source code versioning and deployment. As an AI assistant, I can modify and show you the code for any file, but I cannot package the entire application codebase for download or direct GitHub upload. All changes I make are applied directly to the project files.
                </AlertDescription>
            </Alert>
            <div className="mt-4 text-muted-foreground">
                <p>To see the code of any file, you can ask me: "Show me the code for [file path]".</p>
                <p className='mt-2'>All changes are tracked with a timestamp in our conversation history.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
