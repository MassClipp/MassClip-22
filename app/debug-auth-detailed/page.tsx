"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useFirebaseAuthSafe } from "@/hooks/use-firebase-auth-safe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2, Copy } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface LogEntry {
  timestamp: string
  level: "info" | "error" | "warning" | "success"
  message: string
  data?: any
}

interface DiagnosticResult {
  step: string
  status: "success" | "error" | "warning" | "pending"
  message: string
  data?: any
  logs: LogEntry[]
}

export default function DetailedAuthDebugPage() {
  const contextAuth = useAuth()
  const firebaseAuth = useFirebaseAuthSafe()
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)
  const [globalLogs, setGlobalLogs] = useState<LogEntry[]>([])

  const activeUser = contextAuth.user || firebaseAuth.user

  const addLog = (level: LogEntry["level"], message: string, data?: any) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }
    setGlobalLogs((prev) => [...prev, logEntry])
    return logEntry
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard" })
  }

  const runDetailedDiagnostics = async () => {
    setLoading(true)
    setResults([])
    setGlobalLogs([])

    addLog("info", "Starting detailed authentication diagnostics")

    const diagnostics: DiagnosticResult[] = []

    // Step 1: Authentication State Analysis
    const authResult: DiagnosticResult = {
      step: "Authentication State",
      status: "pending",
      message: "Analyzing authentication state...",
      logs: [],
    }

    if (activeUser) {
      authResult.status = "success"
      authResult.message = `User authenticated: ${activeUser.email}`
      authResult.data = {
        uid: activeUser.uid,
        email: activeUser.email,
        emailVerified: activeUser.emailVerified,
        displayName: activeUser.displayName,
        photoURL: activeUser.photoURL,
        providerId: activeUser.providerId,
        metadata: {
          creationTime: activeUser.metadata.creationTime,
          lastSignInTime: activeUser.metadata.lastSignInTime,
        },
      }
      authResult.logs.push(addLog("success", "User is authenticated", authResult.data))
    } else {
      authResult.status = "error"
      authResult.message = "No user authenticated"
      authResult.logs.push(addLog("error", "No authenticated user found"))
      diagnostics.push(authResult)
      setResults(diagnostics)
      setLoading(false)
      return
    }

    diagnostics.push(authResult)
    setResults([...diagnostics])

    // Step 2: Token Generation Analysis
    const tokenResult: DiagnosticResult = {
      step: "Token Generation",
      status: "pending",
      message: "Generating Firebase ID token...",
      logs: [],
    }

    try {
      tokenResult.logs.push(addLog("info", "Requesting fresh ID token from Firebase"))

      const idToken = await activeUser.getIdToken(true)

      tokenResult.status = "success"
      tokenResult.message = `Token generated successfully (${idToken.length} chars)`

      // Parse JWT payload for analysis
      const tokenParts = idToken.split(".")
      let decodedPayload = null

      try {
        const payload = JSON.parse(atob(tokenParts[1]))
        decodedPayload = {
          iss: payload.iss,
          aud: payload.aud,
          auth_time: payload.auth_time,
          user_id: payload.user_id,
          sub: payload.sub,
          iat: payload.iat,
          exp: payload.exp,
          email: payload.email,
          email_verified: payload.email_verified,
          firebase: payload.firebase,
        }

        tokenResult.logs.push(addLog("info", "Token payload decoded successfully", decodedPayload))

        // Check token expiration
        const now = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = payload.exp - now

        if (timeUntilExpiry > 0) {
          tokenResult.logs.push(addLog("success", `Token expires in ${timeUntilExpiry} seconds`))
        } else {
          tokenResult.logs.push(addLog("error", "Token is expired!"))
        }
      } catch (parseError) {
        tokenResult.logs.push(addLog("warning", "Could not parse token payload", parseError))
      }

      tokenResult.data = {
        tokenLength: idToken.length,
        tokenPreview: `${idToken.substring(0, 50)}...${idToken.substring(idToken.length - 50)}`,
        decodedPayload,
        tokenParts: tokenParts.length,
      }

      tokenResult.logs.push(addLog("success", "ID token generated successfully"))

      diagnostics[1] = tokenResult
      setResults([...diagnostics])

      // Step 3: Firebase Admin Verification
      const adminResult: DiagnosticResult = {
        step: "Firebase Admin Verification",
        status: "pending",
        message: "Testing Firebase Admin token verification...",
        logs: [],
      }

      try {
        adminResult.logs.push(addLog("info", "Sending token to Firebase Admin for verification"))

        const adminResponse = await fetch("/api/debug/firebase-admin-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            idToken,
            testMode: true,
            includeHeaders: true,
          }),
        })

        const responseText = await adminResponse.text()
        adminResult.logs.push(addLog("info", `Admin API response status: ${adminResponse.status}`))
        adminResult.logs.push(
          addLog("info", `Admin API response headers:`, Object.fromEntries(adminResponse.headers.entries())),
        )

        let adminData
        try {
          adminData = JSON.parse(responseText)
        } catch {
          adminData = { rawResponse: responseText }
        }

        if (adminResponse.ok) {
          adminResult.status = "success"
          adminResult.message = "Firebase Admin verification successful"
          adminResult.logs.push(addLog("success", "Token verified by Firebase Admin", adminData))
        } else {
          adminResult.status = "error"
          adminResult.message = `Firebase Admin Error: ${adminData.error || "Unknown error"}`
          adminResult.logs.push(
            addLog("error", "Firebase Admin verification failed", {
              status: adminResponse.status,
              statusText: adminResponse.statusText,
              response: adminData,
            }),
          )
        }

        adminResult.data = {
          status: adminResponse.status,
          statusText: adminResponse.statusText,
          response: adminData,
          headers: Object.fromEntries(adminResponse.headers.entries()),
        }
      } catch (error: any) {
        adminResult.status = "error"
        adminResult.message = `Network Error: ${error.message}`
        adminResult.logs.push(
          addLog("error", "Firebase Admin request failed", {
            error: error.message,
            stack: error.stack,
          }),
        )
        adminResult.data = { error: error.toString() }
      }

      diagnostics.push(adminResult)
      setResults([...diagnostics])

      // Step 4: Checkout API Test
      const checkoutResult: DiagnosticResult = {
        step: "Checkout API Test",
        status: "pending",
        message: "Testing checkout session creation...",
        logs: [],
      }

      try {
        checkoutResult.logs.push(addLog("info", "Sending checkout request with authentication"))

        const checkoutPayload = {
          idToken,
          priceId: "price_test_123",
          bundleId: "bundle_test_123",
          successUrl: `${window.location.origin}/purchase-success`,
          cancelUrl: window.location.href,
          debugMode: true,
        }

        checkoutResult.logs.push(addLog("info", "Checkout payload prepared", checkoutPayload))

        const checkoutResponse = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(checkoutPayload),
        })

        const checkoutResponseText = await checkoutResponse.text()
        checkoutResult.logs.push(addLog("info", `Checkout API response status: ${checkoutResponse.status}`))
        checkoutResult.logs.push(
          addLog("info", `Checkout API response headers:`, Object.fromEntries(checkoutResponse.headers.entries())),
        )

        let checkoutData
        try {
          checkoutData = JSON.parse(checkoutResponseText)
        } catch {
          checkoutData = { rawResponse: checkoutResponseText }
        }

        if (checkoutResponse.ok) {
          checkoutResult.status = "success"
          checkoutResult.message = "Checkout session creation successful"
          checkoutResult.logs.push(addLog("success", "Checkout API succeeded", checkoutData))
        } else {
          checkoutResult.status = "error"
          checkoutResult.message = `Checkout API Error: ${checkoutData.error || "Unknown error"}`
          checkoutResult.logs.push(
            addLog("error", "Checkout API failed", {
              status: checkoutResponse.status,
              statusText: checkoutResponse.statusText,
              response: checkoutData,
            }),
          )
        }

        checkoutResult.data = {
          status: checkoutResponse.status,
          statusText: checkoutResponse.statusText,
          response: checkoutData,
          headers: Object.fromEntries(checkoutResponse.headers.entries()),
        }
      } catch (error: any) {
        checkoutResult.status = "error"
        checkoutResult.message = `Network Error: ${error.message}`
        checkoutResult.logs.push(
          addLog("error", "Checkout request failed", {
            error: error.message,
            stack: error.stack,
          }),
        )
        checkoutResult.data = { error: error.toString() }
      }

      diagnostics.push(checkoutResult)
      setResults([...diagnostics])
    } catch (error: any) {
      tokenResult.status = "error"
      tokenResult.message = `Token generation failed: ${error.message}`
      tokenResult.logs.push(
        addLog("error", "Token generation failed", {
          error: error.message,
          code: error.code,
          stack: error.stack,
        }),
      )
      tokenResult.data = { error: error.toString() }

      diagnostics[1] = tokenResult
      setResults([...diagnostics])
    }

    addLog("info", "Diagnostics completed")
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
      case "pending":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
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
      case "pending":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "warning":
        return "text-yellow-600"
      case "info":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Detailed Authentication Debug</CardTitle>
          <p className="text-gray-600">Comprehensive authentication flow analysis with detailed logging</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Button onClick={runDetailedDiagnostics} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Detailed Diagnostics...
                </>
              ) : (
                "Run Detailed Diagnostics"
              )}
            </Button>
            {activeUser && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">Authenticated as: {activeUser.email}</Badge>
                <Badge variant="outline">UID: {activeUser.uid.substring(0, 8)}...</Badge>
              </div>
            )}
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

          {globalLogs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Global Logs</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(globalLogs, null, 2))}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Logs
                </Button>
              </div>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto">
                {globalLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-400">[{log.timestamp}]</span>{" "}
                    <span className={getLogColor(log.level)}>[{log.level.toUpperCase()}]</span>{" "}
                    <span>{log.message}</span>
                    {log.data && <div className="ml-4 text-gray-300">{JSON.stringify(log.data, null, 2)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Diagnostic Results</h3>
              <div className="space-y-6">
                {results.map((result, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <Badge className={getStatusColor(result.status)}>{result.step}</Badge>
                        <span className="font-medium">{result.message}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.data && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Data:</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {result.logs.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Step Logs:</h4>
                          <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm max-h-40 overflow-y-auto">
                            {result.logs.map((log, logIndex) => (
                              <div key={logIndex} className="mb-1">
                                <span className="text-gray-400">[{log.timestamp.split("T")[1].split(".")[0]}]</span>{" "}
                                <span className={getLogColor(log.level)}>[{log.level.toUpperCase()}]</span>{" "}
                                <span>{log.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
