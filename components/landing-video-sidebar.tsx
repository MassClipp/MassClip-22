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
    <div className="w-80 border-l border-white/20 bg-white/5 backdrop-blur-2xl overflow-y-auto shadow-2xl">
      <div className="p-4 border-b border-white/20 bg-white/5">
        <h3 className="text-sm font-medium text-white">Uploaded Videos ({videos.length})</h3>
        <p className="text-xs text-white/60 mt-1">Videos are being processed for VEX analysis</p>
      </div>

      <div className="p-4 space-y-3">
        {videos.map((video) => (
          <VideoUploadCard key={video.id} video={video} onRemove={() => onRemoveVideo(video.id)} />
        ))}
      </div>
    </div>
  )
}

function VideoUploadCard({ video, onRemove }: { video: UploadedVideo; onRemove: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  return (
    <>
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden hover:bg-white/15 hover:border-white/30 transition-all group shadow-xl">
        {/* Video Preview */}
        {video.status === "complete" && video.url ? (
          <div className="relative aspect-video bg-black">
            {!isPlaying ? (
              <>
                <video src={video.url} className="w-full h-full object-cover" poster={video.thumbnailUrl} />
                <div
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-pointer"
                  onClick={() => setIsPlaying(true)}
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white/30 transition-colors">
                    <Play className="h-6 w-6 text-white ml-1" />
                  </div>
                </div>
              </>
            ) : (
              <video src={video.url} controls autoPlay className="w-full h-full object-cover" />
            )}

            {/* Remove button overlay */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-lg z-10"
              aria-label="Remove video"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="aspect-video bg-black/50 backdrop-blur-sm flex items-center justify-center">
            {video.status === "uploading" && <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />}
            {video.status === "transcribing" && <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />}
            {video.status === "error" && <AlertCircle className="h-8 w-8 text-red-500" />}
          </div>
        )}

        {/* Video Info */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white truncate">{video.name}</h4>

              {/* Status */}
              <div className="flex items-center gap-2 mt-1.5">
                {video.status === "uploading" && (
                  <>
                    <Loader2 className="h-3 w-3 text-teal-500 animate-spin" />
                    <span className="text-xs text-teal-400">Uploading...</span>
                  </>
                )}
                {video.status === "transcribing" && (
                  <>
                    <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />
                    <span className="text-xs text-cyan-400">Transcribing...</span>
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
            </div>
          </div>

          {/* Progress bar */}
          {(video.status === "uploading" || video.status === "transcribing") && (
            <div className="mt-3">
              <Progress value={video.progress} className="h-1.5 bg-white/10" />
              <p className="text-xs text-white/60 mt-1.5">{Math.round(video.progress)}%</p>
            </div>
          )}

          {/* Error message */}
          {video.status === "error" && video.error && (
            <p className="text-xs text-red-400 mt-2 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded p-2">
              {video.error}
            </p>
          )}

          {/* Transcript preview */}
          {video.status === "complete" &&
            video.transcript &&
            typeof video.transcript === "string" &&
            video.transcript.length > 0 && (
              <div className="mt-3 p-2.5 bg-white/5 backdrop-blur-sm border border-white/20 rounded text-xs text-white/70 max-h-20 overflow-y-auto leading-relaxed">
                {video.transcript.substring(0, 150)}
                {video.transcript.length > 150 && "..."}
              </div>
            )}
        </div>
      </div>

      {/* Dialog component is removed as it's no longer needed */}
    </>
  )
}
