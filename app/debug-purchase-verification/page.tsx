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
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Bug,
  Settings,
  Activity,
  AlertTriangle,
  CreditCard,
  Database,
  Webhook,
  Search,
  Zap,
} from "lucide-react"

interface PurchaseDebugResult {
  sessionId: string
  userId: string
  timestamp: string
  stripeSession: {
    found: boolean
    data?: any
    error?: string
  }
  firestorePurchases: {
    userPurchases: {
      found: boolean
      count: number
      data: any[]
    }
    unifiedPurchases: {
      found: boolean
      data?: any
    }
  }
  webhookLogs: {
    checkoutSession: {
      found: boolean
      data?: any
    }
  }
  recommendations: string[]
  issues: string[]
  success: boolean
}

interface StripeEnvironmentInfo {
  environment: string
  keyType: string
  isLiveMode: boolean
  webhookSecrets: {
    testSecretSet: boolean
    liveSecretSet: boolean
    correctSecretAvailable: boolean
  }
  recommendations: string[]
  issues: string[]
}

export default function PurchaseVerificationDebug() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState("")
  const [userId, setUserId] = useState(user?.uid || "")
  const [debugResult, setDebugResult] = useState<PurchaseDebugResult | null>(null)
  const [envInfo, setEnvInfo] = useState<StripeEnvironmentInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [envLoading, setEnvLoading] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      setUserId(user.uid)
    }
  }, [user])

  useEffect(() => {
    checkEnvironment()
  }, [])

  const debugPurchaseVerification = async () => {
    if (!sessionId || !userId) {
      alert("Please provide both Session ID and User ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/debug/purchase-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, userId }),
      })

      const result = await response.json()
      setDebugResult(result)
    } catch (error) {
      console.error("Debug failed:", error)
      alert("Debug request failed")
    } finally {
      setLoading(false)
    }
  }

  const checkEnvironment = async () => {
    setEnvLoading(true)
    try {
      const response = await fetch("/api/debug/stripe-environment")
      const info = await response.json()
      setEnvInfo(info)
    } catch (error) {
      console.error("Environment check failed:", error)
    } finally {
      setEnvLoading(false)
    }
  }

  const createTestPurchase = async () => {
    if (!userId) {
      alert("Please provide User ID")
      return
    }

    try {
      const response = await fetch("/api/debug/create-test-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const result = await response.json()
      if (result.sessionId) {
        setSessionId(result.sessionId)
        alert(`Test purchase created! Session ID: ${result.sessionId}`)
      }
    } catch (error) {
      console.error("Test purchase creation failed:", error)
      alert("Failed to create test purchase")
    }
  }

  const StatusIcon = ({ status }: { status: boolean | undefined }) => {
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === false) return <AlertCircle className="h-4 w-4 text-red-500" />
    return <Clock className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Verification Debug</h1>
          <p className="text-gray-600">Comprehensive debugging tool for purchase verification issues</p>
        </div>

        <Tabs defaultValue="environment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="environment" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Environment
            </TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Purchase
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Test Purchase
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Monitor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="environment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Stripe Environment Status
                  <Button onClick={checkEnvironment} disabled={envLoading} size="sm" variant="outline">
                    {envLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {envInfo ? (
                  <div className="space-y-6">
                    {/* Environment Alert */}
                    <Alert className={envInfo.isLiveMode ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}>
                      {envInfo.isLiveMode ? (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                      <AlertDescription className={envInfo.isLiveMode ? "text-red-800" : "text-blue-800"}>
                        <strong>Current Environment: {envInfo.environment}</strong>
                        <br />
                        <span className="text-sm">
                          {envInfo.isLiveMode
                            ? "⚠️ LIVE MODE - Real payments will be processed!"
                            : "✅ TEST MODE - Safe for development"}
                        </span>
                      </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Stripe Configuration
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={envInfo.isLiveMode ? "destructive" : "secondary"}>
                              {envInfo.keyType.toUpperCase()}
                            </Badge>
                            <span className="text-sm">{envInfo.environment}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Webhook className="h-4 w-4" />
                          Webhook Secrets
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={envInfo.webhookSecrets.testSecretSet} />
                            <span className="text-sm">Test Secret</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={envInfo.webhookSecrets.liveSecretSet} />
                            <span className="text-sm">Live Secret</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={envInfo.webhookSecrets.correctSecretAvailable} />
                            <span className="text-sm">Correct Secret Available</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {envInfo.recommendations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Recommendations</h3>
                        <div className="space-y-2">
                          {envInfo.recommendations.map((rec, index) => (
                            <Alert key={index} className="border-blue-200 bg-blue-50">
                              <AlertDescription className="text-blue-800">{rec}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    {envInfo.issues.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-red-600">Issues</h3>
                        <div className="space-y-2">
                          {envInfo.issues.map((issue, index) => (
                            <Alert key={index} className="border-red-200 bg-red-50">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">{issue}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Button onClick={checkEnvironment} disabled={envLoading}>
                      {envLoading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Checking Environment...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Check Environment
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Debug Purchase Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="sessionId">Stripe Session ID</Label>
                    <Input
                      id="sessionId"
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      placeholder="cs_live_... or cs_test_..."
                      className="font-mono text-sm"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Get this from the URL after successful checkout or browser console
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Firebase user ID"
                      className="font-mono text-sm"
                    />
                  </div>

                  <Button onClick={debugPurchaseVerification} disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Debugging Purchase...
                      </>
                    ) : (
                      <>
                        <Bug className="h-4 w-4 mr-2" />
                        Debug Purchase Verification
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {debugResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <StatusIcon status={debugResult.success} />
                      Debug Results
                      <Badge variant={debugResult.success ? "default" : "destructive"}>
                        {debugResult.success ? "VERIFIED" : "NOT VERIFIED"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Stripe Session */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Stripe Session
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={debugResult.stripeSession.found} />
                            <span className="text-sm">Session Found</span>
                          </div>
                          {debugResult.stripeSession.data && (
                            <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
                              <div>Status: {debugResult.stripeSession.data.payment_status}</div>
                              <div>Mode: {debugResult.stripeSession.data.mode}</div>
                              <div>Amount: ${(debugResult.stripeSession.data.amount_total / 100).toFixed(2)}</div>
                            </div>
                          )}
                          {debugResult.stripeSession.error && (
                            <div className="text-red-500 text-xs">{debugResult.stripeSession.error}</div>
                          )}
                        </div>
                      </div>

                      {/* Firestore Purchases */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Firestore Records
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={debugResult.firestorePurchases.userPurchases.found} />
                            <span className="text-sm">User Purchases</span>
                            {debugResult.firestorePurchases.userPurchases.count > 0 && (
                              <Badge variant="secondary">{debugResult.firestorePurchases.userPurchases.count}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={debugResult.firestorePurchases.unifiedPurchases.found} />
                            <span className="text-sm">Unified Purchases</span>
                          </div>
                        </div>
                      </div>

                      {/* Webhook Processing */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Webhook className="h-4 w-4" />
                          Webhook Processing
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={debugResult.webhookLogs.checkoutSession.found} />
                            <span className="text-sm">Session Processed</span>
                          </div>
                          {debugResult.webhookLogs.checkoutSession.data && (
                            <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                              Processed:{" "}
                              {new Date(
                                debugResult.webhookLogs.checkoutSession.data.webhookProcessedAt?.seconds * 1000,
                              ).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {debugResult.recommendations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Recommendations</h3>
                        <div className="space-y-2">
                          {debugResult.recommendations.map((rec, index) => (
                            <Alert key={index} className="border-blue-200 bg-blue-50">
                              <AlertDescription className="text-blue-800">{rec}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    {debugResult.issues.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-red-600">Issues Found</h3>
                        <div className="space-y-2">
                          {debugResult.issues.map((issue, index) => (
                            <Alert key={index} className="border-red-200 bg-red-50">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">{issue}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Create Test Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    This will create a test purchase record to verify the purchase verification system is working
                    correctly.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="testUserId">User ID for Test Purchase</Label>
                  <Input
                    id="testUserId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Firebase user ID"
                    className="font-mono text-sm"
                  />
                </div>

                <Button onClick={createTestPurchase} className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Create Test Purchase
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Real-time monitoring feature coming soon</p>
                  <p className="text-sm">Monitor webhook events and purchase verification in real-time</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
