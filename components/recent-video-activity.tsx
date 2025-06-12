"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, Clock, Download } from "lucide-react"
import { useRealTimeVideoStats } from "@/hooks/use-real-time-video-stats"

export function RecentVideoActivity() {
  const { recentUploads, recentFreeVideos, loading } = useRealTimeVideoStats()

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Loading recent uploads...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/20 rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-zinc-700 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-zinc-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const allRecentVideos = [
    ...recentUploads.map((video) => ({ ...video, type: "upload" })),
    ...recentFreeVideos.map((video) => ({ ...video, type: "free" })),
  ]
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .slice(0, 5)

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Your latest video uploads and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {allRecentVideos.length > 0 ? (
          <div className="space-y-3">
            {allRecentVideos.map((video) => (
              <div key={`${video.type}-${video.id}`} className="flex items-center gap-3 p-3 bg-zinc-800/20 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-medium text-zinc-200 truncate">
                      {video.title || video.filename || "Untitled"}
                    </div>
                    <Badge
                      variant={video.type === "free" ? "default" : "secondary"}
                      className={
                        video.type === "free" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"
                      }
                    >
                      {video.type === "free" ? "Free" : "Upload"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>{video.uploadedAt.toLocaleDateString()}</span>
                    {video.downloadCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        <span>{video.downloadCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No recent activity</p>
            <p className="text-xs text-zinc-500 mt-1">Upload your first video to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
