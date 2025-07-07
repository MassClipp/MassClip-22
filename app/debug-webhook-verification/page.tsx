"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, RefreshCw, Bug, Settings, Activity } from "lucide-react"

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
  }
  webhookSecrets: {
    testSecretSet: boolean
    liveSecretSet: boolean
    correctSecretAvailable: boolean
  }
  stripeKeys: {
    secretKeySet: boolean
    keyType: string
  }
  configurationIssues: string[]
}

export default function WebhookVerificationDebug() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState("")
  const [userId, setUserId] = useState(user?.uid || "")
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null)
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Webhook Verification Debug</h1>
          <p className="text-gray-600">Diagnose webhook processing and purchase verification issues</p>
        </div>

        <Tabs defaultValue="debug" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="debug" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Session
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Webhook Config
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Webhooks
            </TabsTrigger>
          </TabsList>

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
                      {debugResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
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
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {check.found ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="font-mono text-xs">{check.collection}</span>
                              {check.found && check.count !== undefined && (
                                <Badge variant="secondary">({check.count} records)</Badge>
                              )}
                              {check.error && <span className="text-red-500">({check.error})</span>}
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
                            <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                              <div>Status: {debugResult.stripeSessionData.payment_status}</div>
                              <div>Amount: {debugResult.stripeSessionData.amount_total}</div>
                              <div>Currency: {debugResult.stripeSessionData.currency}</div>
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
                      <ul className="space-y-2">
                        {debugResult.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

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
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Environment</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {webhookConfig.environment.isTestMode ? (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm">Test Mode</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {webhookConfig.environment.isLiveMode ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm">Live Mode</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Webhook Secrets</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {webhookConfig.webhookSecrets.testSecretSet ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">Test Secret Set</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {webhookConfig.webhookSecrets.liveSecretSet ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">Live Secret Set</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {webhookConfig.webhookSecrets.correctSecretAvailable ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">Correct Secret Available</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Stripe Keys</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {webhookConfig.stripeKeys.secretKeySet ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">Stripe Secret Key Set</span>
                        </div>
                        <div className="text-xs text-gray-500">Key Type: {webhookConfig.stripeKeys.keyType}</div>
                      </div>
                    </div>

                    {webhookConfig.configurationIssues.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-red-600">Configuration Issues</h3>
                        <ul className="space-y-1">
                          {webhookConfig.configurationIssues.map((issue, index) => (
                            <li key={index} className="text-sm text-red-600">
                              • {issue}
                            </li>
                          ))}
                        </ul>
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
