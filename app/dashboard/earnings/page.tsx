"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, TrendingUp, Users, CreditCard, RefreshCw, AlertCircle, ExternalLink, Settings } from "lucide-react"
import { formatCurrency, formatInteger, formatPercentage } from "@/lib/format-utils"
import Link from "next/link"

interface EarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  last30DaysEarnings: number
  pendingPayout: number
  availableBalance: number
  salesMetrics: {
    totalSales: number
    thisMonthSales: number
    last30DaysSales: number
    averageTransactionValue: number
  }
  recentTransactions: any[]
  payoutHistory: any[]
  monthlyBreakdown: any[]
}

interface ApiResponse {
  success?: boolean
  data: EarningsData
  error?: string
  message?: string
  needsStripeConnection?: boolean
  dataSource?: string
  lastUpdated?: string
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsStripeConnection, setNeedsStripeConnection] = useState(false)
  const [dataSource, setDataSource] = useState<string>("unknown")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchEarningsData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching earnings data...")
      const response = await fetch("/api/dashboard/earnings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result: ApiResponse = await response.json()
      console.log("📊 Earnings API response:", result)

      if (result.needsStripeConnection) {
        setNeedsStripeConnection(true)
        setError(result.message || "Stripe account connection required")
      } else if (result.error && result.dataSource !== "fallback") {
        setError(result.message || result.error)
      } else {
        setError(null)
        setNeedsStripeConnection(false)
      }

      setData(result.data)
      setDataSource(result.dataSource || "unknown")
      setLastUpdated(result.lastUpdated || null)
    } catch (err) {
      console.error("💥 Failed to fetch earnings:", err)
      setError("Failed to load earnings data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarningsData()
  }, [])

  const calculateGrowthPercentage = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const monthlyGrowth = data ? calculateGrowthPercentage(data.thisMonthEarnings, data.lastMonthEarnings) : 0

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-20" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings Dashboard</h1>
          <p className="text-muted-foreground">Track your revenue and performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchEarningsData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connection Status Alert */}
      {needsStripeConnection && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connect your Stripe account to view earnings data</span>
            <Link href="/dashboard/connect-stripe">
              <Button size="sm" variant="outline">
                Connect Stripe <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && !needsStripeConnection && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Source Badge */}
      {dataSource && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={dataSource === "stripe" ? "default" : "secondary"}>
            {dataSource === "stripe" ? "Live Stripe Data" : "Demo Data"}
          </Badge>
          {lastUpdated && <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>}
        </div>
      )}

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.totalEarnings || 0)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.thisMonthEarnings || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyGrowth >= 0 ? "+" : ""}
              {formatPercentage(monthlyGrowth)} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.availableBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatInteger(data?.salesMetrics?.totalSales || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data?.salesMetrics?.averageTransactionValue || 0)} avg order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed View */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Last 30 Days</span>
                  <span className="text-sm font-bold">{formatCurrency(data?.last30DaysEarnings || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">This Month Sales</span>
                  <span className="text-sm font-bold">{formatInteger(data?.salesMetrics?.thisMonthSales || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Last 30 Days Sales</span>
                  <span className="text-sm font-bold">{formatInteger(data?.salesMetrics?.last30DaysSales || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Pending Payout</span>
                  <span className="text-sm font-bold">{formatCurrency(data?.pendingPayout || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Available Balance</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(data?.availableBalance || 0)}
                  </span>
                </div>
                <div className="pt-2">
                  <Link href="/dashboard/settings/stripe">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Payouts
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest sales and payments</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.recentTransactions?.length ? (
                <div className="space-y-2">
                  {data.recentTransactions.map((transaction, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{transaction.description || "Sale"}</p>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                      <span className="font-bold">{formatCurrency(transaction.amount || 0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No recent transactions</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Detailed performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">Analytics coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
