"use client"

import { CreditCard } from 'lucide-react'
import { StripeConnectButton } from "@/components/stripe-connect-button"

interface StripeConnectionSetupProps {
  userId: string
  onSuccess?: () => void
}

export function StripeConnectionSetup({ userId, onSuccess }: StripeConnectionSetupProps) {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Connect Your Stripe Account</h1>
        <p className="text-gray-600">Start accepting payments and track your earnings</p>
      </div>

      <StripeConnectButton userId={userId} onSuccess={onSuccess} />
    </div>
  )
}
