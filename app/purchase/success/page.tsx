"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function LegacySuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    const accountId = searchParams.get("account_id")

    if (sessionId) {
      console.log(`🔄 [Legacy Success] Converting session ${sessionId} to payment intent`)

      // Build the conversion URL
      let conversionUrl = `/api/purchase/convert-session-to-payment-intent?session_id=${sessionId}`
      if (accountId) {
        conversionUrl += `&account_id=${accountId}`
      }

      // Redirect to the conversion endpoint which will redirect to the proper success page
      window.location.href = conversionUrl
    } else {
      // No session ID, redirect to dashboard
      router.push("/dashboard")
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
          <p className="text-gray-600 mb-4">Converting your checkout session to the proper verification format.</p>
          <p className="text-xs text-gray-500">
            This should only take a moment. You'll be redirected to the payment verification page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
