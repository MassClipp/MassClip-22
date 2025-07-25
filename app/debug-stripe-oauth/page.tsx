"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface TestResult {
  name: string
  status: "pending" | "success" | "error" | "warning"
  message: string
  details?: any
  expanded?: boolean
}

export default function DebugStripeOAuthPage() {
  const { user } = useFirebaseAuth()
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const updateTest = (name: string, status: TestResult["status"], message: string, details?: any) => {
    setTests((prev) => {
      const existing = prev.find((t) => t.name === name)
      if (existing) {
        existing.status = status
        existing.message = message
        existing.details = details
        return [...prev]
      }
      return [...prev, { name, status, message, details, expanded: false }]
    })
  }

  const toggleExpanded = (index: number) => {
    setTests((prev) => {
      const updated = [...prev]
      updated[index].expanded = !updated[index].expanded
      return updated
    })
  }

  const runTests = async () => {
    setIsRunning(true)
    setTests([])

    // Test 1: Check user authentication
    updateTest("User Authentication", "pending", "Checking Firebase auth...")
    if (!user) {
      updateTest("User Authentication", "error", "User not authenticated")
      setIsRunning(false)
      return
    }
    updateTest("User Authentication", "success", `Authenticated as ${user.uid}`)

    // Test 2: Check environment variables
    updateTest("Environment Check", "pending", "Checking environment variables...")
    try {
      const envResponse = await fetch("/api/debug/stripe-oauth-env")
      const envData = await envResponse.json()

      if (envResponse.ok) {
        updateTest("Environment Check", "success", "Environment variables loaded", envData)
      } else {
        updateTest("Environment Check", "error", envData.error || "Failed to check environment", envData)
      }
    } catch (error) {
      updateTest("Environment Check", "error", `Network error: ${error}`, { error: String(error) })
    }

    // Test 3: Test Firebase Admin connection
    updateTest("Firebase Admin", "pending", "Testing Firebase Admin connection...")
    try {
      const firebaseResponse = await fetch("/api/debug/firebase-admin-test")
      const firebaseData = await firebaseResponse.json()

      if (firebaseResponse.ok) {
        updateTest("Firebase Admin", "success", "Firebase Admin connected", firebaseData)
      } else {
        updateTest("Firebase Admin", "error", firebaseData.error || "Firebase Admin connection failed", firebaseData)
      }
    } catch (error) {
      updateTest("Firebase Admin", "error", `Network error: ${error}`, { error: String(error) })
    }

    // Test 4: Test Stripe API connection
    updateTest("Stripe API", "pending", "Testing Stripe API connection...")
    try {
      const stripeResponse = await fetch("/api/debug/stripe-api-test")
      const stripeData = await stripeResponse.json()

      if (stripeResponse.ok) {
        updateTest("Stripe API", "success", "Stripe API connected", stripeData)
      } else {
        updateTest("Stripe API", "error", stripeData.error || "Stripe API connection failed", stripeData)
      }
    } catch (error) {
      updateTest("Stripe API", "error", `Network error: ${error}`, { error: String(error) })
    }

    // Test 5: Test OAuth URL generation
    updateTest("OAuth URL Generation", "pending", "Testing OAuth URL generation...")
    try {
      const idToken = await user.getIdToken()
      const oauthResponse = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      let oauthData
      try {
        oauthData = await oauthResponse.json()
      } catch (parseError) {
        oauthData = { parseError: "Failed to parse JSON response", status: oauthResponse.status }
      }

      if (oauthResponse.ok) {
        updateTest("OAuth URL Generation", "success", "OAuth URL generated successfully", {
          url: oauthData.oauthUrl,
          state: oauthData.state,
        })
      } else {
        updateTest("OAuth URL Generation", "error", oauthData.error || "Failed to generate OAuth URL", {
          status: oauthResponse.status,
          statusText: oauthResponse.statusText,
          response: oauthData,
          headers: Object.fromEntries(oauthResponse.headers.entries()),
        })
      }
    } catch (error) {
      updateTest("OAuth URL Generation", "error", `Network error: ${error}`, {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }

    // Test 6: Test state storage/retrieval
    updateTest("State Management", "pending", "Testing state parameter storage...")
    try {
      const stateResponse = await fetch("/api/debug/test-state-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })
      const stateData = await stateResponse.json()

      if (stateResponse.ok) {
        updateTest("State Management", "success", "State storage/retrieval working", stateData)
      } else {
        updateTest("State Management", "error", stateData.error || "State management failed", stateData)
      }
    } catch (error) {
      updateTest("State Management", "error", `Network error: ${error}`, { error: String(error) })
    }

    setIsRunning(false)
  }

  const testOAuthCallback = async () => {
    if (!user) return

    updateTest("OAuth Callback Test", "pending", "Testing OAuth callback processing...")

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/debug/test-oauth-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          idToken,
        }),
      })

      const data = await response.json()

      updateTest(
        "OAuth Callback Test",
        response.ok ? "success" : "error",
        response.ok ? "OAuth callback test passed" : data.error || "OAuth callback test failed",
        {
          status: response.status,
          statusText: response.statusText,
          response: data,
        },
      )
    } catch (error) {
      updateTest("OAuth Callback Test", "error", `Network error: ${error}`, { error: String(error) })
    }
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      pending: "secondary",
      success: "default",
      error: "destructive",
      warning: "outline",
    } as const

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Stripe OAuth Debug Console</CardTitle>
            <CardDescription>Comprehensive testing suite to diagnose Stripe OAuth connection issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={runTests} disabled={isRunning || !user}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  "Run All Tests"
                )}
              </Button>
              <Button onClick={testOAuthCallback} disabled={!user} variant="outline">
                Test OAuth Callback
              </Button>
            </div>

            {!user && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800">Please log in to run the tests</p>
              </div>
            )}
          </CardContent>
        </Card>

        {tests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tests.map((test, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(test.status)}
                        <h3 className="ml-2 font-medium">{test.name}</h3>
                        {getStatusBadge(test.status)}
                      </div>
                      {test.details && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(index)}
                          className="flex items-center gap-1"
                        >
                          {test.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Details
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{test.message}</p>

                    {test.details && test.expanded && (
                      <div className="mt-3 p-4 bg-gray-50 border rounded-md">
                        <h4 className="font-medium text-sm mb-2">Error Details:</h4>
                        <div className="bg-white p-3 rounded border">
                          <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-96">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
