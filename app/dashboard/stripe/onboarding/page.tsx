"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, ExternalLink } from "lucide-react"

export default function StripeOnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRefresh = searchParams.get("refresh") === "true"

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleReturnToEarnings = () => {
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
              {isRefresh ? <ExternalLink className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              Stripe Onboarding
            </CardTitle>
            <CardDescription>
              {isRefresh
                ? "Continue setting up your Stripe account"
                : "Complete your Stripe account setup to start accepting payments"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRefresh ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  It looks like you need to complete additional steps in your Stripe onboarding process.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you were redirected here, please return to the earnings page and try the onboarding process again.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You'll be redirected to Stripe to complete your account setup. This process includes:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Verifying your identity</li>
                  <li>Adding your business information</li>
                  <li>Setting up your bank account for payouts</li>
                  <li>Reviewing terms and conditions</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  After completing the setup, you'll be redirected back to your earnings dashboard.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleReturnToEarnings} variant="outline">
                Return to Earnings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
