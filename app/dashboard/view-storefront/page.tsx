"use client"

import type React from "react"
import { getDoc } from "firebase/firestore"
import { useState, useEffect, useRef } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Play, Download, Pause } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { OnboardingStepBanner } from "@/components/onboarding-step-banner"
import { useUserPlan } from "@/hooks/use-user-plan"

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
  const { isProUser, planData } = useUserPlan()
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
  const [isStorefrontLive, setIsStorefrontLive] = useState(false)

  const [isEditingBio, setIsEditingBio] = useState(false)
  const [isEditingSocials, setIsEditingSocials] = useState(false)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [tempBio, setTempBio] = useState("")
  const [tempSocials, setTempSocials] = useState<{
    instagram?: string
    twitter?: string
    website?: string
  }>({})
  const [tempUsername, setTempUsername] = useState("")

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
          setIsStorefrontLive(userData.isStorefrontLive || false)

          if (userData.createdAt) {
            if (userData.createdAt.toDate) {
              setCreatedAt(userData.createdAt.toDate().toISOString())
            } else {
              setCreatedAt(userData.createdAt)
            }
          }

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

  const handleSaveUsername = async () => {
    if (!user || !tempUsername.trim()) return

    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        username: tempUsername.trim(),
      })

      setUsername(tempUsername.trim())
      setIsEditingUsername(false)
      toast({
        title: "Username Updated",
        description: "Your username has been saved successfully",
      })
    } catch (error) {
      console.error("[v0] Error updating username:", error)
      toast({
        title: "Error",
        description: "Failed to update username",
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

  const currentContent = activeTab === "free" ? freeContent : premiumContent

  const onTrialOrSubscription = planData?.isActive || false

  return (
    <div className="min-h-screen bg-black fixed inset-0 overflow-y-auto">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900/40 via-black to-zinc-800/30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-zinc-900/20 via-transparent to-zinc-800/10 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        <OnboardingStepBanner stepId="customize_profile" />

        {user && <div className="absolute top-8 right-8"></div>}

        <div className="mb-8 sm:mb-16">
          <div className="flex items-start justify-between gap-8">
            <div className="flex items-center gap-8"></div>
          </div>
        </div>

        <div className="flex items-center gap-8 mb-12 text-sm"></div>

        <div className="mb-8">
          <div className="flex items-center gap-8 border-b border-zinc-800/50"></div>
        </div>

        <div className="pt-8"></div>
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
