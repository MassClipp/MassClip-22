"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DebugWebhookUserLookupPage() {
  const [email, setEmail] = useState("johnisworthier103@gmail.com")
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/debug/webhook-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, sessionId }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Test failed")
      }
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug: Webhook User Lookup Test</CardTitle>
          <CardDescription>
            Test the user lookup logic that the webhook uses to identify users from Stripe sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Session ID (optional)</label>
            <Input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="cs_test_..."
            />
          </div>

          <Button onClick={handleTest} disabled={loading || !email}>
            {loading ? "Testing..." : "Test User Lookup"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-green-600">✅ Test completed</p>
                    <p>Firebase Initialized: {result.debug.firebaseInitialized ? "✅ Yes" : "❌ No"}</p>
                    {result.debug.userLookup?.success ? (
                      <div>
                        <p className="text-green-600">✅ User found: {result.debug.userLookup.uid}</p>
                        <p>Source: {result.debug.userLookup.source}</p>
                        <p>Display Name: {result.debug.userLookup.displayName}</p>
                      </div>
                    ) : (
                      <p className="text-red-600">❌ User not found: {result.debug.userLookup?.error}</p>
                    )}
                    {result.debug.existingMembership?.exists ? (
                      <p className="text-green-600">✅ Existing membership found</p>
                    ) : (
                      <p className="text-yellow-600">⚠️ No existing membership</p>
                    )}
                    {result.debug.existingFreeUser?.exists ? (
                      <p className="text-green-600">✅ Free user record found</p>
                    ) : (
                      <p className="text-yellow-600">⚠️ No free user record</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <details className="mt-4">
                <summary className="cursor-pointer font-medium">View Full Debug Data</summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
