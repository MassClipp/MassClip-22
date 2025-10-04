"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  DollarSign,
  Video,
  Eye,
  ShoppingCart,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

interface PlatformStats {
  totalUsers: number
  activeCreators: number
  totalVideos: number
  totalRevenue: number
  totalSales: number
  totalProfileViews: number
  avgRevenuePerCreator: number
  avgVideosPerCreator: number
  topCreators: Array<{
    userId: string
    username: string
    revenue: number
    sales: number
    videos: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
    sales: number
  }>
  userGrowth: Array<{
    date: string
    users: number
  }>
  contentStats: {
    freeVideos: number
    premiumVideos: number
    avgPrice: number
  }
  dailyStats?: Array<{
    date: string
    revenue: number
    sales: number
    views: number
    newUsers: number
  }>
  conversionFunnel?: {
    profileViews: number
    videoViews: number
    addToCarts: number
    purchases: number
  }
  contentPerformance?: {
    avgViewsPerVideo: number
    avgRevenuePerVideo: number
    topPerformingVideos: Array<{
      id: string
      title: string
      views: number
      revenue: number
      conversionRate: number
    }>
  }
  growthMetrics?: {
    revenueGrowthMoM: number
    userGrowthMoM: number
    salesGrowthWoW: number
  }
  creatorTiers?: {
    topTier: number // >$1000/month
    midTier: number // $100-$1000/month
    lowTier: number // <$100/month
  }
  peakActivity?: {
    peakHour: number
    peakDay: string
    activityByHour: Array<{ hour: number; activity: number }>
    activityByDay: Array<{ day: string; activity: number }>
  }
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d")

  useEffect(() => {
    fetchPlatformStats()
  }, [timeRange])

