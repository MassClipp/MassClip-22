"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Users, Mail, Clock, AlertTriangle } from "lucide-react"

interface DiagnosticResult {
  totalUsers: number
  eligibleUsers: number
  unsubscribedUsers: number
  recentEmailsSent: number
  usersNeedingEmails: {
    stripe: number
    bundles: number
    freeContent: number
    content: number
  }
  lastCronRun?: string
  errors: string[]
}

export default function BehavioralEmailDiagnosticsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/behavioral-email-diagnostics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to run diagnostics")
      }
    } catch (err) {
      setError("Network error occurred")
      console.error("Error running diagnostics:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const testCronJob = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/behavioral-emails/check-and-send", {
        method: "POST",
      })
      const data = await response.json()

      if (response.ok) {
        alert("Cron job test successful! Check server logs for details.")
      } else {
        alert(`Cron job test failed: ${data.error}`)
      }
    } catch (err) {
      alert("Cron job test failed: Network error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Behavioral Email Diagnostics</h1>
        <p className="text-muted-foreground">Diagnose why behavioral emails might not be sending</p>
      </div>

      <div className="grid gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Run Diagnostics
            </CardTitle>
            <CardDescription>Analyze the behavioral email system to identify potential issues</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={runDiagnostics} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Run Full Diagnostics
                </>
              )}
            </Button>
            <Button onClick={testCronJob} disabled={isLoading} variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Test Cron Job
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Users:</span>
                  <Badge variant="outline">{result.totalUsers}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Eligible for Emails:</span>
                  <Badge variant="outline">{result.eligibleUsers}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Unsubscribed:</span>
                  <Badge variant="secondary">{result.unsubscribedUsers}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Recent Emails Sent:</span>
                  <Badge variant="outline">{result.recentEmailsSent}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Email Types Needed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Users Needing Emails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Stripe Setup:</span>
                  <Badge variant={result.usersNeedingEmails.stripe > 0 ? "default" : "secondary"}>
                    {result.usersNeedingEmails.stripe}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Bundle Creation:</span>
                  <Badge variant={result.usersNeedingEmails.bundles > 0 ? "default" : "secondary"}>
                    {result.usersNeedingEmails.bundles}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Free Content:</span>
                  <Badge variant={result.usersNeedingEmails.freeContent > 0 ? "default" : "secondary"}>
                    {result.usersNeedingEmails.freeContent}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Content Upload:</span>
                  <Badge variant={result.usersNeedingEmails.content > 0 ? "default" : "secondary"}>
                    {result.usersNeedingEmails.content}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Errors */}
        {result?.errors && result.errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Issues Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.errors.map((error, index) => (
                  <Badge key={index} variant="destructive" className="block w-fit">
                    {error}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Diagnostic Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="destructive">{error}</Badge>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">If No Users Need Emails:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Users may have already completed required actions</li>
                <li>• Check if users are marked as unsubscribed</li>
                <li>• Verify recent email timestamps (7-day cooldown)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">If Cron Job Fails:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check Vercel Cron logs in dashboard</li>
                <li>• Verify RESEND_API_KEY environment variable</li>
                <li>• Test manual trigger above</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">If Emails Not Delivering:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check Resend dashboard for delivery status</li>
                <li>• Verify webhook configuration</li>
                <li>• Check emailEvents collection in Firestore</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
