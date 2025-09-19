"use client"

import { useState, useEffect } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, RefreshCw, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"

interface ProfileViewStatsProps {
  userId: string
}

interface ProfileViewData {
  totalViews: number
  todayViews: number
  lastView: string | null
}

export default function ProfileViewStatsNew({ userId }: ProfileViewStatsProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState<ProfileViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchProfileViews = async () => {
    if (!userId || !user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("[v0] Fetching profile views for userId:", userId)

      // Get user's ID token for authentication
      const idToken = await user.getIdToken()

      const response = await fetch(`/api/profile-views-new?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Profile views response:", data)

      if (data.success) {
        setStats(data.stats)
        setRetryCount(0) // Reset retry count on success
      } else {
        setError(data.error || "Failed to fetch profile views")
      }
    } catch (err) {
      console.error("[v0] Profile views error:", err)
      const errorMessage = err instanceof Error ? err.message : "Network error"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileViews()
  }, [userId, user])

  if (!userId) {
    return (
      <div className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
          <BarChart3 className="h-4 w-4 text-zinc-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-400">-</div>
          <p className="text-xs text-yellow-500">No user ID</p>
        </CardContent>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
          <BarChart3 className="h-4 w-4 text-zinc-400" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </div>
    )
  }

  if (error) {
    const isNetworkError = !navigator.onLine || error.includes("network") || error.includes("fetch")

    return (
      <div className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
          <Button
            onClick={() => {
              setRetryCount((prev) => prev + 1)
              fetchProfileViews()
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
      </div>
    )
  }

  return (
    <div className="p-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
        <BarChart3 className="h-4 w-4 text-zinc-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats?.totalViews || 0}</div>
        <p className="text-xs text-zinc-500">All time</p>
        {stats?.todayViews !== undefined && stats.todayViews > 0 && (
          <p className="text-xs text-zinc-400 mt-1">Today: {stats.todayViews}</p>
        )}
        {stats?.lastView && (
          <p className="text-xs text-zinc-400 mt-1">Last: {new Date(stats.lastView).toLocaleDateString()}</p>
        )}
      </CardContent>
    </div>
  )
}
