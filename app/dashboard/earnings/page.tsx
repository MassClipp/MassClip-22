"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  Loader2,
  DollarSign,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Link,
  Info,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format, formatDistanceToNow } from "date-fns"
import { useStripeEarnings } from "@/hooks/use-stripe-earnings"
import { useToast } from "@/components/ui/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { StripeAccountLinker } from "@/components/stripe-account-linker"
import { useRouter } from "next/navigation"

export default function EarningsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data, loading, error, lastUpdated, refresh, syncData, isConnected } = useStripeEarnings()
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  // Add this after the useState declarations
  console.log("Stripe connection status:", { isConnected, loading, hasData: !!data })

  const handleSync = async () => {
    try {
      setSyncing(true)
      await syncData()
      toast({
        title: "Sync Complete",
        description: "Stripe data has been synchronized successfully.",
      })
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "Failed to sync Stripe data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleRefresh = async () => {
    try {
      await refresh()
      toast({
        title: "Data Refreshed",
        description: "Latest earnings data has been fetched from Stripe.",
      })
    } catch (error) {
      toast({
        title: "Refresh Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading earnings data...</p>
        </div>
      </div>
    )
  }

  // If user doesn't have a connected Stripe account or data is empty with no error (indicating no connection)
  if (!isConnected || (data && Object.keys(data).length === 0) || (!data && !loading)) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings Dashboard</h1>
          <p className="text-zinc-400 mt-1">Connect your Stripe account to view comprehensive earnings data</p>
        </div>

        {/* Connection Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create New Account */}
          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-400" />
                Create New Stripe Account
              </CardTitle>
              <CardDescription>
                Set up a new Stripe account to start accepting payments and track earnings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>Accept payments worldwide</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>Automatic payouts to your bank</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>Comprehensive analytics</span>
                </div>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => window.open("https://dashboard.stripe.com/register", "_blank")}
              >
                Create Stripe Account
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Link Existing Account */}
          <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5 text-green-400" />
                Link Existing Account
              </CardTitle>
              <CardDescription>
                Connect your existing Stripe account to view earnings and transaction data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripeAccountLinker onSuccess={() => window.location.reload()} />
            </CardContent>
          </Card>
        </div>

        {/* Setup Guide */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              Stripe Account Setup Guide
            </CardTitle>
            <CardDescription>Follow these steps to properly set up your Stripe account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="new" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">New Account</TabsTrigger>
                <TabsTrigger value="existing">Existing Account</TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-900/30 text-blue-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Create a Stripe Account</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Click the "Create Stripe Account" button above to register for a new Stripe account. You'll need
                        to provide your email address and create a password.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-900/30 text-blue-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Business Information</h3>
                      <p className="text-sm text-zinc-400 mt-1">Provide your business details including:</p>
                      <ul className="list-disc list-inside text-sm text-zinc-400 mt-1 space-y-1">
                        <li>Business name and address</li>
                        <li>Business type (individual, company, non-profit, etc.)</li>
                        <li>Industry and website (if applicable)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-900/30 text-blue-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Tax Information</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        You'll need to provide your tax identification information:
                      </p>
                      <ul className="list-disc list-inside text-sm text-zinc-400 mt-1 space-y-1">
                        <li>Social Security Number (SSN) or Employer Identification Number (EIN)</li>
                        <li>Date of birth</li>
                        <li>Personal address</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-900/30 text-blue-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Banking Details</h3>
                      <p className="text-sm text-zinc-400 mt-1">Connect your bank account to receive payouts:</p>
                      <ul className="list-disc list-inside text-sm text-zinc-400 mt-1 space-y-1">
                        <li>Bank account number</li>
                        <li>Routing number</li>
                        <li>Account holder name</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-900/30 text-blue-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      5
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Identity Verification</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Stripe will verify your identity to comply with financial regulations. You may need to upload:
                      </p>
                      <ul className="list-disc list-inside text-sm text-zinc-400 mt-1 space-y-1">
                        <li>Government-issued photo ID (driver's license, passport)</li>
                        <li>Proof of address (utility bill, bank statement)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-900/30 text-blue-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      6
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Return to MassClip</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        After completing your Stripe account setup, return to MassClip and click "Link Existing Account"
                        to connect your new Stripe account.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="existing" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-900/30 text-green-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Enter Your Stripe Account ID</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Use the form above to enter your Stripe account ID (starts with "acct_"). You can find this in
                        your Stripe dashboard under Settings → Account.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-green-900/30 text-green-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Authorize Connection</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        You'll be redirected to Stripe to authorize the connection between your Stripe account and
                        MassClip. This gives MassClip permission to process payments and view transaction data.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-green-900/30 text-green-400 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Complete Verification</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        If your Stripe account hasn't completed all verification steps, you may be prompted to provide
                        additional information to ensure compliance with financial regulations.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium text-white">What fees does Stripe charge?</h3>
              <p className="text-sm text-zinc-400">
                Stripe charges 2.9% + 30¢ per successful transaction. MassClip takes an additional 5% platform fee.
                These fees are automatically deducted from each transaction.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-white">How long do payouts take?</h3>
              <p className="text-sm text-zinc-400">
                For new accounts, the first payout typically takes 7-14 days. After that, payouts are processed on a
                2-day rolling basis (standard) or 7-day rolling basis (depending on your country and account status).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-white">Is my information secure?</h3>
              <p className="text-sm text-zinc-400">
                Yes. Stripe is PCI compliant and uses bank-level encryption to protect your sensitive information.
                MassClip never stores your banking details or tax information.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-white">What countries are supported?</h3>
              <p className="text-sm text-zinc-400">
                Stripe supports businesses in 40+ countries.{" "}
                <a
                  href="https://stripe.com/global"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  View the full list here
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h3 className="font-medium mb-1">Find Your Account ID</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Go to your Stripe dashboard and look for your account ID (starts with "acct_")
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://dashboard.stripe.com/settings/account", "_blank")}
                >
                  Open Stripe Settings
                </Button>
              </div>

              <div className="text-center p-4">
                <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-medium mb-1">Verification Required</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Complete identity verification to enable payouts and full functionality
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://stripe.com/docs/connect/identity-verification", "_blank")}
                >
                  Learn More
                </Button>
              </div>

              <div className="text-center p-4">
                <ExternalLink className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h3 className="font-medium mb-1">Stripe Documentation</h3>
                <p className="text-sm text-zinc-400 mb-3">Learn about Stripe Connect and how to manage your account</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://stripe.com/docs/connect", "_blank")}
                >
                  View Docs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = data || {
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    last30DaysEarnings: 0,
    pendingPayout: 0,
    availableBalance: 0,
    salesMetrics: {
      totalSales: 0,
      thisMonthSales: 0,
      last30DaysSales: 0,
      averageTransactionValue: 0,
    },
    accountStatus: {
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCount: 0,
    },
    recentTransactions: [],
    payoutHistory: [],
    monthlyBreakdown: [],
  }

  const hasFullStripeData = data && !data.error && data.payoutHistory && data.payoutHistory.length > 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
      case "paid":
        return "text-green-500"
      case "pending":
        return "text-yellow-500"
      case "failed":
        return "text-red-500"
      default:
        return "text-zinc-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
      case "paid":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings Dashboard</h1>
          <p className="text-zinc-400 mt-1">Financial overview and transaction history</p>
          {lastUpdated && (
            <p className="text-xs text-zinc-500 mt-1">
              Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing || loading}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Sync Data
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-amber-600 bg-amber-600/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-amber-200">{error}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400 mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-white">${stats.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-green-300 mt-1">{stats.salesMetrics.totalSales} total sales</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400 mb-1">This Month</p>
                <p className="text-2xl font-bold text-white">${stats.thisMonthEarnings.toFixed(2)}</p>
                <p className="text-xs text-blue-300 mt-1">{stats.salesMetrics.thisMonthSales} sales</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-400 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-white">${stats.availableBalance.toFixed(2)}</p>
                <p className="text-xs text-purple-300 mt-1">Ready for payout</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 border-amber-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-400 mb-1">Pending Payout</p>
                <p className="text-2xl font-bold text-white">${stats.pendingPayout.toFixed(2)}</p>
                <p className="text-xs text-amber-300 mt-1">Processing</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Breakdown Chart - Enhanced with Financial Data */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Financial Performance</CardTitle>
            <CardDescription>Revenue trends and projections</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Create sample data based on current earnings */}
            {(() => {
              const sampleData = [
                { month: "Oct", earnings: 0, projected: false },
                { month: "Nov", earnings: 0, projected: false },
                { month: "Dec", earnings: stats.thisMonthEarnings, projected: false },
                { month: "Jan", earnings: stats.thisMonthEarnings * 1.2, projected: true },
                { month: "Feb", earnings: stats.thisMonthEarnings * 1.4, projected: true },
                { month: "Mar", earnings: stats.thisMonthEarnings * 1.6, projected: true },
              ]

              return (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sampleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `$${value.toFixed(2)}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any, name: any) => [
                        `$${value.toFixed(2)}`,
                        name === "earnings" ? "Actual" : "Projected",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                      strokeDasharray={(entry: any) => (entry?.projected ? "5 5" : "0")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )
            })()}
          </CardContent>
        </Card>

        {/* Sales Metrics */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Sales Metrics</CardTitle>
            <CardDescription>Performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Average Transaction Value</span>
                <span className="font-medium">${stats.salesMetrics.averageTransactionValue.toFixed(2)}</span>
              </div>
              <Progress value={Math.min(stats.salesMetrics.averageTransactionValue * 10, 100)} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Last 30 Days Sales</span>
                <span className="font-medium">{stats.salesMetrics.last30DaysSales}</span>
              </div>
              <Progress value={Math.min(stats.salesMetrics.last30DaysSales * 5, 100)} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-2xl font-bold text-green-500">${stats.last30DaysEarnings.toFixed(2)}</p>
                <p className="text-xs text-zinc-400">Last 30 Days</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-2xl font-bold text-blue-500">{stats.salesMetrics.totalSales}</p>
                <p className="text-xs text-zinc-400">Total Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions and Payouts */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent transactions and payout history</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transactions">
            <TabsList className="bg-zinc-800/50">
              <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
              <TabsTrigger value="payouts">Payout History</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={getStatusColor(transaction.status)}>{getStatusIcon(transaction.status)}</div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-zinc-400">
                            {format(new Date(transaction.created), "MMM d, yyyy • h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-500">+${transaction.net.toFixed(2)}</p>
                        <p className="text-sm text-zinc-400">Fee: ${transaction.fee.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">No transactions yet</div>
              )}
            </TabsContent>

            <TabsContent value="payouts" className="mt-6">
              {stats.payoutHistory && stats.payoutHistory.length > 0 ? (
                <div className="space-y-4">
                  {stats.payoutHistory.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={getStatusColor(payout.status)}>{getStatusIcon(payout.status)}</div>
                        <div>
                          <p className="font-medium">Payout to {payout.method || "bank account"}</p>
                          <p className="text-sm text-zinc-400">
                            {format(new Date(payout.created), "MMM d, yyyy")}
                            {payout.arrivalDate && <> • Arrives {format(new Date(payout.arrivalDate), "MMM d")}</>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${payout.amount.toFixed(2)} {payout.currency}
                        </p>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">No payouts yet</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Stripe Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("https://dashboard.stripe.com/balance", "_blank")}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Balance
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("https://dashboard.stripe.com/payouts", "_blank")}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Payout Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      {stats.accountStatus && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                {stats.accountStatus.chargesEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Charges</span>
              </div>
              <div className="flex items-center gap-2">
                {stats.accountStatus.payoutsEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Payouts</span>
              </div>
              <div className="flex items-center gap-2">
                {stats.accountStatus.detailsSubmitted ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Details</span>
              </div>
              <div className="flex items-center gap-2">
                {stats.accountStatus.requirementsCount === 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">
                  {stats.accountStatus.requirementsCount === 0
                    ? "Complete"
                    : `${stats.accountStatus.requirementsCount} pending`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Quick Actions */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your content and earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => router.push("/dashboard/uploads")}
            className="w-full justify-start bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Content
          </Button>

          <Button
            onClick={() => router.push("/dashboard/profile")}
            variant="outline"
            className="w-full justify-start border-zinc-700 hover:bg-zinc-800"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
