"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useAuthContext } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function CheckoutAuthDebug() {
  const contextAuth = useAuth()
  const firebaseAuth = useAuthContext()
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Determine which auth context has a user
  const user = contextAuth?.user || firebaseAuth?.user
  const authSource = contextAuth?.user ? "Context Auth" : firebaseAuth?.user ? "Firebase Auth" : "None"

  const runDiagnostics = async () => {
    setLoading(true)
    setDiagnostics(null)

    try {
      const results: any = {
        contextAuth: {
          hasUser: !!contextAuth?.user,
          userEmail: contextAuth?.user?.email,
          userId: contextAuth?.user?.uid,
        },
        firebaseAuth: {
          hasUser: !!firebaseAuth?.user,
          userEmail: firebaseAuth?.user?.email,
          userId: firebaseAuth?.user?.uid,
        },
        overallAuth: {
          hasUser: !!user,
          userEmail: user?.email,
          userId: user?.uid,
          source: authSource,
        },
      }

      // Test token generation
      if (user) {
        try {
          console.log("🔐 Testing token generation...")
          const token = await user.getIdToken(true)
          results.tokenGeneration = {
            success: true,
            tokenLength: token.length,
            tokenPreview: `${token.substring(0, 20)}...`,
          }
          console.log("✅ Token generated successfully, length:", token.length)

          // Test the actual checkout API
          console.log("🧪 Testing checkout API...")
          const testResponse = await fetch("/api/stripe/create-checkout-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              idToken: token,
              priceId: "price_test123", // Test price ID
              bundleId: "test_bundle_id", // Test bundle ID
              successUrl: `${window.location.origin}/purchase-success`,
              cancelUrl: window.location.href,
            }),
          })

          results.checkoutApiTest = {
            status: testResponse.status,
            statusText: testResponse.statusText,
            success: testResponse.ok,
          }

          if (!testResponse.ok) {
            const errorText = await testResponse.text()
            results.checkoutApiTest.error = errorText
            console.error("❌ Checkout API test failed:", errorText)
          } else {
            const responseData = await testResponse.json()
            results.checkoutApiTest.response = responseData
            console.log("✅ Checkout API test successful")
          }
        } catch (error: any) {
          results.tokenGeneration = {
            success: false,
            error: error.message,
          }
          console.error("❌ Token generation failed:", error)
        }
      }

      setDiagnostics(results)
    } catch (error: any) {
      console.error("❌ Diagnostics failed:", error)
      setDiagnostics({
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-run diagnostics when component mounts and user is available
    if (user && !loading && !diagnostics) {
      runDiagnostics()
    }
  }, [user])

  const StatusBadge = ({ status, label }: { status: boolean; label: string }) => (
    <Badge variant={status ? "default" : "destructive"} className="flex items-center gap-1">
      {status ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  )

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Checkout Authentication Debug
          </CardTitle>
          <p className="text-sm text-gray-600">Diagnose authentication issues in the checkout flow</p>
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
            {user && (
              <div className="text-sm text-gray-600">
                Authenticated as: <strong>{user.email}</strong>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Context Auth Status:</h3>
              <StatusBadge status={!!contextAuth?.user} label={contextAuth?.user ? "Connected" : "Disconnected"} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Firebase Auth Status:</h3>
              <StatusBadge status={!!firebaseAuth?.user} label={firebaseAuth?.user ? "Connected" : "Disconnected"} />
            </div>
          </div>

          {diagnostics && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Diagnostic Results</h3>

              {diagnostics.error ? (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-red-800">Error: {diagnostics.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <StatusBadge status={diagnostics.contextAuth.hasUser} label="Context Auth" />
                      {diagnostics.contextAuth.hasUser && (
                        <div className="mt-2 text-sm">
                          <p>Context user: {diagnostics.contextAuth.userId}</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded">
                      <StatusBadge status={diagnostics.firebaseAuth.hasUser} label="Firebase Auth" />
                      {diagnostics.firebaseAuth.hasUser && (
                        <div className="mt-2 text-sm">
                          <p>Firebase user: {diagnostics.firebaseAuth.userId}</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded">
                      <StatusBadge status={diagnostics.overallAuth.hasUser} label="Overall Auth" />
                      {diagnostics.overallAuth.hasUser && (
                        <div className="mt-2 text-sm">
                          <p>Using user: {diagnostics.overallAuth.userId}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {diagnostics.tokenGeneration && (
                    <div className="bg-blue-50 p-4 rounded">
                      <StatusBadge status={diagnostics.tokenGeneration.success} label="Token Generation" />
                      {diagnostics.tokenGeneration.success ? (
                        <div className="mt-2 text-sm">
                          <p>Token generated (length: {diagnostics.tokenGeneration.tokenLength})</p>
                          <p className="font-mono text-xs bg-white p-2 rounded mt-1">
                            {diagnostics.tokenGeneration.tokenPreview}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-red-600">
                          <p>Error: {diagnostics.tokenGeneration.error}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {diagnostics.checkoutApiTest && (
                    <div className="bg-green-50 p-4 rounded">
                      <StatusBadge status={diagnostics.checkoutApiTest.success} label="Checkout API Test" />
                      <div className="mt-2 text-sm">
                        <p>
                          Status: {diagnostics.checkoutApiTest.status} {diagnostics.checkoutApiTest.statusText}
                        </p>
                        {diagnostics.checkoutApiTest.error && (
                          <div className="mt-2 p-2 bg-red-100 rounded text-red-800">
                            <p>Error: {diagnostics.checkoutApiTest.error}</p>
                          </div>
                        )}
                        {diagnostics.checkoutApiTest.response && (
                          <div className="mt-2 p-2 bg-white rounded">
                            <p>Response: {JSON.stringify(diagnostics.checkoutApiTest.response, null, 2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
