"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  CreditCard,
  Database,
  Settings,
  Copy,
  TestTube,
  Info,
  Eye,
  Bug,
} from "lucide-react"

interface EnvironmentStatus {
  stripeMode: string
  stripeKeyPrefix: string
  webhookConfigured: boolean
  firebaseConnected: boolean
  environment: string
  stripeConnected: boolean
  apiEndpointsAvailable: string[]
}

interface SessionAnalysis {
  sessionId: string
  sessionExists: boolean
  sessionDetails?: any
  stripeError?: any
  firestorePurchase?: any
  userAccess?: any
  recommendations: string[]
  errors: string[]
  debugInfo: any
}

interface APIEndpointTest {
  endpoint: string
  method: string
  status: number
  response?: any
  error?: string
  responseTime: number
}

export default function DebugPurchaseVerificationDetailedPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null)
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus | null>(null)
  const [apiTests, setApiTests] = useState<APIEndpointTest[]>([])
  const [testingApis, setTestingApis] = useState(false)

  useEffect(() => {
    if (user) {
      fetchEnvironmentStatus()
      testApiEndpoints()
    }

    // Auto-populate session ID from URL if present
    const urlParams = new URLSearchParams(window.location.search)
    const sessionIdFromUrl = urlParams.get("session_id")
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl)
    }
  }, [user])

  const getAuthHeaders = async () => {
    if (!user) return {}

    try {
      const token = await user.getIdToken(true)
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    } catch (error) {
      console.error("Failed to get auth token:", error)
      return {}
    }
  }

  const fetchEnvironmentStatus = async () => {
    if (!user) return

    try {
      const headers = await getAuthHeaders()
      const response = await fetch("/api/debug/stripe-environment", { headers })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setEnvironmentStatus(data)
    } catch (error: any) {
      console.error("Failed to fetch environment status:", error)
      setEnvironmentStatus({
        stripeMode: "ERROR",
        stripeKeyPrefix: "Failed to load",
        webhookConfigured: false,
        firebaseConnected: false,
        environment: "error",
        stripeConnected: false,
        apiEndpointsAvailable: [],
      })
    }
  }

  const testApiEndpoints = async () => {
    if (!user) return

    setTestingApis(true)
    const endpoints = [
      { endpoint: "/api/purchase/verify-session", method: "POST" },
      { endpoint: "/api/debug/stripe-environment", method: "GET" },
      { endpoint: "/api/debug/purchase-verification", method: "POST" },
      { endpoint: "/api/stripe/checkout/route", method: "POST" },
      { endpoint: "/api/health", method: "GET" },
    ]

    const results: APIEndpointTest[] = []

    for (const { endpoint, method } of endpoints) {
      const startTime = Date.now()
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(endpoint, {
          method,
          headers,
          body: method === "POST" ? JSON.stringify({ test: true }) : undefined,
        })

        const responseTime = Date.now() - startTime
        let responseData
        try {
          responseData = await response.json()
        } catch {
          responseData = await response.text()
        }

        results.push({
          endpoint,
          method,
          status: response.status,
          response: responseData,
          responseTime,
        })
      } catch (error: any) {
        const responseTime = Date.now() - startTime
        results.push({
          endpoint,
          method,
          status: 0,
          error: error.message,
          responseTime,
        })
      }
    }

    setApiTests(results)
    setTestingApis(false)
  }

  const analyzeSession = async () => {
    if (!sessionId || !user) return

    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("/api/debug/purchase-session-analysis", {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, userId: user.uid }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setAnalysis(result)
    } catch (error: any) {
      console.error("Analysis failed:", error)
      setAnalysis({
        sessionId,
        sessionExists: false,
        recommendations: [],
        errors: [`Failed to analyze session: ${error.message}`],
        debugInfo: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert(`Copied: ${text}`)
  }

  const copyAnalysis = () => {
    if (analysis) {
      const analysisText = JSON.stringify(analysis, null, 2)
      navigator.clipboard.writeText(analysisText)
      alert("Analysis copied to clipboard")
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusBadge = (status: boolean, trueText: string, falseText: string) => {
    return <Badge variant={status ? "default" : "destructive"}>{status ? trueText : falseText}</Badge>
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-600"
    if (status >= 400 && status < 500) return "text-red-600"
    if (status >= 500) return "text-red-800"
    return "text-gray-600"
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to use the debug tools.</p>
            <Button onClick={() => (window.location.href = "/login")}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Verification Debug Tool</h1>
          <p className="text-gray-600">Comprehensive analysis of purchase verification issues</p>
        </div>

        <Tabs defaultValue="environment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="environment" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Environment
            </TabsTrigger>
            <TabsTrigger value="api-tests" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              API Tests
            </TabsTrigger>
            <TabsTrigger value="session-analysis" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Session Analysis
            </TabsTrigger>
            <TabsTrigger value="debug-info" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Info
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="environment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Environment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {environmentStatus ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Stripe Mode:</span>
                        <Badge variant={environmentStatus.stripeMode === "LIVE" ? "default" : "secondary"}>
                          {environmentStatus.stripeMode}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Stripe Key:</span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {environmentStatus.stripeKeyPrefix}...
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Stripe Connected:</span>
                        {getStatusIcon(environmentStatus.stripeConnected)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Firebase Connected:</span>
                        {getStatusIcon(environmentStatus.firebaseConnected)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Webhook Configured:</span>
                        {getStatusIcon(environmentStatus.webhookConfigured)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Environment:</span>
                        <Badge variant="outline">{environmentStatus.environment}</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    Loading environment status...
                  </div>
                )}

                <Button onClick={fetchEnvironmentStatus} variant="outline" className="w-full bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-tests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  API Endpoint Tests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={testApiEndpoints}
                  disabled={testingApis}
                  className="w-full bg-transparent"
                  variant="outline"
                >
                  {testingApis ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing APIs...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test API Endpoints
                    </>
                  )}
                </Button>

                {apiTests.length > 0 && (
                  <div className="space-y-3">
                    {apiTests.map((test, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{test.method}</Badge>
                            <code className="text-sm">{test.endpoint}</code>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={test.status >= 200 && test.status < 300 ? "default" : "destructive"}>
                              {test.status || "ERROR"}
                            </Badge>
                            <span className="text-sm text-gray-500">{test.responseTime}ms</span>
                          </div>
                        </div>
                        {test.error && (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">Error: {test.error}</div>
                        )}
                        {test.response && (
                          <details className="mt-2">
                            <summary className="text-sm cursor-pointer text-gray-600">View Response</summary>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(test.response, null, 2)}
                            </pre>
                          </details>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="session-analysis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Session Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionId">Stripe Session ID</Label>
                  <Input
                    id="sessionId"
                    placeholder="cs_live_... or cs_test_..."
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Enter the Stripe checkout session ID to analyze. This will be auto-populated if you came from a
                    purchase-success URL.
                  </p>
                </div>

                <Button onClick={analyzeSession} disabled={!sessionId || loading} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Analyze Session
                    </>
                  )}
                </Button>

                {analysis && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Analysis Results</h3>
                      <Button variant="ghost" size="sm" onClick={copyAnalysis}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy All
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="h-4 w-4" />
                            <span className="font-medium">Stripe Session</span>
                          </div>
                          {getStatusBadge(analysis.sessionExists, "Found", "Not Found")}
                          {analysis.sessionDetails && (
                            <div className="mt-2 text-sm text-gray-600">
                              <div>Status: {analysis.sessionDetails.payment_status}</div>
                              <div>Amount: ${(analysis.sessionDetails.amount_total / 100).toFixed(2)}</div>
                              <div>
                                Created: {new Date(analysis.sessionDetails.created * 1000).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="h-4 w-4" />
                            <span className="font-medium">Firestore Purchase</span>
                          </div>
                          {getStatusBadge(!!analysis.firestorePurchase, "Found", "Not Found")}
                          {analysis.firestorePurchase && (
                            <div className="mt-2 text-sm text-gray-600">
                              <div>Status: {analysis.firestorePurchase.status}</div>
                              <div>
                                Created: {analysis.firestorePurchase.createdAt?.toDate?.()?.toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">User Access</span>
                          </div>
                          {getStatusBadge(!!analysis.userAccess, "Granted", "Not Granted")}
                          {analysis.userAccess && (
                            <div className="mt-2 text-sm text-gray-600">
                              <div>Type: {analysis.userAccess.accessType}</div>
                              <div>Granted: {analysis.userAccess.grantedAt?.toDate?.()?.toLocaleDateString()}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {analysis.errors.length > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>Errors Found:</strong>
                            <ul className="list-disc list-inside space-y-1">
                              {analysis.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {analysis.recommendations.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>Recommendations:</strong>
                            <ul className="list-disc list-inside space-y-1">
                              {analysis.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug-info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Debug Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Current Session</h4>
                    <div className="text-sm space-y-1">
                      <div>Domain: {window.location.origin}</div>
                      <div>URL: {window.location.href}</div>
                      <div>User ID: {user?.uid}</div>
                      <div>User Email: {user?.email}</div>
                      <div>Timestamp: {new Date().toISOString()}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Browser Info</h4>
                    <div className="text-sm space-y-1">
                      <div>User Agent: {navigator.userAgent}</div>
                      <div>Language: {navigator.language}</div>
                      <div>Online: {navigator.onLine ? "Yes" : "No"}</div>
                      <div>Cookies Enabled: {navigator.cookieEnabled ? "Yes" : "No"}</div>
                    </div>
                  </div>
                </div>

                {analysis?.debugInfo && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Analysis Debug Info</h4>
                    <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                      {JSON.stringify(analysis.debugInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Troubleshooting Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-blue-700">Session Not Found (404)</h4>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1">
                      <li>• Check if you're using the correct Stripe mode (test vs live)</li>
                      <li>• Verify the session ID is complete and not truncated</li>
                      <li>• Sessions expire after 24 hours</li>
                      <li>• Ensure your Stripe keys are configured correctly</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="font-semibold text-yellow-700">Payment Not Completed</h4>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1">
                      <li>• Customer may have abandoned the checkout</li>
                      <li>• Payment method was declined</li>
                      <li>• Check Stripe dashboard for payment status</li>
                      <li>• Verify webhook is processing payment.succeeded events</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-semibold text-red-700">API Endpoint Issues</h4>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1">
                      <li>• Check if the API route exists and is properly configured</li>
                      <li>• Verify authentication is working</li>
                      <li>• Check server logs for detailed error messages</li>
                      <li>• Ensure all required environment variables are set</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold text-green-700">Database Issues</h4>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1">
                      <li>• Verify Firestore connection and permissions</li>
                      <li>• Check if purchase record was created</li>
                      <li>• Ensure user access was properly granted</li>
                      <li>• Verify collection names and document structure</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Next Steps:</strong> Use the Session Analysis tab to get specific recommendations for your
                    session ID. The API Tests tab will help identify if there are routing or configuration issues.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
