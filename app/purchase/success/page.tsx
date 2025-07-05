"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { CheckCircle, Loader2, AlertCircle, ArrowRight, Download, RefreshCw, Bug, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface PurchaseDetails {
  id: string
  productBoxId: string
  itemTitle: string
  itemDescription?: string
  amount: number
  currency: string
  sessionId: string
  thumbnailUrl?: string
  purchasedAt: Date
  status: string
}

interface DebugInfo {
  session?: any
  error?: string
  environment?: any
}

export default function PurchaseSuccessPage() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [showDebug, setShowDebug] = useState(false)

  const sessionId = searchParams.get("session_id")

  const debugSession = async () => {
    if (!sessionId) return

    try {
      console.log("🔍 [Debug] Fetching session debug info...")
      const response = await fetch("/api/debug/stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("✅ [Debug] Session debug info retrieved:", data)
        setDebugInfo(data)
      } else {
        console.error("❌ [Debug] Session debug failed:", data)
        setDebugInfo({ error: data.error || "Debug failed" })
      }
    } catch (error) {
      console.error("❌ [Debug] Debug session failed:", error)
      setDebugInfo({ error: "Failed to fetch debug info" })
    }
  }

  const verifyPurchase = async () => {
    if (!sessionId) {
      setError("Missing session ID in URL")
      setLoading(false)
      return
    }

    if (authLoading || !user) {
      // Wait for auth to complete
      return
    }

    try {
      console.log("🔍 [Purchase Success] Verifying purchase:", {
        sessionId: sessionId.substring(0, 20) + "...",
        attempt: retryCount + 1,
        userId: user.uid,
      })

      const idToken = await user.getIdToken()

      const response = await fetch("/api/purchase/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          sessionId,
          idToken,
        }),
      })

      console.log("📡 [Purchase Success] Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Verification failed" }))
        console.error("❌ [Purchase Success] Error response:", errorData)

        // Automatically fetch debug info on error
        await debugSession()

        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ [Purchase Success] Purchase verified:", data)

      setPurchaseDetails(data.purchase)
      setError(null)

      // Show success toast
      toast({
        title: "Purchase Verified!",
        description: "Your payment has been confirmed and content is now available.",
      })
    } catch (error) {
      console.error("❌ [Purchase Success] Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to verify purchase"
      setError(errorMessage)

      // Show error toast
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      verifyPurchase()
    } else if (!authLoading && !user) {
      setError("Please log in to verify your purchase")
      setLoading(false)
    }
  }, [sessionId, authLoading, user, retryCount])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setDebugInfo(null)
    setRetryCount((prev) => prev + 1)
  }

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      toast({
        title: "Copied!",
        description: "Session ID copied to clipboard",
      })
    }
  }

  const copyDebugInfo = () => {
    if (debugInfo) {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
      toast({
        title: "Copied!",
        description: "Debug info copied to clipboard",
      })
    }
  }

  if (authLoading || (loading && !purchaseDetails)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-light text-white mb-2">
            {authLoading ? "Authenticating..." : "Verifying your purchase..."}
          </h2>
          <p className="text-gray-400">Please wait while we confirm your payment</p>
          {retryCount > 0 && <p className="text-gray-500 text-sm mt-2">Attempt {retryCount + 1}</p>}
          {sessionId && (
            <p className="text-gray-600 text-xs mt-2 font-mono">Session: {sessionId.substring(0, 20)}...</p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border border-red-500/30">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-white text-2xl">Purchase Verification Failed</CardTitle>
            <CardDescription className="text-gray-400 text-lg">{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4">
                Don't worry! Your payment was likely successful. You can try verifying again or check your purchases.
              </p>
              {sessionId && (
                <div className="bg-gray-800/50 rounded-lg p-3 mb-4 flex items-center justify-between">
                  <p className="text-gray-500 text-xs font-mono">Session: {sessionId.substring(0, 30)}...</p>
                  <Button onClick={copySessionId} size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {debugInfo && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-400 text-sm font-medium">Debug Information</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowDebug(!showDebug)} size="sm" variant="ghost" className="text-xs">
                      {showDebug ? "Hide" : "Show"}
                    </Button>
                    <Button onClick={copyDebugInfo} size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {showDebug && (
                  <pre className="text-xs text-gray-300 overflow-auto max-h-60 bg-gray-900/50 p-3 rounded">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={debugSession}
                className="w-full bg-amber-600 hover:bg-amber-700 text-black"
                variant="outline"
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug Session
              </Button>
              <Button
                asChild
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                <Link href="/dashboard/purchases">View My Purchases</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-800/30 border-gray-700/50 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center border border-green-500/30 shadow-lg">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <CardTitle className="text-3xl font-light text-white mb-2">Purchase Successful!</CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Thank you for your purchase. You now have access to premium content.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {purchaseDetails && (
            <div className="bg-gray-800/30 rounded-lg p-6 space-y-4 border border-gray-700/30">
              <h3 className="text-xl font-medium text-white">Purchase Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Product:</span>
                  <p className="text-white font-medium">{purchaseDetails.itemTitle}</p>
                </div>
                <div>
                  <span className="text-gray-400">Amount:</span>
                  <p className="text-white font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: purchaseDetails.currency.toUpperCase(),
                    }).format(purchaseDetails.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Transaction ID:</span>
                  <p className="text-white font-mono text-xs">{purchaseDetails.sessionId}</p>
                </div>
                <div>
                  <span className="text-gray-400">Purchase Date:</span>
                  <p className="text-white font-medium">{new Date(purchaseDetails.purchasedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium"
            >
              <Link href={`/product-box/${purchaseDetails?.productBoxId}/content`}>
                <Download className="h-4 w-4 mr-2" />
                Access Content
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 border-gray-600 hover:bg-gray-700 text-white bg-transparent"
            >
              <Link href="/dashboard/purchases">
                <ArrowRight className="h-4 w-4 mr-2" />
                View All Purchases
              </Link>
            </Button>
          </div>

          <div className="text-center pt-4 border-t border-gray-700/50">
            <p className="text-gray-400 text-sm">
              A receipt has been sent to your email address. If you have any issues accessing your content,{" "}
              <Link href="/support" className="text-amber-400 hover:text-amber-300 underline">
                contact support
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
