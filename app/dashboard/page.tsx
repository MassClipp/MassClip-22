"use client"

import { useState, useEffect } from "react"
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
  ArrowUpRight,
  BarChart3,
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
  const [animatedRevenue, setAnimatedRevenue] = useState(0)
  const [animatedViews, setAnimatedViews] = useState(0)

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

  useEffect(() => {
    if (salesData.totalRevenueLast30Days > 0) {
      const duration = 2000
      const steps = 60
      const increment = salesData.totalRevenueLast30Days / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= salesData.totalRevenueLast30Days) {
          setAnimatedRevenue(salesData.totalRevenueLast30Days)
          clearInterval(timer)
        } else {
          setAnimatedRevenue(current)
        }
      }, duration / steps)

      return () => clearInterval(timer)
    }
  }, [salesData.totalRevenueLast30Days])

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
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <h1 className="text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-primary to-chart-2 bg-clip-text text-transparent">
                Creator Dashboard
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                <span className="text-xs font-medium text-primary">PRO</span>
              </div>
            </div>
          </div>
          <p className="text-xl text-muted-foreground font-light">
            Welcome back,{" "}
            <span className="font-semibold text-foreground bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              {user?.displayName || username || "Creator"}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm text-success font-medium">Live Data</span>
            </div>
            <div className="w-1 h-4 bg-border" />
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-chart-2" />
              <span className="text-sm text-muted-foreground">Real-time Analytics</span>
            </div>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} className="premium-button h-12 px-6">
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
        <div className="premium-metric-card group cursor-pointer" onClick={() => router.push("/dashboard/earnings")}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
          <div className="metric-label">Revenue (30 Days)</div>
          <div className="metric-value text-4xl font-black">
            ${salesData.totalRevenueLast30Days > 0 ? animatedRevenue.toFixed(2) : "0.00"}
          </div>
          <div className="metric-description flex items-center justify-between">
            <span>
              {salesData.totalSalesLast30Days} sales • Avg ${salesData.averageOrderValue.toFixed(2)}
            </span>
            {salesData.totalRevenueLast30Days > 0 && (
              <div className="flex items-center gap-1 text-success">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">+12%</span>
              </div>
            )}
          </div>
          {salesData.totalRevenueLast30Days === 0 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-warning/10 to-primary/10 rounded-lg border border-warning/20">
              <p className="text-sm text-warning font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Let's make your first sale this week! 🚀
              </p>
            </div>
          )}
        </div>

        <div
          className="premium-metric-card group cursor-pointer"
          onClick={() => router.push("/dashboard/free-content")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-chart-2/10 rounded-xl border border-chart-2/20">
              <Video className="h-6 w-6 text-chart-2" />
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-chart-2 transition-colors" />
            </div>
          </div>
          <div className="metric-label">Free Content</div>
          <div className="metric-value text-4xl font-black text-chart-2">{videoStats.totalFreeVideos}</div>
          <div className="metric-description">
            {videoStats.freeVideoPercentage.toFixed(1)}% of {videoStats.totalUploads} uploads
          </div>
          <div className="mt-4">
            <div className="premium-progress h-3">
              <div
                className="premium-progress-bar"
                style={{ width: `${Math.min(100, videoStats.freeVideoPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Free content boosts discovery</span>
              <span>{Math.min(100, videoStats.freeVideoPercentage).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="premium-metric-card group cursor-pointer" onClick={() => router.push("/dashboard/profile")}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-chart-3/10 rounded-xl border border-chart-3/20">
              <Eye className="h-6 w-6 text-chart-3" />
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-chart-3 transition-colors" />
            </div>
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
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  {completionPercentage > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{completedTasks}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">Creator Setup</h3>
                  <p className="text-sm text-muted-foreground">Complete your journey to success</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-primary">
                  {completedTasks}/{totalTasks}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {completionPercentage.toFixed(0)}% complete
                </div>
              </div>
            </div>

            {/* Premium circular progress indicator */}
            <div className="mb-6 relative">
              <div className="premium-progress h-4 rounded-full">
                <div
                  className="premium-progress-bar h-4 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-muted-foreground">Getting started</span>
                <span className="text-primary font-medium">{completionPercentage.toFixed(0)}% to success</span>
              </div>
            </div>

            {/* Enhanced task list with premium styling */}
            <div className="space-y-3">
              {[
                {
                  key: "stripe",
                  icon: CreditCard,
                  label: "Connect Stripe account",
                  color: "text-primary",
                  desc: "Start earning money",
                },
                {
                  key: "upload",
                  icon: Upload,
                  label: "Upload your first content",
                  color: "text-chart-2",
                  desc: "Share your creativity",
                },
                {
                  key: "freeContent",
                  icon: Gift,
                  label: "Add free content samples",
                  color: "text-chart-3",
                  desc: "Build your audience",
                },
                {
                  key: "bundle",
                  icon: ShoppingBag,
                  label: "Create your first bundle",
                  color: "text-chart-4",
                  desc: "Package your best work",
                },
                {
                  key: "socialBio",
                  icon: Link,
                  label: "Add link to social profiles",
                  color: "text-chart-5",
                  desc: "Drive traffic here",
                },
              ].map(({ key, icon: Icon, label, color, desc }) => (
                <div
                  key={key}
                  className={`premium-checklist-item group ${checkedTasks[key as keyof typeof checkedTasks] ? "completed" : ""}`}
                >
                  <Checkbox
                    id={key}
                    checked={checkedTasks[key as keyof typeof checkedTasks]}
                    onCheckedChange={() => handleTaskCheck(key as keyof typeof checkedTasks)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="p-2 bg-muted/20 rounded-lg group-hover:bg-muted/30 transition-colors">
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor={key}
                      onClick={() => handleTaskClick(key)}
                      className={`text-sm cursor-pointer hover:text-primary transition-colors font-medium block ${
                        checkedTasks[key as keyof typeof checkedTasks] ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>

            {completionPercentage === 100 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/20 rounded-lg">
                    <Zap className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-success font-bold">🎉 Congratulations!</p>
                    <p className="text-xs text-muted-foreground">You're ready to start earning serious money.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="premium-dashboard-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-chart-2/10 rounded-xl border border-chart-2/20">
                <Zap className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Your creator command center</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => router.push("/dashboard/bundles")}
                className="w-full justify-between premium-button h-12 text-left"
              >
                <div className="flex items-center">
                  <Package className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium">Create Bundle</div>
                    <div className="text-xs opacity-80">Package your best content</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => router.push("/dashboard/earnings")}
                variant="outline"
                className="w-full justify-between border-border hover:bg-muted/50 h-12 text-left"
              >
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium">View Earnings</div>
                    <div className="text-xs text-muted-foreground">Track your revenue</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => router.push("/dashboard/profile")}
                variant="outline"
                className="w-full justify-between border-border hover:bg-muted/50 h-12 text-left"
              >
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium">Edit Profile</div>
                    <div className="text-xs text-muted-foreground">Optimize your presence</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
