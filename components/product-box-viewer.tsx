"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Play, Video, Lock, DollarSign, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Bundle {
  id: string
  title: string
  description: string | null
  price: number
  comparePrice?: number | null // Added compare price to interface
  currency: string
  type: string
  coverImage: string | null
  contentItems: string[]
  active: boolean
  createdAt: any
}

interface VideoItem {
  id: string
  title: string
  description?: string
  thumbnailUrl: string
  url: string
  type: string
  status: string
  duration?: number
  createdAt?: any
}

interface BundleViewerProps {
  bundle: Bundle
  isOpen: boolean
  onClose: () => void
  hasAccess?: boolean
  onPurchase?: () => void
}

export default function BundleViewer({ bundle, isOpen, onClose, hasAccess = false, onPurchase }: BundleViewerProps) {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && bundle.contentItems.length > 0) {
      fetchVideos()
    }
  }, [isOpen, bundle.contentItems])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      console.log(`🔍 [Bundle Viewer] Fetching ${bundle.contentItems.length} videos`)

      const videoPromises = bundle.contentItems.map(async (videoId) => {
        try {
          const videoDoc = await getDoc(doc(db, "videos", videoId))
          if (videoDoc.exists()) {
            const data = videoDoc.data()
            return {
              id: videoDoc.id,
              title: data.title || "Untitled",
              description: data.description || "",
              thumbnailUrl: data.thumbnailUrl || "",
              url: data.url || "",
              type: data.type || "premium",
              status: data.status || "active",
              duration: data.duration || 0,
              createdAt: data.createdAt,
            }
          }
          return null
        } catch (error) {
          console.error(`❌ [Bundle Viewer] Error fetching video ${videoId}:`, error)
          return null
        }
      })

      const fetchedVideos = (await Promise.all(videoPromises)).filter(Boolean) as VideoItem[]
      setVideos(fetchedVideos)
      console.log(`✅ [Bundle Viewer] Loaded ${fetchedVideos.length} videos`)
    } catch (error) {
      console.error("❌ [Bundle Viewer] Error fetching videos:", error)
      toast({
        title: "Error",
        description: "Failed to load content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const VideoPlayer = ({ video }: { video: VideoItem }) => {
    return (
      <div className="space-y-4">
        <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden">
          {hasAccess ? (
            <video
              src={video.url}
              poster={video.thumbnailUrl || undefined}
              controls
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 relative">
              {video.thumbnailUrl && (
                <img
                  src={video.thumbnailUrl || "/placeholder.svg"}
                  alt={video.title}
                  className="w-full h-full object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <Lock className="h-12 w-12 text-white mx-auto mb-4" />
                  <p className="text-white text-lg font-medium mb-2">Premium Content</p>
                  <p className="text-zinc-300 text-sm">Purchase access to view this video</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">{video.title}</h3>
          {video.description && <p className="text-zinc-400 text-sm">{video.description}</p>}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {video.duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(video.duration)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              <span>Premium</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl text-white">{bundle.title}</DialogTitle>
              {bundle.description && <p className="text-zinc-400 text-sm max-w-2xl">{bundle.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500 text-amber-400">
                {bundle.type === "subscription" ? "Subscription" : "One-time"}
              </Badge>
              <div className="text-right">
                {bundle.comparePrice && bundle.comparePrice > bundle.price && (
                  <div className="text-sm text-zinc-400 line-through">
                    {formatPrice(bundle.comparePrice, bundle.currency)}
                  </div>
                )}
                <div className="flex items-center text-xl font-bold text-white">
                  <DollarSign className="h-5 w-5 text-green-500 mr-1" />
                  {formatPrice(bundle.price, bundle.currency)}
                </div>
                {bundle.type === "subscription" && <span className="text-xs text-zinc-400">/month</span>}
                {bundle.comparePrice && bundle.comparePrice > bundle.price && (
                  <div className="text-xs text-green-400 font-medium">
                    Save ${(bundle.comparePrice - bundle.price).toFixed(2)} (
                    {Math.round(((bundle.comparePrice - bundle.price) / bundle.comparePrice) * 100)}% off)
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase Section for Non-Access Users */}
          {!hasAccess && onPurchase && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Get Access to Premium Content</h3>
                    <p className="text-zinc-300 text-sm">
                      Unlock {videos.length} premium video{videos.length !== 1 ? "s" : ""} and exclusive content.
                    </p>
                  </div>
                  <Button
                    onClick={onPurchase}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium"
                  >
                    Purchase Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            </div>
          ) : videos.length > 0 ? (
            <div className="space-y-6">
              {/* Selected Video Player */}
              {selectedVideo && <VideoPlayer video={selectedVideo} />}

              {/* Video Grid */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Content Library ({videos.length} video{videos.length !== 1 ? "s" : ""})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {videos.map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`cursor-pointer rounded-lg overflow-hidden transition-all duration-300 ${
                        selectedVideo?.id === video.id
                          ? "ring-2 ring-red-500 bg-red-500/10"
                          : "hover:ring-1 hover:ring-zinc-600"
                      }`}
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="aspect-video bg-zinc-800 relative">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl || "/placeholder.svg"}
                            alt={video.title}
                            className={`w-full h-full object-cover ${!hasAccess ? "opacity-50" : ""}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-8 w-8 text-zinc-600" />
                          </div>
                        )}

                        {!hasAccess && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Lock className="h-6 w-6 text-white" />
                          </div>
                        )}

                        {hasAccess && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        )}

                        {video.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {formatDuration(video.duration)}
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <h4 className="text-sm font-medium text-white truncate">{video.title}</h4>
                        {video.description && (
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{video.description}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Content Available</h3>
              <p className="text-zinc-400">This product box doesn't contain any content yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
