import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, CreditCard, DollarSign, Shield, Zap } from "lucide-react"
import { StripeAccountLinker } from "@/components/stripe-account-linker"

export default function ConnectStripePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Connect Your Stripe Account</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Connect your Stripe account to start receiving payments for your premium content. Our platform handles all
            the technical integration while you focus on creating great content.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="text-center">
              <Zap className="h-8 w-8 mx-auto text-purple-600" />
              <CardTitle className="text-lg">Express Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Quick onboarding with minimal information required to get started
              </p>
            </CardContent>
          </Card>

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
              <CardTitle className="text-lg">Competitive Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                2.9% + 30¢ per transaction with automatic payouts to your bank
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Shield className="h-8 w-8 mx-auto text-indigo-600" />
              <CardTitle className="text-lg">Global Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Accept payments from customers worldwide in multiple currencies
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Connection Interface */}
        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <span className="ml-2">Loading connection status...</span>
                </div>
              </CardContent>
            </Card>
          }
        >
          <StripeAccountLinker />
        </Suspense>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Need Help?
            </CardTitle>
            <CardDescription>Resources and support for connecting your Stripe account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Don't have a Stripe account?</h3>
                <p className="text-sm text-gray-600 mb-3">
                  You can create one during the connection process, or create one beforehand at Stripe.
                </p>
                <Button asChild variant="outline" size="sm">
                  <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Create Stripe Account
                  </a>
                </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-medium text-amber-900 mb-2">What you'll need:</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Business information (can be individual/sole proprietor)</li>
                  <li>• Bank account details for payouts</li>
                  <li>• Government-issued ID for identity verification</li>
                  <li>• Tax identification number (SSN for individuals)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
