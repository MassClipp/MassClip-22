"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, ExternalLink, TrendingUp, DollarSign, Users, BarChart3, Link2, Loader2 } from "lucide-react"
import Link from "next/link"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DashboardStats {
  totalEarnings: number
  totalSales: number
  averageTransactionValue: number
  last30DaysSales: number
  last30DaysEarnings: number
}

interface StripeConnectionStatus {
  isConnected: boolean
  accountId?: string
  canReceivePayments: boolean
  detailedStatus: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalEarnings: 0,
    totalSales: 0,
    averageTransactionValue: 0,
    last30DaysSales: 0,
    last30DaysEarnings: 0,
  })
  const [stripeStatus, setStripeStatus] = useState<StripeConnectionStatus | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingStripe, setIsLoadingStripe] = useState(true)

  // Mock data for the chart
  const chartData = [
    { name: "Oct", value: 0 },
    { name: "Nov", value: 0 },
    { name: "Dec", value: 0 },
    { name: "Jan", value: 0 },
    { name: "Feb", value: 0 },
    { name: "Mar", value: 0 },
  ]

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
      fetchStripeStatus()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    if (!user) return

    try {
      setIsLoadingStats(true)
      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/statistics", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const fetchStripeStatus = async () => {
    if (!user) return

    try {
      setIsLoadingStripe(true)
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStripeStatus({
          isConnected: !!data.accountId,
          accountId: data.accountId,
          canReceivePayments: data.canReceivePayments || false,
          detailedStatus: data.detailedStatus || "unknown",
        })
      }
    } catch (error) {
      console.error("Error fetching Stripe status:", error)
      setStripeStatus({
        isConnected: false,
        canReceivePayments: false,
        detailedStatus: "error",
      })
    } finally {
      setIsLoadingStripe(false)
    }
  }

  const openStripeDashboard = () => {
    if (!stripeStatus?.accountId) {
      console.error("No Stripe account ID available")
      return
    }

    // Use the Express Dashboard URL with the specific account ID
    const dashboardUrl = `https://dashboard.stripe.com/connect/accounts/${stripeStatus.accountId}`
    console.log(`Opening Stripe dashboard for account: ${stripeStatus.accountId}`)
    window.open(dashboardUrl, "_blank")
  }

  const getStripeButtonContent = () => {
    if (isLoadingStripe) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Checking Connection...
        </>
      )
    }

    if (!stripeStatus?.isConnected) {
      return (
        <>
          <Link2 className="h-4 w-4 mr-2" />
          Link Stripe Account
        </>
      )
    }

    return (
      <>
        <ExternalLink className="h-4 w-4 mr-2" />
        Stripe Dashboard
      </>
    )
  }

  const handleStripeAction = () => {
    if (!stripeStatus?.isConnected) {
      // Navigate to connect page
      window.location.href = "/dashboard/connect-stripe"
    } else {
      // Open the specific account's dashboard
      openStripeDashboard()
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your content and earnings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${isLoadingStats ? "0.00" : stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{stats.totalSales} total sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${isLoadingStats ? "0.00" : stats.last30DaysEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ready to be paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Transaction Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${isLoadingStats ? "0.00" : stats.averageTransactionValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days Sales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingStats ? "0" : stats.last30DaysSales}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Financial Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Performance</CardTitle>
            <CardDescription>Revenue trends and projections</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Metrics</CardTitle>
            <CardDescription>Performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Transaction Value</span>
              <span className="text-2xl font-bold">${stats.averageTransactionValue.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Last 30 Days Sales</span>
              <span className="text-2xl font-bold">{stats.last30DaysSales}</span>
            </div>
            <Separator />
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-green-500">${stats.last30DaysEarnings.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Last 30 Days</div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-500">{stats.totalSales}</div>
                <div className="text-sm text-muted-foreground">Total Sales</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your content and earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/dashboard/upload">
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Content
            </Button>
          </Link>

          <Button
            className={`w-full justify-start ${
              !stripeStatus?.isConnected ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-transparent"
            }`}
            variant={!stripeStatus?.isConnected ? "default" : "outline"}
            onClick={handleStripeAction}
            disabled={isLoadingStripe}
          >
            {getStripeButtonContent()}
          </Button>

          {/* Show account ID if connected */}
          {stripeStatus?.isConnected && stripeStatus.accountId && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Connected Account: {stripeStatus.accountId}
            </div>
          )}

          {/* Show connection status */}
          {stripeStatus && (
            <div className="flex items-center gap-2">
              <Badge variant={stripeStatus.canReceivePayments ? "default" : "secondary"} className="text-xs">
                {stripeStatus.canReceivePayments ? "Ready for Payments" : "Setup Required"}
              </Badge>
              {stripeStatus.detailedStatus && (
                <span className="text-xs text-muted-foreground">Status: {stripeStatus.detailedStatus}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
