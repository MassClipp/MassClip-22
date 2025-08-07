"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, DollarSign, TrendingUp, CreditCard, Users, AlertCircle, CheckCircle, XCircle, Bug, Info, Loader2, ExternalLink, Globe, Shield, ArrowRight, Zap, Lock, BarChart3 } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import EarningsContent from './earnings-content'

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

export default function EarningsPage() {
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
          "Authorization": `Bearer ${idToken}`,
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
          status: "not_connected"
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
        status: "error"
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
          <p className="text-gray-400">
            {loading ? "Loading..." : "Checking Stripe connection..."}
          </p>
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
      <div className="min-h-screen">
        {/* Hero Section - Compact */}
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-700 rounded-full mb-4 shadow-lg">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Connect Your Stripe Account
          </h1>
          <p className="text-gray-400 mb-8">
            Start accepting payments and track your earnings
          </p>
        </div>

        {/* Benefits Section - Individual Cards */}
        <div className="grid grid-cols-3 gap-6 px-16 mb-12">
          <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Accept Payments</h3>
            <p className="text-gray-400 text-sm">Process payments from customers worldwide</p>
          </div>
          
          <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
            <Globe className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Global Reach</h3>
            <p className="text-gray-400 text-sm">Supported in 40+ countries</p>
          </div>
          
          <div className="border border-gray-700/50 rounded-lg text-center p-4 bg-transparent">
            <Shield className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Secure & Reliable</h3>
            <p className="text-gray-400 text-sm">Bank-level security and encryption</p>
          </div>
        </div>

        {/* Connection Cards - Compact */}
        <div className="grid grid-cols-2 gap-6 px-16 mb-12">
          {/* Create New Account */}
          <Card className="bg-gray-800/30 border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Create New Stripe Account</h3>
                <p className="text-gray-400 text-sm">Set up a new Stripe account to start accepting payments</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">Automatic payouts to your bank</span>
              </div>
            </div>
            
            <Button 
              onClick={async () => {
                try {
                  setConnectionError(null)
                  const idToken = await user.getIdToken()
                  const response = await fetch("/api/stripe/create-stripe-account", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ userId: user.uid }),
                  })
                  const data = await response.json()
                  if (!response.ok) throw new Error(data.error || "Failed to create Stripe account")
                  if (data.url) window.location.href = data.url
                } catch (err) {
                  setConnectionError(err instanceof Error ? err.message : "Failed to create account")
                }
              }}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Create Stripe Account
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              You'll be redirected to Stripe to complete setup
            </p>
          </Card>

          {/* Connect Existing Account */}
          <Card className="bg-gray-800/30 border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Already Have a Stripe Account?</h3>
                <p className="text-gray-400 text-sm">Securely connect your existing Stripe account through Stripe Connect</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">Secure OAuth connection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">No manual account IDs needed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 text-sm">Stripe handles account verification</span>
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
                      "Authorization": `Bearer ${idToken}`,
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
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
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
            
            <p className="text-xs text-gray-500 text-center mt-3">
              Stripe will detect your existing account and connect it securely
            </p>
          </Card>
        </div>

        {/* How It Works Section - Compact */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Info className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">How It Works</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-8 px-20">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Choose Your Option</h3>
              <p className="text-gray-400 text-sm">Create a new account or connect an existing one</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Complete Setup</h3>
              <p className="text-gray-400 text-sm">Follow Stripe's secure onboarding process</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Start Earning</h3>
              <p className="text-gray-400 text-sm">Begin accepting payments immediately</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {connectionError && (
          <div className="px-16 pb-8">
            <Card className="border-red-600/50 bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span>Error: {connectionError}</span>
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
          </div>
        )}
      </div>
    )
  }

  // Show the earnings dashboard if connected and set up
  return <EarningsContent />
}
