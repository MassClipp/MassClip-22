"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DollarSign, Package, TrendingUp, Video, RefreshCw, Activity, Calendar, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface DashboardStats {
  totalUploads: number
  totalFreeVideos: number
  freeVideoPercentage: number
  totalRevenueLast30Days: number
  totalSalesLast30Days: number
  averageOrderValue: number
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [stats, setStats] = useState<DashboardStats>({
    totalUploads: 0,
    totalFreeVideos: 0,
    freeVideoPercentage: 0,
    totalRevenueLast30Days: 0,
    totalSalesLast30Days: 0,
    averageOrderValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      setError(null)

      // Get auth token
      const token = await user.getIdToken()

      // Fetch uploads data with better error handling
      const uploadsResponse = await fetch("/api/uploads", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      let uploadsData = { uploads: [] }
      if (uploadsResponse.ok) {
        uploadsData = await uploadsResponse.json()
      } else {
        console.warn("Failed to fetch uploads:", uploadsResponse.status)
        // Continue with empty data instead of failing completely
      }

      // Calculate video stats
      const totalUploads = uploadsData.uploads?.length || 0
      const freeVideos =
        uploadsData.uploads?.filter((upload: any) => upload.isPublic !== false && upload.type !== "premium") || []
      const totalFreeVideos = freeVideos.length
      const freeVideoPercentage = totalUploads > 0 ? (totalFreeVideos / totalUploads) * 100 : 0

      // Try to fetch sales data (optional)
      let salesData = {
        totalRevenueLast30Days: 0,
        totalSalesLast30Days: 0,
        averageOrderValue: 0,
      }

      try {
        const salesResponse = await fetch("/api/dashboard/statistics", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (salesResponse.ok) {
          const salesResult = await salesResponse.json()
          salesData = {
            totalRevenueLast30Days: salesResult.totalRevenueLast30Days || 0,
            totalSalesLast30Days: salesResult.totalSalesLast30Days || 0,
            averageOrderValue: salesResult.averageOrderValue || 0,
          }
        }
      } catch (salesError) {
        console.warn("Failed to fetch sales data:", salesError)
        // Continue without sales data
      }

      setStats({
        totalUploads,
        totalFreeVideos,
        freeVideoPercentage,
        ...salesData,
      })
    } catch (error) {
      console.error("Dashboard error:", error)
      setError(error instanceof Error ? error.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      fetchDashboardData()
    } else if (!authLoading && !user) {
      setLoading(false)
      setError("Please log in to view your dashboard")
    }
  }, [user, authLoading])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
    toast({
      title: "Dashboard Refreshed",
      description: "Your dashboard data has been updated",
    })
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
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

  // Show error state with more helpful information
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Creator Dashboard</h1>
            <p className="text-zinc-400">Welcome back, {user?.displayName || "Creator"}</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        </div>

        <Alert className="border-red-800 bg-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">
            <strong>Dashboard Error:</strong> {error}
            <br />
            <span className="text-sm text-red-300 mt-2 block">
              This might be a temporary issue. Try refreshing or check your internet connection.
            </span>
          </AlertDescription>
        </Alert>

        {/* Show basic dashboard layout even with errors */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-200">Sales (30 Days)</CardTitle>
              <Calendar className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-zinc-500">Data unavailable</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-200">Free Videos</CardTitle>
              <Video className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-zinc-500">Data unavailable</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
              <Activity className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-zinc-500">Data unavailable</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Dashboard</h1>
          <p className="text-zinc-400">Welcome back, {user?.displayName || "Creator"}</p>
          <div className="flex items-center gap-2 mt-1">
            <Activity className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-500">Live Data</span>
          </div>
        </div>
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900/50 border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Sales (30 Days)</CardTitle>
            <Calendar className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenueLast30Days.toFixed(2)}</div>
            <p className="text-xs text-zinc-500">{stats.totalSalesLast30Days} sales in last 30 days</p>
            {stats.averageOrderValue > 0 && (
              <p className="text-xs text-zinc-400 mt-1">Avg: ${stats.averageOrderValue.toFixed(2)} per sale</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Free Videos</CardTitle>
            <Video className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFreeVideos}</div>
            <p className="text-xs text-zinc-500">Free content available</p>
            {stats.totalUploads > 0 && (
              <p className="text-xs text-zinc-400 mt-1">
                {stats.freeVideoPercentage.toFixed(1)}% of {stats.totalUploads} total uploads
              </p>
            )}
            {stats.totalFreeVideos === 0 && stats.totalUploads > 0 && (
              <p className="text-xs text-yellow-500 mt-1">Consider adding free content</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
            <Activity className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-zinc-900/50 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="w-full justify-start bg-blue-600 hover:bg-blue-700"
            >
              <Video className="h-4 w-4 mr-2" />
              Upload Content
            </Button>

            <Button
              onClick={() => router.push("/dashboard/bundles")}
              variant="outline"
              className="w-full justify-start border-zinc-700 hover:bg-zinc-800"
            >
              <Package className="h-4 w-4 mr-2" />
              Create Bundle
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

        <Card className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border-zinc-700/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                <Video className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-200 mb-1">Content Library</div>
                <div className="text-2xl font-bold text-white">{stats.totalUploads}</div>
                <div className="text-xs text-zinc-500 mt-1">total uploads</div>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-400">Free videos:</span>
                    <span className="text-white font-medium">{stats.totalFreeVideos}</span>
                  </div>
                  {stats.totalUploads > stats.totalFreeVideos && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-yellow-400">Premium videos:</span>
                      <span className="text-white font-medium">{stats.totalUploads - stats.totalFreeVideos}</span>
                    </div>
                  )}
                  {stats.totalUploads > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-400">Free ratio:</span>
                      <span className="text-white font-medium">{stats.freeVideoPercentage.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
