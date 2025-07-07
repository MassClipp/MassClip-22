"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Settings,
  ArrowLeft,
  Copy,
  Info,
  User,
  Package,
  DollarSign,
  Zap,
} from "lucide-react"
import Link from "next/link"

interface StripeDebugResult {
  success?: boolean
  error?: string
  code?: string
  details?: any
  bundle?: any
  creator?: any
  user?: any
  stripeConfig?: any
  checkoutSession?: any
  recommendations?: string[]
  timestamp?: string
  logs?: string[]
}

export default function DebugStripeCheckoutPage() {
  const { toast } = useToast()
  const { user } = useFirebaseAuth()
  const searchParams = useSearchParams()
  const [bundleId, setBundleId] = useState(searchParams?.get("bundleId") || "")
  const [debugResult, setDebugResult] = useState<StripeDebugResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [testingCheckout, setTestingCheckout] = useState(false)

  const debugStripeCheckout = async () => {
    if (!bundleId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bundle ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      setDebugResult(null)

      const response = await fetch("/api/debug/stripe-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bundleId: bundleId.trim() }),
      })

      const data = await response.json()
      setDebugResult(data)

      if (response.ok) {
        toast({
          title: "Debug Complete",
          description: "Stripe checkout debug information retrieved",
        })
      } else {
        toast({
          title: "Debug Failed",
          description: data.error || "Failed to debug Stripe checkout",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error debugging Stripe checkout:", error)
      toast({
        title: "Error",
        description: "Failed to debug Stripe checkout",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testCheckoutFlow = async () => {
    if (!bundleId.trim() || !user) {
      toast({
        title: "Error",
        description: "Bundle ID and authentication required",
        variant: "destructive",
      })
      return
    }

    try {
      setTestingCheckout(true)

      const idToken = await user.getIdToken()
      const response = await fetch(`/api/creator/product-boxes/${bundleId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
          debug: true,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Checkout Test Successful",
          description: "Checkout session created successfully",
        })

        // Update debug result with checkout session info
        setDebugResult((prev) => ({
          ...prev,
          checkoutSession: {
            sessionId: data.sessionId,
            url: data.url,
            success: true,
          },
        }))
      } else {
        toast({
          title: "Checkout Test Failed",
          description: data.error || "Failed to create checkout session",
          variant: "destructive",
        })

        // Update debug result with error info
        setDebugResult((prev) => ({
          ...prev,
          checkoutSession: {
            error: data.error,
            code: data.code,
            success: false,
          },
        }))
      }
    } catch (error) {
      console.error("Error testing checkout:", error)
      toast({
        title: "Error",
        description: "Failed to test checkout flow",
        variant: "destructive",
      })
    } finally {
      setTestingCheckout(false)
    }
  }

  const copyBundleId = () => {
    navigator.clipboard.writeText(bundleId)
    toast({
      title: "Copied!",
      description: "Bundle ID copied to clipboard",
    })
  }

  const copyDebugResult = () => {
    if (debugResult) {
      navigator.clipboard.writeText(JSON.stringify(debugResult, null, 2))
      toast({
        title: "Copied!",
        description: "Debug result copied to clipboard",
      })
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getErrorColor = (code?: string) => {
    switch (code) {
      case "BUNDLE_NOT_FOUND":
        return "border-red-500/30 bg-red-500/10"
      case "CREATOR_NOT_FOUND":
        return "border-orange-500/30 bg-orange-500/10"
      case "NO_STRIPE_ACCOUNT":
        return "border-yellow-500/30 bg-yellow-500/10"
      case "STRIPE_CONFIG_ERROR":
        return "border-purple-500/30 bg-purple-500/10"
      case "CHECKOUT_CREATION_FAILED":
        return "border-pink-500/30 bg-pink-500/10"
      default:
        return "border-gray-500/30 bg-gray-500/10"
    }
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
            <h1 className="text-3xl font-bold text-white">Stripe Checkout Debug</h1>
            <p className="text-gray-400">Diagnose and fix Stripe checkout issues</p>
          </div>
        </div>

        {/* User Status */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white">Authentication Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(!!user)}
              <span className="text-white">{user ? `Authenticated as ${user.email}` : "Not authenticated"}</span>
            </div>
            {user && (
              <div className="mt-2 text-sm text-gray-400">
                User ID: <code className="bg-gray-700 px-1 rounded">{user.uid}</code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Input */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white">Debug Stripe Checkout</CardTitle>
            </div>
            <CardDescription>Enter a bundle ID to debug Stripe checkout flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter bundle ID (e.g., product-qvCtwHlb)"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                onClick={copyBundleId}
                variant="outline"
                size="sm"
                className="border-gray-600 bg-transparent"
                disabled={!bundleId}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={debugStripeCheckout}
                disabled={loading || !bundleId.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Debugging...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Debug Checkout
                  </>
                )}
              </Button>

              <Button
                onClick={testCheckoutFlow}
                disabled={testingCheckout || !bundleId.trim() || !user}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {testingCheckout ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Test Checkout
                  </>
                )}
              </Button>
            </div>

            {!user && (
              <Alert className="border-yellow-500/30 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertTitle className="text-yellow-400">Authentication Required</AlertTitle>
                <AlertDescription className="text-yellow-300">
                  You need to be logged in to test checkout flows.{" "}
                  <Link href="/login" className="underline">
                    Login here
                  </Link>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Debug Results */}
        {debugResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Results */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-green-400" />
                    <CardTitle className="text-white">Debug Results</CardTitle>
                  </div>
                  <Button
                    onClick={copyDebugResult}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 bg-transparent"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall Status */}
                <div className="flex items-center gap-2">
                  {getStatusIcon(!!debugResult.success)}
                  <span className="text-white font-medium">
                    {debugResult.success ? "Checkout Ready" : "Checkout Failed"}
                  </span>
                  {debugResult.code && (
                    <Badge variant="outline" className="border-red-500 text-red-400">
                      {debugResult.code}
                    </Badge>
                  )}
                </div>

                {/* Error Details */}
                {debugResult.error && (
                  <Alert className={getErrorColor(debugResult.code)}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Details</AlertTitle>
                    <AlertDescription>{debugResult.error}</AlertDescription>
                  </Alert>
                )}

                {/* Stripe Configuration */}
                {debugResult.stripeConfig && (
                  <div className="space-y-3">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Stripe Configuration
                    </h4>
                    <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Environment:</span>
                          <span className="text-white ml-2">{debugResult.stripeConfig.environment}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Key Type:</span>
                          <span className="text-white ml-2">{debugResult.stripeConfig.keyType}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Has Main Key:</span>
                          <span className="text-white ml-2">{debugResult.stripeConfig.hasMainKey ? "Yes" : "No"}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Has Test Key:</span>
                          <span className="text-white ml-2">{debugResult.stripeConfig.hasTestKey ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checkout Session Info */}
                {debugResult.checkoutSession && (
                  <div className="space-y-3">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Checkout Session Test
                    </h4>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      {debugResult.checkoutSession.success ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span>Checkout session created successfully</span>
                          </div>
                          {debugResult.checkoutSession.sessionId && (
                            <div className="text-sm">
                              <span className="text-gray-400">Session ID:</span>
                              <code className="text-white ml-2 bg-gray-600 px-1 rounded text-xs">
                                {debugResult.checkoutSession.sessionId}
                              </code>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-red-400">
                            <XCircle className="h-4 w-4" />
                            <span>Checkout session creation failed</span>
                          </div>
                          {debugResult.checkoutSession.error && (
                            <div className="text-sm text-red-300">{debugResult.checkoutSession.error}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {debugResult.recommendations && debugResult.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Recommendations
                    </h4>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                      <ul className="space-y-2 text-blue-300 text-sm">
                        {debugResult.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bundle & Creator Info */}
            <div className="space-y-6">
              {/* Bundle Information */}
              {debugResult.bundle && (
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-400" />
                      <CardTitle className="text-white">Bundle Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-400 text-sm">Title:</span>
                        <div className="text-white font-medium">{debugResult.bundle.title}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Price:</span>
                          <span className="text-white ml-2">
                            ${debugResult.bundle.price} {debugResult.bundle.currency?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Active:</span>
                          <span className="text-white ml-2">{debugResult.bundle.active ? "Yes" : "No"}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Creator ID:</span>
                        <code className="text-white ml-2 bg-gray-600 px-1 rounded text-xs block mt-1">
                          {debugResult.bundle.creatorId}
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Creator Information */}
              {debugResult.creator && (
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-orange-400" />
                      <CardTitle className="text-white">Creator Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-400 text-sm">Username:</span>
                        <div className="text-white font-medium">{debugResult.creator.username}</div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Stripe Account:</span>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(debugResult.creator.hasStripeAccount)}
                            <span className="text-white">
                              {debugResult.creator.hasStripeAccount ? "Connected" : "Not Connected"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Onboarding:</span>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(debugResult.creator.onboardingComplete)}
                            <span className="text-white">
                              {debugResult.creator.onboardingComplete ? "Complete" : "Incomplete"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {debugResult.creator.stripeAccountId && (
                        <div>
                          <span className="text-gray-400 text-sm">Account ID:</span>
                          <code className="text-white bg-gray-600 px-1 rounded text-xs block mt-1">
                            {debugResult.creator.stripeAccountId}
                          </code>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Debug Logs */}
        {debugResult?.logs && debugResult.logs.length > 0 && (
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Debug Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900/50 rounded-lg p-4 max-h-60 overflow-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">{debugResult.logs.join("\n")}</pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription>Common debugging and fixing actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button asChild variant="outline" className="border-gray-600 bg-transparent">
                <Link href="/debug-bundle-finder">
                  <Package className="h-4 w-4 mr-2" />
                  Find Bundles
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-600 bg-transparent">
                <Link href="/dashboard/connect-stripe">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Stripe Setup
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-600 bg-transparent">
                <Link href="/debug-stripe-config">
                  <Settings className="h-4 w-4 mr-2" />
                  Stripe Config
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-600 bg-transparent">
                <Link href="/dashboard/diagnostics">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Diagnostics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
