"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"

export default function OnboardingSuccessPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean
    message: string
    accountConnected?: boolean
  } | null>(null)

  // Verify onboarding completion
  const verifyOnboarding = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/onboarding-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.connected) {
          setVerificationResult({
            success: true,
            message: "Your Stripe account has been successfully connected!",
            accountConnected: true,
          })
        } else {
          setVerificationResult({
            success: false,
            message: "Your Stripe account setup is not yet complete. You may need to finish some additional steps.",
            accountConnected: false,
          })
        }
      } else {
        setVerificationResult({
          success: false,
          message: "Unable to verify your Stripe account status. Please try again.",
          accountConnected: false,
        })
      }
    } catch (error) {
      console.error("Error verifying onboarding:", error)
      setVerificationResult({
        success: false,
        message: "An error occurred while verifying your account. Please try again.",
        accountConnected: false,
      })
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      // Wait a moment for Stripe to process, then verify
      const timer = setTimeout(() => {
        verifyOnboarding()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [user, loading, router])

  const handleContinue = () => {
    router.push("/dashboard/earnings")
  }

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
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isVerifying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : verificationResult?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Stripe Onboarding Complete
            </CardTitle>
            <CardDescription>
              {isVerifying
                ? "Verifying your Stripe account setup..."
                : "Thank you for completing the Stripe onboarding process"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isVerifying ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Please wait while we verify your Stripe account setup...</p>
              </div>
            ) : verificationResult ? (
              <div className="space-y-4">
                <Alert className={verificationResult.success ? "border-green-500" : "border-yellow-500"}>
                  {verificationResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{verificationResult.message}</AlertDescription>
                </Alert>

                {verificationResult.success ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">Your Stripe account is now ready to:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Accept payments from customers</li>
                      <li>Receive automatic payouts to your bank account</li>
                      <li>View earnings and transaction history</li>
                      <li>Manage your payment settings</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      You may need to complete additional verification steps in your Stripe dashboard.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Don't worry - you can continue this process later from your earnings page.
                    </p>
                  </div>
                )}

                <Button onClick={handleContinue} className="w-full">
                  Continue to Earnings Dashboard
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
