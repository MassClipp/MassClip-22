"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface DiagnosticResult {
  step: string
  status: "success" | "error" | "warning"
  message: string
  data?: any
}

export default function CheckoutAuthDebug() {
  const { user } = useAuth()
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (step: string, status: "success" | "error" | "warning", message: string, data?: any) => {
    setResults((prev) => [...prev, { step, status, message, data }])
  }

  const runDiagnostics = async () => {
    setResults([])
    setLoading(true)

    try {
      // Step 1: Check authentication context
      if (!user) {
        addResult("Context Auth", "error", "No user found in auth context")
        return
      }

      addResult("Context Auth", "success", `Context user: ${user.uid}`)

      // Step 2: Check Firebase auth state
      try {
        const idToken = await user.getIdToken(true)
        addResult("Firebase Auth", "success", `Firebase user: ${user.uid}`)
        addResult("Token Generation", "success", `Token generated (length: ${idToken.length})`)

        // Step 3: Test the actual checkout API
        const testCheckoutData = {
          idToken,
          priceId: "price_test_123", // Test price ID
          bundleId: "test_bundle_123",
          successUrl: `${window.location.origin}/purchase-success`,
          cancelUrl: window.location.href,
        }

        addResult("API Test", "warning", "Testing checkout API endpoint...")

        const response = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(testCheckoutData),
        })

        const responseText = await response.text()
        let responseData
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = { error: responseText }
        }

        if (response.ok) {
          addResult("API Test", "success", "Checkout API responded successfully", {
            status: response.status,
            data: responseData,
          })
        } else {
          addResult("API Test", "error", `Checkout API failed: ${response.status}`, {
            status: response.status,
            error: responseData,
          })
        }
      } catch (error) {
        addResult("Firebase Auth", "error", `Firebase auth error: ${error}`)
      }
    } catch (error) {
      addResult("Overall Auth", "error", `Authentication error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  // Auto-run diagnostics when user is available
  useEffect(() => {
    if (user && results.length === 0) {
      runDiagnostics()
    }
  }, [user])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-600">Connected</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "warning":
        return <Badge variant="secondary">Warning</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Checkout Authentication Debug</h1>
          <p className="text-zinc-400">Diagnose authentication issues in the checkout flow</p>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <Button onClick={runDiagnostics} disabled={loading} className="bg-red-600 hover:bg-red-700">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              "Run Diagnostics"
            )}
          </Button>

          {user && <div className="text-sm text-zinc-400">Authenticated as: {user.email}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Context Auth Status:
                {user ? getStatusBadge("success") : getStatusBadge("error")}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Firebase Auth Status:
                {user ? getStatusBadge("success") : getStatusBadge("error")}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">
                {loading ? "Running diagnostics..." : "Click 'Run Diagnostics' to test authentication"}
              </p>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(result.status)}
                      <Badge variant="outline" className="text-xs">
                        {result.step}
                      </Badge>
                      <span className="text-sm font-medium">
                        {result.status === "success" ? "✅" : result.status === "error" ? "❌" : "⚠️"} {result.message}
                      </span>
                    </div>

                    {result.data && (
                      <div className="mt-3 p-3 bg-zinc-800 rounded text-xs font-mono overflow-x-auto">
                        <pre>{JSON.stringify(result.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
