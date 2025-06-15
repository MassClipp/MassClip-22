"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, RefreshCw, Settings, CheckCircle, AlertTriangle } from "lucide-react"

interface ProfileViewStatsProps {
  userId: string
  showAdminControls?: boolean
}

interface ViewStats {
  totalViews: number
  uniqueViews: number
  todayViews: number
  weekViews: number
  monthViews: number
  lastViewAt: string | null
}

interface VerificationResult {
  success: boolean
  originalCount: number
  actualCount: number
  repaired: boolean
  message: string
}

export default function EnhancedProfileViewStats({ userId, showAdminControls = false }: ProfileViewStatsProps) {
  const [stats, setStats] = useState<ViewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verification, setVerification] = useState<VerificationResult | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`📊 [EnhancedProfileViewStats] Fetching stats for: ${userId}`)

      const response = await fetch(`/api/profile-views/stats?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
        console.log(`✅ [EnhancedProfileViewStats] Stats loaded:`, data.stats)
      } else {
        setError(data.error || "Failed to fetch stats")
      }
    } catch (err) {
      setError("Network error while fetching stats")
      console.error("❌ [EnhancedProfileViewStats] Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const verifyViewCount = async () => {
    try {
      setVerifying(true)
      console.log(`🔧 [EnhancedProfileViewStats] Verifying count for: ${userId}`)

      const response = await fetch("/api/profile-views/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUserId: userId }),
      })

      const data = await response.json()
      setVerification(data)

      if (data.repaired) {
        // Refresh stats after repair
        await fetchStats()
      }
    } catch (err) {
      console.error("❌ [EnhancedProfileViewStats] Verification error:", err)
    } finally {
      setVerifying(false)
    }
  }

  const resetViewCount = async () => {
    if (!confirm("Are you sure you want to reset the view count to 0?")) {
      return
    }

    try {
      const response = await fetch("/api/profile-views/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUserId: userId }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchStats()
        setVerification(null)
      }
    } catch (err) {
      console.error("❌ [EnhancedProfileViewStats] Reset error:", err)
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
          <div className="text-sm text-gray-500">Loading comprehensive stats...</div>
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
          <div className="text-sm text-red-500 mb-3">Error: {error}</div>
          <Button onClick={fetchStats} variant="outline" size="sm">
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
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold text-blue-600">{stats.totalViews.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Views</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">{stats.uniqueViews.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Unique Viewers</div>
          </div>
        </div>

        {/* Time-based Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xl font-semibold">{stats.todayViews}</div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold">{stats.weekViews}</div>
            <div className="text-xs text-gray-500">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold">{stats.monthViews}</div>
            <div className="text-xs text-gray-500">This Month</div>
          </div>
        </div>

        {/* Last View */}
        {stats.lastViewAt && (
          <div className="text-sm text-gray-500">Last view: {new Date(stats.lastViewAt).toLocaleString()}</div>
        )}

        {/* Verification Status */}
        {verification && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              {verification.repaired ? (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium">Verification Result</span>
            </div>
            <div className="text-sm text-gray-600">{verification.message}</div>
            {verification.repaired && (
              <Badge variant="outline" className="mt-2">
                Repaired: {verification.originalCount} → {verification.actualCount}
              </Badge>
            )}
          </div>
        )}

        {/* Admin Controls */}
        {showAdminControls && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Admin Controls</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyViewCount} disabled={verifying} variant="outline" size="sm">
                {verifying ? "Verifying..." : "Verify Count"}
              </Button>
              <Button onClick={resetViewCount} variant="destructive" size="sm">
                Reset Count
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
