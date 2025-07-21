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
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Upload,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { useStripeEarnings } from "@/hooks/use-stripe-earnings"
import { useToast } from "@/components/ui/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useRouter } from "next/navigation"

export default function EarningsPageContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data, loading, error, lastUpdated, refresh, syncData } = useStripeEarnings()
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

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
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-white">Loading earnings data...</p>
            <p className="text-sm text-zinc-400">Fetching your financial overview</p>
          </div>
        </div>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
      case "paid":
        return "text-green-400"
      case "pending":
        return "text-yellow-400"
      case "failed":
        return "text-red-400"
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

  const monthlyGrowth = stats.thisMonthEarnings > stats.lastMonthEarnings
  const growthPercentage =
    stats.lastMonthEarnings > 0
      ? (((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings) * 100).toFixed(1)
      : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Earnings Dashboard</h1>
          <p className="text-zinc-400">Financial overview and transaction history</p>
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="h-4 w-4" />
              <span>Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing || loading}
            className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
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
            className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
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
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-400 font-medium">Total Earnings</p>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    All Time
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white">${stats.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {stats.salesMetrics.totalSales} total sales
                </p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-xl">
                <DollarSign className="h-8 w-8 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-400 font-medium">This Month</p>
                  {monthlyGrowth ? (
                    <div className="flex items-center gap-1 text-xs text-green-400">
                      <ArrowUpRight className="h-3 w-3" />+{growthPercentage}%
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <ArrowDownRight className="h-3 w-3" />
                      {growthPercentage}%
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-white">${stats.thisMonthEarnings.toFixed(2)}</p>
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {stats.salesMetrics.thisMonthSales} sales
                </p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-xl">
                <Calendar className="h-8 w-8 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-400 font-medium">Available Balance</p>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    Ready
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white">${stats.availableBalance.toFixed(2)}</p>
                <p className="text-xs text-zinc-400">Ready for payout</p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-xl">
                <Wallet className="h-8 w-8 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-400 font-medium">Pending Payout</p>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    Processing
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white">${stats.pendingPayout.toFixed(2)}</p>
                <p className="text-xs text-zinc-400">In processing</p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-xl">
                <Clock className="h-8 w-8 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Financial Performance Chart */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Financial Performance</CardTitle>
                <CardDescription className="text-zinc-400">Revenue trends and projections</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const sampleData = [
                { month: "Aug", earnings: Math.max(stats.thisMonthEarnings * 0.6, 0) },
                { month: "Sep", earnings: Math.max(stats.thisMonthEarnings * 0.8, 0) },
                { month: "Oct", earnings: Math.max(stats.thisMonthEarnings * 0.9, 0) },
                { month: "Nov", earnings: stats.thisMonthEarnings },
                { month: "Dec", earnings: stats.thisMonthEarnings * 1.2 },
                { month: "Jan", earnings: stats.thisMonthEarnings * 1.4 },
              ]

              return (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sampleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181B",
                        border: "1px solid #3F3F46",
                        borderRadius: "8px",
                        color: "#FFFFFF",
                      }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Earnings"]}
                      labelStyle={{ color: "#A1A1AA" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2, fill: "#18181B" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )
            })()}
          </CardContent>
        </Card>

        {/* Sales Metrics */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800/50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Sales Metrics</CardTitle>
                <CardDescription className="text-zinc-400">Performance indicators</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300 font-medium">Average Transaction Value</span>
                <span className="text-lg font-bold text-white">
                  ${stats.salesMetrics.averageTransactionValue.toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                <Progress
                  value={Math.min(stats.salesMetrics.averageTransactionValue * 4, 100)}
                  className="h-2 bg-zinc-800"
                />
                <p className="text-xs text-zinc-500">Target: $25.00 per transaction</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300 font-medium">Last 30 Days Sales</span>
                <span className="text-lg font-bold text-white">{stats.salesMetrics.last30DaysSales}</span>
              </div>
              <div className="space-y-2">
                <Progress value={Math.min(stats.salesMetrics.last30DaysSales * 5, 100)} className="h-2 bg-zinc-800" />
                <p className="text-xs text-zinc-500">Target: 20 sales per month</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-2xl font-bold text-white">${stats.last30DaysEarnings.toFixed(2)}</p>
                <p className="text-xs text-zinc-400 mt-1">Last 30 Days</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-2xl font-bold text-white">{stats.salesMetrics.totalSales}</p>
                <p className="text-xs text-zinc-400 mt-1">Total Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800/50 rounded-lg">
              <Activity className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
              <CardDescription className="text-zinc-400">Manage your content and earnings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="w-full justify-start bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Content
            </Button>

            <Button
              onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
              variant="outline"
              className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Stripe Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
