"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Share2, Edit, Instagram, Twitter, Globe, Lock, Upload, Plus, RefreshCw, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  freeClips: any[]
  paidClips: any[]
  createdAt: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
}

interface VideoItem {
  id: string
  title: string
  description: string
  url: string
  thumbnailUrl: string
  createdAt: any // Can be timestamp or string
  views: number
  likes: number
  isPremium: boolean
  [key: string]: any
}

export default function CreatorProfile({ creator }: { creator: Creator }) {
  const { user: userData } = useAuth()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "free"
  const [activeTab, setActiveTab] = useState(defaultTab)
  const isOwner = userData && userData.uid === creator.uid
  const [freeVideos, setFreeVideos] = useState<VideoItem[]>([])
  const [premiumVideos, setPremiumVideos] = useState<VideoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const [fadingIn, setFadingIn] = useState<string | null>(null)
  const [thumbnailsLoading, setThumbnailsLoading] = useState<{ [key: string]: boolean }>({})
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})
  const { toast } = useToast()

  // Function to fetch videos
  const fetchVideos = useCallback(
    async (showToast = false) => {
      if (!creator.uid) {
        setError("Creator ID is missing")
        setIsLoading(false)
        return
      }

      if (showToast) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      try {
        console.log(`Fetching videos for creator: ${creator.uid}`)

        // Fetch free videos
        const freeQuery = query(
          collection(db, `users/${creator.uid}/freeClips`),
          orderBy("createdAt", "desc"),
          limit(12),
        )

        console.log("Executing free videos query")
        const freeSnapshot = await getDocs(freeQuery)
        console.log(`Free videos query returned ${freeSnapshot.docs.length} results`)

        const freeData = freeSnapshot.docs.map((doc) => {
          const data = doc.data()
          // Convert Firestore timestamp to string if needed
          const createdAt =
            data.createdAt && typeof data.createdAt.toDate === "function"
              ? data.createdAt.toDate().toISOString()
              : data.createdAt

          return {
            id: doc.id,
            ...data,
            createdAt,
          }
        }) as VideoItem[]

        // Fetch premium videos
        const premiumQuery = query(
          collection(db, `users/${creator.uid}/premiumClips`),
          orderBy("createdAt", "desc"),
          limit(12),
        )

        console.log("Executing premium videos query")
        const premiumSnapshot = await getDocs(premiumQuery)
        console.log(`Premium videos query returned ${premiumSnapshot.docs.length} results`)

        const premiumData = premiumSnapshot.docs.map((doc) => {
          const data = doc.data()
          // Convert Firestore timestamp to string if needed
          const createdAt =
            data.createdAt && typeof data.createdAt.toDate === "function"
              ? data.createdAt.toDate().toISOString()
              : data.createdAt

          return {
            id: doc.id,
            ...data,
            createdAt,
          }
        }) as VideoItem[]

        console.log("Free videos:", freeData)
        console.log("Premium videos:", premiumData)

        // Initialize thumbnails loading state
        const newThumbnailsLoading: { [key: string]: boolean } = {}

        // Mark all thumbnails as loading initially
        ;[...freeData, ...premiumData].forEach((video) => {
          newThumbnailsLoading[video.id] = true
        })

        setThumbnailsLoading(newThumbnailsLoading)
        setFreeVideos(freeData)
        setPremiumVideos(premiumData)

        if (freeData.length === 0 && premiumData.length === 0) {
          console.log("No videos found for this creator")
        }

        if (showToast) {
          toast({
            title: "Content refreshed",
            description: "Your videos have been refreshed",
          })
        }
      } catch (error) {
        console.error("Error fetching videos:", error)
        setError("Failed to load videos. Please try again later.")

        toast({
          title: "Error loading videos",
          description: "There was a problem loading the videos. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [creator.uid, toast],
  )

  // Initial fetch
  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  // Refresh videos
  const refreshVideos = () => {
    fetchVideos(true)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.displayName} on MassClip`,
          text: `Check out ${creator.displayName}'s content on MassClip`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied",
        description: "Profile link copied to clipboard!",
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const handleVideoClick = (video: VideoItem) => {
    // If this video is already playing, stop it
    if (playingVideo === video.id) {
      const videoElement = videoRefs.current[video.id]
      if (videoElement) {
        videoElement.pause()
      }
      setPlayingVideo(null)
      return
    }

    // If another video is playing, stop it
    if (playingVideo && videoRefs.current[playingVideo]) {
      videoRefs.current[playingVideo]?.pause()
    }

    // Start the fade-in transition
    setFadingIn(video.id)

    // After a short delay, set the playing video
    setTimeout(() => {
      setPlayingVideo(video.id)
      setFadingIn(null)
    }, 300) // Match this with the CSS transition duration
  }

  const handlePlayButtonClick = (e: React.MouseEvent, video: VideoItem) => {
    e.stopPropagation() // Prevent triggering the card click event

    const videoElement = videoRefs.current[video.id]
    if (videoElement) {
      if (videoElement.paused) {
        videoElement.play().catch((err) => {
          console.error("Error playing video:", err)
          toast({
            title: "Playback error",
            description: "There was a problem playing this video. Please try again.",
            variant: "destructive",
          })
        })
      } else {
        videoElement.pause()
        setPlayingVideo(null) // Stop the video completely
      }
    }
  }

  const handleThumbnailLoad = (videoId: string) => {
    setThumbnailsLoading((prev) => ({
      ...prev,
      [videoId]: false,
    }))
  }

  // Function to render video card
  const renderVideoCard = (video: VideoItem) => {
    const isPlaying = playingVideo === video.id
    const isFading = fadingIn === video.id
    const isThumbnailLoading = thumbnailsLoading[video.id]

    return (
      <div key={video.id} className="flex flex-col" style={{ maxWidth: "220px" }}>
        {/* Video Container */}
        <div
          className={`relative overflow-hidden rounded-md transition-all duration-300 ${
            isPlaying ? "ring-[0.5px] ring-red-600" : "hover:ring-[0.5px] hover:ring-red-600"
          }`}
          style={{ aspectRatio: "9/16" }}
        >
          <div
            className="relative overflow-hidden group cursor-pointer w-full h-full bg-black"
            onClick={() => handleVideoClick(video)}
          >
            {/* Skeleton loader for thumbnail */}
            {isThumbnailLoading && <div className="absolute inset-0 bg-zinc-900 animate-pulse"></div>}

            {/* Thumbnail (visible when not playing) */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                isPlaying ? "opacity-0" : isFading ? "opacity-50" : "opacity-100"
              }`}
            >
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl || "/placeholder.svg"}
                  alt={video.title}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  style={{ opacity: isThumbnailLoading ? 0 : 1 }}
                  onLoad={() => handleThumbnailLoad(video.id)}
                  onError={(e) => {
                    // Fallback if thumbnail fails to load
                    const target = e.target as HTMLImageElement
                    target.onerror = null
                    target.src = "/placeholder.svg?key=video-thumbnail"
                    handleThumbnailLoad(video.id)
                  }}
                />
              ) : video.url ? (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center relative">
                  <video
                    className="w-full h-full object-cover"
                    preload="metadata"
                    poster="/placeholder.svg?key=video-poster"
                    onLoadedData={() => handleThumbnailLoad(video.id)}
                  >
                    <source src={`${video.url}#t=0.1`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <span className="text-zinc-500 text-xs">No preview</span>
                </div>
              )}

              {/* Minimal Play Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div
                  className="rounded-full bg-black/40 backdrop-blur-sm p-1.5 transform transition-transform duration-200 group-hover:scale-110"
                  onClick={(e) => handlePlayButtonClick(e, video)}
                >
                  <Play className="h-4 w-4 text-white" fill="white" />
                </div>
              </div>

              {/* Premium badge if applicable */}
              {video.isPremium && (
                <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-sm flex items-center">
                  <Lock className="w-2 h-2 mr-0.5" />
                  <span className="font-medium tracking-wide">PREMIUM</span>
                </div>
              )}
            </div>

            {/* Video Player (visible when playing) */}
            <div
              className={`w-full h-full transition-opacity duration-300 ${
                isPlaying ? "opacity-100" : "opacity-0"
              } ${!isPlaying && !isFading ? "hidden" : ""}`}
            >
              <video
                ref={(el) => (videoRefs.current[video.id] = el)}
                src={video.url}
                className="w-full h-full object-cover"
                playsInline
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                disablePictureInPicture
                disableRemotePlayback
              >
                Your browser does not support the video tag.
              </video>

              {/* Play/Pause overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                onClick={(e) => handlePlayButtonClick(e, video)}
              >
                <div className="rounded-full bg-black/40 backdrop-blur-sm p-1.5 transform transition-transform duration-200 hover:scale-110">
                  <Play className="h-4 w-4 text-white" fill="white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Title - Below the video */}
        <div className="mt-2 px-0.5">
          <h3 className="text-xs font-medium text-zinc-200 line-clamp-1 tracking-tight">{video.title}</h3>
          <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(video.createdAt)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900">
      {/* Hero Section */}
      <div className="relative">
        {/* Background gradient with subtle animated lines */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 to-black/90 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-500 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-500 to-transparent"></div>
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-500 to-transparent"></div>
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-500 to-transparent"></div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 shadow-xl">
                {creator.profilePic ? (
                  <Image
                    src={creator.profilePic || "/placeholder.svg"}
                    alt={creator.displayName}
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 text-4xl font-light">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Premium indicator for pro users */}
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-medium px-2 py-0.5 rounded-full shadow-lg">
                PRO
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-1">{creator.displayName}</h1>
              <p className="text-zinc-400 text-sm mb-4">@{creator.username}</p>

              {creator.bio && <p className="text-zinc-300 max-w-2xl mb-6 text-sm md:text-base">{creator.bio}</p>}

              {/* Social Links */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                {creator.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${creator.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>Instagram</span>
                  </a>
                )}

                {creator.socialLinks?.twitter && (
                  <a
                    href={`https://twitter.com/${creator.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                    <span>Twitter</span>
                  </a>
                )}

                {creator.socialLinks?.website && (
                  <a
                    href={creator.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {/* Member since */}
                <div className="text-zinc-500 text-xs">Member since {formatDate(creator.createdAt)}</div>

                {/* Content counts */}
                <div className="flex gap-3 text-xs">
                  <div className="text-zinc-400">
                    <span className="text-white font-medium">{freeVideos.length}</span> free clips
                  </div>
                  <div className="text-zinc-400">
                    <span className="text-white font-medium">{premiumVideos.length}</span> premium clips
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 md:mt-0">
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-white"
                  onClick={refreshVideos}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-white"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-white"
                    onClick={() => (window.location.href = "/dashboard/profile/edit")}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>

                  {/* Upload Button */}
                  <Button
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => (window.location.href = "/dashboard/upload")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="container mx-auto px-4 pb-20">
        <div className="mt-8">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-zinc-800 border-b border-zinc-700 w-full justify-start rounded-none p-0">
              <TabsTrigger
                value="free"
                className="data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none rounded-none px-6 py-3"
              >
                Free Videos
              </TabsTrigger>
              <TabsTrigger
                value="premium"
                className="data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none rounded-none px-6 py-3"
              >
                Premium Videos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="free" className="mt-6">
              {/* Add Video Button (Only visible to profile owner) */}
              {isOwner && (
                <div className="mb-6">
                  <Button
                    className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                    onClick={() => (window.location.href = "/dashboard/upload")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Free Video
                  </Button>
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex flex-col" style={{ maxWidth: "220px" }}>
                      <div className="bg-zinc-900 animate-pulse rounded-md" style={{ aspectRatio: "9/16" }} />
                      <div className="mt-2">
                        <div className="h-3 bg-zinc-800 animate-pulse rounded w-3/4"></div>
                        <div className="h-2 bg-zinc-800 animate-pulse rounded w-1/2 mt-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-light text-white mb-2">Error Loading Videos</h3>
                    <p className="text-zinc-400 mb-6">{error}</p>
                  </div>
                </div>
              ) : freeVideos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {freeVideos.map((video) => renderVideoCard(video))}
                </div>
              ) : (
                <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-light text-white mb-2">No Free Videos Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      {isOwner
                        ? "Share your first free video to attract viewers and showcase your content."
                        : `${creator.displayName} hasn't shared any free videos yet.`}
                    </p>

                    {isOwner && (
                      <Button
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => (window.location.href = "/dashboard/upload")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Free Video
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="premium" className="mt-6">
              {/* Add Video Button (Only visible to profile owner) */}
              {isOwner && (
                <div className="mb-6">
                  <Button
                    className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                    onClick={() => (window.location.href = "/dashboard/upload?premium=true")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Premium Video
                  </Button>
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex flex-col" style={{ maxWidth: "220px" }}>
                      <div className="bg-zinc-900 animate-pulse rounded-md" style={{ aspectRatio: "9/16" }} />
                      <div className="mt-2">
                        <div className="h-3 bg-zinc-800 animate-pulse rounded w-3/4"></div>
                        <div className="h-2 bg-zinc-800 animate-pulse rounded w-1/2 mt-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-light text-white mb-2">Error Loading Videos</h3>
                    <p className="text-zinc-400 mb-6">{error}</p>
                  </div>
                </div>
              ) : premiumVideos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {premiumVideos.map((video) => renderVideoCard(video))}
                </div>
              ) : (
                <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-light text-white mb-2">No Premium Videos Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      {isOwner
                        ? "Add premium videos to monetize your content and provide exclusive value to your subscribers."
                        : `${creator.displayName} hasn't shared any premium videos yet.`}
                    </p>

                    {isOwner && (
                      <Button
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => (window.location.href = "/dashboard/upload?premium=true")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Premium Video
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
