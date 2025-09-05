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
  RefreshCw,
  CheckCircle2,
  CreditCard,
  Upload,
  Gift,
  ShoppingBag,
  Link,
  Download,
  BarChart3,
  Eye,
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
    socialBio: false,
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

  const resolvedUserId = user?.uid || username || user?.email?.split("@")[0] || ""

  console.log("[v0] Dashboard userId resolution:", {
    userUid: user?.uid,
    username: username,
    userEmail: user?.email,
    resolvedUserId: resolvedUserId,
    userObject: user,
  })

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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-thin tracking-tight bg-gradient-to-r from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-zinc-400 mt-2 font-light">Welcome back, {user?.displayName || username || "Creator"}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-green-400 font-medium">Live Data</span>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
          className="border-zinc-700/50 hover:bg-zinc-800/50 bg-transparent backdrop-blur-sm"
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

      {/* Key Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border-zinc-700/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-300">Total Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white mb-1">${salesData.totalRevenueLast30Days.toFixed(2)}</div>
            <p className="text-xs text-zinc-500">Last 30 days</p>
            <div className="mt-3 flex items-center text-xs">
              <TrendingUp className="h-3 w-3 text-emerald-400 mr-1" />
              <span className="text-emerald-400">+12.5%</span>
              <span className="text-zinc-500 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Bundles Sold */}
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border-zinc-700/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-300">Bundles Sold</CardTitle>
              <Package className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white mb-1">{salesData.totalSalesLast30Days}</div>
            <p className="text-xs text-zinc-500">This month</p>
            <div className="mt-3 flex items-center text-xs">
              <span className="text-blue-400">Avg: ${salesData.averageOrderValue.toFixed(2)}</span>
              <span className="text-zinc-500 ml-1">per sale</span>
            </div>
          </CardContent>
        </Card>

        {/* Free Downloads */}
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border-zinc-700/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-300">Free Downloads</CardTitle>
              <Download className="h-5 w-5 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white mb-1">{videoStats.totalFreeVideos}</div>
            <p className="text-xs text-zinc-500">Available content</p>
            <div className="mt-3 flex items-center text-xs">
              <span className="text-purple-400">{videoStats.freeVideoPercentage.toFixed(1)}%</span>
              <span className="text-zinc-500 ml-1">of total uploads</span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Views */}
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border-zinc-700/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-300">Profile Views</CardTitle>
              <Eye className="h-5 w-5 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            {resolvedUserId ? (
              <ProfileViewStats userId={resolvedUserId} />
            ) : (
              <>
                <div className="text-3xl font-light text-white mb-1">-</div>
                <p className="text-xs text-zinc-500">Loading...</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border-zinc-700/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium bg-gradient-to-r from-slate-300 via-cyan-200 to-white bg-clip-text text-transparent">
                Bundle Performance
              </CardTitle>
              <CardDescription className="text-zinc-400">Revenue tracking over the last 7 days</CardDescription>
            </div>
            <BarChart3 className="h-5 w-5 text-zinc-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <SalesForecastCard />
          </div>
        </CardContent>
      </Card>

      {/* Manage Bundles Section */}
      <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border-zinc-700/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium bg-gradient-to-r from-slate-300 via-cyan-200 to-white bg-clip-text text-transparent">
                Manage Bundles
              </CardTitle>
              <CardDescription className="text-zinc-400">Track your bundle performance and status</CardDescription>
            </div>
            <Button
              onClick={() => router.push("/dashboard/bundles")}
              className="bg-gradient-to-r from-slate-300 via-cyan-200 to-white text-black hover:opacity-90 font-medium"
            >
              <Package className="h-4 w-4 mr-2" />
              Create Bundle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-700/50 pb-3">
              <div>Bundle Name</div>
              <div>Status</div>
              <div>Price</div>
              <div>Sales</div>
              <div>Revenue</div>
            </div>

            {/* Sample Bundle Rows */}
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-4 items-center py-3 border-b border-zinc-800/30">
                <div className="font-medium text-white">Premium B-Roll Pack</div>
                <div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-400 border border-green-800/50">
                    Active
                  </span>
                </div>
                <div className="text-zinc-300">$29.99</div>
                <div className="text-zinc-300">47</div>
                <div className="text-white font-medium">$1,409.53</div>
              </div>

              <div className="grid grid-cols-5 gap-4 items-center py-3 border-b border-zinc-800/30">
                <div className="font-medium text-white">Audio Effects Collection</div>
                <div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-400 border border-green-800/50">
                    Active
                  </span>
                </div>
                <div className="text-zinc-300">$19.99</div>
                <div className="text-zinc-300">23</div>
                <div className="text-white font-medium">$459.77</div>
              </div>

              <div className="grid grid-cols-5 gap-4 items-center py-3 border-b border-zinc-800/30">
                <div className="font-medium text-white">Carousel Templates</div>
                <div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-zinc-700/50 text-zinc-400 border border-zinc-600/50">
                    Inactive
                  </span>
                </div>
                <div className="text-zinc-300">$14.99</div>
                <div className="text-zinc-300">8</div>
                <div className="text-white font-medium">$119.92</div>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/bundles")}
                className="border-zinc-700/50 hover:bg-zinc-800/50 text-zinc-300"
              >
                View All Bundles
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Creator Setup */}
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border-zinc-700/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-medium">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                  <span className="bg-gradient-to-r from-slate-300 via-cyan-200 to-white bg-clip-text text-transparent">
                    Setup Progress
                  </span>
                </CardTitle>
                <CardDescription className="text-zinc-400">Complete your creator profile</CardDescription>
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
            <div className="w-full bg-zinc-800/50 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-slate-300 via-cyan-200 to-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="space-y-3">
              {[
                { key: "stripe", icon: CreditCard, label: "Connect Stripe account" },
                { key: "upload", icon: Upload, label: "Upload content" },
                { key: "freeContent", icon: Gift, label: "Add free content" },
                { key: "bundle", icon: ShoppingBag, label: "Create a bundle" },
                { key: "socialBio", icon: Link, label: "Add link to social bio" },
              ].map(({ key, icon: Icon, label }) => (
                <div key={key} className="flex items-center space-x-3">
                  <Checkbox
                    id={key}
                    checked={checkedTasks[key as keyof typeof checkedTasks]}
                    onCheckedChange={() => handleTaskCheck(key as keyof typeof checkedTasks)}
                    className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Icon className="h-4 w-4 text-zinc-400" />
                    <label
                      htmlFor={key}
                      onClick={() => handleTaskClick(key)}
                      className={`text-sm cursor-pointer hover:text-white transition-colors ${
                        checkedTasks[key as keyof typeof checkedTasks] ? "line-through text-zinc-500" : "text-zinc-200"
                      }`}
                    >
                      {label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border-zinc-700/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium bg-gradient-to-r from-slate-300 via-cyan-200 to-white bg-clip-text text-transparent">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-zinc-400">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/dashboard/bundles")}
              className="w-full justify-start bg-gradient-to-r from-zinc-800/80 to-zinc-700/40 hover:from-zinc-700/80 hover:to-zinc-600/40 border border-zinc-700/50 text-white"
            >
              <Package className="h-4 w-4 mr-3" />
              Create New Bundle
            </Button>

            <Button
              onClick={() => router.push("/dashboard/earnings")}
              variant="outline"
              className="w-full justify-start border-zinc-700/50 hover:bg-zinc-800/50 text-zinc-200"
            >
              <DollarSign className="h-4 w-4 mr-3" />
              View Earnings
            </Button>

            <Button
              onClick={() => router.push("/dashboard/upload")}
              variant="outline"
              className="w-full justify-start border-zinc-700/50 hover:bg-zinc-800/50 text-zinc-200"
            >
              <Upload className="h-4 w-4 mr-3" />
              Upload Content
            </Button>

            <Button
              onClick={() => router.push("/dashboard/profile")}
              variant="outline"
              className="w-full justify-start border-zinc-700/50 hover:bg-zinc-800/50 text-zinc-200"
            >
              <TrendingUp className="h-4 w-4 mr-3" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
