import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ComposePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Compose Post</h2>
        <p className="text-muted-foreground">
          Create and schedule a new post for your social platforms.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>New Post</CardTitle>
            <CardDescription>
              Write your content and attach media.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {/* Post composer will go here */}
               <div className="h-[300px] rounded-md border p-4 text-muted-foreground">
                 Post composer placeholder...
               </div>
               <div className="flex justify-end gap-2">
                 <Button variant="outline">Save Draft</Button>
                 <Button>Schedule Post</Button>
               </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              How your post will look.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-md border flex items-center justify-center text-muted-foreground">
              Preview placeholder...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
