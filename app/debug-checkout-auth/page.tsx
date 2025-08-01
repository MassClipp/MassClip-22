"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useFirebaseAuthSafe } from "@/hooks/use-firebase-auth-safe"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"

interface DebugResult {
  step: string
  status: "success" | "error" | "warning"
  message: string
  data?: any
}

export default function DebugCheckoutAuthPage() {
  // Try both auth contexts
  const contextAuth = useAuth()
  const firebaseAuth = useFirebaseAuthSafe()

  const [results, setResults] = useState<DebugResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (step: string, status: "success" | "error" | "warning", message: string, data?: any) => {
    setResults((prev) => [...prev, { step, status, message, data }])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    // Step 1: Check both authentication contexts
    addResult(
      "Context Auth",
      contextAuth.user ? "success" : "error",
      contextAuth.user ? `Context user: ${contextAuth.user.uid}` : "No context user",
      { user: contextAuth.user?.uid, email: contextAuth.user?.email },
    )

    addResult(
      "Firebase Auth",
      firebaseAuth.user ? "success" : "error",
      firebaseAuth.user ? `Firebase user: ${firebaseAuth.user.uid}` : "No firebase user",
      { user: firebaseAuth.user?.uid, email: firebaseAuth.user?.email },
    )

    // Use whichever auth has a user
    const user = contextAuth.user || firebaseAuth.user

    if (!user) {
      addResult("Overall Auth", "error", "No user found in either auth context")
      setIsRunning(false)
      return
    }

    addResult("Overall Auth", "success", `Using user: ${user.uid}`)

    // Step 2: Test token generation
    try {
      const idToken = await user.getIdToken(true)
      addResult("Token Generation", "success", `Token generated (length: ${idToken.length})`, {
        tokenPreview: idToken.substring(0, 50) + "...",
      })

      // Step 3: Test token format
      const tokenParts = idToken.split(".")
      addResult(
        "Token Format",
        tokenParts.length === 3 ? "success" : "error",
        `Token has ${tokenParts.length} parts (should be 3)`,
        { parts: tokenParts.length },
      )

      // Step 4: Test checkout session creation with real data
      try {
        const testBundleId = "test-bundle-123"
        const response = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken,
            priceId: testBundleId,
            bundleId: testBundleId,
            successUrl: `${window.location.origin}/purchase-success`,
            cancelUrl: window.location.href,
          }),
        })

        const responseData = await response.json()

        if (response.ok) {
          addResult("Checkout API", "success", "Checkout session creation successful", {
            sessionId: responseData.sessionId,
            buyerUid: responseData.buyerUid,
          })
        } else {
          addResult("Checkout API", "error", `Checkout failed: ${responseData.error}`, {
            status: response.status,
            error: responseData.error,
            details: responseData.details,
            code: responseData.code,
          })
        }
      } catch (error: any) {
        addResult("Checkout API", "error", `Network error: ${error.message}`, { error: error.message })
      }

      // Step 5: Test Firebase Admin connection
      try {
        const testResponse = await fetch("/api/debug/firebase-admin-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        })

        const testData = await testResponse.json()
        addResult(
          "Firebase Admin",
          testResponse.ok ? "success" : "error",
          testResponse.ok ? "Firebase Admin connection working" : `Firebase Admin error: ${testData.error}`,
          testData,
        )
      } catch (error: any) {
        addResult("Firebase Admin", "error", `Firebase Admin test failed: ${error.message}`)
      }

      // Step 6: Test user profile lookup
      try {
        const profileResponse = await fetch("/api/debug/user-profile-lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ userId: user.uid }),
        })

        const profileData = await profileResponse.json()
        addResult(
          "User Profile",
          profileResponse.ok ? "success" : "warning",
          profileResponse.ok ? "User profile found" : "User profile not found (may need creation)",
          profileData,
        )
      } catch (error: any) {
        addResult("User Profile", "warning", `Profile lookup failed: ${error.message}`)
      }
    } catch (error: any) {
      addResult("Token Generation", "error", `Failed to generate token: ${error.message}`)
    }

    setIsRunning(false)
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const user = contextAuth.user || firebaseAuth.user

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Checkout Authentication Debug</CardTitle>
          <CardDescription>Diagnose authentication issues in the checkout flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={runDiagnostics} disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Diagnostics...
                  </>
                ) : (
                  "Run Diagnostics"
                )}
              </Button>
              {user && <Badge variant="outline">Authenticated as: {user.email || user.uid}</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Context Auth Status:</p>
                <Badge variant={contextAuth.user ? "default" : "secondary"}>
                  {contextAuth.user ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              <div>
                <p className="font-medium">Firebase Auth Status:</p>
                <Badge variant={firebaseAuth.user ? "default" : "secondary"}>
                  {firebaseAuth.user ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </div>

            {results.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Diagnostic Results</h3>
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(result.status)}
                        <Badge className={getStatusColor(result.status)}>{result.step}</Badge>
                        <span className="text-sm font-medium">{result.message}</span>
                      </div>
                      {result.data && (
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
