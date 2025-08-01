"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useFirebaseAuthSafe } from "@/hooks/use-firebase-auth-safe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"

interface DiagnosticResult {
  step: string
  status: "success" | "error" | "warning"
  message: string
  data?: any
}

export default function CheckoutAuthDebugPage() {
  const contextAuth = useAuth()
  const firebaseAuth = useFirebaseAuthSafe()
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)

  // Determine which auth to use
  const activeUser = contextAuth.user || firebaseAuth.user
  const activeAuth = contextAuth.user ? contextAuth : firebaseAuth

  const runDiagnostics = async () => {
    setLoading(true)
    setResults([])
    const diagnostics: DiagnosticResult[] = []

    // Step 1: Check authentication state
    if (activeUser) {
      diagnostics.push({
        step: "Auth State",
        status: "success",
        message: `User authenticated: ${activeUser.email}`,
        data: { uid: activeUser.uid, email: activeUser.email },
      })
    } else {
      diagnostics.push({
        step: "Auth State",
        status: "error",
        message: "No user authenticated",
      })
      setResults(diagnostics)
      setLoading(false)
      return
    }

    // Step 2: Test token generation
    try {
      const idToken = await activeUser.getIdToken(true)
      diagnostics.push({
        step: "Token Generation",
        status: "success",
        message: `Token generated (length: ${idToken.length})`,
        data: { tokenPreview: idToken.substring(0, 50) + "..." },
      })

      // Step 3: Test checkout API call
      try {
        const response = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken,
            priceId: "price_test_123", // Test price ID
            bundleId: "bundle_test_123", // Test bundle ID
            successUrl: `${window.location.origin}/purchase-success`,
            cancelUrl: window.location.href,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          diagnostics.push({
            step: "Checkout API",
            status: "success",
            message: "Checkout session creation successful",
            data: {
              sessionId: data.sessionId,
              buyerUid: data.buyerUid,
              url: data.url ? "URL generated" : "No URL",
            },
          })
        } else {
          diagnostics.push({
            step: "Checkout API",
            status: "error",
            message: `API Error: ${data.error || "Unknown error"}`,
            data: { status: response.status, details: data.details, code: data.code },
          })
        }
      } catch (error: any) {
        diagnostics.push({
          step: "Checkout API",
          status: "error",
          message: `Network Error: ${error.message}`,
          data: { error: error.toString() },
        })
      }

      // Step 4: Test Firebase Admin connection
      try {
        const adminResponse = await fetch("/api/debug/firebase-admin-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        })

        const adminData = await adminResponse.json()

        if (adminResponse.ok) {
          diagnostics.push({
            step: "Firebase Admin",
            status: "success",
            message: "Firebase Admin connection successful",
            data: adminData,
          })
        } else {
          diagnostics.push({
            step: "Firebase Admin",
            status: "error",
            message: `Firebase Admin Error: ${adminData.error}`,
            data: adminData,
          })
        }
      } catch (error: any) {
        diagnostics.push({
          step: "Firebase Admin",
          status: "error",
          message: `Firebase Admin Network Error: ${error.message}`,
        })
      }

      // Step 5: Test user profile lookup
      try {
        const profileResponse = await fetch("/api/debug/user-profile-lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken, uid: activeUser.uid }),
        })

        const profileData = await profileResponse.json()

        if (profileResponse.ok) {
          diagnostics.push({
            step: "User Profile",
            status: "success",
            message: "User profile lookup successful",
            data: profileData,
          })
        } else {
          diagnostics.push({
            step: "User Profile",
            status: "error",
            message: `Profile Error: ${profileData.error}`,
            data: profileData,
          })
        }
      } catch (error: any) {
        diagnostics.push({
          step: "User Profile",
          status: "error",
          message: `Profile Network Error: ${error.message}`,
        })
      }
    } catch (error: any) {
      diagnostics.push({
        step: "Token Generation",
        status: "error",
        message: `Token generation failed: ${error.message}`,
        data: { error: error.toString() },
      })
    }

    setResults(diagnostics)
    setLoading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Checkout Authentication Debug</CardTitle>
          <p className="text-gray-600">Diagnose authentication issues in the checkout flow</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                "Run Diagnostics"
              )}
            </Button>
            {activeUser && <Badge variant="outline">Authenticated as: {activeUser.email}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Context Auth Status:</h3>
              <Badge className={contextAuth.user ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {contextAuth.user ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div>
              <h3 className="font-medium mb-2">Firebase Auth Status:</h3>
              <Badge className={firebaseAuth.user ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {firebaseAuth.user ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>

          {results.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Diagnostic Results</h3>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(result.status)}
                      <Badge className={getStatusColor(result.status)}>{result.step}</Badge>
                      <span className="font-medium">{result.message}</span>
                    </div>
                    {result.data && (
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
