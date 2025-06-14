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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading earnings data...</p>
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
        {/* Monthly Breakdown Chart */}
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Financial Performance</CardTitle>
            <CardDescription>Revenue trends and projections</CardDescription>
          </CardHeader>
          <CardContent>
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

      {/* Quick Actions */}
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
            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
            variant="outline"
            className="w-full justify-start border-zinc-700 hover:bg-zinc-800"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Stripe Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
