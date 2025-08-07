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
import { StripeAccountSetupPrompt } from '@/components/stripe-account-setup-prompt'
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
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                Earnings
                <Badge variant="destructive">Not Connected</Badge>
              </h1>
              <p className="text-gray-400 mt-1">Financial overview and performance metrics</p>
            </div>
            <Button
              onClick={checkStripeStatus}
              disabled={checkingStripe}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${checkingStripe ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Stripe Account Setup Prompt */}
          <StripeAccountSetupPrompt />

          {/* Preview Cards - Disabled State */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gray-800/30 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">$0.00</div>
                <p className="text-xs text-gray-500">All-time revenue</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/30 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">$0.00</div>
                <p className="text-xs text-gray-500">+0.0% from last month</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/30 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Available Balance</CardTitle>
                <CreditCard className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">$0.00</div>
                <p className="text-xs text-gray-500">Ready for payout</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/30 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Sales</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">0</div>
                <p className="text-xs text-gray-500">$0.00 avg order</p>
              </CardContent>
            </Card>
          </div>

          {/* Benefits Section */}
          <Card className="bg-gray-800/30 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-400" />
                Why Connect Your Stripe Account?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Accept Payments</h3>
                  <p className="text-gray-400 text-sm">Start earning money from your premium content and bundles</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Global Reach</h3>
                  <p className="text-gray-400 text-sm">Accept payments from customers worldwide in multiple currencies</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Secure & Reliable</h3>
                  <p className="text-gray-400 text-sm">Bank-level security with automatic fraud protection</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {connectionError && (
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
          )}
        </div>
      </div>
    )
  }

  // Show the earnings dashboard if connected and set up
  return <EarningsContent />
}
