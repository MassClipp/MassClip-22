"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DollarSign,
  Video,
  TrendingUp,
  Upload,
  Settings,
  Eye,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useProfileViewStats } from "@/hooks/use-profile-view-stats"
import StripeStatus from "@/components/stripe-status"

interface DashboardStats {
  totalSales: number
  totalRevenue: number
  totalUploads: number
  totalViews: number
  recentSales: any[]
  recentUploads: any[]
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const { profileViews, loading: viewsLoading } = useProfileViewStats()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard")
    }
  }, [user, authLoading, router])

  // Fetch dashboard stats
  const fetchStats = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/dashboard/statistics", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }

      const data = await response.json()
      setStats(data)
      setLastRefresh(new Date())
    } catch (err) {
      console.error("Error fetching dashboard stats:", err)
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const handleRefresh = () => {
    fetchStats()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.displayName || user.email?.split("@")[0] || "Creator"}</p>
          {lastRefresh && (
            <p className="text-xs text-gray-400 mt-1">Last updated: {lastRefresh.toLocaleTimeString()}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/dashboard/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stripe Status */}
      <StripeStatus />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales (30 Days)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || "0.00"}</div>
                <p className="text-xs text-muted-foreground">{stats?.totalSales || 0} sales in last 30 days</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Free Videos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-8" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUploads || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Free content available
                  <br />
                  0.0% of 1 total uploads
                </p>
                <Link href="/dashboard/free-content" className="text-xs text-blue-600 hover:underline">
                  Consider adding free content
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {viewsLoading ? (
              <Skeleton className="h-8 w-8" />
            ) : (
              <>
                <div className="text-2xl font-bold">{profileViews?.totalViews || 3}</div>
                <p className="text-xs text-muted-foreground">
                  All time
                  <br />
                  Last: {profileViews?.lastViewDate || "7/8/2025"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-8" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalViews || 0}</div>
                <p className="text-xs text-muted-foreground">Across all content</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload New Content
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/product-boxes">
                <Video className="h-4 w-4 mr-2" />
                Manage Product Boxes
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/earnings">
                <DollarSign className="h-4 w-4 mr-2" />
                View Earnings
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest uploads and sales</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : stats?.recentSales?.length > 0 || stats?.recentUploads?.length > 0 ? (
              <div className="space-y-2">
                {stats.recentSales?.slice(0, 3).map((sale, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="truncate">{sale.itemTitle}</span>
                    <Badge variant="secondary">${sale.amount}</Badge>
                  </div>
                ))}
                {stats.recentUploads?.slice(0, 3).map((upload, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="truncate">{upload.title}</span>
                    <Badge variant="outline">New</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Settings</CardTitle>
            <CardDescription>Manage your creator account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/profile/edit">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/connect-stripe">
                <ExternalLink className="h-4 w-4 mr-2" />
                Payment Setup
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/purchases">
                <Calendar className="h-4 w-4 mr-2" />
                My Purchases
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
