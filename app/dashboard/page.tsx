"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useProfileInitialization } from "@/hooks/use-profile-initialization"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, RefreshCw, Activity, CreditCard, Target, Zap, BarChart3, Bell, Flame } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useVideoStatsAPI } from "@/hooks/use-video-stats-api"
import { useStripeDashboardSales } from "@/hooks/use-stripe-dashboard-sales"

export default function DashboardPage() {
  const { user } = useAuth()
  const { isInitializing, isComplete, username, error } = useProfileInitialization()
  const router = useRouter()
  const { toast } = useToast()

  const [refreshing, setRefreshing] = useState(false)
  const [animatedRevenue, setAnimatedRevenue] = useState(0)

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
      <div className="space-y-6">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
            <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs font-medium text-blue-400">
              PRO
            </div>
          </div>
          <p className="text-slate-400">Last updated just now</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <Bell className="h-4 w-4" />
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing} size="sm" variant="outline">
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Large Revenue Card - Left Side */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-6 h-[320px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Revenue (30 Days)</h3>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white mb-1">
                  ${salesData.totalRevenueLast30Days > 0 ? animatedRevenue.toFixed(2) : "0.00"}
                </div>
                <div className="text-sm text-slate-400">
                  {salesData.totalSalesLast30Days} sale • 1 Aug ${salesData.averageOrderValue.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="h-32 mb-6 relative">
              <svg className="w-full h-full" viewBox="0 0 400 120">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#64748b" stopOpacity="1" />
                    <stop offset="50%" stopColor="#94a3b8" stopOpacity="1" />
                    <stop offset="100%" stopColor="#cbd5e1" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 90 Q 50 85 80 80 Q 110 75 140 70 Q 170 65 200 60 Q 230 55 260 50 Q 290 45 320 40 Q 350 35 380 30"
                  stroke="url(#lineGradient)"
                  strokeWidth="3"
                  fill="none"
                  className="drop-shadow-sm"
                />
                {/* Data points */}
                <circle cx="380" cy="30" r="4" fill="#cbd5e1" className="drop-shadow-sm" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>1 wek</span>
              <span>Email</span>
              <span>Profile</span>
            </div>

            {/* Downloads notification */}
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-slate-300">3 new downloads today</span>
            </div>
          </div>
        </div>

        {/* Compact Metrics - Right Side */}
        <div className="space-y-4">
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Total Sales (30 days)</span>
              <span className="text-xs text-slate-500">1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">1</span>
              <div className="flex items-center gap-1 text-emerald-400 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>+100%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Profile Views</span>
              <span className="text-xs text-slate-500">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">0</span>
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <BarChart3 className="h-3 w-3" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Free Clips Uploaded</span>
              <span className="text-xs text-slate-500">5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">{videoStats.totalFreeVideos}</span>
              <span className="text-xs text-slate-400">of 18</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly Forecast - Bottom Left */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-white">Weekly Forecast</h3>
                <p className="text-sm text-slate-400">7-days projection</p>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-sm">
                <TrendingUp className="h-3 w-3" />
                <span>28%</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-3xl font-bold text-white mb-1">$50.00</div>
              <div className="text-sm text-slate-400">goal</div>
            </div>

            <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
                style={{ width: "28%" }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-slate-300">New-goal</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <span className="text-slate-300">success</span>
              </div>
            </div>
          </div>
        </div>

        {/* Creator Setup - Bottom Right */}
        <div className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Target className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Creator setup</h3>
            </div>
          </div>

          <div className="space-y-3">
            {/* Connect Stripe Account */}
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
              onClick={() => handleTaskClick("stripe")}
            >
              <div className="p-1.5 bg-blue-500/10 rounded">
                <CreditCard className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-sm text-slate-300 flex-1">Connect Stripe account</span>
              <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            </div>

            {/* Upload First Content */}
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
              onClick={() => handleTaskClick("upload")}
            >
              <div className="p-1.5 bg-purple-500/10 rounded">
                <Activity className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-sm text-slate-300 flex-1">Upload your first content</span>
              <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            </div>

            {/* Create Bundle */}
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
              onClick={() => handleTaskClick("bundle")}
            >
              <div className="p-1.5 bg-emerald-500/10 rounded">
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm text-slate-300 flex-1">Create your first bundle</span>
              <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            </div>
          </div>

          <div className="mt-6 text-right">
            <span className="text-lg font-bold text-blue-400">0%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
