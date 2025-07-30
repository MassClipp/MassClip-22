"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, ExternalLink, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface VerificationResponse {
  success: boolean
  alreadyProcessed?: boolean
  session?: {
    id: string
    payment_status: string
    amount_total: number
    currency: string
  }
  purchase?: any
  item?: {
    id: string
    title: string
    description?: string
    creator?: {
      username: string
      displayName?: string
    }
  }
  error?: string
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [verificationData, setVerificationData] = useState<VerificationResponse | null>(null)
  const [isManualRetry, setIsManualRetry] = useState(false)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    console.log("🔍 [Purchase Success] Page loaded, extracting URL parameters...")

    const urlParams = new URLSearchParams(window.location.search)
    const sessionIdFromUrl = urlParams.get("session_id")

    console.log("📋 [Purchase Success] Search params:", {
      sessionId: sessionIdFromUrl,
      fullUrl: window.location.href,
      currentDomain: window.location.hostname,
    })

    if (sessionIdFromUrl) {
      console.log("✅ [Purchase Success] Session ID from URL:", sessionIdFromUrl)
    } else {
      console.error("❌ [Purchase Success] No session_id found in URL")
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
      setVerificationData({ success: false, error: "Authentication required" })
      return
    }

    console.log("✅ [Purchase Success] User authenticated:", user.uid)

    if (!sessionId) {
      console.error("❌ [Purchase Success] No session ID found")
      setVerificationStatus("error")
      setVerificationData({ success: false, error: "No session ID provided" })
      return
    }

    verifyPurchase()
  }, [user, authLoading, sessionId, isManualRetry])

  const verifyPurchase = async () => {
    if (!user || !sessionId) return

    try {
      console.log("🔄 [Purchase Success] Starting verification...")
      setVerificationStatus("loading")

      // Get fresh auth token
      const token = await user.getIdToken(true)
      console.log("🔑 [Purchase Success] Auth token obtained")

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      })

      console.log("📡 [Purchase Success] Verification response status:", response.status)

      const data = await response.json()
      console.log("📋 [Purchase Success] Verification response:", data)

      if (data.success) {
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
      setVerificationData({ success: false, error: "Network error occurred" })
    }
  }

  const handleRetry = () => {
    console.log("🔄 [Purchase Success] Manual retry triggered")
    setIsManualRetry(!isManualRetry)
  }

  const handleAccessBundle = () => {
    if (verificationData?.item?.id) {
      router.push(`/product-box/${verificationData.item.id}/content`)
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
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

          {verificationData?.item?.title && <p className="text-gray-600 mb-6">{verificationData.item.title}</p>}

          {verificationData?.alreadyProcessed && (
            <p className="text-sm text-blue-600 mb-4">This purchase was already processed</p>
          )}

          <div className="space-y-3">
            <Button onClick={handleAccessBundle} className="w-full" size="lg">
              <ExternalLink className="h-4 w-4 mr-2" />
              Access Bundle
            </Button>

            <Button variant="outline" onClick={handleViewPurchases} className="w-full bg-transparent">
              View All Purchases
            </Button>
          </div>

          {verificationData?.session && (
            <div className="mt-6 pt-4 border-t text-sm text-gray-500">
              <p>Session: {verificationData.session.id}</p>
              <p>Status: {verificationData.session.payment_status}</p>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
