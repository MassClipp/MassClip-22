"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Loader2, ExternalLink, Copy, AlertTriangle, TestTube, Zap, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DebugPurchaseFlowPage() {
  const { toast } = useToast()
  const [sessionId, setSessionId] = useState("cs_live_b1TVZJXzwj1bz6e25x9t9GwOp7dTLPH95PsLtT71wys2jK4hCVUDrO1Vb")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState("")

  // Test 1: Simple API connectivity
  const testSimpleAPI = async () => {
    setLoading(true)
    setError("")
    setResults(null)

    try {
      console.log("🔍 [Debug] Testing simple API connectivity...")

      const response = await fetch("/api/test-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "data", sessionId }),
      })

      const data = await response.json()
      console.log("📊 [Debug] Simple API response:", data)

      setResults({
        type: "simple_api",
        success: response.ok,
        status: response.status,
        data,
      })

      if (response.ok) {
        toast({ title: "✅ Simple API Test", description: "Basic API connectivity works!" })
      } else {
        toast({ title: "❌ Simple API Test", description: "API connectivity failed", variant: "destructive" })
      }
    } catch (error: any) {
      console.error("❌ [Debug] Simple API test failed:", error)
      setError(`Simple API test failed: ${error.message}`)
      toast({ title: "❌ Network Error", description: "Failed to reach API", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Test 2: Direct Stripe lookup
  const testStripeLookup = async () => {
    if (!sessionId.trim()) {
      toast({ title: "❌ Error", description: "Please enter a session ID", variant: "destructive" })
      return
    }

    setLoading(true)
    setError("")
    setResults(null)

    try {
      console.log("🔍 [Debug] Testing direct Stripe lookup...")

      const response = await fetch("/api/debug/stripe-session-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })

      const data = await response.json()
      console.log("📊 [Debug] Stripe lookup response:", data)

      setResults({
        type: "stripe_lookup",
        success: response.ok,
        status: response.status,
        data,
      })

      if (response.ok && data.success) {
        toast({ title: "✅ Stripe Lookup", description: "Session found in Stripe!" })
      } else {
        toast({ title: "❌ Stripe Lookup", description: data.error || "Session not found", variant: "destructive" })
      }
    } catch (error: any) {
      console.error("❌ [Debug] Stripe lookup failed:", error)
      setError(`Stripe lookup failed: ${error.message}`)
      toast({ title: "❌ Network Error", description: "Failed to reach Stripe API", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Test 3: Full verification
  const testFullVerification = async () => {
    if (!sessionId.trim()) {
      toast({ title: "❌ Error", description: "Please enter a session ID", variant: "destructive" })
      return
    }

    setLoading(true)
    setError("")
    setResults(null)

    try {
      console.log("🔍 [Debug] Testing full verification...")

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })

      const data = await response.json()
      console.log("📊 [Debug] Full verification response:", data)

      setResults({
        type: "full_verification",
        success: response.ok,
        status: response.status,
        data,
      })

      if (response.ok && data.success) {
        toast({ title: "✅ Full Verification", description: "Purchase verified successfully!" })
      } else {
        toast({
          title: "❌ Full Verification",
          description: data.error || "Verification failed",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ [Debug] Full verification failed:", error)
      setError(`Full verification failed: ${error.message}`)
      toast({ title: "❌ Network Error", description: "Failed to complete verification", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId)
    toast({ title: "Copied", description: "Session ID copied to clipboard" })
  }

  const openSuccessPage = () => {
    if (!sessionId.trim()) {
      toast({ title: "❌ Error", description: "Please enter a session ID", variant: "destructive" })
      return
    }
    window.open(`/purchase-success?session_id=${sessionId.trim()}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Purchase Flow Debug Tool
            </CardTitle>
            <CardDescription>Test the manual purchase verification system step by step</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Stripe Session ID</Label>
              <div className="flex gap-2">
                <Input
                  id="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="cs_live_..."
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={copySessionId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Button
                onClick={testSimpleAPI}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                1. Test API
              </Button>

              <Button
                onClick={testStripeLookup}
                disabled={loading || !sessionId.trim()}
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                2. Test Stripe
              </Button>

              <Button
                onClick={testFullVerification}
                disabled={loading || !sessionId.trim()}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                3. Full Verify
              </Button>

              <Button
                onClick={openSuccessPage}
                disabled={!sessionId.trim()}
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
                <ExternalLink className="h-4 w-4" />
                4. Success Page
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Test Results
                <Badge variant={results.success ? "default" : "destructive"}>{results.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="formatted" className="w-full">
                <TabsList>
                  <TabsTrigger value="formatted">Formatted</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="formatted" className="space-y-4">
                  {results.type === "simple_api" && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">API Connectivity Test</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Success:</span>{" "}
                          <span className={results.success ? "text-green-600" : "text-red-600"}>
                            {results.success ? "Yes" : "No"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Environment:</span>{" "}
                          <span className="font-mono">{results.data?.environment}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {results.type === "stripe_lookup" && results.data?.session && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Stripe Session Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">ID:</span>{" "}
                          <span className="font-mono text-xs">{results.data.session.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>{" "}
                          <Badge variant={results.data.session.status === "complete" ? "default" : "secondary"}>
                            {results.data.session.status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Payment:</span>{" "}
                          <Badge variant={results.data.session.payment_status === "paid" ? "default" : "destructive"}>
                            {results.data.session.payment_status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Mode:</span>{" "}
                          <span className="font-mono">{results.data.session.mode}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Amount:</span>{" "}
                          <span className="font-mono">
                            {results.data.session.amount_total
                              ? `$${(results.data.session.amount_total / 100).toFixed(2)}`
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Environment:</span>{" "}
                          <Badge variant={results.data.environment?.stripeKeyType === "live" ? "default" : "secondary"}>
                            {results.data.environment?.stripeKeyType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {results.type === "full_verification" && results.data?.purchase && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Purchase Verification</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Purchase ID:</span>{" "}
                          <span className="font-mono text-xs">{results.data.purchase.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Item Type:</span>{" "}
                          <span className="capitalize">{results.data.purchase.itemType?.replace("_", " ")}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Already Processed:</span>{" "}
                          <span className={results.data.alreadyProcessed ? "text-orange-600" : "text-green-600"}>
                            {results.data.alreadyProcessed ? "Yes" : "No"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Method:</span>{" "}
                          <span className="font-mono text-xs">{results.data.verificationMethod}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="raw">
                  <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
                    {JSON.stringify(results.data, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Debug Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">1</Badge>
              <span>Test basic API connectivity (no auth, no Stripe)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">2</Badge>
              <span>Test direct Stripe session lookup (no Firebase, no purchase creation)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">3</Badge>
              <span>Test full verification flow (creates purchase, grants access)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">4</Badge>
              <span>Test the actual user experience (opens success page)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
