"use client"

import { useState } from "react"
import { X, Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react"
import { Progress } from "@/components/ui/progress"

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
    <div className="w-80 border-l border-zinc-800 bg-zinc-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-white">Uploaded Videos ({videos.length})</h3>
        <p className="text-xs text-zinc-400 mt-1">Videos are being processed for VEX analysis</p>
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
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg hover:border-zinc-700/50 transition-all duration-200 group">
      <div className="p-3">
        {/* Video Preview with 9:16 aspect ratio */}
        <div className="mb-3 relative">
          {video.status === "complete" && video.url ? (
            <div className="aspect-[9/16] bg-zinc-800/50 rounded-md overflow-hidden relative">
              <video
                src={video.url}
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={(e) => {
                  const target = e.target as HTMLVideoElement
                  target.style.display = "none"
                  target.nextElementSibling?.classList.remove("hidden")
                }}
              />
              <div className="hidden w-full h-full flex items-center justify-center absolute inset-0 bg-zinc-800/50">
                <Play className="h-12 w-12 text-white" />
              </div>
            </div>
          ) : (
            <div className="aspect-[9/16] bg-zinc-900 rounded-md flex items-center justify-center">
              {video.status === "uploading" && <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />}
              {video.status === "transcribing" && <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />}
              {video.status === "error" && <AlertCircle className="h-8 w-8 text-red-500" />}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-white text-sm truncate flex-1">{video.name}</h3>
            <button
              onClick={onRemove}
              className="p-1 hover:bg-zinc-700 rounded transition-colors shrink-0"
              aria-label="Remove video"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            {video.status === "uploading" && (
              <>
                <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                <span className="text-xs text-blue-400">Uploading...</span>
              </>
            )}
            {video.status === "transcribing" && (
              <>
                <Loader2 className="h-3 w-3 text-purple-500 animate-spin" />
                <span className="text-xs text-purple-400">Transcribing...</span>
              </>
            )}
            {video.status === "complete" && (
              <>
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-400">Ready</span>
              </>
            )}
            {video.status === "error" && (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-400">Error</span>
              </>
            )}
          </div>

          {/* Progress bar */}
          {(video.status === "uploading" || video.status === "transcribing") && (
            <div>
              <Progress value={video.progress} className="h-1" />
              <p className="text-xs text-zinc-500 mt-1">{Math.round(video.progress)}%</p>
            </div>
          )}

          {/* Error message */}
          {video.status === "error" && video.error && <p className="text-xs text-red-400">{video.error}</p>}

          {/* Transcript preview */}
          {video.status === "complete" && video.transcript && typeof video.transcript === "string" && (
            <div className="p-2 bg-zinc-900/50 border border-zinc-700 rounded text-xs text-zinc-400 max-h-20 overflow-y-auto">
              {video.transcript.substring(0, 150)}
              {video.transcript.length > 150 && "..."}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
