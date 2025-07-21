"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function OnboardingSuccessPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isComplete, setIsComplete] = useState(false)

  const accountId = searchParams.get("account")

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
        setIsComplete(data.connected)

        if (data.connected) {
          console.log("✅ Onboarding completed successfully!")
        }
      }
    } catch (error) {
      console.error("Error verifying onboarding:", error)
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    if (user) {
      // Wait a moment for Stripe to process, then verify
      const timer = setTimeout(() => {
        verifyOnboarding()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [user])

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {isVerifying ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            ) : isComplete ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <CheckCircle className="h-6 w-6 text-yellow-500" />
            )}
            {isVerifying ? "Verifying Setup..." : isComplete ? "Setup Complete!" : "Almost Done!"}
          </CardTitle>
          <CardDescription>
            {isVerifying
              ? "We're verifying your Stripe account setup..."
              : isComplete
                ? "Your Stripe account is ready to accept payments"
                : "Your account setup is processing"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountId && (
            <div className="text-sm text-muted-foreground text-center">
              <p>
                Account ID: <code className="bg-muted px-2 py-1 rounded">{accountId}</code>
              </p>
            </div>
          )}

          {!isVerifying && (
            <div className="space-y-3">
              {isComplete ? (
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-700">🎉 Congratulations!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your Stripe Express account is now connected and ready to process payments. You can start selling
                      your content immediately.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/dashboard/earnings">
                      <Button className="w-full">View Earnings</Button>
                    </Link>
                    <Link href="/dashboard/upload">
                      <Button variant="outline" className="w-full bg-transparent">
                        Upload Content
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your account setup is still processing. This can take a few minutes.
                  </p>

                  <div className="space-y-2">
                    <Button onClick={verifyOnboarding} variant="outline" className="w-full bg-transparent">
                      <Loader2 className="h-4 w-4 mr-2" />
                      Check Status Again
                    </Button>

                    <Link href="/dashboard/earnings">
                      <Button variant="ghost" className="w-full">
                        Continue to Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
