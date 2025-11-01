"use client"
import StripeFeeMonitor from "@/components/stripe-fee-monitor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestStripeFeesPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Stripe Fee Testing</h1>
        <p className="text-gray-600 mt-2">Test and verify the 25% platform fee calculation</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <StripeFeeMonitor />

        <Card>
          <CardHeader>
            <CardTitle>Fee Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Current Platform Fee: 25%</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Platform receives 25% of each transaction</li>
                <li>• Creator receives 75% of each transaction</li>
                <li>• Fees are automatically deducted via Stripe Connect</li>
                <li>• Minimum transaction: $0.50</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Test Examples:</h3>
              <div className="text-sm space-y-1">
                <div>$1.00 → Platform: $0.25, Creator: $0.75</div>
                <div>$5.00 → Platform: $1.25, Creator: $3.75</div>
                <div>$10.00 → Platform: $2.50, Creator: $7.50</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
