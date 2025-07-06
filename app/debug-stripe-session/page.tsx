"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  CreditCard,
  Settings,
  Bug,
  Zap,
} from "lucide-react"

interface StripeConfig {
  hasStripeKey: boolean
  keyType: "test" | "live" | "unknown"
  keyPrefix: string
  environment: string
}

interface SessionDebugResult {
  success: boolean
  session?: any
  error?: string
  recommendations?: string[]
}

interface CheckoutTestResult {
  success: boolean
  sessionId?: string
  checkoutUrl?: string
  error?: string
  details?: any
}

export default function DebugStripeSessionPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null)
  const [sessionDebugResult, setSessionDebugResult] = useState<SessionDebugResult | null>(null)
  const [checkoutTestResult, setCheckoutTestResult] = useState<CheckoutTestResult | null>(null)
  const [testProductBoxId, setTestProductBoxId] = useState("test-product-box-id")

  // Auto-populate session ID from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionIdFromUrl = urlParams.get("session_id")
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl)
    }
  }, [])

  // Load Stripe configuration on mount
  useEffect(() => {
    loadStripeConfig()
  }, [])

  const loadStripeConfig = async () => {
    try {
      const response = await fetch("/api/debug/environment-info")
      if (response.ok) {
        const data = await response.json()
        setStripeConfig(data.stripe)
      }
    } catch (error) {
      console.error("Failed to load Stripe config:", error)
    }
  }

  const debugSession = async () => {
    if (!sessionId.trim()) {
      toast({
        title: "Session ID Required",
        description: "Please enter a session ID to debug",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/debug/stripe-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })

      const result = await response.json()
      setSessionDebugResult(result)

      if (result.success) {
        toast({
          title: "Session Found",
          description: "Session details loaded successfully",
        })
      } else {
        toast({
          title: "Session Debug Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Debug session error:", error)
      toast({
        title: "Debug Failed",
        description: "Failed to debug session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testCheckoutCreation = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/test-checkout-creation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productBoxId: testProductBoxId,
          testMode: true,
        }),
      })

      const result = await response.json()
      setCheckoutTestResult(result)

      if (result.success) {
        toast({
          title: "Checkout Test Successful",
          description: "Test checkout session created successfully",
        })
        // Auto-populate the session ID for debugging
        if (result.sessionId) {
          setSessionId(result.sessionId)
        }
      } else {
        toast({
          title: "Checkout Test Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Checkout test error:", error)
      toast({
        title: "Test Failed",
        description: "Failed to test checkout creation",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500" />
    )
  }

  const getStatusColor = (success: boolean) => {
    return success ? "text-green-600" : "text-red-600"
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Bug className="h-8 w-8 text-blue-400" />
            Stripe Session Debugger
          </h1>
          <p className="text-gray-400">Debug Stripe checkout sessions and configuration issues</p>
        </div>

        {/* Stripe Configuration Panel */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              Stripe Configuration
              <Button variant="ghost" size="sm" onClick={loadStripeConfig} className="ml-auto">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stripeConfig ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-400">Stripe Key Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(stripeConfig.hasStripeKey)}
                    <span className={getStatusColor(stripeConfig.hasStripeKey)}>
                      {stripeConfig.hasStripeKey ? "Configured" : "Missing"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-400">Key Type</Label>
                  <Badge variant={stripeConfig.keyType === "test" ? "secondary" : "default"}>
                    {stripeConfig.keyType.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-400">Key Prefix</Label>
                  <code className="text-sm bg-gray-700 px-2 py-1 rounded">{stripeConfig.keyPrefix}</code>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-400">Environment</Label>
                  <Badge variant="outline">{stripeConfig.environment}</Badge>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading configuration...
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checkout Creation Test */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                Checkout Creation Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testProductBoxId">Test Product Box ID</Label>
                <Input
                  id="testProductBoxId"
                  value={testProductBoxId}
                  onChange={(e) => setTestProductBoxId(e.target.value)}
                  placeholder="Enter product box ID to test"
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <Button
                onClick={testCheckoutCreation}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Test Checkout Creation
                  </>
                )}
              </Button>

              {checkoutTestResult && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(checkoutTestResult.success)}
                    <span className={`font-medium ${getStatusColor(checkoutTestResult.success)}`}>
                      {checkoutTestResult.success ? "Test Successful" : "Test Failed"}
                    </span>
                  </div>

                  {checkoutTestResult.success ? (
                    <div className="space-y-2 text-sm">
                      {checkoutTestResult.sessionId && (
                        <div>
                          <span className="text-gray-400">Session ID:</span>
                          <code className="ml-2 bg-gray-600 px-2 py-1 rounded text-xs">
                            {checkoutTestResult.sessionId}
                          </code>
                        </div>
                      )}
                      {checkoutTestResult.checkoutUrl && (
                        <div>
                          <span className="text-gray-400">Checkout URL:</span>
                          <a
                            href={checkoutTestResult.checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                          >
                            Open Checkout <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-400">{checkoutTestResult.error}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Debug Tool */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-orange-400" />
                Session Debug Tool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionId">Stripe Session ID</Label>
                <Input
                  id="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="cs_test_... or cs_live_..."
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <Button
                onClick={debugSession}
                disabled={loading || !sessionId.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Debugging...
                  </>
                ) : (
                  <>
                    <Bug className="h-4 w-4 mr-2" />
                    Debug Session
                  </>
                )}
              </Button>

              {sessionDebugResult && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(sessionDebugResult.success)}
                    <span className={`font-medium ${getStatusColor(sessionDebugResult.success)}`}>
                      {sessionDebugResult.success ? "Session Found" : "Session Not Found"}
                    </span>
                  </div>

                  {sessionDebugResult.success && sessionDebugResult.session ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <Badge
                          className="ml-2"
                          variant={sessionDebugResult.session.status === "complete" ? "default" : "secondary"}
                        >
                          {sessionDebugResult.session.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-400">Amount:</span>
                        <span className="ml-2 text-green-400">
                          ${(sessionDebugResult.session.amount_total / 100).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Payment Status:</span>
                        <span className="ml-2">{sessionDebugResult.session.payment_status}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm text-red-400">{sessionDebugResult.error}</div>
                      {sessionDebugResult.recommendations && (
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-gray-300">Recommendations:</span>
                          <ul className="text-sm text-gray-400 space-y-1">
                            {sessionDebugResult.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" asChild>
                <a href="https://dashboard.stripe.com/test/payments" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Stripe Test Dashboard
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://dashboard.stripe.com/test/logs" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Stripe Logs
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/dashboard/stripe-test" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Internal Stripe Test
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Common Issues Guide */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <h4 className="font-medium text-red-400 mb-2">404 Session Not Found</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Check if you're using test keys with live session IDs (or vice versa)</li>
                  <li>• Verify the session was created successfully</li>
                  <li>• Sessions expire after 24 hours</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <h4 className="font-medium text-yellow-400 mb-2">Checkout Creation Failed</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Verify Stripe secret key is correctly set</li>
                  <li>• Check product data and pricing</li>
                  <li>• Ensure success/cancel URLs are valid</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-2">Test vs Live Mode</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Test keys start with sk_test_</li>
                  <li>• Live keys start with sk_live_</li>
                  <li>• Test and live data are completely separate</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
