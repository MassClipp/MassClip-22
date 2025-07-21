"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, DollarSign, Calendar, ExternalLink, Upload, Unlink, AlertCircle, Loader2 } from "lucide-react"
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
    sales: number
  }>
}

export default function EarningsContent() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchEarningsData()
    }
  }, [user])

  const fetchEarningsData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/dashboard/earnings")
      const data = await response.json()

      if (data.success) {
        setEarningsData(data.data)
      } else {
        setError(data.error || "Failed to load earnings data")
      }
    } catch (err) {
      setError("Failed to load earnings data")
      console.error("Error fetching earnings:", err)
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

    const confirmed = window.confirm(
      "Are you sure you want to unlink your Stripe account? This will disable payments for all your content until you reconnect.",
    )

    if (!confirmed) return

    setUnlinkLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Stripe Account Unlinked",
          description: data.message || "Your Stripe account has been successfully disconnected",
        })

        // Refresh the page to update the UI
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        console.error("Unlink failed:", data)
        toast({
          title: "Failed to Unlink Account",
          description: data.error || "An error occurred while unlinking your Stripe account",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error unlinking Stripe account:", error)
      toast({
        title: "Network Error",
        description: "Failed to communicate with the server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUnlinkLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading earnings data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-600 bg-red-600/10">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Error:</strong> {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!earningsData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No earnings data available. Start selling content to see your earnings here.
        </AlertDescription>
      </Alert>
    )
  }

  const { totalEarnings, monthlyEarnings, averageTransaction, totalSales, last30DaysSales, monthlyData } = earningsData

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
        <CardDescription className="px-6 pb-4">Performance indicators</CardDescription>
        <CardContent className="space-y-6">
          {/* Average Transaction Value */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Transaction Value</span>
              <span className="text-2xl font-bold">${averageTransaction.toFixed(2)}</span>
            </div>
            <Progress value={Math.min((averageTransaction / 50) * 100, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">Target: $25.00 per transaction</p>
          </div>

          {/* Last 30 Days Sales */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Last 30 Days Sales</span>
              <span className="text-2xl font-bold">{last30DaysSales}</span>
            </div>
            <Progress value={Math.min((last30DaysSales / 50) * 100, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">Target: 20 sales per month</p>
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
          <CardDescription>Monthly earnings and sales over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">${totalEarnings.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Last 30 Days</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalSales}</div>
                <div className="text-sm text-muted-foreground">Total Sales</div>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Monthly Earnings Trend</h4>
              <div className="space-y-2">
                {monthlyData.map((month, index) => (
                  <div key={month.month} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{month.month}</span>
                      <span className="font-medium">${month.earnings.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max((month.earnings / Math.max(...monthlyData.map((m) => m.earnings))) * 100, 5)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardDescription className="px-6 pb-4">Manage your content and earnings</CardDescription>
        <CardContent className="space-y-3">
          <Button className="w-full justify-start bg-transparent" variant="outline" size="lg">
            <Upload className="h-4 w-4 mr-2" />
            Upload New Content
          </Button>

          <Button className="w-full justify-start bg-transparent" variant="outline" size="lg">
            <ExternalLink className="h-4 w-4 mr-2" />
            Stripe Dashboard
          </Button>

          <Button
            className="w-full justify-start bg-transparent"
            variant="outline"
            size="lg"
            onClick={handleUnlinkStripe}
            disabled={!user || unlinkLoading}
          >
            {unlinkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
            {unlinkLoading ? "Unlinking..." : "Unlink Stripe Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
