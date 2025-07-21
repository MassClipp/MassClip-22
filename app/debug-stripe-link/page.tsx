"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle, Info } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

export default function DebugStripeLinkPage() {
  const { user } = useFirebaseAuth()
  const [accountId, setAccountId] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const testLinkAccount = async () => {
    if (!user || !accountId.trim()) {
      setError("Please enter a Stripe account ID")
      return
    }

    setIsLinking(true)
    setError("")
    setResult(null)

    try {
      console.log("🔗 [Debug] Getting ID token...")
      const token = await user.getIdToken(true)
      console.log("🎫 [Debug] Token obtained, length:", token.length)

      console.log("🔗 [Debug] Calling link-account API...")
      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stripeAccountId: accountId.trim(),
        }),
      })

      console.log("📡 [Debug] Response status:", response.status)
      const data = await response.json()
      console.log("📡 [Debug] Response data:", data)

      setResult({
        status: response.status,
        success: response.ok,
        data: data,
        timestamp: new Date().toISOString(),
      })

      if (!response.ok) {
        setError(`API Error (${response.status}): ${data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("❌ [Debug] Link error:", error)
      setError(`Network Error: ${error.message}`)
      setResult({
        status: 0,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsLinking(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Debug Stripe Account Linking</CardTitle>
            <CardDescription>
              Test the Stripe account linking functionality with detailed error reporting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Status */}
            <div className="flex items-center gap-2">
              <Label>User Status:</Label>
              {user ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Authenticated ({user.email})
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Authenticated
                </Badge>
              )}
            </div>

            {/* Account ID Input */}
            <div className="space-y-2">
              <Label htmlFor="accountId">Stripe Account ID</Label>
              <Input
                id="accountId"
                placeholder="acct_1234567890"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={isLinking}
              />
              <p className="text-xs text-muted-foreground">
                Enter a real Stripe account ID to test the linking process
              </p>
            </div>

            {/* Test Button */}
            <Button onClick={testLinkAccount} disabled={isLinking || !accountId.trim() || !user} className="w-full">
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Link...
                </>
              ) : (
                "Test Account Link"
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                Test Results
              </CardTitle>
              <CardDescription>Response from /api/stripe/connect/link-account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <Label>HTTP Status:</Label>
                  <Badge variant={result.success ? "default" : "destructive"}>{result.status}</Badge>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2">
                  <Label>Timestamp:</Label>
                  <span className="text-sm text-muted-foreground">{result.timestamp}</span>
                </div>

                {/* Response Data */}
                <div className="space-y-2">
                  <Label>Response Data:</Label>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>

                {/* Suggestions */}
                {result.data?.suggestions && (
                  <div className="space-y-2">
                    <Label>Suggestions:</Label>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {result.data.suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Testing Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Valid Account ID Format:</strong> Must start with "acct_" followed by alphanumeric characters
              </p>
              <p>
                <strong>Test vs Live:</strong> Make sure your account ID matches your Stripe environment
              </p>
              <p>
                <strong>Common Errors:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>404: Account not found or doesn't exist</li>
                <li>400: Invalid account ID format or account not accessible</li>
                <li>401: Authentication issues (should not happen if user is logged in)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
