"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Bug,
  Settings,
  ArrowLeft,
  ExternalLink,
  Copy,
  Info,
  ShoppingCart,
  Eye,
  Zap,
} from "lucide-react"
import Link from "next/link"

interface StripeConfig {
  stripeKeyExists: boolean
  stripeKeyPrefix: string
  isTestMode: boolean
  isLiveMode: boolean
  environment: string
  timestamp: string
  keyConfiguration: any
}

interface SessionDebugResult {
  success?: boolean
  error?: string
  session?: any
  stripeConfig?: any
  debug?: any
  recommendation?: string
}

interface CheckoutTestResult {
  success?: boolean
  error?: string
  sessionId?: string
  checkoutUrl?: string
  details?: any
}

export default function DebugStripeSessionPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // State for Stripe configuration
  const [config, setConfig] = useState<StripeConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)

  // State for session debugging
  const [sessionId, setSessionId] = useState("")
  const [debugResult, setDebugResult] = useState<SessionDebugResult | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  // State for checkout testing
  const [testProductBoxId, setTestProductBoxId] = useState("test-product-box-id")
  const [checkoutResult, setCheckoutResult] = useState<CheckoutTestResult | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const [lastChecked, setLastChecked] = useState<string>("")

  // Get session ID from URL if present
  useEffect(() => {
    const urlSessionId = searchParams.get("session_id")
    if (urlSessionId) {
      setSessionId(urlSessionId)
      console.log("🔍 [Debug] Session ID from URL:", urlSessionId)
    }
  }, [searchParams])

  const fetchStripeConfig = async () => {
    try {
      setConfigLoading(true)
      console.log("🔍 [Debug] Fetching Stripe configuration...")

      const response = await fetch("/api/debug/stripe-config")
      if (!response.ok) {
        throw new Error("Failed to fetch Stripe configuration")
      }

      const data = await response.json()
      setConfig(data)
      setLastChecked(new Date().toLocaleString())

      console.log("✅ [Debug] Stripe config loaded:", data)
    } catch (error) {
      console.error("❌ [Debug] Config fetch error:", error)
      toast({
        title: "Error",
        description: "Failed to fetch Stripe configuration",
        variant: "destructive",
      })
    } finally {
      setConfigLoading(false)
    }
  }

  const debugSession = async () => {
    if (!sessionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session ID",
        variant: "destructive",
      })
      return
    }

    try {
      setDebugLoading(true)
      setDebugResult(null)

      console.log("🔍 [Debug] Starting session debug:", sessionId.substring(0, 20) + "...")

      const response = await fetch("/api/debug/stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })

      const data = await response.json()
      setDebugResult(data)

      console.log("📊 [Debug] Session debug result:", data)

      if (response.ok && data.success) {
        toast({
          title: "Debug Complete",
          description: "Session found and analyzed successfully",
        })
      } else {
        toast({
          title: "Debug Failed",
          description: data.error || "Failed to debug session",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ [Debug] Session debug error:", error)
      toast({
        title: "Error",
        description: "Failed to debug session",
        variant: "destructive",
      })
    } finally {
      setDebugLoading(false)
    }
  }

  const testCheckoutCreation = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to test checkout creation",
        variant: "destructive",
      })
      return
    }

    try {
      setCheckoutLoading(true)
      setCheckoutResult(null)

      console.log("🛒 [Debug] Testing checkout creation...")

      const idToken = await user.getIdToken()

      const response = await fetch(`/api/creator/product-boxes/${testProductBoxId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          idToken,
        }),
      })

      const data = await response.json()
      setCheckoutResult(data)

      console.log("📊 [Debug] Checkout test result:", data)

      if (response.ok && data.success) {
        toast({
          title: "Checkout Test Successful",
          description: "Session created successfully",
        })

        // Auto-populate the session ID for debugging
        if (data.sessionId) {
          setSessionId(data.sessionId)
        }
      } else {
        toast({
          title: "Checkout Test Failed",
          description: data.error || "Failed to create checkout session",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ [Debug] Checkout test error:", error)
      toast({
        title: "Error",
        description: "Failed to test checkout creation",
        variant: "destructive",
      })
    } finally {
      setCheckoutLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    })
  }

  useEffect(() => {
    fetchStripeConfig()
  }, [])

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="sm" className="border-gray-600 bg-transparent">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Stripe Session Debug Center</h1>
            <p className="text-gray-400">Comprehensive Stripe session and checkout debugging</p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-gray-600 ml-auto bg-transparent">
            <Link href="https://dashboard.stripe.com" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Stripe Dashboard
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Stripe Configuration */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Stripe Configuration</CardTitle>
                </div>
                <CardDescription>Current Stripe environment and key configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {configLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading configuration...</span>
                  </div>
                ) : config ? (
                  <>
                    <div className="flex justify-between items-center">
                      <Button
                        onClick={fetchStripeConfig}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 bg-transparent"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Config
                      </Button>
                      <Badge variant={config.stripeKeyExists ? "default" : "destructive"}>
                        {getStatusIcon(config.stripeKeyExists)}
                        <span className="ml-1">{config.stripeKeyExists ? "Connected" : "Not Connected"}</span>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Key Prefix:</span>
                          <code className="text-white bg-gray-800 px-2 py-1 rounded text-sm">
                            {config.stripeKeyPrefix}
                          </code>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Mode:</span>
                          <Badge variant={config.isLiveMode ? "destructive" : "secondary"}>
                            {config.isLiveMode ? "Live" : config.isTestMode ? "Test" : "Unknown"}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Environment:</span>
                          <span className="text-white">{config.environment}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Last Checked:</span>
                          <span className="text-white text-sm">{lastChecked}</span>
                        </div>
                      </div>

                      {config.keyConfiguration && (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                          <h4 className="text-blue-400 font-medium mb-2">Key Configuration</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-300">Has Main Key:</span>
                              <span className="text-white">{config.keyConfiguration.hasMainKey ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-300">Has Test Key:</span>
                              <span className="text-white">{config.keyConfiguration.hasTestKey ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-300">Active Source:</span>
                              <span className="text-white text-xs">{config.keyConfiguration.activeKeySource}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Configuration Error</AlertTitle>
                    <AlertDescription>Failed to load Stripe configuration</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Checkout Creation Test */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-400" />
                  <CardTitle className="text-white">Checkout Creation Test</CardTitle>
                </div>
                <CardDescription>Test creating a new Stripe checkout session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Product Box ID (optional)"
                    value={testProductBoxId}
                    onChange={(e) => setTestProductBoxId(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                  <Button
                    onClick={() => copyToClipboard(testProductBoxId, "Product Box ID")}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 bg-transparent"
                    disabled={!testProductBoxId}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={testCheckoutCreation}
                  disabled={checkoutLoading || !user}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {checkoutLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Session...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Test Checkout Creation
                    </>
                  )}
                </Button>

                {!user && (
                  <Alert className="border-amber-500/30 bg-amber-500/10">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <AlertTitle className="text-amber-400">Authentication Required</AlertTitle>
                    <AlertDescription className="text-amber-300">
                      Please log in to test checkout session creation
                    </AlertDescription>
                  </Alert>
                )}

                {checkoutResult && (
                  <div className="mt-4 space-y-4">
                    <Separator className="bg-gray-600" />

                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-medium">Checkout Test Results</h4>
                      <Button
                        onClick={() => copyToClipboard(JSON.stringify(checkoutResult, null, 2), "Checkout Result")}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 bg-transparent"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>

                    {checkoutResult.error ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Checkout Creation Failed</AlertTitle>
                        <AlertDescription>{checkoutResult.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-green-500/30 bg-green-500/10">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <AlertTitle className="text-green-400">Checkout Session Created!</AlertTitle>
                        <AlertDescription className="text-green-300">
                          Session ID: <code className="bg-gray-800 px-1 rounded">{checkoutResult.sessionId}</code>
                        </AlertDescription>
                      </Alert>
                    )}

                    {checkoutResult.sessionId && (
                      <div className="bg-gray-700/50 rounded-lg p-4">
                        <h5 className="text-white font-medium mb-2">Session Details:</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Session ID:</span>
                            <code className="text-white bg-gray-800 px-2 py-1 rounded text-xs">
                              {checkoutResult.sessionId}
                            </code>
                          </div>
                          {checkoutResult.checkoutUrl && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Checkout URL:</span>
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-gray-600 bg-transparent text-xs"
                              >
                                <Link href={checkoutResult.checkoutUrl} target="_blank">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Open
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Session Debug */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-amber-400" />
                  <CardTitle className="text-white">Session Debug</CardTitle>
                </div>
                <CardDescription>Debug a specific Stripe checkout session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter session ID (cs_test_... or cs_live_...)"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                  <Button
                    onClick={() => copyToClipboard(sessionId, "Session ID")}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 bg-transparent"
                    disabled={!sessionId}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={debugSession}
                  disabled={debugLoading || !sessionId.trim()}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-black"
                >
                  {debugLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Debugging Session...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Debug Session
                    </>
                  )}
                </Button>

                {debugResult && (
                  <div className="mt-4 space-y-4">
                    <Separator className="bg-gray-600" />

                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-medium">Debug Results</h4>
                      <Button
                        onClick={() => copyToClipboard(JSON.stringify(debugResult, null, 2), "Debug Result")}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 bg-transparent"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>

                    {debugResult.error ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Session Debug Failed</AlertTitle>
                        <AlertDescription>{debugResult.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-green-500/30 bg-green-500/10">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <AlertTitle className="text-green-400">Session Found!</AlertTitle>
                        <AlertDescription className="text-green-300">
                          Session retrieved and analyzed successfully
                        </AlertDescription>
                      </Alert>
                    )}

                    {debugResult.debug && (
                      <div className="bg-gray-700/50 rounded-lg p-4">
                        <h5 className="text-white font-medium mb-3">Session Analysis:</h5>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Session ID:</span>
                            <code className="text-white bg-gray-800 px-2 py-1 rounded text-xs">
                              {debugResult.debug.sessionId}
                            </code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <Badge variant={debugResult.debug.status === "complete" ? "default" : "secondary"}>
                              {debugResult.debug.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Payment Status:</span>
                            <Badge variant={debugResult.debug.payment_status === "paid" ? "default" : "secondary"}>
                              {debugResult.debug.payment_status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Mode:</span>
                            <Badge variant={debugResult.debug.stripeMode === "live" ? "destructive" : "secondary"}>
                              {debugResult.debug.stripeMode}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Key Used:</span>
                            <span className="text-white text-xs">{debugResult.debug.keyUsed}</span>
                          </div>
                          {debugResult.debug.created && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Created:</span>
                              <span className="text-white text-xs">
                                {new Date(debugResult.debug.created).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {debugResult.debug.expires_at && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Expires:</span>
                              <span className="text-white text-xs">
                                {new Date(debugResult.debug.expires_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {debugResult.recommendation && (
                      <Alert className="border-blue-500/30 bg-blue-500/10">
                        <Info className="h-4 w-4 text-blue-400" />
                        <AlertTitle className="text-blue-400">Recommendation</AlertTitle>
                        <AlertDescription className="text-blue-300">{debugResult.recommendation}</AlertDescription>
                      </Alert>
                    )}

                    <details className="bg-gray-700/50 rounded-lg">
                      <summary className="p-4 cursor-pointer text-white font-medium">View Raw Debug Data</summary>
                      <pre className="p-4 text-xs text-gray-300 overflow-auto max-h-60 bg-gray-800/50">
                        {JSON.stringify(debugResult, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-400" />
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </div>
                <CardDescription>Common debugging actions and links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 bg-transparent text-gray-300 hover:text-white"
                >
                  <Link href="/debug-stripe-config">
                    <Settings className="h-4 w-4 mr-2" />
                    Full Stripe Config Debug
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 bg-transparent text-gray-300 hover:text-white"
                >
                  <Link href="/dashboard/purchases">
                    <Eye className="h-4 w-4 mr-2" />
                    View My Purchases
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 bg-transparent text-gray-300 hover:text-white"
                >
                  <Link href="https://dashboard.stripe.com/test/payments" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Test Dashboard
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 bg-transparent text-gray-300 hover:text-white"
                >
                  <Link href="https://dashboard.stripe.com/logs" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe API Logs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Common Issues Guide */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white">Common Issues & Solutions</CardTitle>
            </div>
            <CardDescription>Troubleshoot common Stripe session problems</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-400 font-medium mb-2">Session Not Found (404)</h4>
              <ul className="text-red-300/80 text-sm space-y-1 list-disc ml-4">
                <li>Session was never created</li>
                <li>Session expired (24 hour limit)</li>
                <li>Wrong Stripe account</li>
                <li>Test/live mode mismatch</li>
              </ul>
            </div>

            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-400 font-medium mb-2">Mode Mismatch</h4>
              <ul className="text-amber-300/80 text-sm space-y-1 list-disc ml-4">
                <li>Test key with live session</li>
                <li>Live key with test session</li>
                <li>Environment variable issues</li>
                <li>Preview vs production config</li>
              </ul>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">Configuration Issues</h4>
              <ul className="text-blue-300/80 text-sm space-y-1 list-disc ml-4">
                <li>Missing environment variables</li>
                <li>Invalid API keys</li>
                <li>Webhook configuration</li>
                <li>Network connectivity</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
