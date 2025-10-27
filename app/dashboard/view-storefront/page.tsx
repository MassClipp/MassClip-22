"use client"

import type React from "react"
import { getDoc } from "firebase/firestore"
import { useState, useEffect, useRef } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Instagram,
  Twitter,
  Globe,
  Edit2,
  Check,
  X,
  Calendar,
  Users,
  Heart,
  Package,
  Play,
  UploadIcon,
  Download,
  Pause,
  Settings,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import BundleCard from "@/components/bundle-card"
import { useObjectives } from "@/hooks/use-objectives"

interface ContentItem {
  id: string
  title: string
  thumbnailUrl: string
  fileUrl: string
  duration: string
  views: number
  type: "video" | "audio" | "image" | "bundle"
  isPremium: boolean
  price?: number
  contentCount?: number
  description?: string
  stripePriceId?: string
  stripeProductId?: string
}

export default function ViewStorefrontPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { objectives, isLoading: isLoadingObjectives } = useObjectives()
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [profilePic, setProfilePic] = useState("")
  const [socialLinks, setSocialLinks] = useState<{
    instagram?: string
    twitter?: string
    website?: string
  }>({})
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [premiumContent, setPremiumContent] = useState<ContentItem[]>([])
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [createdAt, setCreatedAt] = useState<string>("")

  // Editing states
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [isEditingSocials, setIsEditingSocials] = useState(false)
  const [tempBio, setTempBio] = useState("")
  const [tempSocials, setTempSocials] = useState<{
    instagram?: string
    twitter?: string
    website?: string
  }>({})

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        setLoading(true)

        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data()
          console.log("[v0] Fetched user data:", userData)

          setUsername(userData.username || null)
          setDisplayName(userData.displayName || userData.username || "")
          setBio(userData.bio || "")
          setTempBio(userData.bio || "")
          setSocialLinks(userData.socialLinks || {})
          setTempSocials(userData.socialLinks || {})
          setProfilePic(userData.profilePic || userData.photoURL || "")

          // Handle createdAt timestamp
          if (userData.createdAt) {
            if (userData.createdAt.toDate) {
              setCreatedAt(userData.createdAt.toDate().toISOString())
            } else {
              setCreatedAt(userData.createdAt)
            }
          }

          // Fetch content data
          const freeResponse = await fetch(`/api/creator/${user.uid}/free-content`)
          if (freeResponse.ok) {
            const freeData = await freeResponse.json()
            setFreeContent(freeData.content || [])
          }

          const premiumResponse = await fetch(`/api/creator/${user.uid}/premium-content`)
          if (premiumResponse.ok) {
            const premiumData = await premiumResponse.json()
            setPremiumContent(premiumData.content || [])
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching user data:", error)
        toast({
          title: "Error",
          description: "Failed to load storefront data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchUserData()
    }
  }, [user, toast])

  const handleSaveBio = async () => {
    if (!user) return

    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        bio: tempBio,
      })

      setBio(tempBio)
      setIsEditingBio(false)
      toast({
        title: "Bio Updated",
        description: "Your bio has been saved successfully",
      })
    } catch (error) {
      console.error("[v0] Error updating bio:", error)
      toast({
        title: "Error",
        description: "Failed to update bio",
        variant: "destructive",
      })
    }
  }

  const handleSaveSocials = async () => {
    if (!user) return

    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        socialLinks: tempSocials,
      })

      setSocialLinks(tempSocials)
      setIsEditingSocials(false)
      toast({
        title: "Social Links Updated",
        description: "Your social links have been saved successfully",
      })
    } catch (error) {
      console.error("[v0] Error updating social links:", error)
      toast({
        title: "Error",
        description: "Failed to update social links",
        variant: "destructive",
      })
    }
  }

  const getMemberSince = () => {
    if (createdAt) {
      let date: Date
      if (typeof createdAt === "string") {
        if (createdAt.includes("T") || createdAt.includes("-")) {
          date = new Date(createdAt)
        } else {
          const timestamp = Number.parseInt(createdAt)
          date = new Date(timestamp)
        }
      } else {
        date = new Date(createdAt)
      }

      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      }
    }
    return "Recently"
  }

  const needsCustomization =
    !isLoadingObjectives &&
    objectives &&
    !objectives.objectives.find((obj) => obj.id === "customize_storefront")?.completed

  const currentContent = activeTab === "free" ? freeContent : premiumContent

  return (
    <div className="min-h-screen bg-black fixed inset-0 overflow-y-auto">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900/40 via-black to-zinc-800/30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-zinc-900/20 via-transparent to-zinc-800/10 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {needsCustomization && (
          <div className="mb-6 p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Customize Your Storefront</h3>
                <p className="text-xs text-white/60">Complete your profile to make your storefront stand out</p>
              </div>
              <Button
                onClick={() => router.push("/dashboard/profile")}
                size="sm"
                className="bg-gradient-to-r from-teal-400 to-cyan-400 text-black hover:from-teal-500 hover:to-cyan-500 font-medium"
              >
                <Settings className="w-4 h-4 mr-2" />
                Customize
              </Button>
            </div>
          </div>
        )}

        {/* Header with inline editing */}
        <div className="mb-8 sm:mb-16">
          <div className="flex items-start justify-between gap-8">
            <div className="flex items-center gap-8">
              <div className="relative group">
                <Avatar
                  className="w-32 h-32 border-2 border-white/20 cursor-pointer"
                  onClick={() => router.push("/dashboard/profile")}
                >
                  <AvatarImage src={profilePic || "/placeholder.svg"} alt={displayName} className="object-cover" />
                  <AvatarFallback className="bg-zinc-900 text-white text-2xl font-medium border-2 border-white/20">
                    {displayName?.charAt(0)?.toUpperCase() || username?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => router.push("/dashboard/profile")}
                >
                  <Edit2 className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h1 className="text-3xl font-light text-white tracking-tight">{displayName || username}</h1>
                  <p className="text-zinc-500 text-sm font-mono">@{username}</p>
                </div>

                {isEditingBio ? (
                  <div className="space-y-2">
                    <Textarea
                      value={tempBio}
                      onChange={(e) => setTempBio(e.target.value)}
                      placeholder="Write your bio..."
                      className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-md resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveBio} className="bg-white text-black hover:bg-zinc-100">
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingBio(false)
                          setTempBio(bio)
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="group cursor-pointer"
                    onClick={() => {
                      setTempBio(bio)
                      setIsEditingBio(true)
                    }}
                  >
                    {bio ? (
                      <p className="text-zinc-400 text-sm max-w-md leading-relaxed group-hover:text-zinc-300 transition-colors">
                        {bio}
                      </p>
                    ) : (
                      <p className="text-zinc-600 text-sm max-w-md leading-relaxed group-hover:text-zinc-500 transition-colors italic">
                        Click to add a bio
                      </p>
                    )}
                    <Edit2 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  </div>
                )}

                {isEditingSocials ? (
                  <div className="space-y-2">
                    <Input
                      value={tempSocials.instagram || ""}
                      onChange={(e) => setTempSocials({ ...tempSocials, instagram: e.target.value })}
                      placeholder="Instagram username"
                      className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                    />
                    <Input
                      value={tempSocials.twitter || ""}
                      onChange={(e) => setTempSocials({ ...tempSocials, twitter: e.target.value })}
                      placeholder="Twitter username"
                      className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                    />
                    <Input
                      value={tempSocials.website || ""}
                      onChange={(e) => setTempSocials({ ...tempSocials, website: e.target.value })}
                      placeholder="Website URL"
                      className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveSocials} className="bg-white text-black hover:bg-zinc-100">
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingSocials(false)
                          setTempSocials(socialLinks)
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {socialLinks.instagram && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900 h-8 w-8 rounded-full p-0"
                        onClick={() => window.open(`https://instagram.com/${socialLinks.instagram}`, "_blank")}
                      >
                        <Instagram className="w-4 h-4" />
                      </Button>
                    )}
                    {socialLinks.twitter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900 h-8 w-8 rounded-full p-0"
                        onClick={() => window.open(`https://twitter.com/${socialLinks.twitter}`, "_blank")}
                      >
                        <Twitter className="w-4 h-4" />
                      </Button>
                    )}
                    {socialLinks.website && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900 h-8 w-8 rounded-full p-0"
                        onClick={() => window.open(socialLinks.website, "_blank")}
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-white hover:bg-zinc-900 h-8 w-8 rounded-full p-0"
                      onClick={() => {
                        setTempSocials(socialLinks)
                        setIsEditingSocials(true)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 mb-12 text-sm">
          <div className="flex items-center gap-2 text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span>Member since {getMemberSince()}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Users className="w-4 h-4" />
            <span>{freeContent.length} free</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Heart className="w-4 h-4" />
            <span>{premiumContent.length} premium</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex items-center gap-8 border-b border-zinc-800/50">
            <button
              onClick={() => setActiveTab("free")}
              className={`pb-4 text-sm font-medium transition-all duration-200 relative ${
                activeTab === "free" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Free Content
              {activeTab === "free" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
            </button>
            <button
              onClick={() => setActiveTab("premium")}
              className={`pb-4 text-sm font-medium transition-all duration-200 relative ${
                activeTab === "premium" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Premium Content
              {activeTab === "premium" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
            </button>
          </div>
        </div>

        {/* Content with action buttons */}
        <div className="pt-8">
          {currentContent.length > 0 ? (
            <div
              className={
                activeTab === "premium"
                  ? "flex flex-col items-center gap-6 sm:grid sm:grid-cols-3 sm:gap-8 sm:justify-items-center"
                  : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center"
              }
            >
              <div
                className={
                  activeTab === "premium"
                    ? "w-full max-w-sm aspect-[3/4] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 group"
                    : "aspect-[9/16] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 group"
                }
                onClick={() => router.push(activeTab === "free" ? "/dashboard/free-content" : "/dashboard/bundles")}
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors flex items-center justify-center">
                  {activeTab === "free" ? (
                    <UploadIcon className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                  ) : (
                    <Package className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                  )}
                </div>
                <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium">
                  {activeTab === "free" ? "Add Content" : "Create Bundle"}
                </p>
              </div>

              {activeTab === "premium"
                ? premiumContent.map((item) => (
                    <BundleCard
                      key={item.id}
                      item={item}
                      user={user}
                      creatorId={user.uid}
                      creatorUsername={username}
                      isPreview={true}
                    />
                  ))
                : freeContent.map((item) => <VideoContentCard key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="text-center py-24">
              <div
                className="w-24 h-24 mx-auto mb-6 bg-zinc-900 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer flex items-center justify-center group"
                onClick={() => router.push(activeTab === "free" ? "/dashboard/free-content" : "/dashboard/bundles")}
              >
                {activeTab === "premium" ? (
                  <Package className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                ) : (
                  <Play className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                )}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No {activeTab} content yet</h3>
              <p className="text-zinc-500 text-sm mb-6">
                {activeTab === "free" ? "Upload your first piece of content" : "Create your first bundle"}
              </p>
              <Button
                onClick={() => router.push(activeTab === "free" ? "/dashboard/free-content" : "/dashboard/bundles")}
                className="bg-white text-black hover:bg-zinc-100 font-medium"
              >
                {activeTab === "free" ? (
                  <>
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Upload Content
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Create Bundle
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VideoContentCard({ item }: { item: ContentItem }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current || !item.fileUrl) {
      console.error("[v0] No video element or URL available")
      return
    }

    console.log("[v0] Attempting to play video:", item.fileUrl)

    if (isPlaying) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      // Pause all other videos
      document.querySelectorAll("video").forEach((v) => {
        if (v !== videoRef.current) {
          v.pause()
          v.currentTime = 0
        }
      })

      videoRef.current.muted = false
      videoRef.current
        .play()
        .then(() => {
          console.log("[v0] Video started playing")
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error("[v0] Error playing video:", error)
        })
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!item.fileUrl) {
      console.error("[v0] No file URL available for download")
      return
    }

    try {
      setIsDownloading(true)
      console.log("[v0] Starting download:", item.fileUrl)

      const response = await fetch(item.fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = item.title || "video.mp4"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log("[v0] Download completed")
    } catch (error) {
      console.error("[v0] Error downloading file:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    videoElement.addEventListener("play", handlePlay)
    videoElement.addEventListener("pause", handlePause)
    videoElement.addEventListener("ended", handleVideoEnd)

    return () => {
      videoElement.removeEventListener("play", handlePlay)
      videoElement.removeEventListener("pause", handlePause)
      videoElement.removeEventListener("ended", handleVideoEnd)
    }
  }, [])

  return (
    <div
      className="group cursor-pointer w-full max-w-[180px] sm:max-w-[200px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative aspect-[9/16] rounded-lg overflow-hidden mb-2 transition-all duration-300 ${
          isHovered ? "border border-white/50" : "border border-transparent"
        }`}
      >
        {item.fileUrl && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover bg-black"
            preload="auto"
            muted
            playsInline
            controls={false}
          >
            <source src={item.fileUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}

        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHovered || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={handlePlayPause}
            disabled={!item.fileUrl}
            className="bg-white/20 backdrop-blur-sm rounded-full p-2 transition-transform duration-300 hover:scale-110 disabled:opacity-50"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            ) : (
              <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white ml-0.5" />
            )}
          </button>
        </div>

        {item.fileUrl && (
          <button
            className={`absolute bottom-2 right-2 backdrop-blur-sm p-1.5 rounded-full transition-all duration-200 hover:scale-110 bg-black/60 hover:bg-black/80 ${
              isHovered ? "opacity-100" : "opacity-70"
            } ${isDownloading ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label="Download video"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-white ${isDownloading ? "animate-pulse" : ""}`} />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-white text-xs sm:text-sm font-medium line-clamp-2 leading-tight" title={item.title}>
          {item.title}
        </h3>
      </div>
    </div>
  )
}
