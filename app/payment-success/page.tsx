"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, Package } from "lucide-react"

interface BundleSlotVerificationResult {
  success: boolean
  bundleSlots?: number
  tier?: string
  error?: string
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [verificationResult, setVerificationResult] = useState<BundleSlotVerificationResult | null>(null)
  const [loading, setLoading] = useState(true)

  const paymentIntentId = searchParams.get("payment_intent")

  useEffect(() => {
    if (!user || !paymentIntentId) {
      setLoading(false)
      return
    }

    verifyBundleSlotPurchase()
  }, [user, paymentIntentId])

  const verifyBundleSlotPurchase = async () => {
    if (!user || !paymentIntentId) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/purchase/verify-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          paymentIntentId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Payment verification failed")
      }

      setVerificationResult({
        success: true,
        bundleSlots: result.bundleSlots,
        tier: result.tier,
      })
    } catch (err: any) {
      setVerificationResult({
        success: false,
        error: err.message || "Failed to verify payment",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-cyan-400 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
          <p className="text-gray-400">Confirming your bundle slot purchase...</p>
        </div>
      </div>
    )
  }

  if (verificationResult?.error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">Payment verification failed</div>
          <p className="text-gray-400 mb-6">{verificationResult.error}</p>
          <Button onClick={() => router.push("/dashboard")} className="bg-white text-black hover:bg-gray-200">
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (verificationResult?.success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold mb-2">Success!</h1>
          <p className="text-gray-300 mb-8">
            You now have{" "}
            <span className="text-cyan-400 font-semibold">{verificationResult.bundleSlots} extra bundles</span>
          </p>
          <Button
            onClick={() => router.push("/dashboard/bundles")}
            className="bg-white text-black hover:bg-gray-200 w-full"
          >
            <Package className="h-4 w-4 mr-2" />
            Visit Bundles
          </Button>
        </div>
      </div>
    )
  }

  return null
}
