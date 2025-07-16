"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, Loader2, Bug, ExternalLink } from "lucide-react"
import Link from "next/link"

interface DebugResult {
  success: boolean
  bundleId: string
  userId: string
  timestamp: string
  checks: Record<string, any>
  recommendations: string[]
  bundle: any
  creator: any
  error: string | null
  code: string | null
}

export default function StripeCheckoutDebugPage() {
  const [bundleId, setBundleId] = useState("")
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)

  const runDebug = async () => {
    if (!bundleId.trim()) {
      alert("Please enter a bundle ID")
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/debug/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId: bundleId.trim(), userId: userId.trim() || "test-user" }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Debug error:", error)
      setResult({
        success: false,
        bundleId,
        userId: userId || "test-user",
        timestamp: new Date().toISOString(),
        checks: {},
        recommendations: ["Failed to run debug - check console for errors"],
        bundle: null,
        creator: null,
        error: "Debug request failed",
        code: "REQUEST_FAILED",
      })
    } finally {
      setLoading(false)
    }
  }

  const CheckStatus = ({ check, label }: { check: boolean | undefined; label: string }) => (
    <div className="flex items-center gap-2">
      {check === true ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : check === false ? (
        <XCircle className="h-4 w-4 text-red-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-gray-400" />
      )}
      <span className={check === true ? "text-green-700" : check === false ? "text-red-700" : "text-gray-500"}>
        {label}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stripe Checkout Debug Tool</h1>
          <p className="text-gray-600">Diagnose and fix Stripe checkout issues</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bundleId">Bundle ID (Required)</Label>
              <Input
                id="bundleId"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                placeholder="e.g., CJBGqge5NmmBOpW8u3LD"
                className="font-mono"
              />
              <p className="text-sm text-gray-500 mt-1">
                Get this from the URL or console errors (e.g., product-qvCtwHlb)
              </p>
            </div>

            <div>
              <Label htmlFor="userId">User ID (Optional)</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Leave empty for test user"
                className="font-mono"
              />
            </div>

            <Button onClick={runDebug} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Debug...
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4 mr-2" />
                  Run Debug
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Debug Results
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "PASSED" : "FAILED"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{result.code}:</strong> {result.error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">System Checks</h3>
                    <div className="space-y-2">
                      <CheckStatus check={result.checks.bundleExists} label="Bundle exists" />
                      <CheckStatus check={result.checks.bundleActive} label="Bundle is active" />
                      <CheckStatus check={result.checks.validPrice} label="Valid pricing" />
                      <CheckStatus check={result.checks.creatorExists} label="Creator exists" />
                      <CheckStatus check={result.checks.hasStripeAccount} label="Has Stripe account" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Stripe Checks</h3>
                    <div className="space-y-2">
                      <CheckStatus check={result.checks.stripeAccountAccessible} label="Account accessible" />
                      <CheckStatus check={result.checks.chargesEnabled} label="Charges enabled" />
                      <CheckStatus check={result.checks.detailsSubmitted} label="Details submitted" />
                      <CheckStatus check={result.checks.checkoutSessionCreated} label="Checkout session test" />
                      {result.checks.requirementsCount !== undefined && (
                        <div className="text-sm text-gray-600">
                          Pending requirements: {result.checks.requirementsCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {result.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Recommendations</h3>
                    <ul className="space-y-1">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {result.bundle && (
              <Card>
                <CardHeader>
                  <CardTitle>Bundle Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Title:</strong> {result.bundle.title}
                    </div>
                    <div>
                      <strong>Price:</strong> ${result.bundle.price} {result.bundle.currency?.toUpperCase() || "USD"}
                    </div>
                    <div>
                      <strong>Active:</strong> {result.bundle.active ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Creator ID:</strong> {result.bundle.creatorId}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {result.creator && (
              <Card>
                <CardHeader>
                  <CardTitle>Creator Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Username:</strong> {result.creator.username}
                    </div>
                    <div>
                      <strong>Email:</strong> {result.creator.email}
                    </div>
                    <div>
                      <strong>Has Stripe Account:</strong> {result.creator.stripeAccountId ? "Yes" : "No"}
                    </div>
                    {result.creator.stripeAccountId && (
                      <div>
                        <strong>Stripe Account ID:</strong> {result.creator.stripeAccountId}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/connect-stripe">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Stripe Setup
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/debug-bundle-finder">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Bundle Finder
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/diagnostics">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Diagnostics
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Raw Debug Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
