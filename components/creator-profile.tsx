"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Share2, Edit, Instagram, Twitter, Globe, Calendar, Film, Lock, Play, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

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

// Hardcoded sample videos
const sampleFreeVideos = [
  {
    id: "free1",
    title: "Morning Routine Essentials",
    description: "Start your day right with these morning habits",
    thumbnail: "/vibrant-morning-start.png",
    vimeoId: "565486457",
    duration: 65,
    isPremium: false,
  },
  {
    id: "free2",
    title: "Healthy Meal Prep Ideas",
    description: "Quick and nutritious meal prep for busy people",
    thumbnail: "/vibrant-salad-intro.png",
    vimeoId: "565486457",
    duration: 78,
    isPremium: false,
  },
  {
    id: "free3",
    title: "5-Minute Workout Routine",
    description: "Quick exercises you can do anywhere",
    thumbnail: "/dynamic-fitness-flow.png",
    vimeoId: "565486457",
    duration: 92,
    isPremium: false,
  },
]

const samplePremiumVideos = [
  {
    id: "premium1",
    title: "Advanced Productivity Techniques",
    description: "Take your productivity to the next level",
    thumbnail: "/focused-work-session.png",
    vimeoId: "565486457",
    duration: 120,
    isPremium: true,
  },
  {
    id: "premium2",
    title: "Content Creation Masterclass",
    description: "Learn how to create engaging content",
    thumbnail: "/focused-creator.png",
    vimeoId: "565486457",
    duration: 185,
    isPremium: true,
  },
]

