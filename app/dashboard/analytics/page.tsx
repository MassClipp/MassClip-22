"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingUp, Users, DollarSign, Eye, RefreshCw } from "lucide-react"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalVideos: 0,
    totalEarnings: 0,
    totalSales: 0,
    viewsThisWeek: 0,
    salesThisWeek: 0,
    topVideos: [] as any[],
    recentSales: [] as any[],
    viewsOverTime: [] as any[],
  })

  const fetchAnalytics = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get all videos
      const videosQuery = query(collection(db, "videos"), where("uid", "==", user.uid))
      const videosSnapshot = await getDocs(videosQuery)
      const videos = videosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Calculate total views and get top videos
      const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0)
      const topVideos = videos.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)

      // Get sales data
      const salesQuery = query(collection(db, "users", user.uid, "sales"), orderBy("purchasedAt", "desc"), limit(100))
      const salesSnapshot = await getDocs(salesQuery)
      const sales = salesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        purchasedAt: doc.data().purchasedAt?.toDate() || new Date(),
      }))

      // Calculate earnings
      const totalEarnings = sales.reduce((sum, sale) => sum + (sale.netAmount || 0), 0)

      // Calculate this week's data
      const weekAgo = subDays(new Date(), 7)
      const viewsThisWeek = videos
        .filter((video) => video.createdAt && video.createdAt.toDate() >= weekAgo)
        .reduce((sum, video) => sum + (video.views || 0), 0)

      const salesThisWeek = sales.filter((sale) => sale.purchasedAt >= weekAgo).length

      // Get recent sales
      const recentSales = sales.slice(0, 10)

      // Create views over time data (last 30 days)
      const viewsOverTime = []
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)

        const dayViews = videos
          .filter((video) => {
            if (!video.createdAt) return false
            const videoDate = video.createdAt.toDate()
            return videoDate >= dayStart && videoDate <= dayEnd
          })
          .reduce((sum, video) => sum + (video.views || 0), 0)

        viewsOverTime.push({
          date: format(date, "MMM d"),
          views: dayViews,
        })
      }

      setAnalytics({
        totalViews,
        totalVideos: videos.length,
        totalEarnings,
        totalSales: sales.length,
        viewsThisWeek,
        salesThisWeek,
        topVideos,
        recentSales,
        viewsOverTime,
      })

      if (refreshing) {
        toast({
          title: "Analytics refreshed",
          description: "Your analytics data has been updated.",
        })
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      if (refreshing) {
        toast({
          title: "Refresh failed",
          description: "There was an error refreshing your analytics data.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [user])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAnalytics()
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-zinc-400 mt-1">Track your content performance and earnings</p>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-700 hover:bg-zinc-800"
        >
          {refreshing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Eye className="h-5 w-5 text-blue-500 mr-2" />
              {analytics.totalViews.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">+{analytics.viewsThisWeek} this week</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Videos</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              {analytics.totalVideos}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Content library</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Earnings</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="h-5 w-5 text-purple-500 mr-2" />${analytics.totalEarnings.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">{analytics.totalSales} total sales</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Sales This Week</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Users className="h-5 w-5 text-amber-500 mr-2" />
              {analytics.salesThisWeek}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Recent activity</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="videos">Top Videos</TabsTrigger>
          <TabsTrigger value="sales">Recent Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Views Over Time</CardTitle>
              <CardDescription>Your content views for the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.viewsOverTime.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-xs text-zinc-500">
                    {analytics.viewsOverTime.slice(-7).map((day, index) => (
                      <div key={index} className="text-center">
                        {day.date}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {analytics.viewsOverTime.slice(-7).map((day, index) => (
                      <div key={index} className="text-center">
                        <div className="bg-zinc-800 rounded p-2">
                          <div className="text-sm font-medium text-white">{day.views}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-500">No view data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Top Performing Videos</CardTitle>
              <CardDescription>Your most viewed content</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topVideos.length > 0 ? (
                <div className="space-y-4">
                  {analytics.topVideos.map((video, index) => (
                    <div key={video.id} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50">
                      <div className="text-lg font-bold text-zinc-400 w-8">#{index + 1}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{video.title}</h4>
                        <p className="text-sm text-zinc-400">
                          {video.views || 0} views • {video.type === "premium" ? "Premium" : "Free"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{video.views || 0}</div>
                        <div className="text-xs text-zinc-500">views</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-500">No videos found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Your latest premium content purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.recentSales.length > 0 ? (
                <div className="space-y-4">
                  {analytics.recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                      <div>
                        <h4 className="font-medium text-white">{sale.videoTitle || "Premium Content"}</h4>
                        <p className="text-sm text-zinc-400">{format(sale.purchasedAt, "MMM d, yyyy h:mm a")}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-500">+${sale.netAmount?.toFixed(2) || "0.00"}</div>
                        <div className="text-xs text-zinc-500">net earnings</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-500">No sales yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
