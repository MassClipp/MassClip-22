"use client"

import { useEffect, useState } from "react"
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
  Bug,
  Settings,
  ArrowLeft,
  Copy,
  Info,
  CreditCard,
  User,
  Package,
} from "lucide-react"
import Link from "next/link"

interface CheckoutDebugResult {
  success?: boolean
  error?: string
  code?: string
  details?: any
  bundle?: any
  creator?: any
  user?: any
  stripeStatus?: any
  recommendations?: string[]
  timestamp?: string
}

export default function DebugCheckoutSessionPage() {
  const { toast } = useToast()
  const { user } = useFirebaseAuth()
  const searchParams = useSearchParams()
  const [bundleId, setBundleId] = useState(searchParams?.get("bundleId") || "")
  const [debugResult, setDebugResult] = useState<CheckoutDebugResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoDebugComplete, setAutoDebugComplete] = useState(false)

  // Auto-debug if bundleId is provided in URL
  useEffect(() => {
    if (bundleId && !autoDebugComplete && user) {
      debugCheckoutSession()
      setAutoDebugComplete(true)
    }
  }, [bundleId, autoDebugComplete, user])

  const debugCheckoutSession = async () => {
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

      // Get the Firebase ID token
      let idToken = null
      if (user) {
        try {
          idToken = await user.getIdToken()
        } catch (error) {
          console.error("Failed to get ID token:", error)
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      // Add authorization header if we have a token
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`
      }

      const response = await fetch("/api/debug/checkout-session", {
        method: "POST",
        headers,
        body: JSON.stringify({
          bundleId: bundleId.trim(),
          userId: user?.uid, // Also send userId in body as backup
        }),
      })

      const data = await response.json()
      setDebugResult(data)

      if (response.ok) {
        toast({
          title: "Debug Complete",
          description: "Checkout session debug information retrieved",
        })
      } else {
        toast({
          title: "Debug Failed",
          description: data.error || "Failed to debug checkout session",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error debugging checkout session:", error)
      toast({
        title: "Error",
        description: "Failed to debug checkout session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
      case "ALREADY_PURCHASED":
        return "border-blue-500/30 bg-blue-500/10"
      case "BUNDLE_INACTIVE":
        return "border-purple-500/30 bg-purple-500/10"
      case "INVALID_PRICE":
        return "border-pink-500/30 bg-pink-500/10"
      default:
        return "border-gray-500/30 bg-gray-500/10"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="sm" className="border-gray-600 bg-transparent">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Checkout Session Debug</h1>
            <p className="text-gray-400">Diagnose checkout session creation issues</p>
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

        {/* Bundle Debug Input */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-white">Debug Checkout Session</CardTitle>
            </div>
            <CardDescription>Enter a bundle ID to debug checkout session creation</CardDescription>
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

            <Button
              onClick={debugCheckoutSession}
              disabled={loading || !bundleId.trim() || !user}
              className="w-full bg-amber-600 hover:bg-amber-700 text-black"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Debugging...
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4 mr-2" />
                  Debug Checkout Session
                </>
              )}
            </Button>

            {!user && (
              <Alert className="border-yellow-500/30 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertTitle className="text-yellow-400">Authentication Required</AlertTitle>
                <AlertDescription className="text-yellow-300">
                  You need to be logged in to debug checkout sessions.{" "}
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
            <CardContent className="space-y-6">
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

              {/* Bundle Information */}
              {debugResult.bundle && (
                <div className="space-y-3">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Bundle Information
                  </h4>
                  <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Title:</span>
                        <span className="text-white ml-2">{debugResult.bundle.title}</span>
                      </div>
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
                      <div>
                        <span className="text-gray-400">Creator ID:</span>
                        <code className="text-white ml-2 bg-gray-600 px-1 rounded text-xs">
                          {debugResult.bundle.creatorId}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Creator Information */}
              {debugResult.creator && (
                <div className="space-y-3">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Creator Information
                  </h4>
                  <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Username:</span>
                        <span className="text-white ml-2">{debugResult.creator.username}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Stripe Account:</span>
                        <span className="text-white ml-2">
                          {debugResult.creator.hasStripeAccount ? "Connected" : "Not Connected"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Onboarding:</span>
                        <span className="text-white ml-2">
                          {debugResult.creator.onboardingComplete ? "Complete" : "Incomplete"}
                        </span>
                      </div>
                      {debugResult.creator.stripeAccountId && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Account ID:</span>
                          <code className="text-white ml-2 bg-gray-600 px-1 rounded text-xs">
                            {debugResult.creator.stripeAccountId}
                          </code>
                        </div>
                      )}
                    </div>
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

              {/* Raw Debug Data */}
              <details className="bg-gray-700/50 rounded-lg">
                <summary className="p-4 cursor-pointer text-white font-medium">View Raw Debug Data</summary>
                <pre className="p-4 text-xs text-gray-300 overflow-auto max-h-60 bg-gray-800/50">
                  {JSON.stringify(debugResult, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Common Issues Guide */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-white">Common Checkout Issues</CardTitle>
            </div>
            <CardDescription>Quick fixes for common checkout problems</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h5 className="text-red-400 font-medium mb-2">Bundle Not Found (404)</h5>
                <p className="text-red-300 text-sm mb-2">The bundle ID doesn't exist in the database.</p>
                <ul className="text-red-300/80 text-sm space-y-1 ml-4 list-disc">
                  <li>Verify the bundle ID is correct</li>
                  <li>Check if the bundle was deleted</li>
                  <li>Ensure you're using the right collection (productBoxes vs bundles)</li>
                </ul>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <h5 className="text-yellow-400 font-medium mb-2">No Stripe Account</h5>
                <p className="text-yellow-300 text-sm mb-2">Creator hasn't set up Stripe payments.</p>
                <ul className="text-yellow-300/80 text-sm space-y-1 ml-4 list-disc">
                  <li>Creator needs to complete Stripe onboarding</li>
                  <li>Check stripeAccountId and stripeOnboardingComplete fields</li>
                  <li>Verify Stripe Connect integration</li>
                </ul>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h5 className="text-blue-400 font-medium mb-2">Already Purchased</h5>
                <p className="text-blue-300 text-sm mb-2">User already owns this content.</p>
                <ul className="text-blue-300/80 text-sm space-y-1 ml-4 list-disc">
                  <li>Check user's purchases collection</li>
                  <li>Redirect to content instead of checkout</li>
                  <li>Consider offering different bundles</li>
                </ul>
              </div>

              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <h5 className="text-purple-400 font-medium mb-2">Bundle Inactive</h5>
                <p className="text-purple-300 text-sm mb-2">Bundle is disabled or not ready for sale.</p>
                <ul className="text-purple-300/80 text-sm space-y-1 ml-4 list-disc">
                  <li>Check the 'active' field in bundle data</li>
                  <li>Verify bundle has content</li>
                  <li>Ensure pricing is set correctly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
