"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { CheckCircle, Loader2, AlertCircle, ArrowRight, Download, RefreshCw, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function PurchaseSuccessPage() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const sessionId = searchParams.get("session_id")

  const debugSession = async () => {
    if (!sessionId) return

    try {
      const response = await fetch("/api/debug/stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })

      if (response.ok) {
        const data = await response.json()
        setDebugInfo(JSON.stringify(data.session, null, 2))
      }
    } catch (error) {
      console.error("Debug session failed:", error)
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
      console.log("🔍 [Purchase Success] Verifying purchase:", { sessionId, attempt: retryCount + 1 })

      const idToken = await user.getIdToken()

      const response = await fetch("/api/verify-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

        // If it's a metadata issue, try to debug the session
        if (errorData.error?.includes("metadata") || errorData.error?.includes("Product information")) {
          await debugSession()
        }

        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ [Purchase Success] Purchase verified:", data)

      setPurchaseDetails(data.purchase)
      setError(null)
    } catch (error) {
      console.error("❌ [Purchase Success] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to verify purchase")
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

  if (authLoading || (loading && !purchaseDetails)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-light text-white mb-2">
            {authLoading ? "Authenticating..." : "Verifying your purchase..."}
          </h2>
          <p className="text-zinc-400">Please wait while we confirm your payment</p>
          {retryCount > 0 && <p className="text-zinc-500 text-sm mt-2">Attempt {retryCount + 1}</p>}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-zinc-900/90 border-zinc-800">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-white">Purchase Verification Failed</CardTitle>
            <CardDescription className="text-zinc-400">{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-zinc-400 text-sm mb-4">
                Don't worry! Your payment was likely successful. You can try verifying again or check your purchases.
              </p>
              {sessionId && (
                <p className="text-zinc-500 text-xs font-mono mb-4">Session: {sessionId.substring(0, 20)}...</p>
              )}
            </div>

            {debugInfo && (
              <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400 text-sm font-medium">Debug Information</span>
                </div>
                <pre className="text-xs text-zinc-300 overflow-auto max-h-40">{debugInfo}</pre>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={handleRetry} className="w-full" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild className="w-full">
                <Link href="/dashboard/purchases">View My Purchases</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border-zinc-800 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-light text-white mb-2">Purchase Successful!</CardTitle>
          <CardDescription className="text-zinc-400 text-lg">
            Thank you for your purchase. You now have access to premium content.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {purchaseDetails && (
            <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-medium text-white">Purchase Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">Product:</span>
                  <p className="text-white font-medium">{purchaseDetails.itemTitle}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Amount:</span>
                  <p className="text-white font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: purchaseDetails.currency.toUpperCase(),
                    }).format(purchaseDetails.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-400">Transaction ID:</span>
                  <p className="text-white font-mono text-xs">{purchaseDetails.sessionId}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Purchase Date:</span>
                  <p className="text-white font-medium">{new Date(purchaseDetails.purchasedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
            >
              <Link href={`/product-box/${purchaseDetails?.productBoxId}/content`}>
                <Download className="h-4 w-4 mr-2" />
                Access Content
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800">
              <Link href="/dashboard/purchases">
                <ArrowRight className="h-4 w-4 mr-2" />
                View All Purchases
              </Link>
            </Button>
          </div>

          <div className="text-center pt-4 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm">
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
