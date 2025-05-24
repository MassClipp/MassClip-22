"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { usePremiumAccess } from "@/hooks/use-premium-access"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface PremiumContentSectionProps {
  creatorId: string
  username: string
}

export default function PremiumContentSection({ creatorId, username }: PremiumContentSectionProps) {
  const { user } = useAuth()
  const { hasAccess, isLoading: accessLoading } = usePremiumAccess(creatorId)
  const [premiumVideos, setPremiumVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPremiumVideos = async () => {
      if (!creatorId) return

      try {
        const videosQuery = query(
          collection(db, "videos"),
          where("uid", "==", creatorId),
          where("isPremium", "==", true),
        )

        const querySnapshot = await getDocs(videosQuery)
        const videos = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setPremiumVideos(videos)
      } catch (error) {
        console.error("Error fetching premium videos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!accessLoading) {
      fetchPremiumVideos()
    }
  }, [creatorId, accessLoading])

  if (accessLoading || isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Premium Content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden">
              <Skeleton className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null // Don't show premium content section if user doesn't have access
  }

  if (premiumVideos.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Premium Content</h2>
        <div className="bg-zinc-800/50 rounded-lg p-6 text-center">
          <p className="text-zinc-400">No premium content available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Premium Content</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {premiumVideos.map((video) => (
          <div key={video.id} className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden relative group">
            <img
              src={video.thumbnailUrl || "/placeholder.svg?height=480&width=270&query=video"}
              alt={video.title}
              className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <div className="flex justify-end">
                <span className="bg-amber-500/90 text-black text-xs font-medium px-2 py-1 rounded">Premium</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm mb-2">{video.title}</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                  onClick={() => (window.location.href = `/video/${video.id}`)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Watch
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
