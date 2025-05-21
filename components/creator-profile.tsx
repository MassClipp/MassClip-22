"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  Share2,
  Edit,
  Instagram,
  Twitter,
  Globe,
  Lock,
  Upload,
  Plus,
  RefreshCw,
  Play,
  X,
  Download,
  Heart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { where, deleteDoc, doc, addDoc, serverTimestamp } from "firebase/firestore"
import { downloadFile } from "@/lib/download-helper"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
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
  const [loadedThumbnails, setLoadedThumbnails] = useState<{ [key: string]: boolean }>({})
  const [favorites, setFavorites] = useState<{ [key: string]: boolean }>({})
  const [isCheckingFavorites, setIsCheckingFavorites] = useState(true)
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

  // Check favorites status
  useEffect(() => {
    const checkFavorites = async () => {
      if (!userData) {
        setIsCheckingFavorites(false)
        return
      }

      try {
        // Get all videos
        const allVideos = [...freeVideos, ...premiumVideos]
        if (allVideos.length === 0) {
          setIsCheckingFavorites(false)
          return
        }

        // Query for favorites
        const favoritesRef = collection(db, `users/${userData.uid}/favorites`)
        const favoritesSnapshot = await getDocs(favoritesRef)

        // Create a map of video IDs to favorite status
        const favoritesMap: { [key: string]: boolean } = {}
        favoritesSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.videoId) {
            favoritesMap[data.videoId] = true
          }
        })

        setFavorites(favoritesMap)
      } catch (error) {
        console.error("Error checking favorites:", error)
      } finally {
        setIsCheckingFavorites(false)
      }
    }

    checkFavorites()
  }, [userData, freeVideos, premiumVideos])

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

      // Use setTimeout to ensure the video element is rendered before trying to play
      setTimeout(() => {
        const videoElement = videoRefs.current[video.id]
        if (videoElement) {
          videoElement.play().catch((err) => {
            console.error("Error playing video:", err)
            toast({
              title: "Playback error",
              description: "There was a problem playing this video. Please try again.",
              variant: "destructive",
            })
          })
        }
      }, 100)
    }, 300) // Match this with the CSS transition duration
  }

  // Function to stop video playback
  const stopVideo = (videoId: string) => {
    const videoElement = videoRefs.current[videoId]
    if (videoElement) {
      videoElement.pause()
      // Reset the video to the beginning
      videoElement.currentTime = 0
    }
    setPlayingVideo(null)
  }

  // Handle thumbnail load
  const handleThumbnailLoad = (videoId: string) => {
    setLoadedThumbnails((prev) => ({ ...prev, [videoId]: true }))
  }

  // Handle download
  const handleDownload = async (e: React.MouseEvent, video: VideoItem) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userData) {
      toast({
        title: "Authentication Required",
        description: "Please log in to download videos",
        variant: "destructive",
      })
      return
    }

    if (!video.url) {
      toast({
        title: "Download Error",
        description: "No download link available for this video.",
        variant: "destructive",
      })
      return
    }

    try {
      // Show loading toast
      toast({
        title: "Starting download...",
        description: "Preparing your video for download",
      })

      // Use the downloadFile helper function
      const filename = `${video.title || "video"}.mp4`
      const success = await downloadFile(video.url, filename)

      if (success) {
        toast({
          title: "Download Started",
          description: "Your video is downloading",
        })
      } else {
        throw new Error("Download failed")
      }
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download Error",
        description: "There was a problem downloading the video. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Toggle favorite - Updated to ensure compatibility with VimeoCard
  const toggleFavorite = async (e: React.MouseEvent, video: VideoItem) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userData) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save favorites",
        variant: "destructive",
      })
      return
    }

    const videoId = video.id
    const isFavorite = favorites[videoId]

    try {
      if (isFavorite) {
        // Find and remove from favorites
        const favoritesRef = collection(db, `users/${userData.uid}/favorites`)
        const q = query(favoritesRef, where("videoId", "==", videoId))
        const querySnapshot = await getDocs(q)

        querySnapshot.forEach(async (document) => {
          await deleteDoc(doc(db, `users/${userData.uid}/favorites`, document.id))
        })

        // Update local state
        setFavorites((prev) => {
          const updated = { ...prev }
          delete updated[videoId]
          return updated
        })

        toast({
          title: "Removed from favorites",
          description: "Video removed from your favorites",
        })
      } else {
        // Format the video data to be compatible with VimeoCard
        // This is the key change - we need to transform our VideoItem into a format
        // that matches what VimeoCard expects
        const vimeoCompatibleVideo = {
          uri: `/videos/${videoId}`, // Create a URI format that VimeoCard expects
          name: video.title,
          description: video.description || "",
          link: video.url,
          pictures: {
            sizes: [
              {
                width: 1920,
                height: 1080,
                link: video.thumbnailUrl || "",
              },
            ],
          },
          // Add other required fields that VimeoCard might use
          duration: video.duration || 0,
          width: 1920,
          height: 1080,
          created_time: video.createdAt || new Date().toISOString(),
          modified_time: video.createdAt || new Date().toISOString(),
          release_time: video.createdAt || new Date().toISOString(),
          // Add download information
          download: [
            {
              quality: "hd",
              type: "video/mp4",
              width: 1920,
              height: 1080,
              link: video.url,
              size: 0,
            },
          ],
        }

        // Add to favorites with the properly formatted video object
        await addDoc(collection(db, `users/${userData.uid}/favorites`), {
          videoId: videoId,
          video: vimeoCompatibleVideo, // Store the compatible format
          createdAt: serverTimestamp(),
        })

        // Update local state
        setFavorites((prev) => ({
          ...prev,
          [videoId]: true,
        }))

        toast({
          title: "Added to favorites",
          description: "Video saved to your favorites",
        })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      })
    }
  }

  // Function to render video card
  const renderVideoCard = (video: VideoItem) => {
    const isPlaying = playingVideo === video.id
    const isFading = fadingIn === video.id
    const isThumbnailLoaded = loadedThumbnails[video.id]
    const isFavorite = favorites[video.id]

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
            {/* Thumbnail (visible when not playing) */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                isPlaying ? "opacity-0" : isFading ? "opacity-50" : "opacity-100"
              }`}
            >
              {video.thumbnailUrl ? (
                <div className="w-full h-full bg-black">
                  <img
                    src={video.thumbnailUrl || "/placeholder.svg"}
                    alt={video.title}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      isThumbnailLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => handleThumbnailLoad(video.id)}
                    onError={(e) => {
                      // Fallback if thumbnail fails to load
                      const target = e.target as HTMLImageElement
                      target.onerror = null
                      target.src = "/placeholder.svg?key=video-thumbnail"
                      handleThumbnailLoad(video.id) // Mark as loaded even if it's the fallback
                    }}
                  />
                </div>
              ) : video.url ? (
                <div className="w-full h-full bg-black flex items-center justify-center relative">
                  <video
                    className="w-full h-full object-cover"
                    preload="metadata"
                    poster="/placeholder.svg?key=video-poster"
                  >
                    <source src={`${video.url}#t=0.1`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <span className="text-zinc-500 text-xs">No preview</span>
                </div>
              )}

              {/* Minimal Play Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="rounded-full bg-black/40 backdrop-blur-sm p-1.5 transform transition-transform duration-200 group-hover:scale-110">
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

              {/* Download button - bottom left */}
              <button
                className="absolute bottom-2 left-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                onClick={(e) => handleDownload(e, video)}
                aria-label="Download video"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>

              {/* Favorite button - bottom right */}
              <button
                className={`absolute bottom-2 right-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                  isFavorite ? "text-red-500" : "text-white"
                }`}
                onClick={(e) => toggleFavorite(e, video)}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                disabled={isCheckingFavorites}
              >
                <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
              </button>
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
                className="w-full h-full object-cover bg-black"
                playsInline
                // Remove autoPlay to ensure videos only play when clicked
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                disablePictureInPicture
                disableRemotePlayback
              >
                Your browser does not support the video tag.
              </video>

              {/* Custom play/pause overlay */}
              <div
                className="absolute inset-0 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation()
                  const videoElement = videoRefs.current[video.id]
                  if (videoElement) {
                    if (videoElement.paused) {
                      videoElement.play()
                    } else {
                      videoElement.pause()
                    }
                  }
                }}
              />

              {/* Close button - clicking it will stop the video */}
              <button
                className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm rounded-full p-1 z-10 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => {
                  e.stopPropagation()
                  stopVideo(video.id)
                }}
              >
                <X className="h-3 w-3 text-white" />
              </button>

              {/* Download button - bottom left (also visible when playing) */}
              <button
                className="absolute bottom-2 left-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(e, video)
                }}
                aria-label="Download video"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>

              {/* Favorite button - bottom right (also visible when playing) */}
              <button
                className={`absolute bottom-2 right-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                  isFavorite ? "text-red-500" : "text-white"
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(e, video)
                }}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                disabled={isCheckingFavorites}
              >
                <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
              </button>
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
