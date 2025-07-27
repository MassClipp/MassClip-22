"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Settings,
  Download,
  Eye,
} from "lucide-react"
import { TechRevenueChart } from "@/components/tech-revenue-chart"

interface StripeStatus {
  connected: boolean
  accountId?: string
  isFullyEnabled: boolean
  actionsRequired: boolean
  actionUrl?: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: {
    currently_due: Array<{ field: string; description: string }>
    past_due: Array<{ field: string; description: string }>
    eventually_due: Array<{ field: string; description: string }>
    pending_verification: Array<{ field: string; description: string }>
  }
  country?: string
  business_type?: string
}

interface EarningsData {
  totalEarnings: number
  thisMonth: number
  lastMonth: number
  thisWeek: number
  totalTransactions: number
  averageOrderValue: number
  topProducts: Array<{
    name: string
    sales: number
    revenue: number
  }>
  recentTransactions: Array<{
    id: string
    amount: number
    customer: string
    product: string
    date: string
    status: string
  }>
  monthlyData: Array<{
    month: string
    revenue: number
    transactions: number
  }>
  balance?: {
    available: number
    pending: number
  }
}

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth()
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  useEffect(() => {
    if (stripeStatus?.isFullyEnabled) {
      fetchEarnings()
    }
  }, [stripeStatus])

  const checkStripeStatus = async () => {
    try {
      setLoading(true)
      const idToken = await user!.getIdToken()

      const response = await fetch("/api/stripe/account-status-fixed", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStripeStatus(data)
      } else {
        console.error("Failed to check Stripe status")
        setStripeStatus({
          connected: false,
          isFullyEnabled: false,
          actionsRequired: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          requirements: {
            currently_due: [],
            past_due: [],
            eventually_due: [],
            pending_verification: [],
          },
        })
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEarnings = async () => {
    try {
      const idToken = await user!.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEarnings(data)
      }
    } catch (error) {
      console.error("Error fetching earnings:", error)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await checkStripeStatus()
    if (stripeStatus?.isFullyEnabled) {
      await fetchEarnings()
    }
    setRefreshing(false)
  }

  const connectStripe = async () => {
    try {
      const idToken = await user!.getIdToken()
      const response = await fetch("/api/stripe/connect-url", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      }
    } catch (error) {
      console.error("Error creating Stripe connection:", error)
    }
  }

  const openStripeDashboard = () => {
    window.open("https://dashboard.stripe.com", "_blank")
  }

  const openStripeExpress = () => {
    if (stripeStatus?.accountId) {
      window.open(`https://connect.stripe.com/express/accounts/${stripeStatus.accountId}`, "_blank")
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-zinc-900/60 border-zinc-800/50">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show connection prompt if not connected or not fully enabled
  if (!stripeStatus?.connected || !stripeStatus?.isFullyEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Connect Your Stripe Account</h1>
            <p className="text-zinc-400">Start accepting payments and track your earnings</p>
          </div>

          {/* Connection Status */}
          {stripeStatus?.connected && (
            <Card className="bg-zinc-900/60 border-zinc-800/50 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  Account Setup Required
                </CardTitle>
                <CardDescription>
                  Your Stripe account is connected but needs additional setup to accept payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${stripeStatus.charges_enabled ? "bg-green-400" : "bg-red-400"}`}
                    />
                    <span className="text-sm text-zinc-300">Accept Payments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${stripeStatus.payouts_enabled ? "bg-green-400" : "bg-red-400"}`}
                    />
                    <span className="text-sm text-zinc-300">Receive Payouts</span>
                  </div>
                </div>

                {stripeStatus.actionsRequired && stripeStatus.actionUrl && (
                  <div className="pt-4">
                    <Button onClick={() => (window.location.href = stripeStatus.actionUrl!)} className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Complete Setup
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Connection Options */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Create New Stripe Account
                </CardTitle>
                <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Quick 5-minute setup
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    2.9% + 30¢ per transaction
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Automatic payouts to your bank
                  </div>
                </div>
                <Button onClick={connectStripe} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Create Stripe Account
                </Button>
                <p className="text-xs text-zinc-500">You'll be redirected to Stripe to complete setup</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Already Have a Stripe Account?
                </CardTitle>
                <CardDescription>Securely connect your existing Stripe account through Stripe Connect</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Secure OAuth connection
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    No manual account IDs needed
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Stripe handles account verification
                  </div>
                </div>
                <Button onClick={connectStripe} variant="outline" className="w-full bg-transparent">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect with Stripe
                </Button>
                <p className="text-xs text-zinc-500">
                  Stripe will detect your existing account and connect it securely
                </p>
              </CardContent>
            </Card>
          </div>

          <Button onClick={refreshData} variant="outline" className="w-full bg-transparent" disabled={refreshing}>
            {refreshing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh Status
          </Button>
        </div>
      </div>
    )
  }

  // Show earnings dashboard when fully connected and enabled
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Earnings Dashboard</h1>
            <p className="text-zinc-400">Track your revenue and performance in real-time</p>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm" disabled={refreshing} className="bg-transparent">
            {refreshing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${earnings?.totalEarnings?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-zinc-400">All time revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${earnings?.thisMonth?.toFixed(2) || "0.00"}</div>
              <div className="flex items-center text-xs text-zinc-400">
                {earnings?.thisMonth && earnings?.lastMonth ? (
                  earnings.thisMonth > earnings.lastMonth ? (
                    <>
                      <ArrowUpRight className="w-3 h-3 text-zinc-300 mr-1" />
                      <span className="text-zinc-300">
                        +{(((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth) * 100).toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-3 h-3 text-zinc-500 mr-1" />
                      <span className="text-zinc-500">
                        {(((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth) * 100).toFixed(1)}%
                      </span>
                    </>
                  )
                ) : (
                  "vs last month"
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{earnings?.totalTransactions || 0}</div>
              <p className="text-xs text-zinc-400">Total sales</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Avg Order Value</CardTitle>
              <Users className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${earnings?.averageOrderValue?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-zinc-400">Per transaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-zinc-900/60 border-zinc-800/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tech Revenue Chart */}
              <Card className="bg-zinc-900/60 border-zinc-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-zinc-400" />
                    Revenue Analytics
                  </CardTitle>
                  <CardDescription>Real-time sales performance over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <TechRevenueChart data={earnings?.monthlyData || []} />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-zinc-900/60 border-zinc-800/50">
                <CardHeader>
                  <CardTitle className="text-white">Recent Transactions</CardTitle>
                  <CardDescription>Your latest sales activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {earnings?.recentTransactions?.length ? (
                    <div className="space-y-3">
                      {earnings.recentTransactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{transaction.product}</p>
                            <p className="text-xs text-zinc-400">{transaction.customer}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">${transaction.amount.toFixed(2)}</p>
                            <p className="text-xs text-zinc-400">{transaction.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-zinc-400">
                      <div className="text-center">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No transactions yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader>
                <CardTitle className="text-white">All Transactions</CardTitle>
                <CardDescription>Complete transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-400">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Transaction history will appear here</p>
                    <p className="text-sm">Make your first sale to see detailed transaction data</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader>
                <CardTitle className="text-white">Top Performing Products</CardTitle>
                <CardDescription>Your best-selling content</CardDescription>
              </CardHeader>
              <CardContent>
                {earnings?.topProducts?.length ? (
                  <div className="space-y-4">
                    {earnings.topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-sm font-medium text-white">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{product.name}</p>
                            <p className="text-xs text-zinc-400">{product.sales} sales</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">${product.revenue.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-zinc-400">
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Product performance data will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/60 border-zinc-800/50">
                <CardHeader>
                  <CardTitle className="text-white">Conversion Metrics</CardTitle>
                  <CardDescription>Track your sales performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">Conversion Rate</span>
                      <span className="text-white">2.4%</span>
                    </div>
                    <Progress value={24} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">Customer Retention</span>
                      <span className="text-white">68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">Revenue Growth</span>
                      <span className="text-white">12%</span>
                    </div>
                    <Progress value={12} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/60 border-zinc-800/50">
                <CardHeader>
                  <CardTitle className="text-white">Payout Information</CardTitle>
                  <CardDescription>Your earnings and payout schedule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-zinc-300">Available Balance</span>
                    <span className="text-white font-medium">
                      ${earnings?.balance?.available?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-300">Pending Balance</span>
                    <span className="text-white font-medium">${earnings?.balance?.pending?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-300">Next Payout</span>
                    <span className="text-white font-medium">-</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="text-xs text-zinc-400">Payouts are processed automatically every 2 business days</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Stripe Dashboard Quick Actions */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Stripe Account Management
            </CardTitle>
            <CardDescription>Quick access to your Stripe dashboard and account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={openStripeDashboard} variant="outline" className="bg-transparent">
                <ExternalLink className="w-4 h-4 mr-2" />
                Stripe Dashboard
              </Button>
              <Button onClick={openStripeExpress} variant="outline" className="bg-transparent">
                <Eye className="w-4 h-4 mr-2" />
                Express Dashboard
              </Button>
              <Button variant="outline" className="bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Download Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
