"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

interface AuthDiagnostic {
  step: string
  status: "pending" | "success" | "error"
  message: string
  details?: any
}

export default function DebugStripeAuthPage() {
  const { user, loading: authLoading } = useAuth()
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostic[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addDiagnostic = (diagnostic: AuthDiagnostic) => {
    setDiagnostics((prev) => [...prev, diagnostic])
  }

  const updateLastDiagnostic = (updates: Partial<AuthDiagnostic>) => {
    setDiagnostics((prev) => {
      const newDiagnostics = [...prev]
      const lastIndex = newDiagnostics.length - 1
      if (lastIndex >= 0) {
        newDiagnostics[lastIndex] = { ...newDiagnostics[lastIndex], ...updates }
      }
      return newDiagnostics
    })
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setDiagnostics([])

    // Step 1: Check if user is authenticated
    addDiagnostic({
      step: "User Authentication",
      status: "pending",
      message: "Checking if user is authenticated...",
    })

    if (!user) {
      updateLastDiagnostic({
        status: "error",
        message: "User is not authenticated",
        details: { user: null },
      })
      setIsRunning(false)
      return
    }

    updateLastDiagnostic({
      status: "success",
      message: "User is authenticated",
      details: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    })

    // Step 2: Get ID Token
    addDiagnostic({
      step: "ID Token Generation",
      status: "pending",
      message: "Getting Firebase ID token...",
    })

    let idToken: string
    try {
      idToken = await user.getIdToken(true) // Force refresh
      updateLastDiagnostic({
        status: "success",
        message: "ID token generated successfully",
        details: {
          tokenLength: idToken.length,
          tokenPreview: idToken.substring(0, 50) + "...",
          tokenParts: idToken.split(".").length,
        },
      })
    } catch (error: any) {
      updateLastDiagnostic({
        status: "error",
        message: "Failed to get ID token",
        details: { error: error.message },
      })
      setIsRunning(false)
      return
    }

    // Step 3: Test token verification
    addDiagnostic({
      step: "Token Verification",
      status: "pending",
      message: "Testing token verification with test endpoint...",
    })

    try {
      const testResponse = await fetch("/api/test-auth", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      const testData = await testResponse.json()

      if (testResponse.ok) {
        updateLastDiagnostic({
          status: "success",
          message: "Token verification successful",
          details: testData,
        })
      } else {
        updateLastDiagnostic({
          status: "error",
          message: `Token verification failed: ${testResponse.status}`,
          details: testData,
        })
      }
    } catch (error: any) {
      updateLastDiagnostic({
        status: "error",
        message: "Token verification request failed",
        details: { error: error.message },
      })
    }

    // Step 4: Test Stripe connection status endpoint
    addDiagnostic({
      step: "Stripe Connection Status",
      status: "pending",
      message: "Testing Stripe connection status endpoint...",
    })

    try {
      const statusResponse = await fetch("/api/stripe/connect/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      const statusData = await statusResponse.json()

      if (statusResponse.ok) {
        updateLastDiagnostic({
          status: "success",
          message: "Stripe status check successful",
          details: statusData,
        })
      } else {
        updateLastDiagnostic({
          status: "error",
          message: `Stripe status check failed: ${statusResponse.status}`,
          details: statusData,
        })
      }
    } catch (error: any) {
      updateLastDiagnostic({
        status: "error",
        message: "Stripe status request failed",
        details: { error: error.message },
      })
    }

    // Step 5: Test link account endpoint with dummy data
    addDiagnostic({
      step: "Link Account Endpoint",
      status: "pending",
      message: "Testing link account endpoint with test data...",
    })

    try {
      const linkResponse = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stripeAccountId: "acct_test123", // This will fail but should show auth is working
        }),
      })

      const linkData = await linkResponse.json()

      updateLastDiagnostic({
        status: linkResponse.status === 401 ? "error" : "success",
        message: `Link account test: ${linkResponse.status}`,
        details: {
          status: linkResponse.status,
          response: linkData,
          expectedError: "Should fail with invalid account, not auth error",
        },
      })
    } catch (error: any) {
      updateLastDiagnostic({
        status: "error",
        message: "Link account request failed",
        details: { error: error.message },
      })
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: AuthDiagnostic["status"]) => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: AuthDiagnostic["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            Success
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Stripe Authentication Diagnostics</h1>
        <p className="text-muted-foreground">This page helps debug authentication issues with Stripe API endpoints.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Auth State</CardTitle>
          <CardDescription>Basic authentication information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">User:</span>
              {user ? (
                <Badge variant="default" className="bg-green-500">
                  Authenticated ({user.email})
                </Badge>
              ) : (
                <Badge variant="destructive">Not Authenticated</Badge>
              )}
            </div>
            {user && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium">UID:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{user.uid}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Email Verified:</span>
                  {user.emailVerified ? (
                    <Badge variant="default" className="bg-green-500">
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="destructive">No</Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Run Diagnostics</CardTitle>
          <CardDescription>Test the complete authentication flow for Stripe endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={isRunning || !user} className="w-full">
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              "Run Authentication Diagnostics"
            )}
          </Button>
        </CardContent>
      </Card>

      {diagnostics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
            <CardDescription>Step-by-step authentication testing results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {diagnostics.map((diagnostic, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(diagnostic.status)}
                      <h3 className="font-medium">{diagnostic.step}</h3>
                    </div>
                    {getStatusBadge(diagnostic.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{diagnostic.message}</p>
                  {diagnostic.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Show Details
                      </summary>
                      <pre className="mt-2 bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(diagnostic.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
