"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { StripeAccountLinker } from "@/components/stripe-account-linker"

export default function ConnectStripePage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Connect Your Stripe Account</h1>
        <p className="text-gray-600">
          Start accepting payments and track your earnings by connecting your Stripe account
        </p>
      </div>

      <StripeAccountLinker />
    </div>
  )
}
