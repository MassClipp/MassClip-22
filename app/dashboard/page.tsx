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
import ProfileViewStatsNew from "@/components/profile-view-stats-new"
import SalesMetricsNew from "@/components/sales-metrics-new"
import { SalesForecastCard } from "@/components/sales-forecast-card"

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
    socialBio: false,
  })

  // Use API-based video statistics (avoids Firestore index issues)
  const videoStats = useVideoStatsAPI()

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await videoStats.refetch()
      // Force refresh by reloading the page
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

  const resolvedUserId = user?.uid || username || user?.email?.split("@")[0] || ""

  // Show loading state while profile is being initialized or stats are loading
  if (isInitializing || videoStats.loading) {
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <SalesMetricsNew />

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
          {resolvedUserId ? (
            <ProfileViewStatsNew userId={resolvedUserId} />
          ) : (
            <Card className="bg-transparent border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
                <TrendingUp className="h-4 w-4 text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-zinc-500">Loading user data...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial Forecast - Replaces Sales Performance */}
        <div className="lg:col-span-2">
          <SalesForecastCard />
        </div>

        <div className="space-y-6">
          {/* Creator Checklist - Replaces Content Library */}
          <Card className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border-zinc-700/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                    Creator Setup
                  </CardTitle>
                  <CardDescription>Complete these steps to get started</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {completedTasks}/{totalTasks}
                  </div>
                  <div className="text-xs text-zinc-400">{completionPercentage.toFixed(0)}% complete</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-white to-gray-300 h-2 rounded-full transition-all duration-300"
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
                    <CreditCard className="h-4 w-4 text-zinc-400" />
                    <label
                      htmlFor="stripe"
                      onClick={() => handleTaskClick("stripe")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors ${checkedTasks.stripe ? "line-through text-zinc-500" : "text-zinc-200"}`}
                    >
                      Connect your Stripe account
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
                    <Upload className="h-4 w-4 text-zinc-400" />
                    <label
                      htmlFor="upload"
                      onClick={() => handleTaskClick("upload")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors ${checkedTasks.upload ? "line-through text-zinc-500" : "text-zinc-200"}`}
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
                    <Gift className="h-4 w-4 text-zinc-400" />
                    <label
                      htmlFor="freeContent"
                      onClick={() => handleTaskClick("freeContent")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors ${checkedTasks.freeContent ? "line-through text-zinc-500" : "text-zinc-200"}`}
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
                    <ShoppingBag className="h-4 w-4 text-zinc-400" />
                    <label
                      htmlFor="bundle"
                      onClick={() => handleTaskClick("bundle")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors ${checkedTasks.bundle ? "line-through text-zinc-500" : "text-zinc-200"}`}
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
                    <Link className="h-4 w-4 text-zinc-400" />
                    <label
                      htmlFor="socialBio"
                      onClick={() => handleTaskClick("socialBio")}
                      className={`text-sm cursor-pointer hover:text-white transition-colors ${checkedTasks.socialBio ? "line-through text-zinc-500" : "text-zinc-200"}`}
                    >
                      Put storefront link in social bio
                    </label>
                  </div>
                </div>
              </div>

              {completionPercentage === 100 && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                  <p className="text-sm text-green-400 font-medium">
                    🎉 Great job! You're all set up and ready to start selling.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions - Moved below checklist */}
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => router.push("/dashboard/bundles")}
                className="w-full justify-start bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
              >
                <Package className="h-4 w-4 mr-2" />
                Make a Bundle
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
        </div>
      </div>
    </div>
  )
}
