"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import StripeIntegrationTest from "@/components/stripe-integration-test"
import StripeStatus from "@/components/stripe-status"

export default function StripeTestPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stripe Integration Testing</h1>
        <p className="text-zinc-400 mt-1">Test and verify your Stripe integration for product box creation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stripe Status */}
        <StripeStatus />

        {/* Integration Test */}
        <StripeIntegrationTest />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Understanding the Stripe integration process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Product Box Creation Process:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Validate user authentication and form data</li>
              <li>Check Stripe account status and capabilities</li>
              <li>Create product in your connected Stripe account</li>
              <li>Create price for the product (one-time or subscription)</li>
              <li>Save product box data to database with Stripe IDs</li>
              <li>Return success with both local and Stripe identifiers</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Error Handling:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Automatic rollback of Stripe resources if database save fails</li>
              <li>Detailed error messages with specific resolution steps</li>
              <li>Validation of Stripe account status before creation</li>
              <li>Comprehensive logging for debugging</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
