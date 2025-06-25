"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react"

export default function StripeOnboardingTest() {
  const [accountStatus, setAccountStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/stripe/check-requirements")
      const data = await response.json()
      setAccountStatus(data)
    } catch (error) {
      console.error("Error checking status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteOnboarding = async () => {
    try {
      setRedirecting(true)
      const response = await fetch("/api/stripe/create-onboarding-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_url: `${window.location.origin}/dashboard/earnings`,
          return_url: `${window.location.origin}/dashboard/earnings`,
        }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Error creating onboarding link:", error)
    } finally {
      setRedirecting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Checking onboarding status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!accountStatus?.needsIdentityVerification) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-green-600">✅ Your account verification is complete!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Complete Account Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-500 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Your account is almost ready. Provide your SSN to complete onboarding and start accepting payments.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleCompleteOnboarding}
          disabled={redirecting}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {redirecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Complete Verification with Stripe
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          You'll be redirected to Stripe's secure platform to complete your account verification.
        </p>
      </CardContent>
    </Card>
  )
}
