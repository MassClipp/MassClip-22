"use client"

import { useState } from "react"
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export interface UploadedVideo {
  id: string
  name: string
  url: string
  thumbnailUrl?: string
  transcript?: string
  status: "uploading" | "transcribing" | "complete" | "error"
  progress: number
  error?: string
}

interface LandingVideoSidebarProps {
  videos: UploadedVideo[]
  onRemoveVideo: (id: string) => void
}

export function LandingVideoSidebar({ videos, onRemoveVideo }: LandingVideoSidebarProps) {
  if (videos.length === 0) return null

  return (
    <div className="w-96 border-l border-zinc-800 bg-black overflow-y-auto">
      <div className="p-6 border-b border-zinc-800/50">
        <h3 className="text-lg font-semibold text-white">Uploaded Videos ({videos.length})</h3>
        <p className="text-sm text-zinc-400 mt-1">Videos are being processed for VEX analysis</p>
      </div>

      <div className="p-4 space-y-4">
        {videos.map((video) => (
          <VideoUploadCard key={video.id} video={video} onRemove={() => onRemoveVideo(video.id)} />
        ))}
      </div>
    </div>
  )
}

function VideoUploadCard({ video, onRemove }: { video: UploadedVideo; onRemove: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg hover:border-zinc-700/50 transition-all duration-200 group overflow-hidden">
      {/* Video Preview - 9:16 aspect ratio like free content page */}
      <div className="relative">
        {video.status === "complete" && video.url ? (
          <div className="aspect-[9/16] bg-zinc-800/50 rounded-t-lg overflow-hidden relative">
            <video src={video.url} className="w-full h-full object-cover" controls playsInline preload="metadata" />
          </div>
        ) : (
          <div className="aspect-[9/16] bg-zinc-800/50 rounded-t-lg flex flex-col items-center justify-center gap-3">
            {video.status === "uploading" && (
              <>
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-400">Uploading...</span>
              </>
            )}
            {video.status === "transcribing" && (
              <>
                <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                <span className="text-sm text-purple-400">Transcribing...</span>
              </>
            )}
            {video.status === "error" && (
              <>
                <AlertCircle className="h-10 w-10 text-red-500" />
                <span className="text-sm text-red-400">Upload failed</span>
              </>
            )}
          </div>
        )}

        {/* Remove button overlay */}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors backdrop-blur-sm"
          aria-label="Remove video"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Video Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-white truncate flex-1">{video.name}</h4>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {video.status === "uploading" && (
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Uploading
            </Badge>
          )}
          {video.status === "transcribing" && (
            <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400 bg-purple-500/10">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Transcribing
            </Badge>
          )}
          {video.status === "complete" && (
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 bg-green-500/10">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          )}
          {video.status === "error" && (
            <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 bg-red-500/10">
              <AlertCircle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        {(video.status === "uploading" || video.status === "transcribing") && (
          <div className="space-y-1">
            <Progress value={video.progress} className="h-1.5" />
            <p className="text-xs text-zinc-500">{Math.round(video.progress)}%</p>
          </div>
        )}

        {/* Error message */}
        {video.status === "error" && video.error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{video.error}</p>
        )}

        {/* Transcript preview - expandable */}
        {video.status === "complete" && video.transcript && typeof video.transcript === "string" && (
          <div className="space-y-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              {isExpanded ? "Hide" : "Show"} transcript
            </button>
            {isExpanded && (
              <div className="p-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-xs text-zinc-300 max-h-32 overflow-y-auto">
                {video.transcript}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
