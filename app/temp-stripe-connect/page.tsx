"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react"

export default function TempStripeConnectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const success = searchParams.get("success")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const accountId = searchParams.get("account")
  const onboardingNeeded = searchParams.get("onboarding_needed")

  useEffect(() => {
    // Simulate loading and then redirect or show status
    const timer = setTimeout(() => {
      setIsLoading(false)

      if (onboardingNeeded === "true") {
        setNeedsOnboarding(true)
      } else if (success === "true" && !error) {
        // Successful connection, redirect to earnings page after a moment
        setTimeout(() => {
          router.push("/dashboard/earnings")
        }, 2000)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [success, error, onboardingNeeded, router])

  const handleCompleteOnboarding = async () => {
    try {
      const response = await fetch("/api/stripe/create-account-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        }
      }
    } catch (error) {
      console.error("Error creating account link:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-zinc-400">Processing your Stripe connection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Success State */}
        {success === "true" && !error && !needsOnboarding && (
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-white">Successfully Connected!</CardTitle>
              <CardDescription>Your Stripe account has been connected successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountId && (
                <div className="text-center">
                  <p className="text-sm text-zinc-400">Account ID:</p>
                  <p className="text-sm font-mono text-zinc-300">{accountId}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-zinc-400">Redirecting to your earnings dashboard...</p>
              </div>
              <Button onClick={() => router.push("/dashboard/earnings")} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Onboarding Needed State */}
        {needsOnboarding && (
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
              <CardTitle className="text-white">Complete Your Setup</CardTitle>
              <CardDescription>Your account is connected but needs additional setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-zinc-300">
                  To start accepting payments, you need to complete your Stripe onboarding.
                </p>
                <p className="text-xs text-zinc-400">
                  This includes verifying your identity and providing business details.
                </p>
              </div>

              <Button onClick={handleCompleteOnboarding} className="w-full bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Complete Stripe Setup
              </Button>

              <Button variant="outline" onClick={() => router.push("/dashboard/earnings")} className="w-full">
                Continue to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <CardTitle className="text-white">Connection Failed</CardTitle>
              <CardDescription>There was an issue connecting your Stripe account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  <strong>Error:</strong> {error}
                  {errorDescription && (
                    <>
                      <br />
                      <span className="text-sm">{decodeURIComponent(errorDescription)}</span>
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button onClick={() => router.push("/dashboard/earnings")} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
