"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Copy, RefreshCw, Bug } from "lucide-react"
import { toast } from "sonner"

interface PurchaseData {
  sessionId: string
  amount: number
  currency: string
  customerEmail: string
  status: string
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided")
      setIsLoading(false)
      return
    }

    verifyPurchase()
  }, [sessionId])

  const verifyPurchase = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/purchase/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()
      setDebugInfo(data)

      if (response.ok && data.success) {
        setPurchaseData(data.purchase)
        setError(null)
      } else {
        setError(data.error || "Purchase verification failed")
      }
    } catch (err) {
      console.error("Verification error:", err)
      setError("Failed to verify purchase")
    } finally {
      setIsLoading(false)
    }
  }

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      toast.success("Session ID copied to clipboard")
    }
  }

  const copyDebugInfo = () => {
    if (debugInfo) {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
      toast.success("Debug info copied to clipboard")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/60">Verifying your purchase...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isConfigError = error.includes("Test/Live Mode Mismatch") || error.includes("configuration")

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Error Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white mb-2">Purchase Verification Failed</h1>
              <p className="text-white/60">{isConfigError ? "Configuration Error: Test/Live Mode Mismatch" : error}</p>
            </div>
          </div>

          {/* Configuration Warning */}
          {isConfigError && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <h3 className="text-amber-400 font-medium">Configuration Issue Detected</h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    There's a mismatch between your Stripe configuration and the payment session. This typically happens
                    when:
                  </p>
                  <ul className="text-white/60 text-sm space-y-1 ml-4">
                    <li>• Using test Stripe keys with a live payment session</li>
                    <li>• Using live Stripe keys with a test payment session</li>
                  </ul>
                  <Button
                    onClick={() => router.push("/debug-stripe-config")}
                    variant="outline"
                    size="sm"
                    className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Check Configuration
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Reassurance */}
          <div className="text-center">
            <p className="text-white/60 text-sm">
              Don't worry! Your payment was likely successful. You can try verifying again or check your purchases.
            </p>
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm font-mono">Session: {sessionId.substring(0, 20)}...</span>
                <Button onClick={copySessionId} variant="ghost" size="sm" className="text-white/60 hover:text-white">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Debug Info */}
          {debugInfo && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-amber-400 text-sm font-medium">Debug Information</h3>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setShowDebug(!showDebug)}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white text-sm"
                  >
                    {showDebug ? "Hide" : "Show"}
                  </Button>
                  <Button onClick={copyDebugInfo} variant="ghost" size="sm" className="text-white/60 hover:text-white">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {showDebug && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-400 text-sm mb-2">
                    <strong>Recommendation:</strong> Verify the session ID is correct and belongs to your Stripe account
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={verifyPurchase}
              className="w-full bg-white/10 hover:bg-white/20 text-white border-0"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => router.push("/debug-stripe-config")}
              variant="outline"
              className="w-full bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            >
              <Bug className="w-4 h-4 mr-2" />
              Debug Session
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Success State - Minimal & Sleek Design
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-light text-white mb-2">Payment Successful</h1>
            <p className="text-white/60">Your purchase has been completed</p>
          </div>
        </div>

        {/* Purchase Details */}
        {purchaseData && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/60">Amount</span>
              <span className="text-white font-medium">
                ${(purchaseData.amount / 100).toFixed(2)} {purchaseData.currency.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Email</span>
              <span className="text-white font-medium">{purchaseData.customerEmail}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Status</span>
              <span className="text-green-400 font-medium capitalize">{purchaseData.status}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-white text-black hover:bg-white/90 font-medium"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => router.push("/dashboard/purchases")}
            variant="ghost"
            className="w-full text-white/60 hover:text-white hover:bg-white/5"
          >
            View Purchases
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-white/40 text-sm">
            Need help?{" "}
            <a href="mailto:support@massclip.pro" className="text-white/60 hover:text-white underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
