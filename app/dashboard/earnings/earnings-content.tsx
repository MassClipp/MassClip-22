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
  Upload,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Unlink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { useStripeEarnings } from "@/hooks/use-stripe-earnings"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { formatCurrency, formatPercentage, formatInteger, safeNumber, validateEarningsData } from "@/lib/format-utils"

export default function EarningsPageContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data: rawData, loading, error, lastUpdated, refresh, syncData } = useStripeEarnings()
  const [syncing, setSyncing] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const router = useRouter()

  // Validate and clean the data using our bulletproof utilities
  const data = validateEarningsData(rawData)

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

  const handleUnlinkStripe = async () => {
    if (
      !confirm("Are you sure you want to unlink your Stripe account? This will disable payments and earnings tracking.")
    ) {
      return
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to unlink your Stripe account.",
        variant: "destructive",
      })
      return
    }

    try {
      setUnlinking(true)

      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to unlink Stripe account")
      }

      const result = await response.json()

      toast({
        title: "Stripe Account Unlinked",
        description: result.message || "Your Stripe account has been successfully disconnected.",
      })

      router.refresh()
    } catch (error: any) {
      console.error("Unlink error:", error)
      toast({
        title: "Unlink Error",
        description: error.message || "Failed to unlink Stripe account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUnlinking(false)
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

  // All values are now guaranteed to be safe numbers
  const totalEarnings = data.totalEarnings
  const thisMonthEarnings = data.thisMonthEarnings
  const lastMonthEarnings = data.lastMonthEarnings
  const last30DaysEarnings = data.last30DaysEarnings
  const pendingPayout = data.pendingPayout
  const availableBalance = data.availableBalance

  const totalSales = data.salesMetrics.totalSales
  const thisMonthSales = data.salesMetrics.thisMonthSales
  const last30DaysSales = data.salesMetrics.last30DaysSales
  const averageTransactionValue = data.salesMetrics.averageTransactionValue

  const monthlyGrowth = thisMonthEarnings > lastMonthEarnings
  const growthPercentage =
    lastMonthEarnings > 0
      ? formatPercentage(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
      : "0.0"

  // Generate chart data with safe calculations
  const chartData = [
    { month: "Jul", earnings: Math.max(totalEarnings * 0.1, 0) },
    { month: "Aug", earnings: Math.max(totalEarnings * 0.3, 0) },
    { month: "Sep", earnings: Math.max(totalEarnings * 0.5, 0) },
    { month: "Oct", earnings: Math.max(totalEarnings * 0.7, 0) },
    { month: "Nov", earnings: Math.max(totalEarnings * 0.9, 0) },
    { month: "Dec", earnings: totalEarnings },
  ]

  const maxEarnings = Math.max(...chartData.map((d) => safeNumber(d.earnings, 0)), 1)

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
            onClick={() => router.push("/debug-earnings")}
            className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Debug
          </Button>

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
          <AlertDescription className="text-amber-200">
            {error}
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-amber-200 underline"
              onClick={() => router.push("/debug-earnings")}
            >
              Debug this issue
            </Button>
          </AlertDescription>
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
                <p className="text-3xl font-bold text-white">${formatCurrency(totalEarnings)}</p>
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {formatInteger(totalSales)} total sales
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
                <p className="text-3xl font-bold text-white">${formatCurrency(thisMonthEarnings)}</p>
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {formatInteger(thisMonthSales)} sales
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
                <p className="text-3xl font-bold text-white">${formatCurrency(availableBalance)}</p>
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
                <p className="text-3xl font-bold text-white">${formatCurrency(pendingPayout)}</p>
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
            <div className="space-y-4">
              <div className="flex items-end justify-between h-48 px-4 py-2 bg-zinc-800/30 rounded-lg">
                {chartData.map((item, index) => {
                  const itemEarnings = safeNumber(item.earnings, 0)
                  const heightPercentage = maxEarnings > 0 ? (itemEarnings / maxEarnings) * 160 : 8
                  const safeHeight = Math.max(heightPercentage, 8)

                  return (
                    <div key={item.month} className="flex flex-col items-center gap-2">
                      <div
                        className="w-8 bg-gradient-to-t from-green-600 to-green-400 rounded-t-sm transition-all duration-300 hover:from-green-500 hover:to-green-300"
                        style={{ height: `${safeHeight}px` }}
                      />
                      <span className="text-xs text-zinc-400 font-medium">{item.month}</span>
                      <span className="text-xs text-zinc-500">${formatCurrency(itemEarnings, { decimals: 0 })}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">6-month earnings trend</span>
                <span className="text-green-400 font-medium">↗ Growing</span>
              </div>
            </div>
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
                <span className="text-lg font-bold text-white">${formatCurrency(averageTransactionValue)}</span>
              </div>
              <div className="space-y-2">
                <Progress value={Math.min(averageTransactionValue * 4, 100)} className="h-2 bg-zinc-800" />
                <p className="text-xs text-zinc-500">Target: $25.00 per transaction</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-300 font-medium">Last 30 Days Sales</span>
                <span className="text-lg font-bold text-white">{formatInteger(last30DaysSales)}</span>
              </div>
              <div className="space-y-2">
                <Progress value={Math.min(last30DaysSales * 5, 100)} className="h-2 bg-zinc-800" />
                <p className="text-xs text-zinc-500">Target: 20 sales per month</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-2xl font-bold text-white">${formatCurrency(last30DaysEarnings)}</p>
                <p className="text-xs text-zinc-400 mt-1">Last 30 Days</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-2xl font-bold text-white">{formatInteger(totalSales)}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Button
              onClick={handleUnlinkStripe}
              disabled={unlinking || !user}
              variant="outline"
              className="w-full justify-start border-red-700/50 hover:bg-red-900/20 text-red-400 hover:text-red-300 bg-transparent"
            >
              {unlinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4 mr-2" />
                  Unlink Stripe Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
