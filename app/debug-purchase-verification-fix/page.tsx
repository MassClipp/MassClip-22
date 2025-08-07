"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  TestTube,
  Database,
  CreditCard,
  Link,
  User,
} from "lucide-react"

interface VerificationResult {
  success: boolean
  alreadyProcessed?: boolean
  session?: {
    id: string
    amount: number
    currency: string
    status: string
    customerEmail?: string
    created: string
    connectedAccount?: string
    retrievalMethod?: string
  }
  purchase?: {
    id: string
    productBoxId?: string
    bundleId?: string
    itemId: string
    itemType: string
    userId?: string
    creatorId?: string
    amount: number
  }
  item?: {
    title: string
    description?: string
    type: string
  }
  error?: string
  details?: string
  debugInfo?: any
}

const DebugPurchaseVerificationFixPage = () => {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [rawResponse, setRawResponse] = useState("")
  const [useAuthFlag, setUseAuthFlag] = useState(true)

  // Test session IDs for different scenarios
  const testSessions = [
    {
      id: "cs_live_b1HRh5PlcJKwAoQ2bStam9QjRnHWGoarNc7mSJikquf2XSvDa4CNVSwUCt",
      description: "Live session from screenshot",
      type: "live",
    },
    {
      id: "cs_test_example123",
      description: "Test session example",
      type: "test",
    },
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert(`Copied: ${text.substring(0, 50)}...`)
  }

  const testVerification = async (testSessionId?: string) => {
    const sessionToTest = testSessionId || sessionId
    if (!sessionToTest) {
      alert("Please enter a session ID")
      return
    }

    setLoading(true)
    setResult(null)
    setRawResponse("")

    try {
      console.log("🧪 [Debug] Testing session verification:", sessionToTest)
      console.log("🧪 [Debug] Using authentication:", useAuthFlag)
      console.log("🧪 [Debug] User authenticated:", !!user)

      let idToken = null
      if (useAuthFlag && user) {
        try {
          idToken = await user.getIdToken(true)
          console.log("🧪 [Debug] Got ID token")
        } catch (error) {
          console.error("🧪 [Debug] Failed to get ID token:", error)
        }
      }

      const requestBody = {
        sessionId: sessionToTest,
        ...(idToken && { idToken }),
      }

      console.log("🧪 [Debug] Request body:", { ...requestBody, idToken: idToken ? "[PRESENT]" : null })

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      setRawResponse(responseText)

      console.log("🧪 [Debug] Response status:", response.status)
      console.log("🧪 [Debug] Response headers:", Object.fromEntries(response.headers.entries()))
      console.log("🧪 [Debug] Raw response:", responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("🧪 [Debug] Failed to parse JSON response:", parseError)
        setResult({
          success: false,
          error: "Invalid JSON response",
          details: `Response was not valid JSON. Status: ${response.status}`,
          debugInfo: {
            status: response.status,
            statusText: response.statusText,
            rawResponse: responseText.substring(0, 500),
          },
        })
        return
      }

      if (response.ok) {
        console.log("✅ [Debug] Verification successful:", data)
        setResult(data)
      } else {
        console.error("❌ [Debug] Verification failed:", data)
        setResult({
          success: false,
          error: data.error || "Unknown error",
          details: data.details || "No details provided",
          debugInfo: data.debugInfo || data,
        })
      }
    } catch (error: any) {
      console.error("🧪 [Debug] Network error:", error)
      setResult({
        success: false,
        error: "Network error",
        details: error.message,
        debugInfo: {
          name: error.name,
          stack: error.stack,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      unpaid: "destructive",
      pending: "secondary",
      completed: "default",
      failed: "destructive",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Verification Fix Debug</h1>
          <p className="text-gray-600">Test the updated purchase verification system with Stripe Connect support</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionId">Session ID</Label>
                <Input
                  id="sessionId"
                  placeholder="cs_live_... or cs_test_..."
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Quick Test Sessions</Label>
                <div className="space-y-2">
                  {testSessions.map((session, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{session.description}</div>
                        <div className="text-xs text-gray-500 font-mono">{session.id.substring(0, 30)}...</div>
                      </div>
                      <Badge variant={session.type === "live" ? "default" : "secondary"}>{session.type}</Badge>
                      <Button size="sm" variant="outline" onClick={() => setSessionId(session.id)}>
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useAuth"
                  checked={useAuthFlag}
                  onChange={(e) => setUseAuthFlag(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="useAuth">Use authentication (send ID token)</Label>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>User Status: {user ? "Authenticated" : "Not authenticated"}</span>
                  </div>
                  {user && (
                    <div className="text-xs text-gray-500 mt-1">
                      UID: {user.uid}
                      <br />
                      Email: {user.email}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={() => testVerification()} disabled={!sessionId || loading} className="w-full">
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Verification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="text-center py-8 text-gray-500">
                  <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Run a test to see results</p>
                </div>
              ) : (
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="raw">Raw Response</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <span className="font-medium">
                        {result.success ? "Verification Successful" : "Verification Failed"}
                      </span>
                    </div>

                    {result.success && result.session && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Amount:</span> ${(result.session.amount / 100).toFixed(2)}{" "}
                            {result.session.currency.toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> {getStatusBadge(result.session.status)}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {result.session.customerEmail || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">Method:</span>{" "}
                            <Badge variant="outline">{result.session.retrievalMethod || "unknown"}</Badge>
                          </div>
                        </div>

                        {result.session.connectedAccount && (
                          <Alert>
                            <Link className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Stripe Connect:</strong> Session retrieved from connected account{" "}
                              <code className="text-xs">{result.session.connectedAccount}</code>
                            </AlertDescription>
                          </Alert>
                        )}

                        {result.alreadyProcessed && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Already Processed:</strong> This purchase was already recorded in the database.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {!result.success && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{result.error}</strong>
                          {result.details && (
                            <>
                              <br />
                              {result.details}
                            </>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4">
                    {result.success && result.purchase && (
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Purchase Details
                        </h4>
                        <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                          <div>
                            <strong>Purchase ID:</strong> {result.purchase.id}
                          </div>
                          <div>
                            <strong>Item Type:</strong> {result.purchase.itemType}
                          </div>
                          <div>
                            <strong>Item ID:</strong> {result.purchase.itemId}
                          </div>
                          {result.purchase.creatorId && (
                            <div>
                              <strong>Creator ID:</strong> {result.purchase.creatorId}
                            </div>
                          )}
                          {result.purchase.userId && (
                            <div>
                              <strong>User ID:</strong> {result.purchase.userId}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {result.debugInfo && (
                      <div className="space-y-3">
                        <h4 className="font-medium">Debug Information</h4>
                        <div className="bg-gray-50 p-3 rounded">
                          <pre className="text-xs overflow-auto">{JSON.stringify(result.debugInfo, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="raw" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Raw API Response</h4>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(rawResponse)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={rawResponse}
                      readOnly
                      className="font-mono text-xs"
                      rows={15}
                      placeholder="Raw response will appear here..."
                    />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Button variant="outline" onClick={() => setResult(null)}>
                Clear Results
              </Button>
              <Button variant="outline" onClick={() => setSessionId("")}>
                Clear Session ID
              </Button>
              {testSessions.map((session, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => testVerification(session.id)}
                  disabled={loading}
                >
                  Test {session.type} Session
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DebugPurchaseVerificationFixPage