  const fetchPlatformStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/platform-stats?range=${timeRange}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error("Error fetching platform stats:", err)
      setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  const formatGrowth = (value: number) => {
    const isPositive = value >= 0
    return (
      <span className={`flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-400">{error || "Failed to load platform statistics"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Platform Analytics</h1>
        <p className="text-muted-foreground">Comprehensive insights into platform performance and user activity</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2">
        {(["7d", "30d", "90d", "all"] as const).map((range) => (
          <Badge
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setTimeRange(range)}
          >
            {range === "7d" && "Last 7 Days"}
            {range === "30d" && "Last 30 Days"}
            {range === "90d" && "Last 90 Days"}
            {range === "all" && "All Time"}
          </Badge>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{stats.activeCreators} active creators</p>
              {stats.growthMetrics && <div className="text-xs">{formatGrowth(stats.growthMetrics.userGrowthMoM)}</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{stats.totalSales} total sales</p>
              {stats.growthMetrics && (
                <div className="text-xs">{formatGrowth(stats.growthMetrics.revenueGrowthMoM)}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVideos.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.contentStats.freeVideos} free, {stats.contentStats.premiumVideos} premium
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProfileViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all creators</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Revenue/Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  $
                  {stats.avgRevenuePerCreator.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Content Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  $
                  {stats.contentStats.avgPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalProfileViews > 0
                    ? ((stats.totalSales / stats.totalProfileViews) * 100).toFixed(2)
                    : "0.00"}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.dailyStats && stats.dailyStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Breakdown</CardTitle>
                <CardDescription>Detailed day-by-day revenue and sales performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      name="Revenue ($)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sales"
                      stroke="#3b82f6"
                      name="Sales"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>Monthly revenue and sales trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Volume</CardTitle>
              <CardDescription>Number of sales per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeCreators}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.activeCreators / stats.totalUsers) * 100).toFixed(1)}% of total users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Videos/Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgVideosPerCreator.toFixed(1)}</div>
              </CardContent>
            </Card>
          </div>

          {stats.creatorTiers && (
            <Card>
              <CardHeader>
                <CardTitle>Creator Performance Tiers</CardTitle>
                <CardDescription>Distribution of creators by monthly revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Top Tier</span>
                      <Badge variant="default" className="bg-yellow-600">
                        $1000+
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold">{stats.creatorTiers.topTier}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stats.creatorTiers.topTier / stats.activeCreators) * 100).toFixed(1)}% of creators
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Mid Tier</span>
                      <Badge variant="secondary">$100-$1000</Badge>
                    </div>
                    <p className="text-2xl font-bold">{stats.creatorTiers.midTier}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stats.creatorTiers.midTier / stats.activeCreators) * 100).toFixed(1)}% of creators
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Growing</span>
                      <Badge variant="outline">{"<$100"}</Badge>
                    </div>
                    <p className="text-2xl font-bold">{stats.creatorTiers.lowTier}</p>
                    <p className="text-xs text-muted-foreground">
                      {((stats.creatorTiers.lowTier / stats.activeCreators) * 100).toFixed(1)}% of creators
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Top Tier ($1000+)", value: stats.creatorTiers.topTier },
                        { name: "Mid Tier ($100-$1000)", value: stats.creatorTiers.midTier },
                        { name: "Growing (<$100)", value: stats.creatorTiers.lowTier },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Creators</CardTitle>
              <CardDescription>Highest earning creators on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topCreators.map((creator, index) => (
                  <div key={creator.userId} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{creator.username || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground">{creator.videos} videos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        $
                        {creator.revenue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">{creator.sales} sales</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New user registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVideos}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Free Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.contentStats.freeVideos}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.contentStats.freeVideos / stats.totalVideos) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Premium Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.contentStats.premiumVideos}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.contentStats.premiumVideos / stats.totalVideos) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {stats.contentPerformance && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Avg Views per Video</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.contentPerformance.avgViewsPerVideo.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Average engagement per content</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Avg Revenue per Video</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      $
                      {stats.contentPerformance.avgRevenuePerVideo.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">Average monetization per content</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Videos</CardTitle>
                  <CardDescription>Highest revenue generating content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.contentPerformance.topPerformingVideos.map((video, index) => (
                      <div key={video.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center text-xs">
                            {index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{video.title}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                              <span>{video.views.toLocaleString()} views</span>
                              <span>{video.conversionRate.toFixed(2)}% conversion</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            $
                            {video.revenue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Content Distribution</CardTitle>
              <CardDescription>Breakdown of free vs premium content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Free Content</span>
                    <span className="text-sm text-muted-foreground">{stats.contentStats.freeVideos} videos</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(stats.contentStats.freeVideos / stats.totalVideos) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Premium Content</span>
                    <span className="text-sm text-muted-foreground">{stats.contentStats.premiumVideos} videos</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${(stats.contentStats.premiumVideos / stats.totalVideos) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Profile Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProfileViews.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Views per Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.activeCreators > 0 ? Math.round(stats.totalProfileViews / stats.activeCreators) : 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">View to Sale Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalSales > 0 ? Math.round(stats.totalProfileViews / stats.totalSales) : 0}:1
                </div>
                <p className="text-xs text-muted-foreground">Views per sale</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>Platform-wide engagement statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Active Users</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.activeCreators}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Total Transactions</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.totalSales}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          {stats.conversionFunnel ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                  <CardDescription>User journey from discovery to purchase</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Eye className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Profile Views</p>
                            <p className="text-sm text-muted-foreground">Initial discovery</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{stats.conversionFunnel.profileViews.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">100%</p>
                        </div>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-blue-500 to-purple-500" />
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Video className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="font-medium">Video Views</p>
                            <p className="text-sm text-muted-foreground">Content engagement</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{stats.conversionFunnel.videoViews.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {((stats.conversionFunnel.videoViews / stats.conversionFunnel.profileViews) * 100).toFixed(
                              1,
                            )}
                            %
                          </p>
                        </div>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-purple-500 to-orange-500" />
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="font-medium">Add to Cart</p>
                            <p className="text-sm text-muted-foreground">Purchase intent</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{stats.conversionFunnel.addToCarts.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {((stats.conversionFunnel.addToCarts / stats.conversionFunnel.profileViews) * 100).toFixed(
                              1,
                            )}
                            %
                          </p>
                        </div>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-orange-500 to-green-500" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Target className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">Purchases</p>
                            <p className="text-sm text-muted-foreground">Completed transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{stats.conversionFunnel.purchases.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {((stats.conversionFunnel.purchases / stats.conversionFunnel.profileViews) * 100).toFixed(
                              1,
                            )}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Profile → Video</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((stats.conversionFunnel.videoViews / stats.conversionFunnel.profileViews) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Engagement rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Video → Cart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((stats.conversionFunnel.addToCarts / stats.conversionFunnel.videoViews) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Interest rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cart → Purchase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((stats.conversionFunnel.purchases / stats.conversionFunnel.addToCarts) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Checkout completion</p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Conversion funnel data not available for this time range
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {stats.peakActivity ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Peak Activity Hour</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div className="text-2xl font-bold">{stats.peakActivity.peakHour}:00</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Highest user activity time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Peak Activity Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.peakActivity.peakDay}</div>
                    <p className="text-xs text-muted-foreground">Most active day of week</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Activity by Hour</CardTitle>
                  <CardDescription>User activity patterns throughout the day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.peakActivity.activityByHour}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" label={{ value: "Hour of Day", position: "insideBottom", offset: -5 }} />
                      <YAxis label={{ value: "Activity", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Bar dataKey="activity" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity by Day of Week</CardTitle>
                  <CardDescription>Weekly activity distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.peakActivity.activityByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="activity" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Activity pattern data not available for this time range
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
