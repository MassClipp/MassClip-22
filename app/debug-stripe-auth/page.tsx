"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface DiagnosticResult {
  name: string
  status: "success" | "error" | "warning"
  message: string
  details?: any
}

export default function DebugStripeAuthPage() {
  const { user, loading } = useFirebaseAuth()
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (result: DiagnosticResult) => {
    setResults((prev) => [...prev, result])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    try {
      // Test 1: User Authentication
      if (!user) {
        addResult({
          name: "User Authentication",
          status: "error",
          message: "User is not authenticated",
        })
        setIsRunning(false)
        return
      }

      addResult({
        name: "User Authentication",
        status: "success",
        message: "User is authenticated",
        details: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      })

      // Test 2: ID Token Generation
      try {
        const token = await user.getIdToken()
        addResult({
          name: "ID Token Generation",
          status: "success",
          message: "ID token generated successfully",
          details: {
            tokenLength: token.length,
            tokenPreview: token.substring(0, 50) + "...",
            tokenParts: token.split(".").length,
          },
        })

        // Test 3: Token Verification
        try {
          const response = await fetch("/api/test-auth", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })

          const data = await response.json()

          if (response.ok) {
            addResult({
              name: "Token Verification",
              status: "success",
              message: "Token verification successful",
              details: data,
            })
          } else {
            addResult({
              name: "Token Verification",
              status: "error",
              message: "Token verification failed",
              details: data,
            })
          }
        } catch (error: any) {
          addResult({
            name: "Token Verification",
            status: "error",
            message: "Token verification request failed",
            details: { error: error.message },
          })
        }

        // Test 4: Stripe Connection Status
        try {
          const response = await fetch("/api/stripe/connect/status", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          const data = await response.json()

          if (response.ok) {
            addResult({
              name: "Stripe Connection Status",
              status: "success",
              message: "Stripe status check successful",
              details: data,
            })
          } else {
            addResult({
              name: "Stripe Connection Status",
              status: "error",
              message: "Stripe status check failed",
              details: data,
            })
          }
        } catch (error: any) {
          addResult({
            name: "Stripe Connection Status",
            status: "error",
            message: "Stripe status request failed",
            details: { error: error.message },
          })
        }

        // Test 5: Link Account Endpoint (with test data)
        try {
          const response = await fetch("/api/stripe/connect/link-account", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              stripeAccountId: "acct_test123", // This should fail, but not with auth error
            }),
          })

          const data = await response.json()

          addResult({
            name: "Link Account Endpoint",
            status: response.status === 400 ? "success" : "error",
            message: response.status === 400 ? "Link account test: 400" : `Unexpected status: ${response.status}`,
            details: {
              status: response.status,
              response: data,
              expectedError: "Should fail with invalid account, not auth error",
            },
          })
        } catch (error: any) {
          addResult({
            name: "Link Account Endpoint",
            status: "error",
            message: "Link account request failed",
            details: { error: error.message },
          })
        }
      } catch (error: any) {
        addResult({
          name: "ID Token Generation",
          status: "error",
          message: "Failed to generate ID token",
          details: { error: error.message },
        })
      }
    } catch (error: any) {
      addResult({
        name: "Diagnostic Error",
        status: "error",
        message: "Unexpected error during diagnostics",
        details: { error: error.message },
      })
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Success</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Stripe Authentication Diagnostics</h1>
        <p className="text-muted-foreground mt-2">Debug authentication issues with Stripe endpoints</p>
      </div>

      {/* Current Auth State */}
      <Card>
        <CardHeader>
          <CardTitle>Current Auth State</CardTitle>
          <CardDescription>Basic authentication information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">User:</span>
            {user ? (
              <Badge className="bg-green-500">Authenticated ({user.email})</Badge>
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
                <Badge variant={user.emailVerified ? "default" : "destructive"}>
                  {user.emailVerified ? "Yes" : "No"}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Run Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle>Run Diagnostics</CardTitle>
          <CardDescription>Test the complete authentication flow for Stripe endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={isRunning || !user} className="w-full">
            {isRunning ? "Running Diagnostics..." : "Run Authentication Diagnostics"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
            <CardDescription>Step-by-step authentication testing results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <Collapsible key={index}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.name}</span>
                    {getStatusBadge(result.status)}
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-1">▼ Show Details</p>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
