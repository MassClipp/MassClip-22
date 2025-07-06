"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { CheckCircle, Loader2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface PurchaseDetails {
  id: string
  productBoxId: string
  itemTitle: string
  amount: number
  currency: string
  sessionId: string
  purchasedAt: Date
  status: string
}

export default function PurchaseSuccessPage() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const sessionId = searchParams.get("session_id")

  // Log session ID from URL
  useEffect(() => {
    console.log("🔍 [Success Page] Session ID from URL:", sessionId)
    if (sessionId) {
      console.log("✅ [Success Page] Session details:", {
        sessionId,
        isTest: sessionId.startsWith("cs_test_"),
        isLive: sessionId.startsWith("cs_live_"),
      })
    }
  }, [sessionId])

  const verifyPurchase = async () => {
    if (!sessionId) {
      console.error("❌ [Verify] Missing session ID")
      setError("Missing session ID in URL")
      setLoading(false)
      return
    }

    if (authLoading || !user) {
      console.log("⏳ [Verify] Waiting for authentication...")
      return
    }

    try {
      console.log("🔍 [Verify] Starting verification:", {
        sessionId: sessionId.substring(0, 20) + "...",
        userId: user.uid,
        attempt: retryCount + 1,
      })

      const idToken = await user.getIdToken()
      console.log("🔑 [Verify] Got auth token")

      console.log("📡 [Verify] Sending to /api/purchase/verify")
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

      console.log("📡 [Verify] Response:", {
        status: response.status,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Verification failed" }))
        console.error("❌ [Verify] Error:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ [Verify] Success:", data)

      setPurchaseDetails(data.purchase)
      setError(null)

      toast({
        title: "Purchase Verified!",
        description: "Your payment has been confirmed.",
      })
    } catch (error) {
      console.error("❌ [Verify] Failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Verification failed"
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
    console.log("🔄 [Verify] Retrying...")
    setLoading(true)
    setError(null)
    setRetryCount((prev) => prev + 1)
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/90 border-gray-700 shadow-2xl backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {authLoading ? "Authenticating..." : "Verifying Purchase..."}
                </h2>
                <p className="text-sm text-gray-400 mt-1">Please wait a moment</p>
              </div>
              {sessionId && (
                <div className="text-xs text-gray-400 font-mono bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                  <div className="text-gray-300 font-medium mb-1">Session ID</div>
                  <div className="break-all text-gray-400">{sessionId.substring(0, 30)}...</div>
                  <div className="text-gray-500 mt-1">Type: {sessionId.startsWith("cs_test_") ? "Test" : "Live"}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/90 border-gray-700 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-white">Purchase Verification Failed</CardTitle>
            <p className="text-gray-400 mt-2">{error}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionId && (
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <div className="text-sm font-medium text-gray-300 mb-2">Session Details</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Session ID</div>
                    <div className="text-xs font-mono text-gray-300 break-all bg-gray-800/50 p-2 rounded border border-gray-600 mt-1">
                      {sessionId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Type</div>
                    <div className="text-sm font-medium text-gray-300">
                      {sessionId.startsWith("cs_test_") ? "Test Mode" : "Live Mode"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full border-gray-600 hover:bg-gray-700 bg-transparent text-gray-300 hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                <Link href="/dashboard/purchases">View My Purchases</Link>
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                Don't worry! Your payment was likely successful. Check your purchases or try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800/90 border-gray-700 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-white">Purchase Successful!</CardTitle>
          <p className="text-gray-400 mt-2">Your payment has been confirmed</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {purchaseDetails && (
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 space-y-3">
              <div className="text-sm font-medium text-gray-300 mb-3">Purchase Details</div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Product</div>
                <div className="text-sm font-medium text-white mt-1">{purchaseDetails.itemTitle}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Amount</div>
                  <div className="text-sm font-medium text-white mt-1">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: purchaseDetails.currency.toUpperCase(),
                    }).format(purchaseDetails.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Date</div>
                  <div className="text-sm font-medium text-white mt-1">
                    {new Date(purchaseDetails.purchasedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href={`/product-box/${purchaseDetails?.productBoxId}/content`}>
                Access Content
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-gray-600 hover:bg-gray-700 bg-transparent text-gray-300 hover:text-white"
            >
              <Link href="/dashboard/purchases">View All Purchases</Link>
            </Button>
          </div>

          <div className="text-center pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">A receipt has been sent to your email address</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
