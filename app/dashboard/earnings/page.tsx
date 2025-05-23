import type { Metadata } from "next"
import StripeStatus from "@/components/stripe-status"

export const metadata: Metadata = {
  title: "Earnings - MassClip",
  description: "Manage your earnings and payment settings",
}

export default function EarningsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Earnings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* Earnings stats will go here */}
          <div className="bg-black border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Earnings</h2>
            <p className="text-zinc-400">Connect your Stripe account to start earning from your premium content.</p>
          </div>
        </div>

        <div>
          <StripeStatus />
        </div>
      </div>
    </div>
  )
}
