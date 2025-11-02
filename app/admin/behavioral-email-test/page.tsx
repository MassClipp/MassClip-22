"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, CheckCircle, XCircle } from "lucide-react"

export default function BehavioralEmailTestPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testBehavioralEmails = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/behavioral-emails/check-and-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to test behavioral emails")
      }
    } catch (err) {
      setError("Network error occurred")
      console.error("Error testing behavioral emails:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Behavioral Email System Test</h1>
        <p className="text-muted-foreground">Test the behavioral email system to verify it's working correctly</p>
      </div>

      <div className="grid gap-6">
        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Test Behavioral Emails
            </CardTitle>
            <CardDescription>
              Manually trigger the behavioral email system to check all users and send appropriate emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testBehavioralEmails} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking and Sending Emails...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Run Behavioral Email Check
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {result.message}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  The behavioral email system has been triggered successfully. Check your server logs for detailed
                  information about which emails were sent.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="destructive" className="mb-2">
                {error}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Check your server logs for more detailed error information.
              </p>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>How the behavioral email system works</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Email Types</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    • <strong>Stripe Setup:</strong> Sent to users without connected Stripe accounts
                  </li>
                  <li>
                    • <strong>Bundle Creation:</strong> Sent to users with 0 bundles
                  </li>
                  <li>
                    • <strong>Free Content:</strong> Sent to users with 0 free content uploads
                  </li>
                  <li>
                    • <strong>Content Upload:</strong> Sent to users with 0 total content
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Timing</h4>
                <p className="text-sm text-muted-foreground">
                  Each email type is sent every 7 days until the user completes the required action. The system runs
                  daily via Vercel Cron at 2 PM UTC.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Data Storage</h4>
                <p className="text-sm text-muted-foreground">
                  User behavioral email data is stored in the <code>behavioralEmails</code> Firestore collection. Email
                  events are tracked via Resend webhooks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
