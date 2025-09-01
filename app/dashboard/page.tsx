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
  CreditCard,
  Upload,
  Gift,
  ShoppingBag,
  Link,
  BarChart3,
  Eye,
  ArrowUpRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useVideoStatsAPI } from "@/hooks/use-video-stats-api"
import { useStripeDashboardSales } from "@/hooks/use-stripe-dashboard-sales"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const mockSalesData = [
  { date: "Jan", sales: 4000, revenue: 2400 },
  { date: "Feb", sales: 3000, revenue: 1398 },
  { date: "Mar", sales: 2000, revenue: 9800 },
  { date: "Apr", sales: 2780, revenue: 3908 },
  { date: "May", sales: 1890, revenue: 4800 },
  { date: "Jun", sales: 2390, revenue: 3800 },
]

const mockContentData = [
  { name: "Free", value: 65, color: "#10b981" },
  { name: "Premium", value: 35, color: "#3b82f6" },
]

const mockTrafficData = [
  { day: "Mon", views: 120 },
  { day: "Tue", views: 150 },
  { day: "Wed", views: 180 },
  { day: "Thu", views: 220 },
  { day: "Fri", views: 200 },
  { day: "Sat", views: 170 },
  { day: "Sun", views: 190 },
]

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

  // Show loading state while profile is being initialized or stats are loading
  if (isInitializing || videoStats.loading || salesData.loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-gray-200">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Dashboard Error</CardTitle>
            <CardDescription>There was an issue loading your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
              <Button onClick={() => router.push("/dashboard/upload")} variant="outline" className="w-full">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.displayName || username || "Creator"}</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
          className="border-gray-300 hover:bg-gray-50 bg-transparent"
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

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${salesData.totalRevenueLast30Days.toFixed(2)}</div>
            <div className="flex items-center text-xs text-gray-600 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              <span>+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{salesData.totalSalesLast30Days}</div>
            <div className="flex items-center text-xs text-gray-600 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              <span>+8% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Free Content</CardTitle>
            <Video className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{videoStats.totalFreeVideos}</div>
            <div className="flex items-center text-xs text-gray-600 mt-1">
              <span>{videoStats.freeVideoPercentage.toFixed(1)}% of total uploads</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">1,247</div>
            <div className="flex items-center text-xs text-gray-600 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              <span>+5% from last week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Revenue Trend</CardTitle>
            <CardDescription className="text-gray-600">Monthly revenue and sales performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockSalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Content Distribution */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Content Mix</CardTitle>
            <CardDescription className="text-gray-600">Free vs Premium content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockContentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockContentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {mockContentData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Traffic */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Weekly Traffic</CardTitle>
            <CardDescription className="text-gray-600">Profile views by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockTrafficData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Bar dataKey="views" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Setup Progress & Quick Actions */}
        <div className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Setup Progress</CardTitle>
                  <CardDescription className="text-gray-600">Complete your creator profile</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {completedTasks}/{totalTasks}
                  </div>
                  <div className="text-xs text-gray-500">{completionPercentage.toFixed(0)}% complete</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
                    className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <label
                      htmlFor="stripe"
                      onClick={() => handleTaskClick("stripe")}
                      className={`text-sm cursor-pointer hover:text-gray-900 transition-colors ${checkedTasks.stripe ? "line-through text-gray-500" : "text-gray-700"}`}
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
                    className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <label
                      htmlFor="upload"
                      onClick={() => handleTaskClick("upload")}
                      className={`text-sm cursor-pointer hover:text-gray-900 transition-colors ${checkedTasks.upload ? "line-through text-gray-500" : "text-gray-700"}`}
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
                    className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Gift className="h-4 w-4 text-gray-400" />
                    <label
                      htmlFor="freeContent"
                      onClick={() => handleTaskClick("freeContent")}
                      className={`text-sm cursor-pointer hover:text-gray-900 transition-colors ${checkedTasks.freeContent ? "line-through text-gray-500" : "text-gray-700"}`}
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
                    className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <ShoppingBag className="h-4 w-4 text-gray-400" />
                    <label
                      htmlFor="bundle"
                      onClick={() => handleTaskClick("bundle")}
                      className={`text-sm cursor-pointer hover:text-gray-900 transition-colors ${checkedTasks.bundle ? "line-through text-gray-500" : "text-gray-700"}`}
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
                    className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Link className="h-4 w-4 text-gray-400" />
                    <label
                      htmlFor="socialBio"
                      onClick={() => handleTaskClick("socialBio")}
                      className={`text-sm cursor-pointer hover:text-gray-900 transition-colors ${checkedTasks.socialBio ? "line-through text-gray-500" : "text-gray-700"}`}
                    >
                      Put storefront link in social bio
                    </label>
                  </div>
                </div>
              </div>

              {completionPercentage === 100 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    🎉 Great job! You're all set up and ready to start selling.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => router.push("/dashboard/bundles")}
                className="w-full justify-start bg-gray-900 hover:bg-gray-800"
              >
                <Package className="h-4 w-4 mr-2" />
                Create Bundle
              </Button>

              <Button
                onClick={() => router.push("/dashboard/earnings")}
                variant="outline"
                className="w-full justify-start border-gray-300 hover:bg-gray-50"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                View Earnings
              </Button>

              <Button
                onClick={() => router.push("/dashboard/profile")}
                variant="outline"
                className="w-full justify-start border-gray-300 hover:bg-gray-50"
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
