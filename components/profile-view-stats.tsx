"use client"

import { useProfileViewStats } from "@/hooks/use-profile-view-stats"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProfileViewStatsProps {
  userId: string
}

export default function ProfileViewStats({ userId }: ProfileViewStatsProps) {
  const { stats, loading, error, refetch } = useProfileViewStats(userId)

  if (loading) {
    return (
      <div className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
          <BarChart3 className="h-4 w-4 text-zinc-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">...</div>
          <p className="text-xs text-zinc-500">Loading...</p>
        </CardContent>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">Profile Views</CardTitle>
          <Button onClick={refetch} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400">Error</div>
          <p className="text-xs text-red-500">{error}</p>
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
        {stats?.lastView && (
          <p className="text-xs text-zinc-400 mt-1">Last: {new Date(stats.lastView).toLocaleDateString()}</p>
        )}
      </CardContent>
    </div>
  )
}
