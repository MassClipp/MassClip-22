"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Copy, RefreshCw, ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface PurchaseResult {
  success: boolean
  error?: string
  sessionId?: string
  purchaseDetails?: {
    amount: number
    currency: string
    customerEmail: string
    productName?: string
  }
  debugInfo?: any
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [result, setResult] = useState<PurchaseResult | null>(null)
  const [loading, setLoading] = useState(true)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (!sessionId) {
      setResult({
        success: false,
        error: "No session ID provided",
      })
      setLoading(false)
      return
    }

    verifyPurchase()
  }, [sessionId])

  const verifyPurchase = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/purchase/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error verifying purchase:", error)
      setResult({
        success: false,
        error: "Failed to verify purchase",
      })
    } finally {
      setLoading(false)
    }
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

  const retryVerification = () => {
    verifyPurchase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-white mx-auto" />
          <p className="text-gray-400">Verifying your purchase...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-light text-white">Something went wrong</h1>
          <p className="text-gray-400">Unable to load purchase information</p>
        </div>
      </div>
    )
  }

  if (result.success) {
    // SUCCESS STATE - Minimal & Sleek Design
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Success Icon */}
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h1 className="text-3xl font-light text-white">Purchase Complete</h1>
            <p className="text-gray-400 text-sm">Your payment has been processed successfully</p>
          </div>

          {/* Purchase Details */}
          {result.purchaseDetails && (
            <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Amount</span>
                <span className="text-white font-medium">
                  ${(result.purchaseDetails.amount / 100).toFixed(2)} {result.purchaseDetails.currency.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Email</span>
                <span className="text-white text-sm">{result.purchaseDetails.customerEmail}</span>
              </div>
              {result.purchaseDetails.productName && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Product</span>
                  <span className="text-white text-sm">{result.purchaseDetails.productName}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button asChild className="w-full bg-white text-black hover:bg-gray-100 font-medium">
              <Link href="/dashboard">Continue to Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full text-gray-400 hover:text-white hover:bg-gray-900/50">
              <Link href="/dashboard/purchases">View Purchases</Link>
            </Button>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-800">
            <p className="text-gray-500 text-xs">
              Need help?{" "}
              <Link href="/support" className="text-gray-400 hover:text-white underline">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ERROR STATE - Also minimal and dark
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-light text-white">Purchase Verification Failed</h1>
          <p className="text-gray-400 text-sm">
            {result.error?.includes("Configuration Error")
              ? "Stripe Configuration Issue"
              : result.error?.includes("not found")
                ? "Payment Session Not Found"
                : result.error || "Unable to verify your purchase"}
          </p>
        </div>

        {/* Specific Error Details */}
        {result.error?.includes("not found") && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-left space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 font-medium text-sm">Session Not Found</span>
            </div>
            <p className="text-blue-300/80 text-sm">The payment session could not be found. This can happen if:</p>
            <ul className="text-blue-300/70 text-sm space-y-1 ml-4 list-disc">
              <li>The session ID is incorrect or incomplete</li>
              <li>The session has expired (sessions expire after 24 hours)</li>
              <li>The session belongs to a different Stripe account or environment</li>
            </ul>
          </div>
        )}

        {/* Configuration Issue Alert */}
        {result.error?.includes("Configuration Error") && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 text-left space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm">Configuration Issue</span>
            </div>
            <p className="text-amber-300/80 text-sm">
              {result.error?.includes("Mismatch")
                ? "There's a mismatch between your Stripe configuration and the payment session."
                : "There's an issue with your Stripe configuration."}
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent"
            >
              <Link href="/debug-stripe-config">
                <AlertCircle className="h-4 w-4 mr-2" />
                Debug Configuration
              </Link>
            </Button>
          </div>
        )}

        {/* Session ID */}
        {sessionId && (
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Session ID:</span>
              <Button onClick={copySessionId} variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <code className="text-gray-300 text-xs break-all">{sessionId}</code>
          </div>
        )}

        {/* Reassurance */}
        <p className="text-gray-500 text-sm">
          {result.error?.includes("not found")
            ? "Your payment may have been processed successfully even if we can't verify it right now."
            : "Don't worry! Your payment was likely successful. You can try verifying again or check your purchases."}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={retryVerification} className="w-full bg-gray-800 hover:bg-gray-700 text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <div className="flex gap-3">
            <Button asChild variant="ghost" className="flex-1 text-gray-400 hover:text-white hover:bg-gray-900/50">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="ghost" className="flex-1 text-gray-400 hover:text-white hover:bg-gray-900/50">
              <Link href="/debug-stripe-config">
                <ExternalLink className="h-4 w-4 mr-2" />
                Debug
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
