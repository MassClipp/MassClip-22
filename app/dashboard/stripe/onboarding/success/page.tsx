"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Loader2, ArrowRight } from "lucide-react"

export default function StripeOnboardingSuccessPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean
    message: string
    accountDetails?: any
  } | null>(null)

  // Get Firebase ID token
  const getIdToken = async () => {
    if (!user) return null
    try {
      return await user.getIdToken()
    } catch (error) {
      console.error("Failed to get ID token:", error)
      return null
    }
  }

  // Verify onboarding completion
  const verifyOnboardingCompletion = async () => {
    if (!user) return

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      // Check onboarding status
      const response = await fetch("/api/stripe/connect/onboarding-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to verify onboarding status")
      }

      const data = await response.json()

      setVerificationResult({
        success: data.connected,
        message: data.connected
          ? "Your Stripe account has been successfully connected!"
          : "Onboarding is still in progress. Please complete all required steps.",
        accountDetails: data.account,
      })
    } catch (error: any) {
      console.error("Error verifying onboarding:", error)
      setVerificationResult({
        success: false,
        message: `Error verifying connection: ${error.message}`,
      })
    } finally {
      setIsVerifying(false)
    }
  }

  // Verify on component mount
  useEffect(() => {
    if (user && !loading) {
      // Add a small delay to ensure Stripe has processed the onboarding
      setTimeout(() => {
        verifyOnboardingCompletion()
      }, 2000)
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>Please log in to view your onboarding status.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              {isVerifying ? (
                <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
              ) : verificationResult?.success ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <div className="h-8 w-8 bg-yellow-500 rounded-full" />
              )}
            </div>
            <CardTitle>
              {isVerifying
                ? "Verifying Your Connection..."
                : verificationResult?.success
                  ? "Successfully Connected!"
                  : "Setup In Progress"}
            </CardTitle>
            <CardDescription>
              {isVerifying ? "Please wait while we verify your Stripe account setup" : verificationResult?.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isVerifying ? (
              <div className="text-center">
                <p className="text-muted-foreground">We're confirming your Stripe account details...</p>
              </div>
            ) : verificationResult ? (
              <div className="space-y-4">
                {verificationResult.success ? (
                  <div className="space-y-4">
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-green-800">
                        Your Stripe account is now connected and ready to process payments!
                      </AlertDescription>
                    </Alert>

                    {verificationResult.accountDetails && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Account Details:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Account ID:</span>
                            <br />
                            <code className="text-xs">{verificationResult.accountDetails.id}</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Country:</span>
                            <br />
                            {verificationResult.accountDetails.country}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Charges Enabled:</span>
                            <br />
                            {verificationResult.accountDetails.charges_enabled ? "✅ Yes" : "❌ No"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Payouts Enabled:</span>
                            <br />
                            {verificationResult.accountDetails.payouts_enabled ? "✅ Yes" : "❌ No"}
                          </div>
                        </div>
                      </div>
                    )}

                    <Button onClick={() => router.push("/dashboard/earnings")} className="w-full" size="lg">
                      Go to Earnings Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertDescription>{verificationResult.message}</AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => router.push("/dashboard/stripe/onboarding")}
                        variant="outline"
                        className="flex-1"
                      >
                        Continue Setup
                      </Button>
                      <Button onClick={() => router.push("/dashboard/earnings")} className="flex-1">
                        Back to Dashboard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
