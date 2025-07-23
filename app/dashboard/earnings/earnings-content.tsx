"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useStripeEarnings } from "@/hooks/use-stripe-earnings"
import { RecentSales } from "@/components/recent-sales"
import { DollarSign, TrendingUp, Calendar, ExternalLink, Unlink, CreditCard, AlertCircle } from "lucide-react"
import { useState } from "react"

export function EarningsContent() {
  const { toast } = useToast()
  const [isUnlinking, setIsUnlinking] = useState(false)
  const earnings = useStripeEarnings()

  const handleUnlinkAccount = async () => {
    try {
      setIsUnlinking(true)
      const result = await earnings.unlinkStripeAccount()

      toast({
        title: "Success",
        description: result.message || "Stripe account unlinked successfully",
      })
    } catch (error: any) {
      console.error("Unlink error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to unlink Stripe account",
        variant: "destructive",
      })
    } finally {
      setIsUnlinking(false)
    }
  }

  const openStripeDashboard = () => {
    window.open("https://dashboard.stripe.com", "_blank")
  }

  // Show Stripe Connect interface for new users
  if (!earnings.loading && !earnings.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Connect Your Stripe Account</h1>
            <p className="text-xl text-gray-300">Start accepting payments and track your earnings</p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Accept Payments</h3>
                <p className="text-gray-400">Process payments from customers worldwide</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Global Reach</h3>
                <p className="text-gray-400">Supported in 40+ countries</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-8 w-8 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Secure & Reliable</h3>
                <p className="text-gray-400">Bank-level security and encryption</p>
              </CardContent>
            </Card>
          </div>

          {/* Connection Options */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Create New Account */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Create New Stripe Account
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Set up a new Stripe account to start accepting payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Quick 5-minute setup
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    2.9% + 30¢ per transaction
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Automatic payouts to your bank
                  </div>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.open("/dashboard/connect-stripe", "_self")}
                >
                  Create Stripe Account
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-gray-500 text-center">After creating your account, return here to link it</p>
              </CardContent>
            </Card>

            {/* Link Existing Account */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Link Existing Account
                </CardTitle>
                <CardDescription className="text-gray-400">Connect your existing Stripe account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Stripe Account ID</label>
                  <input
                    type="text"
                    placeholder="acct_1234567890"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Find this in your Stripe Dashboard → Settings → Account</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-600 hover:text-white bg-transparent"
                  onClick={() => window.open("/dashboard/connect-stripe", "_self")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Link Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (earnings.loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Show error state
  if (earnings.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Earnings</CardTitle>
            <CardDescription>There was an issue loading your earnings data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{earnings.error}</p>
            <Button onClick={earnings.refresh} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show earnings dashboard for connected users
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings Dashboard</h1>
          <p className="text-gray-600">Track your revenue and manage payouts</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Stripe Connected
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earnings.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earnings.last30Days.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Recent performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earnings.thisMonth.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earnings.lastMonth.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Previous month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Sales */}
        <div className="lg:col-span-2">
          <RecentSales transactions={earnings.recentTransactions} loading={earnings.loading} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your content and earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => window.open("/dashboard/upload", "_self")} className="w-full justify-start">
                Upload New Content
              </Button>

              <Button onClick={openStripeDashboard} variant="outline" className="w-full justify-start bg-transparent">
                <ExternalLink className="mr-2 h-4 w-4" />
                Stripe Dashboard
              </Button>

              <Button
                onClick={handleUnlinkAccount}
                variant="outline"
                disabled={isUnlinking}
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
              >
                <Unlink className="mr-2 h-4 w-4" />
                {isUnlinking ? "Unlinking..." : "Unlink Stripe Account"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
