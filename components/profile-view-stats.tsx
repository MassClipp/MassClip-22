"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProfileViewStatsProps {
  userId: string
}

interface ViewStats {
  totalViews: number
  todayViews: number
  lastView: string | null
  totalAnalytics: number
  actualRecordCount?: number
}

export default function ProfileViewStats({ userId }: ProfileViewStatsProps) {
  const [stats, setStats] = useState<ViewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [ProfileViewStats] Fetching stats for userId: ${userId}`)

      const response = await fetch(`/api/profile-view-stats?userId=${userId}`)
      const data = await response.json()

      console.log(`📊 [ProfileViewStats] API response:`, data)

      if (data.success) {
        setStats(data.stats)
      } else {
        setError(data.error || "Failed to fetch stats")
      }
    } catch (err) {
      setError("Network error while fetching stats")
      console.error("❌ [ProfileViewStats] Error fetching profile view stats:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchStats()
    }
  }, [userId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Views
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading stats...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Views
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Error: {error}</div>
          <Button onClick={fetchStats} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Profile Views
          <Button onClick={fetchStats} variant="ghost" size="sm" className="ml-auto">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Views</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.todayViews.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Today</div>
          </div>
        </div>
        {stats.lastView && (
          <div className="mt-4 text-sm text-gray-500">Last view: {new Date(stats.lastView).toLocaleDateString()}</div>
        )}
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === "development" && stats.actualRecordCount !== undefined && (
          <div className="mt-2 text-xs text-gray-400 border-t pt-2">
            Debug: {stats.actualRecordCount} actual records
          </div>
        )}
      </CardContent>
    </Card>
  )
}
