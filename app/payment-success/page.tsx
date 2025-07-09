"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"

interface VerificationResult {
  success: boolean
  error?: string
}

const PaymentSuccessPage = () => {
  const searchParams = useSearchParams()
  const paymentIntentId = searchParams.get("payment_intent")
  const accountId = searchParams.get("account_id")
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const { user } = useUser()
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (paymentIntentId || sessionId) {
      verifyPayment()
    } else {
      setVerificationResult({
        success: false,
        error: "No payment information found in URL",
      })
      setIsVerifying(false)
    }
  }, [paymentIntentId, sessionId])

  const verifyPayment = async () => {
    let finalPaymentIntentId = paymentIntentId

    // If we have a session ID instead of payment intent ID, convert it
    if (!finalPaymentIntentId && sessionId) {
      try {
        console.log("🔄 Converting session ID to payment intent ID:", sessionId)

        const idToken = await user.getIdToken()
        const sessionResponse = await fetch("/api/purchase/get-payment-intent-from-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            sessionId,
            accountId,
          }),
        })

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          finalPaymentIntentId = sessionData.paymentIntentId
          console.log("✅ Converted to payment intent:", finalPaymentIntentId)
        } else {
          throw new Error("Failed to convert session ID to payment intent ID")
        }
      } catch (error) {
        console.error("❌ Session conversion error:", error)
        setVerificationResult({
          success: false,
          error: "Failed to process payment information",
        })
        setIsVerifying(false)
        return
      }
    }

    if (!finalPaymentIntentId) {
      setVerificationResult({
        success: false,
        error: "No payment information found in URL",
      })
      setIsVerifying(false)
      return
    }

    try {
      setIsVerifying(true)
      console.log("Verifying payment intent:", finalPaymentIntentId)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/purchase/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          paymentIntentId: finalPaymentIntentId,
          accountId,
        }),
      })

      if (response.ok) {
        setVerificationResult({ success: true })
      } else {
        const errorData = await response.json()
        setVerificationResult({
          success: false,
          error: errorData.error || "Payment verification failed",
        })
      }
    } catch (error: any) {
      console.error("Payment verification error:", error)
      setVerificationResult({
        success: false,
        error: "Failed to process payment verification",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-semibold mb-4 text-center">Payment Verification</h1>

        {isVerifying && (
          <div className="text-center">
            <p>Verifying your payment...</p>
            <div className="loader"></div>
          </div>
        )}

        {verificationResult && verificationResult.success && (
          <div className="text-center text-green-600">
            <p>Payment verified successfully!</p>
          </div>
        )}

        {verificationResult && !verificationResult.success && (
          <div className="text-center text-red-600">
            <p>Payment verification failed.</p>
            {verificationResult.error && <p>Error: {verificationResult.error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentSuccessPage
