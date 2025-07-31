"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, ExternalLink, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-firebase-auth"

interface VerificationResponse {
  success: boolean
  verified: boolean
  alreadyProcessed?: boolean
  session?: {
    id: string
    status: string
    paymentStatus: string
  }
  purchase?: {
    id: string
    buyerUid: string
    creatorId: string
    amount: number
    status: string
    purchaseType: string
    productBoxId?: string
    bundleId?: string
    createdAt: any
  }
  error?: string
  isAnonymous?: boolean
  isUnauthorized?: boolean
  needsProcessing?: boolean
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [verificationData, setVerificationData] = useState<VerificationResponse | null>(null)
  const [isManualRetry, setIsManualRetry] = useState(false)

  const sessionId = searchParams.get("session_id")
  const buyerUid = searchParams.get("buyer_uid")

  useEffect(() => {
    console.log("🔍 [Purchase Success] Page loaded, extracting URL parameters...")

    const urlParams = new URLSearchParams(window.location.search)
    const sessionIdFromUrl = urlParams.get("session_id")
    const buyerUidFromUrl = urlParams.get("buyer_uid")

    console.log("📋 [Purchase Success] Search params:", {
      sessionId: sessionIdFromUrl,
      buyerUid: buyerUidFromUrl,
      fullUrl: window.location.href,
      currentDomain: window.location.hostname,
    })

    if (sessionIdFromUrl) {
      console.log("✅ [Purchase Success] Session ID from URL:", sessionIdFromUrl)
    } else {
      console.error("❌ [Purchase Success] No session_id found in URL")
    }

    if (buyerUidFromUrl) {
      console.log("✅ [Purchase Success] Buyer UID from URL:", buyerUidFromUrl)
    } else {
      console.warn("⚠️ [Purchase Success] No buyer_uid found in URL")
    }
  }, [])

  useEffect(() => {
    if (authLoading) {
      console.log("⏳ [Purchase Success] Auth loading...")
      return
    }

    if (!user) {
      console.log("❌ [Purchase Success] User not authenticated")
      setVerificationStatus("error")
      setVerificationData({
        success: false,
        verified: false,
        error: "Authentication required to verify purchase",
      })
      return
    }

    console.log("✅ [Purchase Success] User authenticated:", user.uid)

    // Verify buyer UID matches authenticated user
    if (buyerUid && buyerUid !== user.uid) {
      console.error("❌ [Purchase Success] Buyer UID mismatch:", {
        urlBuyerUid: buyerUid,
        authenticatedUid: user.uid,
      })
      setVerificationStatus("error")
      setVerificationData({
        success: false,
        verified: false,
        error: "Purchase verification failed: User identity mismatch",
        isUnauthorized: true,
      })
      return
    }

    if (!sessionId) {
      console.error("❌ [Purchase Success] No session ID found")
      setVerificationStatus("error")
      setVerificationData({
        success: false,
        verified: false,
        error: "No session ID provided",
      })
      return
    }

    verifyPurchase()
  }, [user, authLoading, sessionId, buyerUid, isManualRetry])

  const verifyPurchase = async () => {
    if (!user || !sessionId) return

    try {
      console.log("🔄 [Purchase Success] Starting verification...")
      setVerificationStatus("loading")

      // Get fresh auth token
      const buyerToken = await user.getIdToken(true)
      console.log("🔑 [Purchase Success] Auth token obtained")

      const response = await fetch("/api/purchase/verify-session-with-buyer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: JSON.stringify({
          sessionId,
          buyerToken,
        }),
      })

      console.log("📡 [Purchase Success] Verification response status:", response.status)
      console.log(
        "📡 [Purchase Success] Verification response headers:",
        Object.fromEntries(response.headers.entries()),
      )

      const data = await response.json()
      console.log("📋 [Purchase Success] Full verification response:", JSON.stringify(data, null, 2))

      if (data.success && data.verified) {
        setVerificationStatus("success")
        setVerificationData(data)
        console.log("✅ [Purchase Success] Verification successful")
      } else {
        setVerificationStatus("error")
        setVerificationData(data)
        console.error("❌ [Purchase Success] Verification failed:", data.error)
      }
    } catch (error) {
      console.error("❌ [Purchase Success] Verification error:", error)
      setVerificationStatus("error")
      setVerificationData({
        success: false,
        verified: false,
        error: "Network error occurred during verification",
      })
    }
  }

  const handleRetry = () => {
    console.log("🔄 [Purchase Success] Manual retry triggered")
    setIsManualRetry(!isManualRetry)
  }

  const handleAccessContent = () => {
    if (verificationData?.purchase?.productBoxId) {
      router.push(`/product-box/${verificationData.purchase.productBoxId}/content`)
    } else if (verificationData?.purchase?.bundleId) {
      router.push(`/bundle/${verificationData.purchase.bundleId}`)
    } else {
      router.push("/dashboard/purchases")
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Authentication Required</h1>
            <p className="text-gray-600 mb-4">Please log in to view your purchase.</p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verificationStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Verifying Purchase</h1>
            <p className="text-gray-600">Please wait while we confirm your purchase...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verificationStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-4">{verificationData?.error || "Unable to verify your purchase"}</p>

            {verificationData?.isAnonymous && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  Anonymous purchases are not allowed. Please ensure you're logged in when making purchases.
                </p>
              </div>
            )}

            {verificationData?.isUnauthorized && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">This purchase belongs to a different user account.</p>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={handleViewPurchases} className="w-full bg-transparent">
                View My Purchases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Purchase Complete</h1>

          {verificationData?.purchase && (
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                {verificationData.purchase.purchaseType === "bundle" ? "Bundle" : "Product Box"}
              </p>
              <p className="text-lg font-semibold">${verificationData.purchase.amount}</p>
            </div>
          )}

          {verificationData?.alreadyProcessed && (
            <p className="text-sm text-blue-600 mb-4">This purchase was already processed</p>
          )}

          <div className="space-y-3">
            <Button onClick={handleAccessContent} className="w-full" size="lg">
              <ExternalLink className="h-4 w-4 mr-2" />
              Access Content
            </Button>

            <Button variant="outline" onClick={handleViewPurchases} className="w-full bg-transparent">
              View All Purchases
            </Button>
          </div>

          {verificationData?.session && (
            <div className="mt-6 pt-4 border-t text-sm text-gray-500">
              <p>Session: {verificationData.session.id}</p>
              <p>Status: {verificationData.session.paymentStatus}</p>
              {verificationData.purchase && <p>Buyer: {verificationData.purchase.buyerUid}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
