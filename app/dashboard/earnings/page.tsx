"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Calendar, CreditCard, AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { StripeConnectionPrompt } from "@/components/stripe-connection-prompt"
import { toast } from "sonner"

interface StripeAccountStatus {
  connected: boolean
  accountId?: string
  status?: "pending" | "complete" | "restricted"
  businessType?: "individual" | "company"
  detailsSubmitted?: boolean
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  requirements?: string[]
}

export default function EarningsPage() {
  const { user, loading } = useAuth()
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const checkStripeStatus = async () => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connection-status", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStripeStatus(data)
      } else {
        setStripeStatus({ connected: false })
      }
    } catch (error) {
      console.error("Failed to check Stripe status:", error)
      setStripeStatus({ connected: false })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    await checkStripeStatus()
    setIsRefreshing(false)
    toast.success("Status refreshed")
  }

  useEffect(() => {
    if (user && !loading) {
      checkStripeStatus()
    }
  }, [user, loading])

  // Check for URL parameters (success, error, etc.)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const error = urlParams.get("error")
    const connected = urlParams.get("connected")

    if (success === "true") {
      if (connected === "true") {
        toast.success("Successfully connected your existing Stripe account!")
      } else {
        toast.success("Stripe account setup completed!")
      }
      // Refresh status after successful connection
      setTimeout(() => {
        checkStripeStatus()
      }, 1000)
    }

    if (error) {
      switch (error) {
        case "oauth_failed":
          toast.error("Failed to connect existing account. Please try again.")
          break
        case "invalid_callback":
          toast.error("Invalid connection callback. Please try again.")
          break
        case "connection_failed":
          toast.error("Connection failed. Please try again.")
          break
        default:
          toast.error("An error occurred. Please try again.")
      }
    }

    // Clean up URL parameters
    if (success || error) {
      window.history.replaceState({}, "", "/dashboard/earnings")
    }
  }, [])

  if (loading || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800">Complete</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "restricted":
        return <Badge className="bg-red-100 text-red-800">Restricted</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="text-gray-600">Manage your payments and track your revenue</p>
        </div>
        {stripeStatus?.connected && (
          <Button onClick={handleRefreshStatus} disabled={isRefreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>
        )}
      </div>

      {/* Stripe Connection Status */}
      {!stripeStatus?.connected ? (
        <div className="space-y-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-900">Connect Your Stripe Account</CardTitle>
              </div>
              <CardDescription className="text-orange-700">
                To start earning money from your content, you need to connect a Stripe account for payment processing.
              </CardDescription>
            </CardHeader>
          </Card>

          <StripeConnectionPrompt
            onConnectionStart={() => {
              toast.info("Redirecting to Stripe...")
            }}
            onConnectionComplete={() => {
              checkStripeStatus()
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle>Stripe Account Connected</CardTitle>
                </div>
                {getStatusBadge(stripeStatus.status)}
              </div>
              <CardDescription>Account ID: {stripeStatus.accountId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Account Type</p>
                  <p className="text-sm text-gray-600 capitalize">{stripeStatus.businessType || "Individual"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Capabilities</p>
                  <div className="flex gap-2">
                    <Badge variant={stripeStatus.chargesEnabled ? "default" : "secondary"}>
                      {stripeStatus.chargesEnabled ? "Charges Enabled" : "Charges Disabled"}
                    </Badge>
                    <Badge variant={stripeStatus.payoutsEnabled ? "default" : "secondary"}>
                      {stripeStatus.payoutsEnabled ? "Payouts Enabled" : "Payouts Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>

              {stripeStatus.requirements && stripeStatus.requirements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-600">Outstanding Requirements</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {stripeStatus.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Earnings Overview */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">+0% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Total sales</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest sales and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Start selling content to see your earnings here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
