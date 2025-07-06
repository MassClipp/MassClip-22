"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { CheckCircle, Loader2, AlertCircle, Download, RefreshCw, Bug, Copy, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  stripeError?: any
  recommendation?: string
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
  const [isTestLiveMismatch, setIsTestLiveMismatch] = useState(false)

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
        setDebugInfo({
          error: data.error || "Debug failed",
          recommendation: data.recommendation,
          environment: data.environment,
        })

        if (data.error?.includes("Test/Live mode mismatch")) {
          setIsTestLiveMismatch(true)
        }
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

        if (errorData.error?.includes("Test/Live Mode Mismatch")) {
          setIsTestLiveMismatch(true)
        }

        await debugSession()

        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ [Purchase Success] Purchase verified:", data)

      setPurchaseDetails(data.purchase)
      setError(null)

      toast({
        title: "Purchase Verified!",
        description: "Your payment has been confirmed and content is now available.",
      })
    } catch (error) {
      console.error("❌ [Purchase Success] Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to verify purchase"
      setError(errorMessage)

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
    setIsTestLiveMismatch(false)
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-white animate-spin mx-auto" />
          <h2 className="text-xl font-light text-white mb-2">
            {authLoading ? "Authenticating..." : "Verifying purchase..."}
          </h2>
          <p className="text-gray-400 text-sm">Please wait</p>
          {retryCount > 0 && <p className="text-gray-500 text-xs mt-2">Attempt {retryCount + 1}</p>}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Error Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white mb-2">Purchase Verification Failed</h1>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          </div>

          {/* Configuration Warning */}
          {isTestLiveMismatch && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400 font-medium text-sm">Configuration Issue</span>
              </div>
              <p className="text-amber-300/80 text-sm">
                Stripe test/live mode mismatch detected. Check your configuration.
              </p>
              <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-black text-xs">
                <Link href="/debug-stripe-config">
                  <Settings className="h-3 w-3 mr-1" />
                  Check Config
                </Link>
              </Button>
            </div>
          )}

          {/* Reassurance */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Don't worry! Your payment was likely successful. You can try verifying again or check your purchases.
            </p>
          </div>

          {/* Session ID */}
          {sessionId && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Session ID</span>
                <Button onClick={copySessionId} size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <code className="text-gray-300 text-xs break-all">{sessionId}</code>
            </div>
          )}

          {/* Debug Info */}
          {debugInfo && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400 text-sm font-medium">Debug Info</span>
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

              {debugInfo.recommendation && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                  <p className="text-blue-300 text-sm">
                    <strong>Recommendation:</strong> {debugInfo.recommendation}
                  </p>
                </div>
              )}

              {showDebug && (
                <pre className="text-xs text-gray-300 overflow-auto max-h-40 bg-black/50 p-3 rounded">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full bg-white hover:bg-gray-100 text-black h-12 rounded-lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={debugSession}
              variant="ghost"
              className="w-full text-gray-400 hover:text-white hover:bg-gray-800/50 h-10 rounded-lg"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug Session
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full text-gray-400 hover:text-white hover:bg-gray-800/50 h-10 rounded-lg"
            >
              <Link href="/dashboard/purchases">View Purchases</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // SUCCESS STATE - New minimal design
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Success Icon */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Payment Successful</h1>
          <p className="text-gray-400 text-sm">Your content is now available</p>
        </div>

        {/* Purchase Details */}
        {purchaseDetails && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-gray-400 text-sm">Product</span>
              <span className="text-white text-sm font-medium text-right max-w-[200px]">
                {purchaseDetails.itemTitle}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Amount</span>
              <span className="text-white text-sm font-medium">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: purchaseDetails.currency.toUpperCase(),
                }).format(purchaseDetails.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Date</span>
              <span className="text-white text-sm font-medium">
                {new Date(purchaseDetails.purchasedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button asChild className="w-full bg-white hover:bg-gray-100 text-black font-medium h-12 rounded-lg">
            <Link href={`/product-box/${purchaseDetails?.productBoxId}/content`}>
              <Download className="h-4 w-4 mr-2" />
              Access Content
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="w-full text-gray-400 hover:text-white hover:bg-gray-800/50 h-10 rounded-lg"
          >
            <Link href="/dashboard/purchases">View All Purchases</Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-gray-800">
          <p className="text-gray-500 text-xs">
            Receipt sent to your email • Need help?{" "}
            <Link href="/support" className="text-gray-400 hover:text-white underline">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
