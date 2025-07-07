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
import { AlertCircle, CheckCircle, Clock, RefreshCw, Bug, Settings, Activity, AlertTriangle } from "lucide-react"

interface DebugResult {
  sessionId: string
  userId: string
  timestamp: string
  purchaseChecks: Array<{
    collection: string
    found: boolean
    count?: number
    data?: any[]
    error?: string
  }>
  stripeSessionData: any
  recommendations: string[]
  success: boolean
}

interface WebhookConfig {
  environment: {
    isTestMode: boolean
    isLiveMode: boolean
    currentMode: string
    detected: string
  }
  webhookSecrets: {
    testSecretSet: boolean
    liveSecretSet: boolean
    correctSecretAvailable: boolean
    testSecretLength: number
    liveSecretLength: number
  }
  stripeKeys: {
    secretKeySet: boolean
    keyType: string
    keyLength: number
  }
  configurationIssues: string[]
  recommendations: string[]
}

export default function WebhookVerificationDebug() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState("")
  const [userId, setUserId] = useState(user?.uid || "")
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null)
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      setUserId(user.uid)
    }
  }, [user])

  useEffect(() => {
    checkWebhookConfig()
  }, [])

  const debugWebhookProcessing = async () => {
    if (!sessionId || !userId) {
      alert("Please provide both Session ID and User ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/debug/webhook-verification", {
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

  const checkWebhookConfig = async () => {
    setConfigLoading(true)
    try {
      const response = await fetch("/api/debug/webhook-secrets")
      const config = await response.json()
      setWebhookConfig(config)
    } catch (error) {
      console.error("Config check failed:", error)
      alert("Config check failed")
    } finally {
      setConfigLoading(false)
    }
  }

  const StatusIcon = ({ status }: { status: boolean | undefined }) => {
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === false) return <AlertCircle className="h-4 w-4 text-red-500" />
    return <Clock className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Webhook Verification Debug</h1>
          <p className="text-gray-600">Diagnose webhook processing and purchase verification issues</p>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Webhook Config
            </TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Session
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Webhooks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Webhook Configuration
                  <Button onClick={checkWebhookConfig} disabled={configLoading} size="sm" variant="outline">
                    {configLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {webhookConfig ? (
                  <div className="space-y-6">
                    {/* Environment Detection Alert */}
                    <Alert
                      className={
                        webhookConfig.environment.isLiveMode ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"
                      }
                    >
                      {webhookConfig.environment.isLiveMode ? (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                      <AlertDescription
                        className={webhookConfig.environment.isLiveMode ? "text-red-800" : "text-blue-800"}
                      >
                        <strong>{webhookConfig.environment.detected}</strong>
                        {webhookConfig.environment.isLiveMode && <span> - Real payments will be processed!</span>}
                        {webhookConfig.environment.isTestMode && <span> - Safe for development and testing</span>}
                      </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Environment</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={webhookConfig.environment.isTestMode} />
                            <span className="text-sm">Test Mode</span>
                            {webhookConfig.environment.isTestMode && <Badge variant="secondary">Active</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={webhookConfig.environment.isLiveMode} />
                            <span className="text-sm">Live Mode</span>
                            {webhookConfig.environment.isLiveMode && <Badge variant="destructive">Active</Badge>}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">Webhook Secrets</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={webhookConfig.webhookSecrets.testSecretSet} />
                            <span className="text-sm">Test Secret Set</span>
                            {webhookConfig.webhookSecrets.testSecretLength > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {webhookConfig.webhookSecrets.testSecretLength} chars
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={webhookConfig.webhookSecrets.liveSecretSet} />
                            <span className="text-sm">Live Secret Set</span>
                            {webhookConfig.webhookSecrets.liveSecretLength > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {webhookConfig.webhookSecrets.liveSecretLength} chars
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={webhookConfig.webhookSecrets.correctSecretAvailable} />
                            <span className="text-sm">Correct Secret Available</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">Stripe Keys</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={webhookConfig.stripeKeys.secretKeySet} />
                            <span className="text-sm">Stripe Secret Key Set</span>
                          </div>
                          <div className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
                            {webhookConfig.stripeKeys.keyType}
                          </div>
                          <div className="text-xs text-gray-500">
                            Length: {webhookConfig.stripeKeys.keyLength} characters
                          </div>
                        </div>
                      </div>
                    </div>

                    {webhookConfig.recommendations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Recommendations</h3>
                        <div className="space-y-2">
                          {webhookConfig.recommendations.map((rec, index) => (
                            <Alert
                              key={index}
                              className={
                                rec.includes("⚠️") ? "border-orange-200 bg-orange-50" : "border-blue-200 bg-blue-50"
                              }
                            >
                              <AlertDescription className={rec.includes("⚠️") ? "text-orange-800" : "text-blue-800"}>
                                {rec}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    {webhookConfig.configurationIssues.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-red-600">Configuration Issues</h3>
                        <div className="space-y-2">
                          {webhookConfig.configurationIssues.map((issue, index) => (
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
                    <Button onClick={checkWebhookConfig} disabled={configLoading}>
                      {configLoading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Checking Configuration...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Check Webhook Configuration
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
                    <Bug className="h-5 w-5" />
                    Debug Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="sessionId">Stripe Session ID (Required)</Label>
                    <Input
                      id="sessionId"
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      placeholder="cs_test_..."
                      className="font-mono text-sm"
                    />
                    <p className="text-sm text-gray-500 mt-1">Get this from the purchase success URL or console logs</p>
                  </div>

                  <div>
                    <Label htmlFor="userId">User ID (Required)</Label>
                    <Input
                      id="userId"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Firebase user ID"
                      className="font-mono text-sm"
                    />
                    <p className="text-sm text-gray-500 mt-1">Firebase user ID from authentication</p>
                  </div>

                  <Button onClick={debugWebhookProcessing} disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Debug Webhook Processing
                      </>
                    ) : (
                      <>
                        <Bug className="h-4 w-4 mr-2" />
                        Debug Webhook Processing
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
                        {debugResult.success ? "FOUND" : "NOT FOUND"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Purchase Checks</h3>
                        <div className="space-y-2">
                          {debugResult.purchaseChecks.map((check, index) => (
                            <div key={index} className="text-sm">
                              <div className="flex items-center gap-2">
                                <StatusIcon status={check.found} />
                                <span className="font-mono text-xs">{check.collection}</span>
                                {check.found && check.count !== undefined && (
                                  <Badge variant="secondary">({check.count} records)</Badge>
                                )}
                              </div>
                              {check.error && <div className="ml-6 text-red-500 text-xs">Error: {check.error}</div>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">Stripe Session</h3>
                        {debugResult.stripeSessionData ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Session found</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
                              <div>Status: {debugResult.stripeSessionData.payment_status}</div>
                              <div>Amount: {debugResult.stripeSessionData.amount_total}</div>
                              <div>Currency: {debugResult.stripeSessionData.currency}</div>
                              <div>Mode: {debugResult.stripeSessionData.mode}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span>Session not found</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Recommendations</h3>
                      <div className="space-y-2">
                        {debugResult.recommendations.map((rec, index) => (
                          <Alert
                            key={index}
                            className={
                              rec.includes("✅") ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"
                            }
                          >
                            <AlertDescription className={rec.includes("✅") ? "text-green-800" : "text-blue-800"}>
                              {rec}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Webhooks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Webhook logs feature coming soon</p>
                  <p className="text-sm">Check Vercel function logs for detailed webhook processing information</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
