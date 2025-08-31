"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useProfileInitialization } from "@/hooks/use-profile-initialization"
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
  CreditCard,
  Upload,
  Gift,
  ShoppingBag,
  Link,
  Eye,
  Sparkles,
  Target,
  Zap,
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

  // Use API-based video statistics
  const videoStats = useVideoStatsAPI()
  // Use live dashboard sales data
  const salesData = useStripeDashboardSales()

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await videoStats.refetch()
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

  // Show loading state
  if (isInitializing || videoStats.loading || salesData.loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-80 bg-muted/50" />
            <Skeleton className="h-5 w-48 bg-muted/30" />
          </div>
          <Skeleton className="h-11 w-32 bg-muted/50" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="premium-dashboard-card p-6 space-y-3">
              <Skeleton className="h-5 w-32 bg-muted/50" />
              <Skeleton className="h-8 w-20 bg-muted/30" />
              <Skeleton className="h-4 w-40 bg-muted/20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show error state
  if (error && !videoStats.loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="premium-dashboard-card w-full max-w-md p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <Activity className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Dashboard Unavailable</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()} className="premium-button flex-1">
              Try Again
            </Button>
            <Button onClick={() => router.push("/dashboard/upload")} variant="outline" className="flex-1">
              Go to Upload
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Creator Dashboard
            </h1>
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground">
            Welcome back,{" "}
            <span className="font-medium text-foreground">{user?.displayName || username || "Creator"}</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-sm text-success font-medium">Live Data</span>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} className="premium-button">
          {refreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="premium-metric-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="metric-label">Revenue (30 Days)</div>
          <div className="metric-value animate-count-up">${salesData.totalRevenueLast30Days.toFixed(2)}</div>
          <div className="metric-description">
            {salesData.totalSalesLast30Days} sales • Avg ${salesData.averageOrderValue.toFixed(2)}
          </div>
          {salesData.totalRevenueLast30Days === 0 && (
            <div className="mt-3 p-2 bg-warning/10 rounded-lg">
              <p className="text-xs text-warning font-medium">Let's make your first sale this week! 👇</p>
            </div>
          )}
        </div>

        <div className="premium-metric-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <Video className="h-5 w-5 text-chart-2" />
            </div>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="metric-label">Free Content</div>
          <div className="metric-value animate-count-up">{videoStats.totalFreeVideos}</div>
          <div className="metric-description">
            {videoStats.freeVideoPercentage.toFixed(1)}% of {videoStats.totalUploads} uploads
          </div>
          <div className="mt-3">
            <div className="premium-progress">
              <div
                className="premium-progress-bar"
                style={{ width: `${Math.min(100, videoStats.freeVideoPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="premium-metric-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <Eye className="h-5 w-5 text-chart-3" />
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <ProfileViewStats userId={username || user?.uid || ""} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Enhanced Sales Forecast */}
        <div className="lg:col-span-2">
          <SalesForecastCard />
        </div>

        <div className="space-y-8">
          <div className="premium-dashboard-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Creator Setup</h3>
                  <p className="text-sm text-muted-foreground">Complete your journey to success</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  {completedTasks}/{totalTasks}
                </div>
                <div className="text-xs text-muted-foreground">{completionPercentage.toFixed(0)}% complete</div>
              </div>
            </div>

            {/* Premium progress indicator */}
            <div className="mb-6">
              <div className="premium-progress">
                <div className="premium-progress-bar" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>

            {/* Enhanced task list */}
            <div className="space-y-3">
              {[
                { key: "stripe", icon: CreditCard, label: "Connect Stripe account", color: "text-primary" },
                { key: "upload", icon: Upload, label: "Upload your first content", color: "text-chart-2" },
                { key: "freeContent", icon: Gift, label: "Add free content samples", color: "text-chart-3" },
                { key: "bundle", icon: ShoppingBag, label: "Create your first bundle", color: "text-chart-4" },
                { key: "socialBio", icon: Link, label: "Add link to social profiles", color: "text-chart-5" },
              ].map(({ key, icon: Icon, label, color }) => (
                <div
                  key={key}
                  className={`premium-checklist-item ${checkedTasks[key as keyof typeof checkedTasks] ? "completed" : ""}`}
                >
                  <Checkbox
                    id={key}
                    checked={checkedTasks[key as keyof typeof checkedTasks]}
                    onCheckedChange={() => handleTaskCheck(key as keyof typeof checkedTasks)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="p-2 bg-muted/20 rounded-lg">
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <label
                    htmlFor={key}
                    onClick={() => handleTaskClick(key)}
                    className={`text-sm cursor-pointer hover:text-primary transition-colors flex-1 ${
                      checkedTasks[key as keyof typeof checkedTasks] ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>

            {completionPercentage === 100 && (
              <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-success" />
                  <p className="text-sm text-success font-medium">🎉 Congratulations! You're ready to start earning.</p>
                </div>
              </div>
            )}
          </div>

          <div className="premium-dashboard-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Zap className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Your creator command center</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button onClick={() => router.push("/dashboard/bundles")} className="w-full justify-start premium-button">
                <Package className="h-4 w-4 mr-3" />
                Create Bundle
              </Button>

              <Button
                onClick={() => router.push("/dashboard/earnings")}
                variant="outline"
                className="w-full justify-start border-border hover:bg-muted/50"
              >
                <DollarSign className="h-4 w-4 mr-3" />
                View Earnings
              </Button>

              <Button
                onClick={() => router.push("/dashboard/profile")}
                variant="outline"
                className="w-full justify-start border-border hover:bg-muted/50"
              >
                <TrendingUp className="h-4 w-4 mr-3" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
