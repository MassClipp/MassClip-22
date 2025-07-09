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
  Webhook,
  Settings,
} from "lucide-react"

interface EnvironmentStatus {
  stripeMode: string
  stripeKeyPrefix: string
  webhookConfigured: boolean
  firebaseConnected: boolean
  environment: string
}

interface PurchaseDebugResult {
  sessionId: string
  stripeSession?: any
  firestorePurchase?: any
  unifiedPurchase?: any
  webhookProcessed: boolean
  recommendations: string[]
  errors: string[]
}

export default function DebugPurchaseVerificationPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [productBoxId, setProductBoxId] = useState("")
  const [debugResult, setDebugResult] = useState<PurchaseDebugResult | null>(null)
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus | null>(null)
  const [testPurchaseLoading, setTestPurchaseLoading] = useState(false)

  useEffect(() => {
    fetchEnvironmentStatus()
  }, [])

  const fetchEnvironmentStatus = async () => {
    try {
      const response = await fetch("/api/debug/stripe-environment")
      const data = await response.json()
      setEnvironmentStatus(data)
    } catch (error) {
      console.error("Failed to fetch environment status:", error)
    }
  }

  const debugPurchase = async () => {
    if (!sessionId || !user) return

    setLoading(true)
    try {
      const response = await fetch("/api/debug/purchase-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ sessionId, userId: user.uid }),
      })

      const result = await response.json()
      setDebugResult(result)
    } catch (error) {
      console.error("Debug failed:", error)
      setDebugResult({
        sessionId,
        recommendations: [],
        errors: [`Failed to debug purchase: ${error.message}`],
        webhookProcessed: false,
      })
    } finally {
      setLoading(false)
    }
  }

  const createTestPurchase = async () => {
    if (!productBoxId || !user) return

    setTestPurchaseLoading(true)
    try {
      const response = await fetch("/api/debug/create-test-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          productBoxId,
          userId: user.uid,
          price: 9.99,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSessionId(result.sessionId)
        alert(`Test purchase created! Session ID: ${result.sessionId}`)
      } else {
        alert(`Failed to create test purchase: ${result.error}`)
      }
    } catch (error) {
      console.error("Test purchase creation failed:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setTestPurchaseLoading(false)
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusBadge = (status: boolean, trueText: string, falseText: string) => {
    return <Badge variant={status ? "default" : "destructive"}>{status ? trueText : falseText}</Badge>
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
          <p className="text-gray-600">Debug and test the purchase verification system</p>
        </div>

        <Tabs defaultValue="environment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="environment" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Environment
            </TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Debug Purchase
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Test Purchase
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Monitor
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
                        <span className="font-medium">Webhook Configured:</span>
                        {getStatusIcon(environmentStatus.webhookConfigured)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Firebase Connected:</span>
                        {getStatusIcon(environmentStatus.firebaseConnected)}
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

                {environmentStatus && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {environmentStatus.stripeMode === "LIVE" ? (
                        <span className="text-green-700">
                          ✅ System is configured for LIVE transactions. Real payments will be processed.
                        </span>
                      ) : (
                        <span className="text-orange-700">
                          ⚠️ System is in TEST mode. Only test payments will be processed.
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Debug Purchase Verification
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
                  <p className="text-sm text-gray-500">Enter the Stripe checkout session ID to debug</p>
                </div>

                <Button onClick={debugPurchase} disabled={!sessionId || loading} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Debugging...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Debug Purchase
                    </>
                  )}
                </Button>

                {debugResult && (
                  <div className="space-y-4 mt-6">
                    <h3 className="text-lg font-semibold">Debug Results</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="h-4 w-4" />
                            <span className="font-medium">Stripe Session</span>
                          </div>
                          {getStatusBadge(!!debugResult.stripeSession, "Found", "Not Found")}
                          {debugResult.stripeSession && (
                            <div className="mt-2 text-sm text-gray-600">
                              Status: {debugResult.stripeSession.payment_status}
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
                          {getStatusBadge(!!debugResult.firestorePurchase, "Found", "Not Found")}
                          {debugResult.firestorePurchase && (
                            <div className="mt-2 text-sm text-gray-600">
                              Status: {debugResult.firestorePurchase.status}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Webhook className="h-4 w-4" />
                            <span className="font-medium">Webhook Processed</span>
                          </div>
                          {getStatusBadge(debugResult.webhookProcessed, "Yes", "No")}
                        </CardContent>
                      </Card>
                    </div>

                    {debugResult.recommendations.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>Recommendations:</strong>
                            <ul className="list-disc list-inside space-y-1">
                              {debugResult.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {debugResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>Errors:</strong>
                            <ul className="list-disc list-inside space-y-1">
                              {debugResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
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

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Create Test Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productBoxId">Product Box ID</Label>
                  <Input
                    id="productBoxId"
                    placeholder="Enter product box ID to test"
                    value={productBoxId}
                    onChange={(e) => setProductBoxId(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    This will create a mock purchase record for testing verification
                  </p>
                </div>

                <Button onClick={createTestPurchase} disabled={!productBoxId || testPurchaseLoading} className="w-full">
                  {testPurchaseLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Create Test Purchase
                    </>
                  )}
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This creates a test purchase record in Firestore without going through Stripe. Use this to test the
                    purchase verification system.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Real-time Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Real-time monitoring features will be implemented here. This will show live webhook events and
                    purchase processing status.
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
