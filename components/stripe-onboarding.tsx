"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, DollarSign, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface StripeStatus {
  isOnboarded: boolean
  canReceivePayments: boolean
  accountId?: string
}

export default function StripeOnboarding() {
  const { user } = useAuth()
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnboarding, setIsOnboarding] = useState(false)

  // Check Stripe status on component mount
  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const checkStripeStatus = async () => {
    try {
      setIsLoading(true)
      const idToken = await user?.getIdToken()

      const response = await fetch("/api/stripe/check-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (response.ok) {
        const data = await response.json()
        setStripeStatus({
          isOnboarded: data.isOnboarded,
          canReceivePayments: data.canReceivePayments,
          accountId: data.accountId,
        })
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const startOnboarding = async () => {
    try {
      setIsOnboarding(true)
      const idToken = await user?.getIdToken()

      const response = await fetch("/api/stripe/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.onboardingUrl) {
          // Redirect to Stripe onboarding
          window.location.href = data.onboardingUrl
        } else if (data.alreadyOnboarded) {
          // Already onboarded, refresh status
          await checkStripeStatus()
        }
      } else {
        throw new Error("Failed to start onboarding")
      }
    } catch (error) {
      console.error("Error starting onboarding:", error)
    } finally {
      setIsOnboarding(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <span className="ml-2 text-zinc-400">Checking payment setup...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-green-500" />
          Payment Setup
        </CardTitle>
        <CardDescription>Connect your bank account to receive payments from premium video sales</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripeStatus?.isOnboarded ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Account Status</span>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payouts Enabled</span>
              <Badge
                variant={stripeStatus.canReceivePayments ? "default" : "secondary"}
                className={stripeStatus.canReceivePayments ? "bg-green-600" : ""}
              >
                {stripeStatus.canReceivePayments ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pending
                  </>
                )}
              </Badge>
            </div>

            <div className="p-3 bg-green-900/20 border border-green-900/50 rounded-lg">
              <p className="text-sm text-green-200">
                ✅ You're all set! You can now upload premium videos and receive payments.
              </p>
            </div>

            <Button variant="outline" onClick={checkStripeStatus} className="w-full">
              Refresh Status
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-200 mb-1">Payment setup required</p>
                  <p className="text-xs text-amber-300">
                    Connect your bank account to start selling premium videos and receive payouts.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-zinc-400">
              <p>• Secure connection via Stripe</p>
              <p>• MassClip takes 5% platform fee</p>
              <p>• Direct payouts to your bank account</p>
              <p>• Full transaction history</p>
            </div>

            <Button
              onClick={startOnboarding}
              disabled={isOnboarding}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isOnboarding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Bank Account
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
