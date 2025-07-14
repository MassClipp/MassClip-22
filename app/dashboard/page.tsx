"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, Video, DollarSign, ShoppingBag, User, Package, CreditCard, RefreshCw } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useStripeConnectionCheck } from "@/hooks/use-stripe-connection-check"
import { useDashboard } from "@/hooks/use-dashboard"
import { useEnhancedDashboardStats } from "@/hooks/use-enhanced-dashboard-stats"
import { RecentSales } from "@/components/recent-sales"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const { isConnected: stripeConnected, loading: stripeLoading } = useStripeConnectionCheck()
  const { stats, loading: statsLoading, error, refreshStats } = useDashboard()
  const { enhancedStats, loading: enhancedLoading } = useEnhancedDashboardStats()

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshStats()
    setTimeout(() => setRefreshing(false), 1000)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Creator Dashboard</h2>
          <p className="text-zinc-400">Welcome back, {user.displayName || user.email?.split("@")[0]}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-zinc-500">Live Data</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Sales (30 Days)</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${stats?.totalSales?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-zinc-500">{stats?.totalSalesCount || 0} sales in last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Free Videos</CardTitle>
            <Video className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.freeVideosCount || 0}</div>
            <p className="text-xs text-zinc-500">Free content available</p>
            <p className="text-xs text-zinc-500">
              {(((stats?.freeVideosCount || 0) / Math.max(stats?.totalUploads || 1, 1)) * 100).toFixed(1)}% of{" "}
              {stats?.totalUploads || 1} total uploads
            </p>
            {(stats?.freeVideosCount || 0) === 0 && (
              <p className="text-xs text-yellow-500 mt-1">Consider adding free content</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Profile Views</CardTitle>
            <Users className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {enhancedStats?.profileViews || stats?.profileViews || 0}
            </div>
            <p className="text-xs text-zinc-500">All time</p>
            <p className="text-xs text-zinc-500">Last: {stats?.lastProfileView || "Never"}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Content Library</CardTitle>
            <Package className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalUploads || 0}</div>
            <p className="text-xs text-zinc-500">total uploads</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-zinc-400" />
              <CardTitle className="text-white">Financial Forecast</CardTitle>
              <Badge variant="outline" className="text-xs border-yellow-600 text-yellow-500">
                STABLE
              </Badge>
            </div>
            <CardDescription className="text-zinc-400">Next 30 days projection</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-white">
                  ${enhancedStats?.projectedEarnings?.toFixed(2) || "0.00"}
                  <span className="text-sm font-normal text-zinc-500 ml-2">low confidence</span>
                </div>
                <p className="text-xs text-zinc-500">Based on ${(stats?.totalSales || 0) / 30}/day average</p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-500">⚡</span>
                <span className="text-zinc-300">
                  {stats?.totalSales && stats.totalSales > 0
                    ? "The best time to start was yesterday, the second best time is now. Upload premium content!"
                    : "Your journey to financial success starts with your first premium upload!"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-xs text-zinc-500">Past Performance</p>
                  <div className="h-2 bg-zinc-800 rounded-full mt-1">
                    <div className="h-2 bg-green-600 rounded-full w-1/3"></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Projected</p>
                  <div className="h-2 bg-zinc-800 rounded-full mt-1">
                    <div className="h-2 bg-blue-600 rounded-full w-1/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-zinc-400">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/dashboard/bundles")}
              className="w-full justify-start bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
              variant="outline"
            >
              <Package className="mr-2 h-4 w-4" />
              Make a Bundle
            </Button>

            <Button
              onClick={() => router.push("/dashboard/purchases")}
              className="w-full justify-start bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
              variant="outline"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              My Purchases
            </Button>

            {!stripeLoading && !stripeConnected && (
              <Button
                onClick={() => router.push("/dashboard/earnings")}
                className="w-full justify-start bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-400 border-yellow-600"
                variant="outline"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Connect Stripe Account
              </Button>
            )}

            <Button
              onClick={() => router.push("/dashboard/profile")}
              className="w-full justify-start bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
              variant="outline"
            >
              <User className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>
      </div>

      {enhancedStats?.recentSales && enhancedStats.recentSales.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Sales</CardTitle>
            <CardDescription className="text-zinc-400">Your latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales sales={enhancedStats.recentSales} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
