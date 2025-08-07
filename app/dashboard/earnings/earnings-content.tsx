"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, DollarSign, TrendingUp, CreditCard, BarChart3, ExternalLink, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface EarningsData {
  totalEarnings: number
  thisMonth: number
  availableBalance: number
  totalSales: number
  avgOrderValue: number
  monthlyGrowth: number
  last30Days: number
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

  useEffect(() => {
    if (!initialData && user) {
      fetchEarningsData()
    }
  }, [user, initialData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Earnings</h1>
          <p className="text-zinc-400">Financial overview and performance metrics</p>
        </div>

        <div className="flex items-center gap-3">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${data.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-zinc-500">All-time revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${data.thisMonth.toFixed(2)}</div>
            <p className="text-xs text-green-400">
              +{data.monthlyGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Available Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${data.availableBalance.toFixed(2)}</div>
            <p className="text-xs text-zinc-500">Ready for payout</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Sales</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.totalSales}</div>
            <p className="text-xs text-zinc-500">${data.avgOrderValue.toFixed(2)} avg order</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-zinc-900 border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800">
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-zinc-800">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-zinc-800">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Performance */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Performance</CardTitle>
                <p className="text-sm text-zinc-400">Your earnings breakdown</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Last 30 Days</span>
                  <span className="font-semibold text-white">${data.last30Days.toFixed(2)}</span>
                </div>
                <Separator className="bg-zinc-800" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">This Month Sales</span>
                  <span className="font-semibold text-white">{data.thisMonthSales}</span>
                </div>
                <Separator className="bg-zinc-800" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Last 30 Days Sales</span>
                  <span className="font-semibold text-white">{data.last30DaysSales}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payout Information */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Payout Information</CardTitle>
                <p className="text-sm text-zinc-400">Balance and payout status</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Pending Payout</span>
                  <span className="font-semibold text-white">${data.pendingPayout.toFixed(2)}</span>
                </div>
                <Separator className="bg-zinc-800" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Available Balance</span>
                  <span className="font-semibold text-green-400">${data.availableBalance.toFixed(2)}</span>
                </div>
                <Separator className="bg-zinc-800" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Account Status</span>
                  <Badge variant={data.accountStatus === "Active" ? "default" : "secondary"}>
                    {data.accountStatus}
                  </Badge>
                </div>
                <Separator className="bg-zinc-800" />
                <Button
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                  onClick={handleStripeDashboard}
                  disabled={dashboardLoading}
                >
                  {dashboardLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Stripe Dashboard
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Transactions</CardTitle>
              <p className="text-sm text-zinc-400">Your latest sales and payments</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-zinc-500">Transaction history coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Analytics & Insights</CardTitle>
              <p className="text-sm text-zinc-400">Detailed performance metrics</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📈</div>
                <p className="text-zinc-500">Advanced analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
