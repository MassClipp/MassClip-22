"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useProfileInitialization } from "@/hooks/use-profile-initialization"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, Upload, TrendingUp, Video, RefreshCw, Activity, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useVideoStatsAPI } from "@/hooks/use-video-stats-api"
import { useStripeDashboardSales } from "@/hooks/use-stripe-dashboard-sales"
import { SalesForecastCard } from "@/components/sales-forecast-card"
import ProfileViewStats from "@/components/profile-view-stats"
import StripeTestConnect from "@/components/stripe-test-connect"

export default function DashboardPage() {
  const { user } = useAuth()
  const { isInitializing, isComplete, username, error } = useProfileInitialization()
  const router = useRouter()
  const { toast } = useToast()

  const [refreshing, setRefreshing] = useState(false)

  // Use API-based video statistics (avoids Firestore index issues)
  const videoStats = useVideoStatsAPI()

  // Use live dashboard sales data
  const salesData = useStripeDashboardSales()

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await videoStats.refetch()
      // Force refresh sales data by reloading the page
      window.location.reload()
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Show loading state while profile is being initialized or stats are loading
  if (isInitializing || videoStats.loading || salesData.loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-zinc-900/50 border-zinc-800/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Show error state if profile initialization failed
  if (error || videoStats.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-red-400">Dashboard Error</CardTitle>
            <CardDescription>There was an issue loading your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-4">{error || videoStats.error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Dashboard</h1>
          <p className="text-zinc-400">Welcome back, {user?.displayName || username || "Creator"}</p>
          <div className="flex items-center gap-2 mt-1">
            <Activity className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-500">Live Data</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
          >
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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

      {/* Test Connect Component - Only shows in preview */}
      <StripeTestConnect />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900/50 border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Sales (30 Days)</CardTitle>
            <Calendar className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${salesData.totalRevenueLast30Days.toFixed(2)}</div>
            <p className="text-xs text-zinc-500">{salesData.totalSalesLast30Days} sales in last 30 days</p>
            {salesData.averageOrderValue > 0 && (
              <p className="text-xs text-zinc-400 mt-1">Avg: ${salesData.averageOrderValue.toFixed(2)} per sale</p>
            )}
            {salesData.error && <p className="text-xs text-red-400 mt-1">Data may be outdated</p>}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Free Videos</CardTitle>
            <Video className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videoStats.totalFreeVideos}</div>
            <p className="text-xs text-zinc-500">Free content available</p>
            {videoStats.totalUploads > 0 && (
              <p className="text-xs text-zinc-400 mt-1">
                {videoStats.freeVideoPercentage.toFixed(1)}% of {videoStats.totalUploads} total uploads
              </p>
            )}
            {videoStats.totalFreeVideos === 0 && videoStats.totalUploads > 0 && (
              <p className="text-xs text-yellow-500 mt-1">Consider adding free content</p>
            )}
          </CardContent>
        </Card>

        <div className="bg-zinc-900/50 border-zinc-800/50 rounded-lg">
          <ProfileViewStats userId={user?.uid || ""} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial Forecast - Replaces Sales Performance */}
        <div className="lg:col-span-2">
          <SalesForecastCard />
        </div>

        {/* Quick Actions & Video Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
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
                onClick={() => router.push("/dashboard/earnings")}
                variant="outline"
                className="w-full justify-start border-zinc-700 hover:bg-zinc-800"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                View Earnings
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

          {/* Video Statistics - Enhanced with API-based data */}
          <Card className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border-zinc-700/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200 mb-1">Content Library</div>
                  <div className="text-2xl font-bold text-white">{videoStats.totalUploads}</div>
                  <div className="text-xs text-zinc-500 mt-1">total uploads</div>

                  {/* Enhanced breakdown */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-400">Free videos:</span>
                      <span className="text-white font-medium">{videoStats.totalFreeVideos}</span>
                    </div>
                    {videoStats.totalUploads > videoStats.totalFreeVideos && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-yellow-400">Premium videos:</span>
                        <span className="text-white font-medium">
                          {videoStats.totalUploads - videoStats.totalFreeVideos}
                        </span>
                      </div>
                    )}
                    {videoStats.totalUploads > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-400">Free ratio:</span>
                        <span className="text-white font-medium">{videoStats.freeVideoPercentage.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Auto-refresh indicator */}
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-500">Auto-refresh (60s)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
