"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useToast } from "@/hooks/use-toast"
import StripeConnectButton from "@/components/stripe-connect-button"

interface StripeStatus {
  connected: boolean
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  email?: string
}

function EarningsContent() {
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useFirebaseAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // Check for connection success/refresh parameters
  const connected = searchParams.get("connected")
  const refresh = searchParams.get("refresh")

  useEffect(() => {
    if (connected === "true") {
      toast({
        title: "Stripe Connected!",
        description: "Your Stripe account has been successfully connected. You can now start accepting payments.",
      })
      
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete("connected")
      window.history.replaceState({}, "", url.toString())
    }
    
    if (refresh === "true") {
      toast({
        title: "Please Complete Setup",
        description: "Please complete your Stripe account setup to start accepting payments.",
        variant: "destructive",
      })
      
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete("refresh")
      window.history.replaceState({}, "", url.toString())
    }
  }, [connected, refresh, toast])

  useEffect(() => {
    checkStripeStatus()
  }, [user])

  const checkStripeStatus = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const idToken = await user.getIdToken()
      
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setStripeStatus(data)
      } else {
        console.error("Failed to check Stripe status:", data)
        toast({
          title: "Status Check Failed",
          description: data.error || "Could not check Stripe connection status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
      toast({
        title: "Connection Error",
        description: "Failed to check Stripe status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="text-muted-foreground">
          Track your earnings and manage your Stripe account
        </p>
      </div>

      {/* Stripe Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Setup
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to start accepting payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stripeStatus?.connected ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You need to connect your Stripe account to start earning money from your content.
                </AlertDescription>
              </Alert>
              
              <StripeConnectButton
                isConnected={false}
                onConnectionChange={checkStripeStatus}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your Stripe account is connected and ready to accept payments!
                </AlertDescription>
              </Alert>
              
              <StripeConnectButton
                isConnected={true}
                accountId={stripeStatus.accountId || undefined}
                onConnectionChange={checkStripeStatus}
              />
              
              <div className="grid gap-2 text-sm bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Account Status</h4>
                <div className="flex justify-between">
                  <span>Charges Enabled:</span>
                  <span className={stripeStatus.chargesEnabled ? "text-green-600 font-medium" : "text-red-600"}>
                    {stripeStatus.chargesEnabled ? "✓ Yes" : "✗ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payouts Enabled:</span>
                  <span className={stripeStatus.payoutsEnabled ? "text-green-600 font-medium" : "text-red-600"}>
                    {stripeStatus.payoutsEnabled ? "✓ Yes" : "✗ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Details Submitted:</span>
                  <span className={stripeStatus.detailsSubmitted ? "text-green-600 font-medium" : "text-red-600"}>
                    {stripeStatus.detailsSubmitted ? "✓ Yes" : "✗ No"}
                  </span>
                </div>
                {stripeStatus.email && (
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="text-gray-600">{stripeStatus.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              {stripeStatus?.connected ? "No sales yet" : "Connect Stripe to start earning"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              No sales this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Payout</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              No payouts yet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your latest earnings and payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {!stripeStatus?.connected 
              ? "Connect your Stripe account to see transactions"
              : "No transactions yet. Start selling your content to see earnings here."
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EarningsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <EarningsContent />
    </Suspense>
  )
}