export default function CreatorProfile({ creator }: { creator: Creator }) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const isOwner = user && user.uid === creator.uid
  const router = useRouter()

  // Set active tab based on URL query parameter
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "premium") {
      setActiveTab("premium")
    } else {
      setActiveTab("free")
    }
  }, [searchParams])

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
      alert("Profile link copied to clipboard!")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleAddClip = (isPremium = false) => {
    if (isPremium) {
      router.push("/dashboard/upload?premium=true")
    } else {
      router.push("/dashboard/upload")
    }
  }

  // Direct embedded video component with 9:16 aspect ratio
  const EmbeddedVideo = ({ vimeoId }: { vimeoId: string }) => {
    return (
      <div className="relative w-full" style={{ paddingBottom: "177.78%" }}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&loop=0&title=0&byline=0&portrait=0`}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    )
  }

  // Video card component with 9:16 aspect ratio
  const VideoCard = ({ video }: { video: any }) => {
    const [showVideo, setShowVideo] = useState(false)

    return (
      <div className="group relative overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800/50 transition-all duration-300 hover:border-zinc-700/50">
        {showVideo ? (
          <EmbeddedVideo vimeoId={video.vimeoId} />
        ) : (
          <div className="relative" style={{ paddingBottom: "177.78%" }}>
            <div className="absolute inset-0">
              <div className="relative w-full h-full overflow-hidden">
                {video.thumbnail ? (
                  <Image
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Film className="h-10 w-10 text-zinc-600" />
                  </div>
                )}

                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {formatDuration(video.duration)}
                </div>

                {/* Premium badge */}
                {video.isPremium && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    PRO
                  </div>
                )}

                {/* Play button overlay */}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 cursor-pointer"
                  onClick={() => setShowVideo(true)}
                >
                  <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" fill="white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-3">
          <h3 className="font-medium text-white line-clamp-1 mb-1">{video.title}</h3>
          <p className="text-xs text-zinc-400 line-clamp-2">{video.description}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Gradient Background */}
      <div className="relative">
        {/* Background gradient with subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

        <div className="container mx-auto relative z-10">
          {/* Profile Header */}
          <div className="pt-10 pb-8 px-4 md:px-8 lg:px-0">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Profile Image with Gradient Border */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-red-500 to-amber-500 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition duration-300"></div>
                <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
                  {creator.profilePic ? (
                    <Image
                      src={creator.profilePic || "/placeholder.svg"}
                      alt={creator.displayName}
                      width={144}
                      height={144}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400 text-4xl font-light">
                      {creator.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Premium indicator */}
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                  PRO
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1 tracking-tight">
                  {creator.displayName}
                </h1>
                <p className="text-zinc-400 text-sm mb-4">@{creator.username}</p>

                {creator.bio && (
                  <div className="relative max-w-2xl mb-6 text-sm bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
                    <p className="text-zinc-300">{creator.bio}</p>
                  </div>
                )}

                {/* Stats Cards Row */}
                <div className="grid grid-cols-3 gap-3 max-w-md mb-6">
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Member since</p>
                    <p className="text-sm font-medium text-white">{formatDate(creator.createdAt)}</p>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Film className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Free clips</p>
                    <p className="text-sm font-medium text-white">{sampleFreeVideos.length}</p>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center">
                    <Lock className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                    <p className="text-xs text-zinc-400">Premium clips</p>
                    <p className="text-sm font-medium text-white">{samplePremiumVideos.length}</p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                  {creator.socialLinks?.instagram && (
                    <a
                      href={`https://instagram.com/${creator.socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      <span>Instagram</span>
                    </a>
                  )}

                  {creator.socialLinks?.twitter && (
                    <a
                      href={`https://twitter.com/${creator.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      <span>Twitter</span>
                    </a>
                  )}

                  {creator.socialLinks?.website && (
                    <a
                      href={creator.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors border border-zinc-800/50"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 md:mt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
                    onClick={() => router.push("/dashboard/profile/edit")}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs with Gradient Highlight */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-20">
        {/* Tab Navigation */}
        <div className="border-b border-zinc-800/50 mb-8">
          <div className="flex">
            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative transition-all duration-200",
                activeTab === "free" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => setActiveTab("free")}
            >
              Free Clips
              {activeTab === "free" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600"></div>
              )}
            </button>

            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative transition-all duration-200",
                activeTab === "premium" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => setActiveTab("premium")}
            >
              Premium Clips
              {activeTab === "premium" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-8">
          {activeTab === "free" && (
            <div>
              {/* Featured Video - Direct Embed */}
              <div className="mb-12">
                <h2 className="text-xl font-medium mb-4">Featured Clip</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden">
                    <iframe
                      src="https://player.vimeo.com/video/565486457?autoplay=0&loop=0&title=0&byline=0&portrait=0"
                      className="w-full h-full"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="text-2xl font-semibold mb-2">Morning Routine Essentials</h3>
                    <p className="text-zinc-400 mb-6">
                      Start your day right with these essential morning habits that will boost your productivity and
                      energy levels throughout the day. This quick guide covers everything from hydration to movement.
                    </p>
                    <div className="flex items-center text-sm text-zinc-500 mb-6">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>1:05</span>
                    </div>
                    <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 w-full md:w-auto">
                      <Play className="h-4 w-4 mr-2" fill="white" />
                      Watch Now
                    </Button>
                  </div>
                </div>
              </div>

              {/* Grid of Videos */}
              <h2 className="text-xl font-medium mb-4">All Free Clips</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sampleFreeVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </div>
          )}

          {activeTab === "premium" && (
            <div>
              {/* Featured Premium Video */}
              <div className="mb-12">
                <h2 className="text-xl font-medium mb-4">Featured Premium Clip</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden">
                    <iframe
                      src="https://player.vimeo.com/video/565486457?autoplay=0&loop=0&title=0&byline=0&portrait=0"
                      className="w-full h-full"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-semibold">Advanced Productivity Techniques</h3>
                      <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                        PRO
                      </span>
                    </div>
                    <p className="text-zinc-400 mb-6">
                      Take your productivity to the next level with these advanced techniques used by top performers.
                      Learn how to manage your energy, not just your time, and accomplish more with less stress.
                    </p>
                    <div className="flex items-center text-sm text-zinc-500 mb-6">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>2:00</span>
                    </div>
                    <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 w-full md:w-auto">
                      <Play className="h-4 w-4 mr-2" fill="white" />
                      Watch Now
                    </Button>
                  </div>
                </div>
              </div>

              {/* Grid of Premium Videos */}
              <h2 className="text-xl font-medium mb-4">All Premium Clips</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {samplePremiumVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
