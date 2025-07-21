"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, DollarSign, CreditCard, Unlink, ExternalLink, Upload } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { toast } from "@/hooks/use-toast"

interface EarningsData {
  totalEarnings: number
  monthlyEarnings: number
  averageTransaction: number
  totalSales: number
  last30DaysSales: number
  monthlyData: Array<{
    month: string
    earnings: number
  }>
  stripeConnected: boolean
  stripeAccountId?: string
}

export default function EarningsContent() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unlinkLoading, setUnlinkLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      fetchEarningsData()
    }
  }, [user, authLoading])

  const fetchEarningsData = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch earnings data")
      }

      const earningsData = await response.json()
      setData(earningsData)
    } catch (error) {
      console.error("Error fetching earnings:", error)
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkStripe = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to unlink your Stripe account",
        variant: "destructive",
      })
      return
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to unlink your Stripe account? This will:\n\n" +
        "• Stop all future payouts\n" +
        "• Disable payment processing for your content\n" +
        "• Remove access to Stripe dashboard\n" +
        "• Require re-verification if you reconnect later\n\n" +
        "This action cannot be undone.",
    )

    if (!confirmed) return

    setUnlinkLoading(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to unlink Stripe account")
      }

      toast({
        title: "Success",
        description: "Stripe account unlinked successfully",
        variant: "default",
      })

      // Refresh earnings data to reflect changes
      await fetchEarningsData()
    } catch (error: any) {
      console.error("Stripe unlink error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to unlink Stripe account",
        variant: "destructive",
      })
    } finally {
      setUnlinkLoading(false)
    }
  }

  const handleUploadContent = () => {
    window.location.href = "/dashboard/upload"
  }

  const handleStripeDashboard = () => {
    if (data?.stripeConnected && data?.stripeAccountId) {
      window.open(`https://dashboard.stripe.com/connect/accounts/${data.stripeAccountId}`, "_blank")
    } else {
      toast({
        title: "Stripe Not Connected",
        description: "Please connect your Stripe account first",
        variant: "destructive",
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load earnings data</p>
        <Button onClick={fetchEarningsData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  const maxEarnings = Math.max(...data.monthlyData.map((d) => d.earnings))

  return (
    <div className="space-y-6">
      {/* Sales Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Sales Metrics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">Performance indicators</CardDescription>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Average Transaction Value</span>
                <span className="text-2xl font-bold">${data.averageTransaction.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((data.averageTransaction / 50) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Target: $25.00 per transaction</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Last 30 Days Sales</span>
                <span className="text-2xl font-bold">{data.last30DaysSales}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((data.last30DaysSales / 20) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Target: 20 sales per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span>Financial Performance</span>
          </CardTitle>
          <CardDescription>Monthly earnings over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">${data.monthlyEarnings.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Last 30 Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{data.totalSales}</div>
                <div className="text-sm text-gray-500">Total Sales</div>
              </div>
            </div>

            <div className="space-y-3">
              {data.monthlyData.map((month, index) => (
                <div key={month.month} className="flex items-center space-x-3">
                  <div className="w-16 text-sm font-medium text-gray-600">{month.month}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${maxEarnings > 0 ? (month.earnings / maxEarnings) * 100 : 0}%`,
                        animationDelay: `${index * 100}ms`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-3">
                      <span className="text-xs font-semibold text-white">${month.earnings.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>Manage your content and earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleUploadContent} className="w-full justify-start bg-transparent" variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload New Content
          </Button>

          <Button
            onClick={handleStripeDashboard}
            className="w-full justify-start bg-transparent"
            variant="outline"
            disabled={!data.stripeConnected}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Stripe Dashboard
          </Button>

          <Button
            onClick={handleUnlinkStripe}
            className="w-full justify-start bg-transparent"
            variant="outline"
            disabled={!data.stripeConnected || !user || unlinkLoading}
          >
            <Unlink className="mr-2 h-4 w-4" />
            {unlinkLoading ? "Unlinking..." : "Unlink Stripe Account"}
          </Button>

          {data.stripeConnected && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
                <span className="text-sm text-green-700">Stripe account is active and ready for payments</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
