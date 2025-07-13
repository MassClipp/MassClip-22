"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle } from "lucide-react"

interface Purchase {
  id: string
  bundleId: string
  bundleTitle: string
  description: string
  thumbnailUrl: string
  creatorName: string
  creatorUsername: string
  amount: number
  currency: string
  contentCount: number
  totalSize: number
  buyerUid: string
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const productBoxId = searchParams.get("product_box_id")
  const creatorId = searchParams.get("creator_id")
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (!productBoxId) {
      setStatus("error")
      setError("Missing product box ID")
      return
    }

    // Wait for auth to be ready
    if (user === undefined) {
      return // Still loading auth
    }

    verifyAndGrantAccess()
  }, [user, productBoxId, creatorId, sessionId, retryCount])

  const verifyAndGrantAccess = async () => {
    try {
      setStatus("loading")
      setError(null)
      setMessage("Verifying your purchase...")

      console.log("🔍 [Purchase Success] Starting verification process", {
        productBoxId,
        creatorId,
        sessionId,
        userId: user?.uid,
        userEmail: user?.email,
      })

      // Prepare request data
      const requestData = {
        productBoxId,
        creatorId,
        sessionId,
        userId: user?.uid || null,
        userEmail: user?.email || null,
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      // Add auth token if user is logged in
      if (user) {
        try {
          const idToken = await user.getIdToken()
          headers.Authorization = `Bearer ${idToken}`
          console.log("✅ [Purchase Success] Added auth token to request")
        } catch (tokenError) {
          console.warn("⚠️ [Purchase Success] Failed to get ID token:", tokenError)
        }
      }

      setMessage("Granting access to your content...")

      const response = await fetch("/api/purchase/verify-and-grant", {
        method: "POST",
        headers,
        body: JSON.stringify(requestData),
      })

      const data = await response.json()
      setDebugInfo(data)

      console.log("📋 [Purchase Success] API Response:", {
        status: response.status,
        data,
      })

      if (response.ok && data.success) {
        setStatus("success")
        setMessage("Access granted successfully!")

        // Redirect to content after a short delay
        setTimeout(() => {
          if (data.redirectUrl) {
            window.location.href = data.redirectUrl
          } else {
            router.push(`/product-box/${productBoxId}/content`)
          }
        }, 2000)
      } else {
        throw new Error(data.error || data.message || "Failed to verify purchase")
      }
    } catch (err: any) {
      console.error("❌ [Purchase Success] Error:", err)
      setStatus("error")
      setError(err.message || "Failed to verify purchase")
      setMessage("There was an issue verifying your purchase")
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  const handleGoToPurchases = () => {
    router.push("/dashboard/purchases")
  }

  const handleGoToContent = () => {
    router.push(`/product-box/${productBoxId}/content`)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Verifying Purchase...</h1>
          <p className="text-gray-400 mb-6">{message}</p>
          <div className="text-xs text-gray-500">{retryCount > 0 && <p>Retry attempt: {retryCount}</p>}</div>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Purchase Successful!</h1>
          <p className="text-gray-400 mb-6">{message}</p>
          <p className="text-sm text-gray-500 mb-8">Redirecting you to your content...</p>
          <div className="space-y-3">
            <Button onClick={handleGoToContent} className="w-full bg-white text-black hover:bg-gray-100">
              View Content Now
            </Button>
            <Button
              onClick={handleGoToPurchases}
              variant="outline"
              className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
            >
              Go to My Purchases
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Verification Failed</h1>
          <p className="text-gray-400 mb-2">{message}</p>
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-red-400 font-medium mb-1">Error Details:</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full bg-white text-black hover:bg-gray-100">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={handleGoToContent}
              variant="outline"
              className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
            >
              Try Accessing Content Directly
            </Button>
            <Button
              onClick={handleGoToPurchases}
              variant="outline"
              className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
            >
              Go to My Purchases
            </Button>
          </div>
          {debugInfo && (
            <details className="mt-6 text-left">
              <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">Debug Info</summary>
              <pre className="text-xs text-gray-600 mt-2 bg-gray-900 p-3 rounded overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }

  return null
}
