"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function StripeSuccessPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check Stripe status after a short delay
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="container max-w-md py-16">
      <div className="bg-black border border-zinc-800 rounded-lg p-8 text-center">
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 text-green-500 mx-auto animate-spin mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verifying your account...</h1>
            <p className="text-zinc-400 mb-4">Please wait while we verify your Stripe account setup.</p>
          </>
        ) : (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Stripe Connected Successfully!</h1>
            <p className="text-zinc-400 mb-6">
              Your Stripe account has been connected. You can now receive payments for your premium content.
            </p>
            <Button onClick={() => router.push("/dashboard/earnings")} className="bg-green-600 hover:bg-green-700">
              View Earnings Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
