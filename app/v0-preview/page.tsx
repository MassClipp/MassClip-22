"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function V0PreviewPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">MassClip Preview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to MassClip</CardTitle>
            <CardDescription>This is a simplified preview version for v0.dev</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is a special version of the app that works in the v0.dev preview environment.</p>
            <p className="mt-2">
              The full version includes Firebase functionality that isn't compatible with v0.dev preview.
            </p>
          </CardContent>
          <CardFooter>
            <Button>Example Button</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>What MassClip offers</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              <li>Video content management</li>
              <li>User authentication</li>
              <li>Content categorization</li>
              <li>Download capabilities</li>
              <li>Subscription management</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline">Learn More</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>How to use MassClip</CardDescription>
          </CardHeader>
          <CardContent>
            <p>MassClip provides an easy way to manage and access video content.</p>
            <p className="mt-2">Sign up, browse categories, and start exploring content right away.</p>
          </CardContent>
          <CardFooter>
            <Button variant="secondary">Get Started</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
