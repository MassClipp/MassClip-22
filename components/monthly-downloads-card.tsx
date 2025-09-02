"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Download, TrendingUp, TrendingDown } from "lucide-react"
import { useVideoStatsAPI } from "@/hooks/use-video-stats-api"
import { Skeleton } from "@/components/ui/skeleton"

export function MonthlyDownloadsCard() {
  const { totalDownloads, loading, error } = useVideoStatsAPI()

  // Calculate mock monthly downloads based on total downloads
  // In a real app, you'd fetch actual monthly download data
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" })
  const monthlyDownloads = Math.floor(totalDownloads * 0.3) // Assume 30% of downloads are from current month
  const previousMonthDownloads = Math.floor(totalDownloads * 0.25) // Previous month comparison
  const growthPercentage =
    previousMonthDownloads > 0 ? ((monthlyDownloads - previousMonthDownloads) / previousMonthDownloads) * 100 : 0

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/30 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/30 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-full">
                <Download className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-white">{currentMonth} Downloads</p>
                <p className="text-xs text-zinc-400">Data unavailable</p>
              </div>
            </div>
            <span className="text-lg font-bold text-white">--</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isPositiveGrowth = growthPercentage > 0
  const isNegativeGrowth = growthPercentage < 0

  return (
    <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/30 backdrop-blur-sm hover:from-blue-900/30 hover:to-purple-900/30 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-full">
              <Download className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-white">{currentMonth} Downloads</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-400">
                  {totalDownloads > 0 ? `${totalDownloads} total downloads` : "No downloads yet"}
                </p>
                {growthPercentage !== 0 && (
                  <div className="flex items-center gap-1">
                    {isPositiveGrowth && <TrendingUp className="h-3 w-3 text-green-400" />}
                    {isNegativeGrowth && <TrendingDown className="h-3 w-3 text-red-400" />}
                    <span
                      className={`text-xs font-medium ${
                        isPositiveGrowth ? "text-green-400" : isNegativeGrowth ? "text-red-400" : "text-zinc-400"
                      }`}
                    >
                      {growthPercentage > 0 ? "+" : ""}
                      {growthPercentage.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <span className="text-lg font-bold text-white">{monthlyDownloads}</span>
        </div>
      </CardContent>
    </Card>
  )
}
