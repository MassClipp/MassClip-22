"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CreditCard, DollarSign, Globe, Shield } from "lucide-react"
import StripeAccountLinker from "@/components/stripe-account-linker"

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
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <CreditCard className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold">Connect Your Stripe Account</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Start accepting payments and track your earnings by connecting your Stripe account
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Accept Payments</h3>
            <p className="text-sm text-gray-600">Process payments from customers worldwide</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Global Reach</h3>
            <p className="text-sm text-gray-600">Supported in 40+ countries</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-sm text-gray-600">Bank-level security and encryption</p>
          </CardContent>
        </Card>
      </div>

      {/* Important Notice */}
      <Alert className="max-w-2xl mx-auto">
        <AlertDescription>
          <strong>Important:</strong> You need a Stripe account to receive payments. If you don't have one, you can
          create it for free using the link below.
        </AlertDescription>
      </Alert>

      {/* Stripe Account Linker Component */}
      <StripeAccountLinker />
    </div>
  )
}
