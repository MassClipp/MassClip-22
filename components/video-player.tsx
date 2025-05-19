"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Lock, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface VideoPlayerProps {
  videoUrl: string
  thumbnailUrl?: string
  title: string
  isPremium: boolean
  videoId: string
  creatorId: string
  onPlay?: () => void
}

export default function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  isPremium,
  videoId,
  creatorId,
  onPlay,
}: VideoPlayerProps) {
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
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
        // This is a placeholder - you'll need to implement the actual purchase check
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
      videoRef.current.play()
      setIsPlaying(true)
      if (onPlay) onPlay()
    }
  }

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
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

      <video
        ref={videoRef}
        src={hasAccess ? videoUrl : undefined}
        className="w-full h-full"
        controls={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        poster={thumbnailUrl}
        playsInline
      />
    </div>
  )
}
