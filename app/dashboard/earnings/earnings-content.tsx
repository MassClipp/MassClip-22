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
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
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
        title: "✅ Sync Complete",
        description: "Stripe data has been synchronized successfully.",
        className: "bg-gradient-to-r from-green-600 to-green-700 border-green-500/50 text-white shadow-2xl rounded-xl",
        duration: 4000,
      })
    } catch (error) {
      toast({
        title: "❌ Sync Error",
        description: "Failed to sync Stripe data. Please try again.",
        variant: "destructive",
        className: "bg-gradient-to-r from-red-600 to-red-700 border-red-500/50 shadow-2xl rounded-xl",
        duration: 5000,
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleRefresh = async () => {
    try {
      await refresh()
      toast({
        title: "🔄 Data Refreshed",
        description: "Latest earnings data has been fetched from Stripe.",
        className: "bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500/50 text-white shadow-2xl rounded-xl",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "⚠️ Refresh Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
        className: "bg-gradient-to-r from-red-600 to-red-700 border-red-500/50 shadow-2xl rounded-xl",
        duration: 5000,
      })
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div
              className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto opacity-50"
              style={{ animationDelay: "0.1s" }}
            ></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-white">Loading earnings data...</p>
            <p className="text-sm text-zinc-400">Fetching your financial overview from Stripe</p>
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
        return "text-emerald-400"
      case "pending":
        return "text-amber-400"
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
    <div className="space-y-8 p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 min-h-screen">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/20">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                Earnings Dashboard
              </h1>
              <p className="text-zinc-400 text-lg">Financial overview and transaction history</p>
            </div>
          </div>
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
            className="border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-700/50 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105"
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
            className="border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-700/50 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105"
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
        <Alert className="border-amber-600/50 bg-gradient-to-r from-amber-600/10 to-orange-600/10 backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200">{error}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald-900/20 via-green-900/10 to-emerald-800/20 border-emerald-500/20 backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-emerald-400 font-medium">Total Earnings</p>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    All Time
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white">${stats.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-emerald-300 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {stats.salesMetrics.totalSales} total sales
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <DollarSign className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/20 via-cyan-900/10 to-blue-800/20 border-blue-500/20 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-blue-400 font-medium">This Month</p>
                  {monthlyGrowth ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
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
                <p className="text-xs text-blue-300 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {stats.salesMetrics.thisMonthSales} sales
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/20 via-violet-900/10 to-purple-800/20 border-purple-500/20 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-purple-400 font-medium">Available Balance</p>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    Ready
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white">${stats.availableBalance.toFixed(2)}</p>
                <p className="text-xs text-purple-300">Ready for payout</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Wallet className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-amber-800/20 border-amber-500/20 backdrop-blur-sm hover:border-amber-500/30 transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-amber-400 font-medium">Pending Payout</p>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                    Processing
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white">${stats.pendingPayout.toFixed(2)}</p>
                <p className="text-xs text-amber-300">In processing</p>
              </div>
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Clock className="h-8 w-8 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Monthly Breakdown Chart */}
        <Card className="bg-gradient-to-br from-zinc-900/60 via-zinc-800/40 to-zinc-900/60 border-zinc-700/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Financial Performance</CardTitle>
                <CardDescription className="text-zinc-400">Revenue trends and growth projections</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const sampleData = [
                { month: "Aug", earnings: stats.thisMonthEarnings * 0.6, projected: false },
                { month: "Sep", earnings: stats.thisMonthEarnings * 0.8, projected: false },
                { month: "Oct", earnings: stats.thisMonthEarnings * 0.9, projected: false },
                { month: "Nov", earnings: stats.thisMonthEarnings, projected: false },
                { month: "Dec", earnings: stats.thisMonthEarnings * 1.2, projected: true },
                { month: "Jan", earnings: stats.thisMonthEarnings * 1.4, projected: true },
                { month: "Feb", earnings: stats.thisMonthEarnings * 1.6, projected: true },
              ]

              return (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={sampleData}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
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
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "12px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                      }}
                      formatter={(value: any, name: any) => [`$${value.toFixed(2)}`, "Earnings"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#10B981"
                      strokeWidth={3}
                      fill="url(#earningsGradient)"
                      dot={{ fill: "#10B981", strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: "#10B981", strokeWidth: 2, fill: "#1F2937" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )
            })()}
          </CardContent>
        </Card>

        {/* Enhanced Sales Metrics */}
        <Card className="bg-gradient-to-br from-zinc-900/60 via-zinc-800/40 to-zinc-900/60 border-zinc-700/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Sales Metrics</CardTitle>
                <CardDescription className="text-zinc-400">Performance indicators and insights</CardDescription>
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
                  className="h-3 bg-zinc-800"
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
                <Progress value={Math.min(stats.salesMetrics.last30DaysSales * 5, 100)} className="h-3 bg-zinc-800" />
                <p className="text-xs text-zinc-500">Target: 20 sales per month</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 bg-gradient-to-br from-emerald-900/20 to-green-900/20 rounded-xl border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-400">${stats.last30DaysEarnings.toFixed(2)}</p>
                <p className="text-xs text-emerald-300 mt-1">Last 30 Days</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-xl border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-400">{stats.salesMetrics.totalSales}</p>
                <p className="text-xs text-blue-300 mt-1">Total Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Actions */}
      <Card className="bg-gradient-to-br from-zinc-900/60 via-zinc-800/40 to-zinc-900/60 border-zinc-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg">
              <Activity className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
              <CardDescription className="text-zinc-400">Manage your content and earnings efficiently</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="w-full justify-start bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Content
            </Button>

            <Button
              onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
              variant="outline"
              className="w-full justify-start border-zinc-600/50 bg-zinc-800/50 hover:bg-zinc-700/50 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105"
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
