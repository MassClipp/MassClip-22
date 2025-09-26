"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, RefreshCw, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"

interface SalesData {
  totalRevenueLast30Days: number
  totalSalesLast30Days: number
  averageOrderValue: number
}

export default function SalesMetricsNew() {
  const { user } = useAuth()
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenueLast30Days: 0,
    totalSalesLast30Days: 0,
    averageOrderValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchSalesData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("[v0] Fetching sales data for user:", user.uid)

      // Get user's ID token for authentication
      const idToken = await user.getIdToken()

      const response = await fetch("/api/sales-metrics-new", {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Sales data response:", data)

      if (data.success) {
        setSalesData(data.sales)
        setRetryCount(0) // Reset retry count on success
      } else {
        setError(data.error || "Failed to fetch sales data")
      }
    } catch (err) {
      console.error("[v0] Sales data error:", err)
      const errorMessage = err instanceof Error ? err.message : "Network error"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesData()
  }, [user])

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">Sales (30 Days)</CardTitle>
          <Calendar className="h-4 w-4 text-zinc-400" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    const isNetworkError = !navigator.onLine || error.includes("network") || error.includes("fetch")

    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">Sales (30 Days)</CardTitle>
          <Button
            onClick={() => {
              setRetryCount((prev) => prev + 1)
              fetchSalesData()
            }}
            variant="ghost"
            size="sm"
            disabled={!navigator.onLine}
          >
            {isNetworkError ? <WifiOff className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400">{isNetworkError ? "Offline" : "Error"}</div>
          <p className="text-xs text-red-500">{isNetworkError ? "Check connection" : error}</p>
          {retryCount > 0 && <p className="text-xs text-zinc-500 mt-1">Retry attempt: {retryCount}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-200">Sales (30 Days)</CardTitle>
        <Calendar className="h-4 w-4 text-zinc-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${salesData.totalRevenueLast30Days.toFixed(2)}</div>
        <p className="text-xs text-zinc-500">{salesData.totalSalesLast30Days} sales in last 30 days</p>
        {salesData.averageOrderValue > 0 && (
          <p className="text-xs text-zinc-400 mt-1">Avg: ${salesData.averageOrderValue.toFixed(2)} per sale</p>
        )}
      </CardContent>
    </Card>
  )
}
