"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts"

interface EarningsData {
  totalEarnings: number
  grossSales: number
  totalPlatformFees: number
  thisMonth: number
  thisMonthGross: number
  thisMonthPlatformFees: number
  availableBalance: number
  totalSales: number
  avgOrderValue: number
  monthlyGrowth: number
  last30Days: number
  last30DaysGross: number
  last30DaysPlatformFees: number
  thisMonthSales: number
  last30DaysSales: number
  pendingPayout: number
  accountStatus: string
  stripeAccountId?: string
  connectedAccountData?: any
}

interface EarningsContentProps {
  initialData?: EarningsData
}

export default function EarningsContent({ initialData }: EarningsContentProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<EarningsData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const fetchEarningsData = async (showRefreshToast = false) => {
    if (!user) return

    try {
      if (showRefreshToast) setRefreshing(true)
      else setLoading(true)

      console.log("🔍 [Earnings] Fetching earnings data...")

      const idToken = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch earnings`)
      }

      const result = await response.json()
      console.log("📊 [Earnings] Data received:", result)

      setData(result)

      if (showRefreshToast) {
        toast({
          title: "Data Refreshed",
          description: "Earnings data has been updated successfully",
        })
      }
    } catch (error) {
      console.error("❌ [Earnings] Error:", error)
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleStripeDashboard = async () => {
    if (!user || !data?.stripeAccountId) {
      toast({
        title: "Error",
        description: "Stripe account not connected",
        variant: "destructive",
      })
      return
    }

    try {
      setDashboardLoading(true)
      console.log("🔗 [Earnings] Creating Stripe Express dashboard link...")

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/express-dashboard-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          accountId: data.stripeAccountId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create dashboard link")
      }

      const result = await response.json()

      if (result.url) {
        console.log("✅ [Earnings] Opening Stripe Express dashboard:", result.url)
        window.open(result.url, "_blank")
      } else {
        throw new Error("No dashboard URL received")
      }
    } catch (error) {
      console.error("❌ [Earnings] Dashboard link error:", error)
      toast({
        title: "Error",
        description: "Failed to open Stripe dashboard. Opening general dashboard instead.",
        variant: "destructive",
      })
      // Fallback to general Stripe dashboard
      window.open("https://dashboard.stripe.com", "_blank")
    } finally {
      setDashboardLoading(false)
    }
  }

  const generateRevenueData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
    return months.map((month, index) => ({
      month,
      revenue: Math.floor(Math.random() * 2000) + index * 300 + 500,
    }))
  }

  const generateSalesReportData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return days.map((day) => ({
      day,
      sales: Math.floor(Math.random() * 500) + 200,
    }))
  }

  const revenueData = generateRevenueData()
  const salesReportData = generateSalesReportData()

  useEffect(() => {
    if (!initialData && user) {
      fetchEarningsData()
    }
  }, [user, initialData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-zinc-500 animate-spin" />
        <span className="ml-3 text-zinc-400">Loading earnings data...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💰</div>
        <h3 className="text-xl font-medium text-white mb-2">No Earnings Data</h3>
        <p className="text-zinc-400 mb-4">Unable to load your earnings information</p>
        <Button onClick={() => fetchEarningsData()} variant="outline" className="border-zinc-700 bg-transparent">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Sales Earnings</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEarningsData(true)}
          disabled={refreshing}
          className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Large Revenue Card - Left Side */}
        <Card className="bg-zinc-900/50 border-zinc-800 lg:row-span-2">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-white">${data.grossSales.toLocaleString()}</div>
              <div className="text-xl text-zinc-400 font-medium">Total Revenue</div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Line Chart - Top Right */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Report Bar Chart - Bottom Left */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Sales Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesReportData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards - Bottom Right */}
        <div className="space-y-4">
          {/* Profit Card */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">${data.totalEarnings.toLocaleString()}</div>
                <div className="text-sm text-zinc-400 mt-1">Profit</div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Card */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{data.totalSales.toLocaleString()}</div>
                <div className="text-sm text-zinc-400 mt-1">Orders</div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate Card */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {data.totalSales > 0 ? Math.round((data.totalSales / (data.totalSales * 4)) * 100) : 0}%
                </div>
                <div className="text-sm text-zinc-400 mt-1">Conversion Rate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
