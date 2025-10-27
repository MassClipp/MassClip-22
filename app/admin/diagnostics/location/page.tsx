import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import LocationTester from "@/components/location-tester"

export default function LocationDiagnosticsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Location Usage Diagnostics</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>About Location Usage</CardTitle>
            <CardDescription>Understanding how to safely use location in Next.js App Router</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              The <code>window.location</code> object is only available in browser environments. Using it directly in
              server components or during server-side rendering will cause errors.
            </p>

            <h3 className="font-semibold mt-4 mb-2">Safe Usage Patterns:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Client Components:</strong> Add <code>"use client"</code> directive at the top of your file
              </li>
              <li>
                <strong>useEffect Hook:</strong> Access location inside useEffect which only runs in the browser
              </li>
              <li>
                <strong>Event Handlers:</strong> Access location in click handlers or other user interactions
              </li>
              <li>
                <strong>Environment Check:</strong> Always use <code>typeof window !== "undefined"</code> before
                accessing location
              </li>
            </ul>
          </CardContent>
        </Card>

        <LocationTester />
      </div>
    </div>
  )
}
