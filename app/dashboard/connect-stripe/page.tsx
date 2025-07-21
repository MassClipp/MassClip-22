import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, CreditCard, DollarSign, Shield } from "lucide-react"
import { StripeAccountLinker } from "@/components/stripe-account-linker"

export default function ConnectStripePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Connect Your Stripe Account</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Connect your Stripe account to start receiving payments for your premium content. Stripe handles all payment
            processing securely and efficiently.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center">
              <CreditCard className="h-8 w-8 mx-auto text-blue-600" />
              <CardTitle className="text-lg">Secure Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Industry-leading security with PCI compliance and fraud protection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <DollarSign className="h-8 w-8 mx-auto text-green-600" />
              <CardTitle className="text-lg">Low Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                2.9% + 30¢ per transaction with automatic payouts to your bank
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Shield className="h-8 w-8 mx-auto text-purple-600" />
              <CardTitle className="text-lg">Global Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Accept payments from customers worldwide in multiple currencies
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create New Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Create New Stripe Account
            </CardTitle>
            <CardDescription>Don't have a Stripe account yet? Create one to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">What you'll need:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Business information and tax ID</li>
                  <li>• Bank account for payouts</li>
                  <li>• Government-issued ID for verification</li>
                </ul>
              </div>

              <Button asChild className="w-full">
                <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Create Stripe Account
                </a>
              </Button>

              <p className="text-xs text-gray-500 text-center">After creating your account, return here to link it</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Linker */}
        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              </CardContent>
            </Card>
          }
        >
          <StripeAccountLinker />
        </Suspense>
      </div>
    </div>
  )
}
