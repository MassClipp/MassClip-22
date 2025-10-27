"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShieldAlert, ShieldCheck, RefreshCw, ExternalLink, Info } from "lucide-react"

export default function SecurityDiagnosticPage() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bypassAttempted, setBypassAttempted] = useState(false)

  async function runDiagnostic() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/security-bypass")
      if (!response.ok) throw new Error("Failed to fetch diagnostic data")

      const data = await response.json()
      setDiagnosticData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  function attemptBypass() {
    setBypassAttempted(true)
    // Clear cookies related to Vercel security
    document.cookie = "_vercel_jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "_vercel_challenge=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

    // Reload the page after a short delay
    setTimeout(() => {
      window.location.href = "/"
    }, 1500)
  }

  useEffect(() => {
    runDiagnostic()
  }, [])

  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              Vercel Security Checkpoint Diagnostic
            </CardTitle>
            <Badge variant="outline" className="px-2 py-1">
              {loading ? "Checking..." : "Ready"}
            </Badge>
          </div>
          <CardDescription>
            Diagnose and resolve the "Failed to verify your browser" error from Vercel Security
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Security Error Detected</AlertTitle>
            <AlertDescription>
              Your browser failed Vercel's security verification (Code 10). This typically happens due to:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Browser privacy settings or extensions blocking verification</li>
                <li>Using incognito/private browsing mode</li>
                <li>VPN or proxy connections that appear suspicious</li>
                <li>Automated browsing or scraping detection</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="rounded-md border p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" /> Browser Information
            </h3>
            {diagnosticData ? (
              <div className="text-sm space-y-2">
                <div>
                  <strong>User Agent:</strong> {diagnosticData.diagnostics.userAgent}
                </div>
                <div>
                  <strong>Timestamp:</strong> {diagnosticData.diagnostics.timestamp}
                </div>

                <Separator className="my-2" />

                <div className="font-medium">Request Headers:</div>
                <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                  {JSON.stringify(diagnosticData.diagnostics.headers, null, 2)}
                </pre>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center p-4">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Loading diagnostic data...
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{error || "No diagnostic data available"}</div>
            )}
          </div>

          {bypassAttempted && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Bypass Attempted</AlertTitle>
              <AlertDescription>Security cookies have been cleared. Redirecting to homepage...</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button onClick={attemptBypass} className="flex-1" disabled={bypassAttempted || loading}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Clear Security Cookies & Retry
            </Button>

            <Button variant="outline" onClick={runDiagnostic} disabled={loading} className="flex-1">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Running..." : "Run Diagnostic Again"}
            </Button>
          </div>

          <Button variant="link" className="w-full" onClick={() => window.open("https://vercel.com/support", "_blank")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Contact Vercel Support
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
