"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  ExternalLink,
  Globe,
  Shield,
} from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import EarningsContent from "./earnings-content"

// Safe formatting functions
function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

interface StripeConnectionStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  status: string
}

function EarningsPage() {
  const [user, loading, error] = useAuthState(auth)
  const [stripeStatus, setStripeStatus] = useState<StripeConnectionStatus | null>(null)
  const [checkingStripe, setCheckingStripe] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Check Stripe connection status
  const checkStripeStatus = async () => {
    if (!user?.uid) return

    try {
      setCheckingStripe(true)
      setConnectionError(null)
      console.log("🔍 Checking Stripe connection status...")

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("🔍 Stripe status:", data)
        setStripeStatus(data)
      } else {
        console.log("🔍 No Stripe connection found")
        setStripeStatus({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          status: "not_connected",
        })
      }
    } catch (error) {
      console.error("🔍 Error checking Stripe status:", error)
      setConnectionError(error instanceof Error ? error.message : "Failed to check connection")
      setStripeStatus({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "error",
      })
    } finally {
      setCheckingStripe(false)
    }
  }

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  // Show loading while checking auth or Stripe status
  if (loading || checkingStripe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">{loading ? "Loading..." : "Checking Stripe connection..."}</p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-center text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show Stripe connection setup if not connected or not fully set up
  if (!stripeStatus?.connected || !stripeStatus?.chargesEnabled || !stripeStatus?.detailsSubmitted) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-purple-700 rounded-full shadow-lg">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-light text-white">Connect Your Stripe Account</h1>
          <p className="text-white/70">Start accepting payments and track your earnings</p>
        </div>

        {/* Benefits */}
        <div className="space-y-4">
          <h2 className="text-lg font-light text-white text-center">Why Connect Stripe?</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border border-gray-700/50 rounded-lg bg-transparent">
              <DollarSign className="w-6 h-6 text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">Accept Payments</h3>
                <p className="text-gray-400 text-sm">Process payments from customers worldwide</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-gray-700/50 rounded-lg bg-transparent">
              <Globe className="w-6 h-6 text-purple-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">Global Reach</h3>
                <p className="text-gray-400 text-sm">Supported in 40+ countries</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-gray-700/50 rounded-lg bg-transparent">
              <Shield className="w-6 h-6 text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">Secure & Reliable</h3>
                <p className="text-gray-400 text-sm">Bank-level security and encryption</p>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Card */}
        <Card className="bg-gray-800/30 border-purple-500/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Connect Your Stripe Account</h3>
                <p className="text-gray-400 text-sm">
                  Securely connect through Stripe Connect. If you don't have an account, Stripe will help you create
                  one.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300 text-sm">Secure OAuth connection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300 text-sm">Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300 text-sm">2.9% + 30¢ per transaction</span>
              </div>
            </div>

            <Button
              onClick={async () => {
                try {
                  setConnectionError(null)
                  const idToken = await user.getIdToken()
                  const response = await fetch("/api/stripe/connect/oauth", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ userId: user.uid }),
                  })
                  const data = await response.json()
                  if (!response.ok) throw new Error(data.error || "Failed to connect Stripe account")
                  if (data.authUrl) window.location.href = data.authUrl
                } catch (err) {
                  setConnectionError(err instanceof Error ? err.message : "Failed to connect account")
                }
              }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 hover:from-blue-700 hover:via-purple-700 hover:to-purple-800 text-white py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect with Stripe
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              You'll be redirected to Stripe to complete setup. If you don't have a Stripe account, one will be created
              for you automatically.
            </p>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Info className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-light text-white">How It Works</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-600 to-purple-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                1
              </div>
              <div>
                <h3 className="font-medium text-white">Click Connect</h3>
                <p className="text-gray-400 text-sm">Start the secure connection process with Stripe</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-600 to-purple-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                2
              </div>
              <div>
                <h3 className="font-medium text-white">Complete Setup</h3>
                <p className="text-gray-400 text-sm">Follow Stripe's secure onboarding process</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-600 to-purple-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                3
              </div>
              <div>
                <h3 className="font-medium text-white">Start Earning</h3>
                <p className="text-gray-400 text-sm">Begin accepting payments immediately</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {connectionError && (
          <Card className="border-red-600/50 bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">Error: {connectionError}</span>
              </div>
              <Button
                onClick={() => setConnectionError(null)}
                variant="outline"
                size="sm"
                className="mt-3 border-red-600/50 text-red-400 hover:bg-red-900/40"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Show the earnings dashboard if connected and set up
  return <EarningsContent />
}

function EarningsPageWithHeader() {
  return <EarningsPage />
}

export default EarningsPageWithHeader
