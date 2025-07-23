"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import StripeConnectButton from "@/components/stripe-connect-button"

interface StripeStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  email?: string
}

export default function ConnectStripePage() {
  const searchParams = useSearchParams()
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Handle URL parameters
  const success = searchParams.get("success")
  const urlError = searchParams.get("error")
  const errorDescription = searchParams.get("description")
  const accountId = searchParams.get("account_id")

  const fetchStripeStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/stripe/connect/status")
      const data = await response.json()

      if (response.ok) {
        setStripeStatus(data)
      } else {
        setError(data.error || "Failed to fetch Stripe status")
      }
    } catch (err) {
      console.error("Error fetching Stripe status:", err)
      setError("Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStripeStatus()
  }, [])

  const getStatusMessage = () => {
    if (!stripeStatus?.connected) {
      return {
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        title: "Stripe Not Connected",
        description: "Connect your Stripe account to start receiving payments",
        variant: "default" as const,
      }
    }

    if (!stripeStatus.detailsSubmitted) {
      return {
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        title: "Setup Incomplete",
        description: "Complete your Stripe account setup to enable payments",
        variant: "default" as const,
      }
    }

    if (!stripeStatus.chargesEnabled || !stripeStatus.payoutsEnabled) {
      return {
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        title: "Account Under Review",
        description: "Your account is being reviewed by Stripe. This usually takes 1-2 business days.",
        variant: "default" as const,
      }
    }

    return {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Stripe Connected Successfully",
      description: "Your account is ready to receive payments",
      variant: "default" as const,
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Connect Stripe</h1>
          <p className="text-muted-foreground mt-2">
            Connect your Stripe account to start receiving payments from your content sales.
          </p>
        </div>

        {/* Success Message */}
        {success === "true" && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully connected to Stripe! {accountId && `Account ID: ${accountId}`}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {urlError && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              {urlError === "access_denied" && "You cancelled the Stripe connection process."}
              {urlError === "invalid_state" && "Invalid security token. Please try again."}
              {urlError === "expired_state" && "Security token expired. Please try again."}
              {urlError === "missing_parameters" && "Missing required parameters from Stripe."}
              {urlError === "callback_failed" && "Failed to process Stripe response."}
              {!["access_denied", "invalid_state", "expired_state", "missing_parameters", "callback_failed"].includes(
                urlError,
              ) &&
                (errorDescription || "An error occurred during Stripe connection.")}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
              </svg>
              Stripe Integration
            </CardTitle>
            <CardDescription>Manage your Stripe account connection and payment settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading Stripe status...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <XCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Status Alert */}
                <Alert variant={getStatusMessage().variant}>
                  {getStatusMessage().icon}
                  <AlertDescription>
                    <div>
                      <div className="font-medium">{getStatusMessage().title}</div>
                      <div className="text-sm mt-1">{getStatusMessage().description}</div>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Account Details */}
                {stripeStatus?.connected && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Account Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Account ID:</span>
                        <div className="font-mono text-xs mt-1">{stripeStatus.accountId}</div>
                      </div>
                      {stripeStatus.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <div className="mt-1">{stripeStatus.email}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Charges:</span>
                        <div className={`mt-1 ${stripeStatus.chargesEnabled ? "text-green-600" : "text-yellow-600"}`}>
                          {stripeStatus.chargesEnabled ? "Enabled" : "Pending"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payouts:</span>
                        <div className={`mt-1 ${stripeStatus.payoutsEnabled ? "text-green-600" : "text-yellow-600"}`}>
                          {stripeStatus.payoutsEnabled ? "Enabled" : "Pending"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <StripeConnectButton
                    isConnected={stripeStatus?.connected}
                    accountId={stripeStatus?.accountId}
                    onConnectionChange={fetchStripeStatus}
                  />

                  {stripeStatus?.connected && (
                    <Button variant="outline" onClick={() => fetchStripeStatus()}>
                      <Loader2 className="w-4 h-4 mr-2" />
                      Refresh Status
                    </Button>
                  )}
                </div>

                {/* Help Text */}
                {!stripeStatus?.connected && (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      <strong>What happens next?</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Click "Connect with Stripe" to start the setup process</li>
                      <li>You'll be redirected to Stripe to create or connect your account</li>
                      <li>Complete the required business information</li>
                      <li>Once approved, you can start receiving payments</li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
