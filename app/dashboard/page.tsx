"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useProfileInitialization } from "@/hooks/use-profile-initialization"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DollarSign,
  Package,
  TrendingUp,
  Video,
  RefreshCw,
  Activity,
  Calendar,
  CheckCircle2,
  CreditCard,
  Upload,
  Gift,
  ShoppingBag,
  Link,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useVideoStatsAPI } from "@/hooks/use-video-stats-api"
import { useStripeDashboardSales } from "@/hooks/use-stripe-dashboard-sales"
import { SalesForecastCard } from "@/components/sales-forecast-card"
import ProfileViewStats from "@/components/profile-view-stats"

export default function DashboardPage() {
  const { user } = useAuth()
  const { isInitializing, isComplete, username, error } = useProfileInitialization()
  const router = useRouter()
  const { toast } = useToast()

  const [refreshing, setRefreshing] = useState(false)

  const [checkedTasks, setCheckedTasks] = useState({
    stripe: false,
    upload: false,
    freeContent: false,
    bundle: false,
    socialBio: false, // Added social bio task to state
  })

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

  const handleTaskCheck = (taskKey: keyof typeof checkedTasks) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskKey]: !prev[taskKey],
    }))
  }

  const handleTaskClick = (taskKey: string) => {
    const taskRoutes = {
      stripe: "/dashboard/earnings",
      upload: "/dashboard/upload",
      freeContent: "/dashboard/free-content",
      bundle: "/dashboard/bundles",
      socialBio: "/dashboard/profile",
    }

    const route = taskRoutes[taskKey as keyof typeof taskRoutes]
    if (route) {
      router.push(route)
    }
  }

  const completedTasks = Object.values(checkedTasks).filter(Boolean).length
  const totalTasks = Object.keys(checkedTasks).length
  const completionPercentage = (completedTasks / totalTasks) * 100

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
  if (error && !videoStats.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-red-400">Dashboard Error</CardTitle>
            <CardDescription>There was an issue loading your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
              <Button
                onClick={() => router.push("/dashboard/upload")}
                variant="outline"
                className="w-full border-zinc-700 hover:bg-zinc-800"
              >
                Go to Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show dashboard with fallback data if there are API errors but we have some data
  if (videoStats.error && !videoStats.loading) {
    console.warn("Video stats API error:", videoStats.error)
    // Continue rendering with fallback data
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Business Dashboard</h1>
          <p className="text-white/80 font-medium">Welcome back, {user?.displayName || username || "Creator"}</p>
          <div className="flex items-center gap-2 mt-2">
            <Activity className="h-3 w-3 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">LIVE DATA</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="bg-white text-black border-white hover:bg-white/90 font-medium"
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900/80 border-zinc-800/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white">Revenue (30 Days)</CardTitle>
            <Calendar className="h-4 w-4 text-white/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${salesData.totalRevenueLast30Days.toFixed(2)}</div>
            <p className="text-xs text-white/60 font-medium">{salesData.totalSalesLast30Days} sales in last 30 days</p>
            {salesData.averageOrderValue > 0 && (
              <p className="text-xs text-white/50 mt-1">Average: ${salesData.averageOrderValue.toFixed(2)} per sale</p>
            )}
            {salesData.error && <p className="text-xs text-red-400 mt-1">Data may be outdated</p>}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/80 border-zinc-800/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white">Content Library</CardTitle>
            <Video className="h-4 w-4 text-white/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{videoStats.totalFreeVideos}</div>
            <p className="text-xs text-white/60 font-medium">Free content available</p>
            {videoStats.totalUploads > 0 && (
              <p className="text-xs text-white/50 mt-1">
                {videoStats.freeVideoPercentage.toFixed(1)}% of {videoStats.totalUploads} total uploads
              </p>
            )}
            {videoStats.totalFreeVideos === 0 && videoStats.totalUploads > 0 && (
              <p className="text-xs text-amber-400 mt-1">Consider adding free content</p>
            )}
          </CardContent>
        </Card>

        <div className="bg-zinc-900/80 border-zinc-800/60 backdrop-blur-sm rounded-lg">
          <ProfileViewStats userId={username || user?.uid || ""} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial Forecast */}
        <div className="lg:col-span-2">
          <SalesForecastCard />
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900/80 border-zinc-800/60 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                    Setup Progress
                  </CardTitle>
                  <CardDescription className="text-white/60 font-medium">
                    Complete these steps to get started
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">
                    {completedTasks}/{totalTasks}
                  </div>
                  <div className="text-xs text-white/60 font-medium">{completionPercentage.toFixed(0)}% complete</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="w-full bg-zinc-800/60 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Task list */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="stripe"
                    checked={checkedTasks.stripe}
                    onCheckedChange={() => handleTaskCheck("stripe")}
                    className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <CreditCard className="h-4 w-4 text-white/60" />
                    <label
                      htmlFor="stripe"
                      onClick={() => handleTaskClick("stripe")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors font-medium ${checkedTasks.stripe ? "line-through text-white/40" : "text-white"}`}
                    >
                      Connect Stripe account
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="upload"
                    checked={checkedTasks.upload}
                    onCheckedChange={() => handleTaskCheck("upload")}
                    className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Upload className="h-4 w-4 text-white/60" />
                    <label
                      htmlFor="upload"
                      onClick={() => handleTaskClick("upload")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors font-medium ${checkedTasks.upload ? "line-through text-white/40" : "text-white"}`}
                    >
                      Upload content
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="freeContent"
                    checked={checkedTasks.freeContent}
                    onCheckedChange={() => handleTaskCheck("freeContent")}
                    className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Gift className="h-4 w-4 text-white/60" />
                    <label
                      htmlFor="freeContent"
                      onClick={() => handleTaskClick("freeContent")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors font-medium ${checkedTasks.freeContent ? "line-through text-white/40" : "text-white"}`}
                    >
                      Add free content
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bundle"
                    checked={checkedTasks.bundle}
                    onCheckedChange={() => handleTaskCheck("bundle")}
                    className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <ShoppingBag className="h-4 w-4 text-white/60" />
                    <label
                      htmlFor="bundle"
                      onClick={() => handleTaskClick("bundle")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors font-medium ${checkedTasks.bundle ? "line-through text-white/40" : "text-white"}`}
                    >
                      Create a bundle
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="socialBio"
                    checked={checkedTasks.socialBio}
                    onCheckedChange={() => handleTaskCheck("socialBio")}
                    className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Link className="h-4 w-4 text-white/60" />
                    <label
                      htmlFor="socialBio"
                      onClick={() => handleTaskClick("socialBio")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors font-medium ${checkedTasks.socialBio ? "line-through text-white/40" : "text-white"}`}
                    >
                      Add storefront link to social bio
                    </label>
                  </div>
                </div>
              </div>

              {completionPercentage === 100 && (
                <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-800/50 rounded-lg">
                  <p className="text-sm text-emerald-400 font-semibold">
                    Setup complete. Your business is ready to start generating revenue.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-white/60 font-medium">Essential business operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => router.push("/dashboard/bundles")}
                className="w-full justify-start bg-white text-black hover:bg-white/90 font-semibold"
              >
                <Package className="h-4 w-4 mr-2" />
                Create Bundle
              </Button>

              <Button
                onClick={() => router.push("/dashboard/earnings")}
                variant="outline"
                className="w-full justify-start border-white/20 hover:bg-white/10 text-white font-medium"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                View Analytics
              </Button>

              <Button
                onClick={() => router.push("/dashboard/profile")}
                variant="outline"
                className="w-full justify-start border-white/20 hover:bg-white/10 text-white font-medium"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Manage Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
