"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Clock, Copy, AlertTriangle } from "lucide-react"

interface TestResult {
  status: "pending" | "success" | "error"
  message: string
  data?: any
  error?: any
}

export default function AuthDetailedDebugPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [logs, setLogs] = useState<string[]>([])
  const [priceId, setPriceId] = useState("price_1QCqGhP8mGrl6RNHK8tJYqzV") // Default to a real price ID
  const [bundleId, setBundleId] = useState("test-bundle-123")

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    setLogs((prev) => [...prev, logMessage])
    console.log(logMessage)
  }

  const updateResult = (testName: string, result: Partial<TestResult>) => {
    setResults((prev) => ({
      ...prev,
      [testName]: { ...prev[testName], ...result },
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Test 1: Authentication State
  const testAuthState = async () => {
    addLog("[INFO] Testing authentication state...")
    updateResult("authState", { status: "pending", message: "Checking authentication..." })

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      const tokenResult = await user.getIdTokenResult()

      updateResult("authState", {
        status: "success",
        message: "User authenticated successfully",
        data: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          tokenExpiration: new Date(tokenResult.expirationTime).toISOString(),
          authTime: new Date(tokenResult.authTime).toISOString(),
          signInProvider: tokenResult.signInProvider,
        },
      })
      addLog("[SUCCESS] Authentication state verified")
    } catch (error: any) {
      updateResult("authState", {
        status: "error",
        message: error.message,
        error,
      })
      addLog(`[ERROR] Authentication state failed: ${error.message}`)
    }
  }

  // Test 2: Token Generation and Analysis
  const testTokenGeneration = async () => {
    addLog("[INFO] Testing token generation...")
    updateResult("tokenGeneration", { status: "pending", message: "Generating Firebase ID token..." })

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Force refresh token
      const idToken = await user.getIdToken(true)

      // Decode JWT payload (without verification)
      const payload = JSON.parse(atob(idToken.split(".")[1]))

      updateResult("tokenGeneration", {
        status: "success",
        message: "Token generated successfully",
        data: {
          tokenLength: idToken.length,
          tokenFormat: idToken.split(".").length === 3 ? "Valid JWT" : "Invalid JWT",
          payload: {
            iss: payload.iss,
            aud: payload.aud,
            auth_time: payload.auth_time,
            user_id: payload.user_id,
            sub: payload.sub,
            iat: payload.iat,
            exp: payload.exp,
            email: payload.email,
            email_verified: payload.email_verified,
          },
          expiresAt: new Date(payload.exp * 1000).toISOString(),
          isExpired: payload.exp * 1000 < Date.now(),
        },
      })
      addLog("[SUCCESS] Token generated and analyzed")
    } catch (error: any) {
      updateResult("tokenGeneration", {
        status: "error",
        message: error.message,
        error,
      })
      addLog(`[ERROR] Token generation failed: ${error.message}`)
    }
  }

  // Test 3: Firebase Admin Verification
  const testFirebaseAdmin = async () => {
    addLog("[INFO] Testing Firebase Admin verification...")
    updateResult("firebaseAdmin", { status: "pending", message: "Testing server-side token verification..." })

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      const idToken = await user.getIdToken(true)

      const response = await fetch("/api/debug/firebase-admin-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || data.message}`)
      }

      updateResult("firebaseAdmin", {
        status: "success",
        message: "Firebase Admin verification successful",
        data,
      })
      addLog("[SUCCESS] Firebase Admin verification passed")
    } catch (error: any) {
      updateResult("firebaseAdmin", {
        status: "error",
        message: error.message,
        error,
      })
      addLog(`[ERROR] Firebase Admin verification failed: ${error.message}`)
    }
  }

  // Test 4: Auth-Only API Test
  const testAuthOnlyAPI = async () => {
    addLog("[INFO] Testing auth-only API endpoint...")
    updateResult("authOnlyAPI", { status: "pending", message: "Testing authentication without Stripe..." })

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      const idToken = await user.getIdToken(true)

      const response = await fetch("/api/debug/auth-test-only", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          idToken,
          testData: "auth-verification",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || data.message}`)
      }

      updateResult("authOnlyAPI", {
        status: "success",
        message: "Auth-only API test successful",
        data,
      })
      addLog("[SUCCESS] Auth-only API test passed")
    } catch (error: any) {
      updateResult("authOnlyAPI", {
        status: "error",
        message: error.message,
        error,
      })
      addLog(`[ERROR] Auth-only API test failed: ${error.message}`)
    }
  }

  // Test 5: Checkout API Test with Real Data
  const testCheckoutAPI = async () => {
    addLog("[INFO] Testing checkout API with real price ID...")
    updateResult("checkoutAPI", { status: "pending", message: "Testing full checkout flow..." })

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      const idToken = await user.getIdToken(true)

      addLog(`[INFO] Using price ID: ${priceId}`)
      addLog(`[INFO] Using bundle ID: ${bundleId}`)

      const payload = {
        idToken,
        priceId,
        bundleId,
        successUrl: `${window.location.origin}/purchase-success`,
        cancelUrl: window.location.href,
        debugMode: true,
      }

      addLog("[INFO] Sending checkout request with authentication")
      addLog("[INFO] Checkout payload prepared")

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "X-Debug-Mode": "true",
        },
        body: JSON.stringify(payload),
      })

      addLog(`[INFO] Checkout API response status: ${response.status}`)
      addLog(`[INFO] Checkout API response headers:`)
      response.headers.forEach((value, key) => {
        addLog(`  ${key}: ${value}`)
      })

      const data = await response.json()

      if (!response.ok) {
        addLog(`[ERROR] Checkout API failed`)
        throw new Error(`HTTP ${response.status}: ${data.error || data.message}`)
      }

      updateResult("checkoutAPI", {
        status: "success",
        message: "Checkout API test successful",
        data,
      })
      addLog("[SUCCESS] Checkout API test passed")
    } catch (error: any) {
      updateResult("checkoutAPI", {
        status: "error",
        message: error.message,
        error,
        data: {
          status: error.status,
          statusText: error.statusText,
          response: error.response,
          headers: error.headers,
        },
      })
      addLog(`[ERROR] Checkout API failed: ${error.message}`)
    }
  }

  // Test 6: Stripe Configuration
  const testStripeConfig = async () => {
    addLog("[INFO] Testing Stripe configuration...")
    updateResult("stripeConfig", { status: "pending", message: "Checking Stripe setup..." })

    try {
      const response = await fetch("/api/debug/stripe-config-test")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error}`)
      }

      updateResult("stripeConfig", {
        status: "success",
        message: "Stripe configuration verified",
        data,
      })
      addLog("[SUCCESS] Stripe configuration verified")
    } catch (error: any) {
      updateResult("stripeConfig", {
        status: "error",
        message: error.message,
        error,
      })
      addLog(`[ERROR] Stripe configuration failed: ${error.message}`)
    }
  }

  const runAllTests = async () => {
    setLogs([])
    setResults({})
    addLog("Starting comprehensive authentication and checkout diagnostics...")

    await testAuthState()
    await testTokenGeneration()
    await testFirebaseAdmin()
    await testAuthOnlyAPI()
    await testStripeConfig()
    await testCheckoutAPI()

    addLog("All tests completed")
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            Success
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "pending":
        return <Badge variant="secondary">Running...</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  useEffect(() => {
    if (user) {
      addLog(`User authenticated: ${user.email} (${user.uid})`)
    } else {
      addLog("No user authenticated")
    }
  }, [user])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Authentication & Checkout Debug</h1>
        <Button onClick={runAllTests} size="lg">
          Run All Tests
        </Button>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priceId">Stripe Price ID</Label>
              <Input
                id="priceId"
                value={priceId}
                onChange={(e) => setPriceId(e.target.value)}
                placeholder="price_1234567890"
              />
            </div>
            <div>
              <Label htmlFor="bundleId">Bundle/Product Box ID</Label>
              <Input
                id="bundleId"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                placeholder="bundle-123"
              />
            </div>
          </div>
          {user && (
            <div className="flex gap-2">
              <Badge variant="outline">User: {user.email}</Badge>
              <Badge variant="outline">UID: {user.uid.substring(0, 8)}...</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: "authState", title: "Authentication State", description: "Verify user authentication status" },
          { key: "tokenGeneration", title: "Token Generation", description: "Generate and analyze Firebase ID token" },
          { key: "firebaseAdmin", title: "Firebase Admin", description: "Server-side token verification" },
          { key: "authOnlyAPI", title: "Auth-Only API", description: "Test authentication without Stripe" },
          { key: "stripeConfig", title: "Stripe Configuration", description: "Verify Stripe setup and prices" },
          { key: "checkoutAPI", title: "Checkout API", description: "Full checkout session creation test" },
        ].map(({ key, title, description }) => {
          const result = results[key]
          return (
            <Card key={key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result?.status)}
                    <CardTitle className="text-lg">{title}</CardTitle>
                  </div>
                  {getStatusBadge(result?.status)}
                </div>
                <p className="text-sm text-gray-600">{description}</p>
              </CardHeader>
              {result && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="text-sm">{result.message}</p>
                    {result.data && (
                      <div className="bg-gray-50 p-3 rounded text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Data:</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(result.data, null, 2)}</pre>
                      </div>
                    )}
                    {result.error && (
                      <div className="bg-red-50 p-3 rounded text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-red-700">Error:</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(JSON.stringify(result.error, null, 2))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <pre className="whitespace-pre-wrap text-red-700">{JSON.stringify(result.error, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Step Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Step Logs</CardTitle>
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(logs.join("\n"))}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Run tests to see detailed logging.</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`
                  ${log.includes("[ERROR]") ? "text-red-400" : ""}
                  ${log.includes("[SUCCESS]") ? "text-green-400" : ""}
                  ${log.includes("[INFO]") ? "text-blue-400" : ""}
                `}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {!user && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                You need to be logged in to run these tests. Please{" "}
                <a href="/login" className="underline">
                  log in
                </a>{" "}
                first.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
