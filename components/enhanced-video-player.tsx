"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Lock, Play, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface EnhancedVideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title: string
  isPremium: boolean
  videoId: string
  creatorId: string
  onPlay?: () => void
}

export default function EnhancedVideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  isPremium,
  videoId,
  creatorId,
  onPlay,
}: EnhancedVideoPlayerProps) {
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoError, setIsVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true)

      // Free videos are always accessible
      if (!isPremium) {
        setHasAccess(true)
        setIsLoading(false)
        return
      }

      // Not logged in users don't have access to premium content
      if (!user) {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      try {
        // Check if the user is the creator (creators always have access to their own content)
        if (user.uid === creatorId) {
          setHasAccess(true)
          setIsLoading(false)
          return
        }

        // For premium content, check if the user has purchased it
        const response = await fetch(`/api/check-purchase-access?videoId=${videoId}`, {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setHasAccess(data.hasAccess)
        } else {
          setHasAccess(false)
        }
      } catch (error) {
        console.error("Error checking access:", error)
        setHasAccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [isPremium, user, videoId, creatorId])

  // Test video URL on mount
  useEffect(() => {
    const testVideoUrl = async () => {
      if (!videoUrl) return

      try {
        console.log("Testing video URL:", videoUrl)
        const response = await fetch(videoUrl, { method: "HEAD" })
        console.log(`Video URL test result: ${response.status} ${response.statusText}`)

        // Log headers for debugging
        const headers: Record<string, string> = {}
        response.headers.forEach((value, key) => {
          headers[key] = value
        })
        console.log("Response headers:", headers)

        if (!response.ok) {
          console.error(`Video URL returned error status: ${response.status}`)
        }
      } catch (error) {
        console.error("Error testing video URL:", error)
      }
    }

    testVideoUrl()
  }, [videoUrl])

  const handlePlay = () => {
    if (!hasAccess && isPremium) {
      // Redirect to purchase page or show upgrade modal
      toast({
        title: "Premium Content",
        description: "This video requires purchase to view",
      })
      router.push(`/video/${videoId}/purchase`)
      return
    }

    if (videoRef.current) {
      try {
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
            if (onPlay) onPlay()
          })
          .catch((err) => {
            console.error("Error playing video:", err)
            setIsVideoError(true)
            toast({
              title: "Playback Error",
              description: "There was a problem playing this video. Please try again.",
              variant: "destructive",
            })
          })
      } catch (error) {
        console.error("Error playing video:", error)
        setIsVideoError(true)
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(videoRef.current.muted)
    }
  }

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = e.currentTarget
    console.error("Video error occurred with URL:", videoUrl)
    console.error("Video error code:", videoElement.error?.code)
    console.error("Video error message:", videoElement.error?.message)

    setIsVideoError(true)
    setIsPlaying(false)

    toast({
      title: "Video Playback Error",
      description: `Error: ${videoElement.error?.message || "Unknown error"}`,
      variant: "destructive",
    })
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-auto overflow-hidden bg-black rounded-lg"
      style={{
        aspectRatio: "9/16",
        maxWidth: "calc(100vh * 9/16)", // Ensure it doesn't get too wide on desktop
        width: "100%",
      }}
    >
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                // Fallback if thumbnail fails to load
                const target = e.target as HTMLImageElement
                target.onerror = null
                target.src = "/placeholder.svg?key=video-thumbnail"
              }}
            />
          )}

          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
            {isPremium && !hasAccess ? (
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
                  <Lock className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                <p className="text-zinc-300 mb-4">This is premium content</p>
                <Button onClick={handlePlay} className="bg-red-500 hover:bg-red-600 text-white">
                  Purchase to Watch
                </Button>
              </div>
            ) : (
              <Button
                onClick={handlePlay}
                size="lg"
                className="rounded-full w-16 h-16 bg-red-500/80 hover:bg-red-500 text-white"
              >
                <Play className="h-8 w-8 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {isVideoError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
          <p className="text-white mb-4">Unable to play this video.</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="bg-zinc-800 text-white hover:bg-zinc-700"
          >
            Reload Page
          </Button>
        </div>
      ) : (
        <>
          {videoUrl && hasAccess && (
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              controls={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={handleVideoError}
              poster={thumbnailUrl}
              playsInline
              preload="metadata"
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}

          {/* Mute/Unmute button (only visible when playing) */}
          {isPlaying && (
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 bg-black/50 p-2 rounded-full z-10"
              style={{ display: isPlaying ? "block" : "none" }}
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
            </button>
          )}
        </>
      )}
    </div>
  )
}
