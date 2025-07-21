"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, DollarSign, Calendar, ExternalLink, Unlink2 } from "lucide-react"
import { useAuth } from "@/hooks/use-firebase-auth"
import { toast } from "sonner"

interface EarningsData {
  totalEarnings: number
  monthlyEarnings: number
  averageTransaction: number
  totalSales: number
  last30DaysSales: number
  monthlyData: Array<{
    month: string
    earnings: number
    sales: number
  }>
}

export default function EarningsContent() {
  const { user } = useAuth()
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unlinking, setUnlinking] = useState(false)

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      const response = await fetch("/api/dashboard/earnings")
      if (response.ok) {
        const data = await response.json()
        setEarnings(data)
      }
    } catch (error) {
      console.error("Failed to fetch earnings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkStripe = async () => {
    if (!user) return

    setUnlinking(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        toast.success("Stripe account disconnected successfully")
        // Refresh the page or update state as needed
        window.location.reload()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to disconnect Stripe account")
      }
    } catch (error) {
      console.error("Unlink error:", error)
      toast.error("Failed to disconnect Stripe account")
    } finally {
      setUnlinking(false)
    }
  }

  const handleUploadContent = () => {
    window.location.href = "/dashboard/upload"
  }

  const handleStripeDashboard = () => {
    window.open("https://dashboard.stripe.com", "_blank")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded w-32 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const defaultEarnings: EarningsData = {
    totalEarnings: 1.64,
    monthlyEarnings: 0.82,
    averageTransaction: 23.55,
    totalSales: 15,
    last30DaysSales: 4,
    monthlyData: [
      { month: "Jan", earnings: 0.2, sales: 2 },
      { month: "Feb", earnings: 0.35, sales: 3 },
      { month: "Mar", earnings: 0.15, sales: 1 },
      { month: "Apr", earnings: 0.45, sales: 4 },
      { month: "May", earnings: 0.25, sales: 2 },
      { month: "Jun", earnings: 0.24, sales: 3 },
    ],
  }

  const data = earnings || defaultEarnings
  const maxEarnings = Math.max(...data.monthlyData.map((d) => d.earnings))

  return (
    <div className="space-y-6">
      {/* Sales Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sales Metrics
          </CardTitle>
          <CardDescription>Performance indicators</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Average Transaction Value</span>
              <span className="text-2xl font-bold">${data.averageTransaction}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full" style={{ width: "85%" }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: $25.00 per transaction</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Last 30 Days Sales</span>
              <span className="text-2xl font-bold">{data.last30DaysSales}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full" style={{ width: "20%" }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: 20 sales per month</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Performance</CardTitle>
          <CardDescription>Monthly earnings over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold">${data.totalEarnings}</div>
                <div className="text-sm text-gray-500">Last 30 Days</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{data.totalSales}</div>
                <div className="text-sm text-gray-500">Total Sales</div>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="mt-6">
              <div className="flex items-end justify-between h-32 gap-2">
                {data.monthlyData.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="w-full bg-gray-200 rounded-t flex flex-col justify-end" style={{ height: "100px" }}>
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300"
                        style={{
                          height: `${(item.earnings / maxEarnings) * 80}px`,
                          minHeight: "4px",
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.month}</div>
                    <div className="text-xs font-medium">${item.earnings}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Manage your content and earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleUploadContent} className="w-full justify-start bg-transparent" variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Upload New Content
          </Button>

          <Button onClick={handleStripeDashboard} className="w-full justify-start bg-transparent" variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Stripe Dashboard
          </Button>

          <Button
            onClick={handleUnlinkStripe}
            disabled={unlinking}
            className="w-full justify-start bg-transparent"
            variant="outline"
          >
            <Unlink2 className="h-4 w-4 mr-2" />
            {unlinking ? "Unlinking..." : "Unlink Stripe Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
