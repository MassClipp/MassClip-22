"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, AlertCircle, XCircle, Zap, Database, Webhook, ShoppingCart } from "lucide-react"

export default function DebugPurchaseIssuePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [diagnosticData, setDiagnosticData] = useState<any>(null)
  const [webhookData, setWebhookData] = useState<any>(null)

  // Manual completion form
  const [sessionId, setSessionId] = useState("")
  const [productBoxId, setProductBoxId] = useState("")
  const [amount, setAmount] = useState("")

  const runDiagnostic = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to run diagnostics",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Get user purchases diagnostic
      const purchaseResponse = await fetch(`/api/debug/purchase-diagnostic?userId=${user.uid}`)
      const purchaseData = await purchaseResponse.json()
      setDiagnosticData(purchaseData)

      // Get webhook diagnostic
      const webhookResponse = await fetch("/api/debug/webhook-diagnostic")
      const webhookDataResponse = await webhookResponse.json()
      setWebhookData(webhookDataResponse)

      toast({
        title: "Diagnostic Complete",
        description: "Purchase diagnostic data loaded",
      })
    } catch (error) {
      console.error("Diagnostic error:", error)
      toast({
        title: "Diagnostic Failed",
        description: "Failed to run purchase diagnostic",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const forceCompletePurchase = async () => {
    if (!user || !sessionId || !productBoxId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/debug/force-complete-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          buyerUid: user.uid,
          productBoxId,
          amount: amount ? Number.parseFloat(amount) : undefined,
          currency: "usd",
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Purchase Completed",
          description: "Purchase has been manually completed",
        })
        // Refresh diagnostic data
        await runDiagnostic()
      } else {
        toast({
          title: "Completion Failed",
          description: data.error || "Failed to complete purchase",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Force completion error:", error)
      toast({
        title: "Error",
        description: "Failed to complete purchase",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      runDiagnostic()
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-zinc-400">Please log in to access purchase diagnostics</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Purchase Issue Diagnostic</h1>
            <p className="text-zinc-400">Debug missing purchases and webhook issues</p>
          </div>
          <Button onClick={runDiagnostic} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Diagnostic
          </Button>
        </div>

        {/* User Info */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-zinc-400">User ID</Label>
                <p className="text-white font-mono">{user.uid}</p>
              </div>
              <div>
                <Label className="text-zinc-400">Email</Label>
                <p className="text-white">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Summary */}
        {diagnosticData && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Purchase Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{diagnosticData.summary?.totalPurchases || 0}</div>
                  <div className="text-sm text-zinc-400">Total Purchases</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {diagnosticData.summary?.totalUnifiedPurchases || 0}
                  </div>
                  <div className="text-sm text-zinc-400">Unified Purchases</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {diagnosticData.summary?.totalLegacyPurchases || 0}
                  </div>
                  <div className="text-sm text-zinc-400">Legacy Purchases</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {diagnosticData.summary?.recentStripeWebhooks || 0}
                  </div>
                  <div className="text-sm text-zinc-400">Recent Webhooks</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collections Data */}
        {diagnosticData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unified Purchases */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Unified Purchases
                  <Badge variant={diagnosticData.collections?.unifiedPurchases?.count > 0 ? "default" : "secondary"}>
                    {diagnosticData.collections?.unifiedPurchases?.count || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnosticData.collections?.unifiedPurchases?.error ? (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span>Error: {diagnosticData.collections.unifiedPurchases.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diagnosticData.collections?.unifiedPurchases?.documents?.length > 0 ? (
                      diagnosticData.collections.unifiedPurchases.documents.map((doc: any, index: number) => (
                        <div key={index} className="p-3 bg-zinc-800 rounded text-sm">
                          <div className="font-mono text-zinc-400">ID: {doc.id}</div>
                          <div className="text-white">Product: {doc.data?.productBoxTitle || "Unknown"}</div>
                          <div className="text-zinc-400">Amount: ${doc.data?.amount || 0}</div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>No unified purchases found</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legacy Purchases */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Legacy Purchases
                  <Badge variant={diagnosticData.collections?.legacyPurchases?.count > 0 ? "default" : "secondary"}>
                    {diagnosticData.collections?.legacyPurchases?.count || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnosticData.collections?.legacyPurchases?.error ? (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span>Error: {diagnosticData.collections.legacyPurchases.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diagnosticData.collections?.legacyPurchases?.documents?.length > 0 ? (
                      diagnosticData.collections.legacyPurchases.documents.map((doc: any, index: number) => (
                        <div key={index} className="p-3 bg-zinc-800 rounded text-sm">
                          <div className="font-mono text-zinc-400">ID: {doc.id}</div>
                          <div className="text-white">Product: {doc.data?.itemTitle || "Unknown"}</div>
                          <div className="text-zinc-400">Amount: ${doc.data?.amount || 0}</div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>No legacy purchases found</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Webhook Data */}
        {webhookData && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Recent Webhooks (Last 24h)
                <Badge variant={webhookData.summary?.totalWebhooks > 0 ? "default" : "secondary"}>
                  {webhookData.summary?.totalWebhooks || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{webhookData.summary?.successfulWebhooks || 0}</div>
                  <div className="text-sm text-zinc-400">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-400">{webhookData.summary?.failedWebhooks || 0}</div>
                  <div className="text-sm text-zinc-400">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">
                    {webhookData.summary?.checkoutSessionsCompleted || 0}
                  </div>
                  <div className="text-sm text-zinc-400">Checkout Completed</div>
                </div>
              </div>

              {webhookData.recentWebhooks?.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {webhookData.recentWebhooks.map((webhook: any, index: number) => (
                    <div key={index} className="p-3 bg-zinc-800 rounded text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-zinc-400">{webhook.eventType}</span>
                        <Badge variant={webhook.status === "success" ? "default" : "destructive"}>
                          {webhook.status}
                        </Badge>
                      </div>
                      <div className="text-white">Session: {webhook.sessionId}</div>
                      {webhook.metadata && <div className="text-zinc-400">Buyer: {webhook.metadata.buyerUid}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>No recent webhooks found</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Purchase Completion */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Manual Purchase Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sessionId" className="text-zinc-400">
                  Stripe Session ID
                </Label>
                <Input
                  id="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="cs_test_..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="productBoxId" className="text-zinc-400">
                  Product Box ID
                </Label>
                <Input
                  id="productBoxId"
                  value={productBoxId}
                  onChange={(e) => setProductBoxId(e.target.value)}
                  placeholder="Product box ID"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="amount" className="text-zinc-400">
                  Amount (optional)
                </Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.50"
                  type="number"
                  step="0.01"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <Button
              onClick={forceCompletePurchase}
              disabled={loading || !sessionId || !productBoxId}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Force Complete Purchase
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
