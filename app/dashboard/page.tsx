"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useProfileInitialization } from "@/hooks/use-profile-initialization"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DollarSign,
  TrendingUp,
  Video,
  RefreshCw,
  Activity,
  CreditCard,
  Upload,
  Gift,
  ShoppingBag,
  Link,
  Eye,
  Target,
  Zap,
  ArrowUpRight,
  BarChart3,
  Bell,
  Users,
  Download,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useVideoStatsAPI } from "@/hooks/use-video-stats-api"
import { useStripeDashboardSales } from "@/hooks/use-stripe-dashboard-sales"
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
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-slate-800/50" />
            <Skeleton className="h-4 w-40 bg-slate-800/30" />
          </div>
          <Skeleton className="h-9 w-28 bg-slate-800/50" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-3">
              <Skeleton className="h-4 w-24 bg-slate-800/50" />
              <Skeleton className="h-6 w-16 bg-slate-800/30" />
              <Skeleton className="h-3 w-32 bg-slate-800/20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show error state
  if (error && !videoStats.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-slate-900/50 border border-slate-800 w-full max-w-md p-6 rounded-lg text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <Activity className="h-6 w-6 text-red-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Dashboard Unavailable</h3>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} size="sm" className="flex-1">
              Try Again
            </Button>
            <Button onClick={() => router.push("/dashboard/upload")} variant="outline" size="sm" className="flex-1">
              Upload
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Creator Dashboard</h1>
            <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Welcome back, {user?.displayName || username || "Creator"}</span>
            <div className="w-1 h-1 bg-slate-600 rounded-full" />
            <span>Last updated 2 min ago</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="relative text-slate-400 hover:text-white">
            <Bell className="h-4 w-4" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing} size="sm" variant="outline">
            {refreshing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Graph - Centerpiece */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Revenue</h3>
                  <p className="text-sm text-slate-400">Last 30 days</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  ${salesData.totalRevenueLast30Days > 0 ? animatedRevenue.toFixed(2) : "0.00"}
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <TrendingUp className="h-3 w-3" />
                  <span>+16%</span>
                </div>
              </div>
            </div>

            {/* Simplified revenue visualization */}
            <div className="h-32 bg-slate-800/30 rounded-lg flex items-end justify-center p-4">
              <div className="flex items-end gap-1 h-full w-full max-w-md">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-t from-blue-500/60 to-blue-400/40 rounded-sm flex-1"
                    style={{
                      height: `${Math.random() * 60 + 20}%`,
                      opacity: i > 25 ? 1 : 0.3,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-slate-400">{salesData.totalSalesLast30Days} orders</span>
              <span className="text-slate-400">Avg ${salesData.averageOrderValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Compact Metrics Column */}
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Video className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-400">Free Content</div>
                <div className="text-xl font-bold text-white">{videoStats.totalFreeVideos}</div>
              </div>
              <div className="text-xs text-emerald-400 font-medium">+30%</div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-400 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, videoStats.freeVideoPercentage)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Eye className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-400">Profile Views</div>
                <ProfileViewStats userId={username || user?.uid || ""} compact />
              </div>
              <div className="text-xs text-emerald-400 font-medium">+23%</div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Download className="h-4 w-4 text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-400">Downloads</div>
                <div className="text-xl font-bold text-white">1,247</div>
              </div>
              <div className="text-xs text-emerald-400 font-medium">+12%</div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-400">Total Clips</div>
                <div className="text-xl font-bold text-white">{videoStats.totalUploads}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compact Weekly Forecast */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Weekly Forecast</h3>
                  <p className="text-sm text-slate-400">Next 7 days projection</p>
                </div>
              </div>
              <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                <span className="text-xs font-medium text-yellow-400">STABLE</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">$0.00</span>
                <span className="text-sm text-slate-400">low confidence</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Weekly Goal</span>
                  <span className="text-white font-medium">$50.00</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-2 rounded-full"
                    style={{ width: "3%" }}
                  />
                </div>
                <div className="text-xs text-slate-400">3% of weekly goal achieved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Creator Setup Progress */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Creator Setup</h3>
                <p className="text-sm text-slate-400">{completedTasks}/5 complete</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-400">{completionPercentage.toFixed(0)}%</div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: "stripe", icon: CreditCard, label: "Connect Stripe", color: "text-blue-400" },
              { key: "upload", icon: Upload, label: "Upload content", color: "text-purple-400" },
              { key: "freeContent", icon: Gift, label: "Add free samples", color: "text-emerald-400" },
              { key: "bundle", icon: ShoppingBag, label: "Create bundle", color: "text-orange-400" },
              { key: "socialBio", icon: Link, label: "Add social links", color: "text-cyan-400" },
            ].map(({ key, icon: Icon, label, color }) => (
              <div
                key={key}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  checkedTasks[key as keyof typeof checkedTasks]
                    ? "bg-slate-800/50 border-slate-700"
                    : "bg-slate-800/20 border-slate-800 hover:bg-slate-800/30"
                }`}
                onClick={() => handleTaskClick(key)}
              >
                <Checkbox
                  checked={checkedTasks[key as keyof typeof checkedTasks]}
                  onCheckedChange={() => handleTaskCheck(key as keyof typeof checkedTasks)}
                  className="border-slate-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <div className="p-1.5 bg-slate-700/50 rounded">
                  <Icon className={`h-3 w-3 ${color}`} />
                </div>
                <span
                  className={`text-sm flex-1 ${
                    checkedTasks[key as keyof typeof checkedTasks] ? "line-through text-slate-500" : "text-slate-300"
                  }`}
                >
                  {label}
                </span>
                <ArrowUpRight className="h-3 w-3 text-slate-500" />
              </div>
            ))}
          </div>

          {completionPercentage === 100 && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Ready to earn!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
