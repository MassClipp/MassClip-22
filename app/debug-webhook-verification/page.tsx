"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertCircle, Loader2, Webhook, Database, CreditCard, RefreshCw } from "lucide-react"

interface WebhookDebugResult {
  sessionId: string
  userId: string
  timestamp: string
  webhookLogs: any[]
  purchaseChecks: any[]
  stripeSessionData: any
  recommendations: string[]
  success: boolean
}

export default function WebhookVerificationDebugPage() {
  const [sessionId, setSessionId] = useState("")
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<WebhookDebugResult | null>(null)
  const [webhookSecrets, setWebhookSecrets] = useState<any>(null)
  const [loadingSecrets, setLoadingSecrets] = useState(false)

  const runWebhookDebug = async () => {
    if (!sessionId.trim() || !userId.trim()) {
      alert("Please enter both session ID and user ID")
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/debug/webhook-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          userId: userId.trim(),
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Webhook debug error:", error)
      setResult({
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
        webhookLogs: [],
        purchaseChecks: [],
        stripeSessionData: null,
        recommendations: ["Failed to run debug - check console for errors"],
        success: false,
      })
    } finally {
      setLoading(false)
    }
  }

  const checkWebhookSecrets = async () => {
    setLoadingSecrets(true)
    try {
      const response = await fetch("/api/debug/webhook-secrets")
      const data = await response.json()
      setWebhookSecrets(data)
    } catch (error) {
      console.error("Webhook secrets check error:", error)
    } finally {
      setLoadingSecrets(false)
    }
  }

  useEffect(() => {
    checkWebhookSecrets()
  }, [])

  const CheckStatus = ({ check, label }: { check: boolean | undefined; label: string }) => (
    <div className="flex items-center gap-2">
      {check === true ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : check === false ? (
        <XCircle className="h-4 w-4 text-red-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-gray-400" />
      )}
      <span className={check === true ? "text-green-700" : check === false ? "text-red-700" : "text-gray-500"}>
        {label}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Webhook Verification Debug</h1>
          <p className="text-gray-600">Diagnose webhook processing and purchase verification issues</p>
        </div>

        <Tabs defaultValue="debug" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="debug">Debug Session</TabsTrigger>
            <TabsTrigger value="secrets">Webhook Config</TabsTrigger>
            <TabsTrigger value="logs">Recent Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="debug" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
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
                    placeholder="cs_test_a1zAg2VLVIipFyc5PCdnIrwC7QfQXBAStZ450RkvMTMm8QoARFCvnFpUuT"
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
                    placeholder="IuMb4NIvePMPhhhC0HcDW5nwo8J2"
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500 mt-1">Firebase user ID from authentication</p>
                </div>

                <Button onClick={runWebhookDebug} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Debug...
                    </>
                  ) : (
                    <>
                      <Webhook className="h-4 w-4 mr-2" />
                      Debug Webhook Processing
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {result && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      Debug Results
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "FOUND" : "NOT FOUND"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold mb-2">Purchase Checks</h3>
                        <div className="space-y-2">
                          {result.purchaseChecks.map((check, index) => (
                            <div key={index} className="text-sm">
                              <CheckStatus check={check.found} label={check.collection} />
                              {check.count !== undefined && (
                                <span className="text-gray-500 ml-6">({check.count} records)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Stripe Session</h3>
                        <div className="space-y-2">
                          {result.stripeSessionData ? (
                            <div className="text-sm space-y-1">
                              <CheckStatus check={true} label="Session exists" />
                              <div className="ml-6 text-gray-600">
                                <div>Status: {result.stripeSessionData.payment_status}</div>
                                <div>Amount: ${(result.stripeSessionData.amount_total / 100).toFixed(2)}</div>
                                <div>Mode: {result.stripeSessionData.mode}</div>
                              </div>
                            </div>
                          ) : (
                            <CheckStatus check={false} label="Session not found" />
                          )}
                        </div>
                      </div>
                    </div>

                    {result.recommendations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Recommendations</h3>
                        <ul className="space-y-1">
                          {result.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {result.webhookLogs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Webhook Processing Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-auto">
                        {result.webhookLogs.map((log, index) => (
                          <div key={index} className="bg-gray-100 p-3 rounded text-sm">
                            <div className="font-mono text-xs text-gray-500">{log.timestamp}</div>
                            <div className="mt-1">{log.message}</div>
                            {log.data && (
                              <pre className="mt-2 text-xs bg-gray-200 p-2 rounded overflow-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Raw Debug Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="secrets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Webhook Configuration
                  <Button onClick={checkWebhookSecrets} disabled={loadingSecrets} variant="outline" size="sm">
                    {loadingSecrets ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {webhookSecrets ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold mb-2">Environment</h3>
                        <div className="space-y-2">
                          <CheckStatus check={webhookSecrets.environment === "test"} label="Test Mode" />
                          <CheckStatus check={webhookSecrets.environment === "live"} label="Live Mode" />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Webhook Secrets</h3>
                        <div className="space-y-2">
                          <CheckStatus check={webhookSecrets.hasTestSecret} label="Test Secret Set" />
                          <CheckStatus check={webhookSecrets.hasLiveSecret} label="Live Secret Set" />
                          <CheckStatus check={webhookSecrets.hasCorrectSecret} label="Correct Secret Available" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Stripe Keys</h3>
                      <div className="space-y-2">
                        <CheckStatus check={webhookSecrets.hasStripeKey} label="Stripe Secret Key Set" />
                        <div className="text-sm text-gray-600 ml-6">Key Type: {webhookSecrets.keyType}</div>
                      </div>
                    </div>

                    {webhookSecrets.recommendations && (
                      <div>
                        <h3 className="font-semibold mb-2">Configuration Issues</h3>
                        <ul className="space-y-1">
                          {webhookSecrets.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                              <span className="text-red-500 mt-1">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading webhook configuration...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Recent Webhook Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Check your Vercel function logs for real-time webhook processing information. Look for logs starting
                    with [Webhook] in your deployment logs.
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
