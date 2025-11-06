"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, RefreshCw } from "lucide-react"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(true)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const paymentIntentId = searchParams.get("payment_intent")
  const connectedAccountId = searchParams.get("account_id")
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    // Handle legacy session_id parameter by converting to payment_intent
    if (sessionId && !paymentIntentId) {
      let conversionUrl = `/api/purchase/convert-session-to-payment-intent?session_id=${sessionId}`
      if (connectedAccountId) {
        conversionUrl += `&account_id=${connectedAccountId}`
      }
      window.location.href = conversionUrl
      return
    }

    if (!user || !paymentIntentId) {
      setIsProcessing(false)
      return
    }

    verifyPayment()
  }, [user, paymentIntentId])

  const verifyPayment = async () => {
    if (!user || !paymentIntentId) return

    try {
      const response = await fetch("/api/purchase/verify-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId,
          connectedAccountId,
          userId: user.uid,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Payment verification failed")
      }

      setVerificationResult(result)
    } catch (err: any) {
      setError(err.message || "Failed to verify payment")
    } finally {
      // Add a small delay to show the loading animation
      setTimeout(() => {
        setIsProcessing(false)
      }, 1500)
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  const handleDownloadEbook = async () => {
    if (!verificationResult?.purchase?.itemId || !sessionId) {
      alert("Missing required information to download")
      return
    }

    const ebookId = verificationResult.purchase.itemId
    const ebookTitle = verificationResult.purchase.itemTitle || "ebook"

    try {
      setDownloading(true)
      console.log("[v0] Starting eBook download:", ebookId)

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      // Add auth token if user is logged in
      if (user) {
        const token = await user.getIdToken()
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch(`/api/ebooks/${ebookId}/download`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to download eBook")
      }

      // Download the ZIP file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${ebookTitle.replace(/[^\w\s-]/gi, "")}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log("[v0] eBook download completed successfully")
    } catch (error) {
      console.error("[v0] eBook download failed:", error)
      alert(error instanceof Error ? error.message : "Failed to download eBook")
    } finally {
      setDownloading(false)
    }
  }

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Please log in to continue</p>
            <Button onClick={() => router.push("/login")} className="w-full bg-red-600 hover:bg-red-700">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment Intent ID validation
  if (!paymentIntentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Invalid payment link</p>
            <Button onClick={() => router.push("/dashboard")} className="w-full bg-red-600 hover:bg-red-700">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state with three dots animation
  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Something went wrong</p>
            <Button onClick={handleViewPurchases} className="w-full bg-red-600 hover:bg-red-700">
              My Purchases
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (verificationResult?.success) {
    const isEbookPurchase = verificationResult.purchase?.type === "ebook"

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-6">You're all good</h2>

            {isEbookPurchase && sessionId && (
              <Button
                onClick={handleDownloadEbook}
                disabled={downloading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white mb-2"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download eBook
                  </>
                )}
              </Button>
            )}

            <Button onClick={handleViewPurchases} className="w-full bg-red-600 hover:bg-red-700">
              My Purchases
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
