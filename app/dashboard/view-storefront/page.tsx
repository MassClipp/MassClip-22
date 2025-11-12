"use client"
import type React from "react"
import { getDoc } from "firebase/firestore"
import { useState, useEffect, useRef } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Plus,
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
  ExternalLink,
  Lock,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import BundleCard from "@/components/bundle-card"
import { useOnboarding } from "@/hooks/use-onboarding"
import { UnlockButton } from "@/components/unlock-button"
import { BuilderModeBanner } from "@/components/builder-mode-banner"
import { StorefrontDesignPanel } from "@/components/storefront-design-panel"

interface ContentItem {
  id: string
  title: string
  thumbnailUrl: string
  fileUrl: string
  duration: string
  views: number
  type: "video" | "audio" | "image" | "bundle" | "ebook"
  isPremium: boolean
  price?: number
  contentCount?: number
  description?: string
  stripePriceId?: string
  stripeProductId?: string
  coverUrl?: string
  pageCount?: number
}

interface StorefrontTab {
  id: string
  type: string
  name: string
  enabled: boolean
  order: number
}

interface ExternalProduct {
  id: string
  tabId: string
  name: string
  description: string
  imageUrl: string
  ctaText: string
  ctaUrl: string
  order: number
  title?: string // Added title field
  externalUrl?: string // Added externalUrl field
  thumbnailUrl?: string // Added thumbnailUrl field
  price?: string // Assuming price is a string from API, adjust if number
}

const PRESET_THEMES = [
  { id: "default", name: "Default", primary: "#000000", accent: "#3b82f6" },
  { id: "crimson", name: "Crimson", primary: "#000000", accent: "#dc2626" },
  { id: "azure", name: "Azure", primary: "#000000", accent: "#0ea5e9" },
  { id: "emerald", name: "Emerald", primary: "#000000", accent: "#10b981" },
  { id: "violet", name: "Violet", primary: "#000000", accent: "#8b5cf6" },
  { id: "amber", name: "Amber", primary: "#000000", accent: "#f59e0b" },
  { id: "rose", name: "Rose", primary: "#000000", accent: "#f43f5e" },
  { id: "teal", name: "Teal", primary: "#000000", accent: "#14b8a6" },
  { id: "indigo", name: "Indigo", primary: "#000000", accent: "#6366f1" },
  { id: "lime", name: "Lime", primary: "#000000", accent: "#84cc16" },
]

export default function ViewStorefrontPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { isProUser, planData, loading: planLoading } = useUserPlan()
  const { toast } = useToast()
  const router = useRouter()
  const { completeStep } = useOnboarding()
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [profilePic, setProfilePic] = useState("")
  const [customDomain, setCustomDomain] = useState("")
  const [socialLinks, setSocialLinks] = useState<{
    instagram?: string
    twitter?: string
    website?: string
    youtube?: string
    tiktok?: string
    discord?: string
    twitch?: string
    shopify?: string
    skool?: string
    facebook?: string
    linkedin?: string
    github?: string
    spotify?: string
    appleMusic?: string
    email?: string
  }>({})
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [premiumContent, setPremiumContent] = useState<ContentItem[]>([])
  const [ebooksContent, setEbooksContent] = useState<ContentItem[]>([])
  const [activeTab, setActiveTab] = useState<"free" | "premium" | "ebooks" | string>("free")
  const [createdAt, setCreatedAt] = useState<string>("")

  const [storefrontTabs, setStorefrontTabs] = useState<StorefrontTab[]>([])
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([])

  // Editing states
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [isEditingSocials, setIsEditingSocials] = useState(false)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [tempBio, setTempBio] = useState("")
  const [tempUsername, setTempUsername] = useState("")
  const [tempSocials, setTempSocials] = useState<{
    instagram?: string
    twitter?: string
    website?: string
    youtube?: string
    tiktok?: string
    discord?: string
    twitch?: string
    shopify?: string
    skool?: string
    facebook?: string
    linkedin?: string
    github?: string
    spotify?: string
    appleMusic?: string
    email?: string
  }>({})
  const [storefrontActive, setStorefrontActive] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [trialEligible, setTrialEligible] = useState(false)

  // Add state for storefront design
  const [storefrontDesign, setStorefrontDesign] = useState<any>(null)

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

  const joinedDate = getMemberSince() // Calculate this once

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
          setTempUsername(userData.username || "")
          setDisplayName(userData.displayName || userData.username || "")
          setBio(userData.bio || "")
          setTempBio(userData.bio || "")
          setSocialLinks(userData.socialLinks || {})
          setTempSocials(userData.socialLinks || {})
          setProfilePic(userData.profilePic || userData.photoURL || "")
          setStorefrontActive(userData.storefrontActive ?? false)
          setCustomDomain(userData.customDomain || "")
          setStorefrontDesign(userData.storefrontDesign || null)

          // Handle createdAt timestamp
          if (userData.createdAt) {
            if (userData.createdAt.toDate) {
              setCreatedAt(userData.createdAt.toDate().toISOString())
            } else {
              setCreatedAt(userData.createdAt)
            }
          }

          console.log("[v0] Fetching storefront tabs for user:", user.uid)
          const tabsResponse = await fetch(`/api/storefront-tabs/${user.uid}`)
          if (tabsResponse.ok) {
            const tabsData = await tabsResponse.json()
            console.log("[v0] Storefront tabs data:", tabsData)
            setStorefrontTabs(tabsData.tabs || [])
            setExternalProducts(tabsData.externalProducts || [])
          } else {
            console.error("[v0] Failed to fetch storefront tabs:", await tabsResponse.text())
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

          const ebooksResponse = await fetch(`/api/creator/${user.uid}/published-ebooks`)
          if (ebooksResponse.ok) {
            const ebooksData = await ebooksResponse.json()
            setEbooksContent(ebooksData.content || [])
          }

          const token = await user.getIdToken()
          const trialResponse = await fetch("/api/user/trial-status", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (trialResponse.ok) {
            const trialData = await trialResponse.json()
            setTrialEligible(!trialData.hasUsedFreeTrial && !trialData.hasActiveCreatorVIP)
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

  const handleSaveUsername = async () => {
    if (!user) return

    // Validate username
    if (!tempUsername || tempUsername.trim().length === 0) {
      toast({
        title: "Invalid Username",
        description: "Username cannot be empty",
        variant: "destructive",
      })
      return
    }

    // Check if username contains only valid characters
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(tempUsername)) {
      toast({
        title: "Invalid Username",
        description: "Username can only contain letters, numbers, underscores, and hyphens",
        variant: "destructive",
      })
      return
    }

    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        username: tempUsername.toLowerCase(),
      })

      setUsername(tempUsername.toLowerCase())
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

  const handleToggleStorefront = async () => {
    if (!user) return

    const hasValidPlan =
      isProUser ||
      planData?.plan === "faceless_pro" ||
      planData?.plan === "facelessprenuer" ||
      planData?.plan?.includes("starter") ||
      planData?.status === "active"

    console.log("[v0] Toggle storefront check:", {
      isProUser,
      plan: planData?.plan,
      status: planData?.status,
      hasValidPlan,
      storefrontActive,
    })

    if (!hasValidPlan && !storefrontActive) {
      toast({
        title: "Upgrade Required",
        description: "You need a subscription to activate your storefront",
        variant: "destructive",
      })
      return
    }

    try {
      setUpdating(true)
      const newStatus = !storefrontActive

      await updateDoc(doc(db, "users", user.uid), {
        storefrontActive: newStatus,
        storefrontUpdatedAt: new Date(),
      })

      setStorefrontActive(newStatus)

      toast({
        title: newStatus ? "Storefront Live" : "Storefront Offline",
        description: newStatus
          ? "Your storefront is now live and visible to visitors"
          : "Your storefront has been taken offline",
      })
    } catch (error) {
      console.error("[v0] Error toggling storefront:", error)
      toast({
        title: "Error",
        description: "Failed to update storefront status",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleGoLiveClick = async () => {
    try {
      if (!user) return

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/checkout/pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.JSON.stringify({
          idToken,
          plan: "facelessprenuer",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("[v0] Error creating checkout session:", error)
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (authLoading || loading || planLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (!user || !username) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Profile Required</h2>
          <p className="text-zinc-400 mb-6">Please complete your profile to view your storefront.</p>
          <Button
            onClick={() => router.push("/dashboard/profile")}
            className="bg-white text-black hover:bg-zinc-100 font-medium"
          >
            Go to Profile Settings
          </Button>
        </div>
      </div>
    )
  }

  const currentContent = activeTab === "free" ? freeContent : activeTab === "premium" ? premiumContent : ebooksContent

  const getStorefrontUrl = (): string => {
    if (customDomain) {
      // If custom domain exists, use it
      return `https://${customDomain}`
    }
    // Otherwise fall back to username subdomain
    return username ? `/creator/${username}` : ""
  }

  const storefrontUrl = getStorefrontUrl()

  const visibleTabs = storefrontTabs.filter((tab) => tab.enabled).sort((a, b) => a.order - b.order)

  console.log("[v0] Visible tabs:", visibleTabs)

  const isFacelessProActive =
    planData?.plan === "faceless_pro" ||
    planData?.plan === "facelessprenuer" ||
    (planData?.status === "active" && isProUser)

  console.log("[v0] Faceless Pro status:", {
    isFacelessProActive,
    planData,
    isProUser,
  })

  const getStorefrontBackground = () => {
    if (!storefrontDesign) {
      return { background: "#000000" }
    }

    const preset =
      storefrontDesign.preset !== "custom" ? PRESET_THEMES.find((p) => p.id === storefrontDesign.preset) : null

    const primary = preset?.primary || storefrontDesign.customColors?.primary || "#000000"
    const accent = preset?.accent || storefrontDesign.customColors?.accent || "#3b82f6"

    return {
      background: `linear-gradient(135deg, ${primary} 0%, ${primary} 60%, ${accent}1a 100%)`,
    }
  }

  return (
    <>
      {/* Fixed positioning container for fullscreen effect */}
      <div className="fixed inset-0 overflow-auto" style={getStorefrontBackground()}>
        <div className="min-h-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {!isFacelessProActive && <BuilderModeBanner onUpgrade={handleGoLiveClick} />}

            {/* Hero Section */}
            <div className="relative">
              {/* Mobile Layout - Optimized spacing */}
              <div className="block sm:hidden">
                <div className="flex flex-col items-center text-center space-y-3 mb-4">
                  {/* Profile Picture - Smaller on mobile */}
                  <div className="relative group">
                    <Avatar
                      className="w-20 h-20 border-2 border-white/20 cursor-pointer"
                      onClick={() => router.push("/dashboard/profile")}
                    >
                      <AvatarImage src={profilePic || "/placeholder.svg"} alt={displayName} className="object-cover" />
                      <AvatarFallback className="bg-zinc-900 text-white text-xl font-medium border-2 border-white/20">
                        {displayName?.charAt(0)?.toUpperCase() || username?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => router.push("/dashboard/profile")}
                    >
                      <Edit2 className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Name and Username - Smaller text */}
                  <div className="space-y-0.5">
                    <h1 className="text-xl font-light text-white tracking-tight">{displayName || username}</h1>
                    {isEditingUsername ? (
                      <div className="flex items-center gap-2 justify-center">
                        <span className="text-zinc-500 text-xs">@</span>
                        <Input
                          value={tempUsername}
                          onChange={(e) => setTempUsername(e.target.value)}
                          placeholder="username"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7 w-32"
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveUsername}
                          className="bg-white text-black hover:bg-zinc-100 h-7 px-2 text-xs"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsEditingUsername(false)
                            setTempUsername(username || "")
                          }}
                          className="text-zinc-400 hover:text-white h-7 px-2 text-xs"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="group/username cursor-pointer flex items-center gap-1 justify-center"
                        onClick={() => {
                          setTempUsername(username || "")
                          setIsEditingUsername(true)
                        }}
                      >
                        <p className="text-zinc-500 text-xs font-mono group-hover/username:text-zinc-400 transition-colors">
                          @{username}
                        </p>
                        <Edit2 className="w-3 h-3 text-zinc-600 opacity-0 group-hover/username:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Bio - Smaller text and reduced padding */}
                  {isEditingBio ? (
                    <div className="space-y-2 w-full max-w-sm px-4">
                      <Textarea
                        value={tempBio}
                        onChange={(e) => setTempBio(e.target.value)}
                        placeholder="Write your bio..."
                        className="bg-zinc-900/50 border-zinc-700 text-white text-xs resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={handleSaveBio}
                          className="bg-white text-black hover:bg-zinc-100 h-8 px-3 text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsEditingBio(false)
                            setTempBio(bio)
                          }}
                          className="text-zinc-400 hover:text-white h-8 px-3 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="group cursor-pointer w-full max-w-sm px-4"
                      onClick={() => {
                        setTempBio(bio)
                        setIsEditingBio(true)
                      }}
                    >
                      {bio ? (
                        <p className="text-zinc-400 text-xs leading-relaxed group-hover:text-zinc-300 transition-colors">
                          {bio}
                        </p>
                      ) : (
                        <p className="text-zinc-600 text-xs leading-relaxed group-hover:text-zinc-500 transition-colors italic">
                          Click to add a bio
                        </p>
                      )}
                      <Edit2 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1 mx-auto" />
                    </div>
                  )}

                  {/* Links Section - Smaller buttons */}
                  <div className="w-full max-w-sm space-y-2 px-4">
                    <h3 className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider text-center">
                      Links
                    </h3>

                    {isEditingSocials ? (
                      <div className="space-y-2">
                        <Input
                          value={tempSocials.instagram || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, instagram: e.target.value })}
                          placeholder="Instagram username"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.twitter || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, twitter: e.target.value })}
                          placeholder="Twitter/X username"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.tiktok || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, tiktok: e.target.value })}
                          placeholder="TikTok username"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.youtube || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, youtube: e.target.value })}
                          placeholder="YouTube channel URL"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.twitch || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, twitch: e.target.value })}
                          placeholder="Twitch username"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.discord || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, discord: e.target.value })}
                          placeholder="Discord invite link"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.skool || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, skool: e.target.value })}
                          placeholder="Skool community URL"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.shopify || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, shopify: e.target.value })}
                          placeholder="Shopify store URL"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.facebook || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, facebook: e.target.value })}
                          placeholder="Facebook profile/page"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.linkedin || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, linkedin: e.target.value })}
                          placeholder="LinkedIn profile URL"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.github || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, github: e.target.value })}
                          placeholder="GitHub username"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.spotify || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, spotify: e.target.value })}
                          placeholder="Spotify artist URL"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.appleMusic || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, appleMusic: e.target.value })}
                          placeholder="Apple Music URL"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.email || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, email: e.target.value })}
                          placeholder="Contact email"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <Input
                          value={tempSocials.website || ""}
                          onChange={(e) => setTempSocials({ ...tempSocials, website: e.target.value })}
                          placeholder="Website URL"
                          className="bg-zinc-900/50 border-zinc-700 text-white text-xs h-7"
                        />
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={handleSaveSocials}
                            className="bg-white text-black hover:bg-zinc-100 h-8 px-3 text-xs"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsEditingSocials(false)
                              setTempSocials(socialLinks)
                            }}
                            className="text-zinc-400 hover:text-white h-8 px-3 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center flex-wrap">
                        {socialLinks.instagram && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(`https://instagram.com/${socialLinks.instagram}`, "_blank")}
                          >
                            Instagram
                          </Button>
                        )}
                        {socialLinks.twitter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(`https://twitter.com/${socialLinks.twitter}`, "_blank")}
                          >
                            Twitter
                          </Button>
                        )}
                        {socialLinks.tiktok && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(`https://tiktok.com/@${socialLinks.tiktok}`, "_blank")}
                          >
                            TikTok
                          </Button>
                        )}
                        {socialLinks.youtube && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.youtube, "_blank")}
                          >
                            YouTube
                          </Button>
                        )}
                        {socialLinks.twitch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(`https://twitch.tv/${socialLinks.twitch}`, "_blank")}
                          >
                            Twitch
                          </Button>
                        )}
                        {socialLinks.discord && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.discord, "_blank")}
                          >
                            Discord
                          </Button>
                        )}
                        {socialLinks.skool && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.skool, "_blank")}
                          >
                            Skool
                          </Button>
                        )}
                        {socialLinks.shopify && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.shopify, "_blank")}
                          >
                            Shopify
                          </Button>
                        )}
                        {socialLinks.facebook && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.facebook, "_blank")}
                          >
                            Facebook
                          </Button>
                        )}
                        {socialLinks.linkedin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.linkedin, "_blank")}
                          >
                            LinkedIn
                          </Button>
                        )}
                        {socialLinks.github && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(`https://github.com/${socialLinks.github}`, "_blank")}
                          >
                            GitHub
                          </Button>
                        )}
                        {socialLinks.spotify && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.spotify, "_blank")}
                          >
                            Spotify
                          </Button>
                        )}
                        {socialLinks.appleMusic && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.appleMusic, "_blank")}
                          >
                            Apple Music
                          </Button>
                        )}
                        {socialLinks.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(`mailto:${socialLinks.email}`, "_blank")}
                          >
                            Email
                          </Button>
                        )}
                        {socialLinks.website && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                            onClick={() => window.open(socialLinks.website, "_blank")}
                          >
                            Website
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-2 py-1 text-[10px] h-auto"
                          onClick={() => {
                            setTempSocials(socialLinks)
                            setIsEditingSocials(true)
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Layout - Unchanged */}
              <div className="hidden sm:flex items-start justify-between">
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
                      {isEditingUsername ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-zinc-500 text-sm">@</span>
                          <Input
                            value={tempUsername}
                            onChange={(e) => setTempUsername(e.target.value)}
                            placeholder="username"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm h-7 w-48"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveUsername}
                            className="bg-white text-black hover:bg-zinc-100 h-7 px-2"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsEditingUsername(false)
                              setTempUsername(username || "")
                            }}
                            className="text-zinc-400 hover:text-white h-7 px-2"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="group/username cursor-pointer flex items-center gap-1"
                          onClick={() => {
                            setTempUsername(username || "")
                            setIsEditingUsername(true)
                          }}
                        >
                          <p className="text-zinc-500 text-sm font-mono group-hover/username:text-zinc-400 transition-colors">
                            @{username}
                          </p>
                          <Edit2 className="w-3 h-3 text-zinc-600 opacity-0 group-hover/username:opacity-100 transition-opacity" />
                        </div>
                      )}
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

                    {/* Links Section */}
                    <div className="space-y-2">
                      <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Links</h3>

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
                            placeholder="Twitter/X username"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.tiktok || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, tiktok: e.target.value })}
                            placeholder="TikTok username"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.youtube || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, youtube: e.target.value })}
                            placeholder="YouTube channel URL"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.twitch || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, twitch: e.target.value })}
                            placeholder="Twitch username"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.discord || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, discord: e.target.value })}
                            placeholder="Discord invite link"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.skool || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, skool: e.target.value })}
                            placeholder="Skool community URL"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.shopify || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, shopify: e.target.value })}
                            placeholder="Shopify store URL"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.facebook || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, facebook: e.target.value })}
                            placeholder="Facebook profile/page"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.linkedin || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, linkedin: e.target.value })}
                            placeholder="LinkedIn profile URL"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.github || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, github: e.target.value })}
                            placeholder="GitHub username"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.spotify || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, spotify: e.target.value })}
                            placeholder="Spotify artist URL"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.appleMusic || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, appleMusic: e.target.value })}
                            placeholder="Apple Music URL"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.email || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, email: e.target.value })}
                            placeholder="Contact email"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <Input
                            value={tempSocials.website || ""}
                            onChange={(e) => setTempSocials({ ...tempSocials, website: e.target.value })}
                            placeholder="Website URL"
                            className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveSocials}
                              className="bg-white text-black hover:bg-zinc-100"
                            >
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
                        <div className="flex gap-2 flex-wrap">
                          {socialLinks.instagram && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(`https://instagram.com/${socialLinks.instagram}`, "_blank")}
                            >
                              Instagram
                            </Button>
                          )}
                          {socialLinks.twitter && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(`https://twitter.com/${socialLinks.twitter}`, "_blank")}
                            >
                              Twitter
                            </Button>
                          )}
                          {socialLinks.tiktok && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(`https://tiktok.com/@${socialLinks.tiktok}`, "_blank")}
                            >
                              TikTok
                            </Button>
                          )}
                          {socialLinks.youtube && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.youtube, "_blank")}
                            >
                              YouTube
                            </Button>
                          )}
                          {socialLinks.twitch && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(`https://twitch.tv/${socialLinks.twitch}`, "_blank")}
                            >
                              Twitch
                            </Button>
                          )}
                          {socialLinks.discord && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.discord, "_blank")}
                            >
                              Discord
                            </Button>
                          )}
                          {socialLinks.skool && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.skool, "_blank")}
                            >
                              Skool
                            </Button>
                          )}
                          {socialLinks.shopify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.shopify, "_blank")}
                            >
                              Shopify
                            </Button>
                          )}
                          {socialLinks.facebook && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.facebook, "_blank")}
                            >
                              Facebook
                            </Button>
                          )}
                          {socialLinks.linkedin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.linkedin, "_blank")}
                            >
                              LinkedIn
                            </Button>
                          )}
                          {socialLinks.github && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(`https://github.com/${socialLinks.github}`, "_blank")}
                            >
                              GitHub
                            </Button>
                          )}
                          {socialLinks.spotify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.spotify, "_blank")}
                            >
                              Spotify
                            </Button>
                          )}
                          {socialLinks.appleMusic && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.appleMusic, "_blank")}
                            >
                              Apple Music
                            </Button>
                          )}
                          {socialLinks.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(`mailto:${socialLinks.email}`, "_blank")}
                            >
                              Email
                            </Button>
                          )}
                          {socialLinks.website && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
                              onClick={() => window.open(socialLinks.website, "_blank")}
                            >
                              Website
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full px-3 py-1.5 h-auto"
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
            </div>

            {/* Stats Bar with Compact Mobile Layout */}
            <div className="flex flex-col items-center sm:items-start sm:flex-row sm:justify-between gap-3 sm:gap-4 py-3 sm:py-4 border-y border-zinc-800/50 mt-4 sm:mt-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Joined {joinedDate || "Recently"}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">{freeContent.length} free</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500">
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">{premiumContent.length} premium</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">{ebooksContent.length} eBooks</span>
                </div>
              </div>

              <div className="flex flex-col items-center sm:items-end gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Action buttons row - Compact on mobile */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <StorefrontDesignPanel
                    userId={user.uid}
                    userPlan={
                      planData?.plan === "faceless_pro"
                        ? "faceless_pro"
                        : planData?.plan === "facelessprenuer"
                          ? "facelessprenuer"
                          : planData?.plan === "starter"
                            ? "starter"
                            : "free"
                    }
                    currentDesign={storefrontDesign}
                    onSave={async () => {
                      const userDocRef = doc(db, "users", user.uid)
                      const userDocSnap = await getDoc(userDocRef)
                      if (userDocSnap.exists()) {
                        setStorefrontDesign(userDocSnap.data().storefrontDesign || null)
                      }
                    }}
                  />

                  {storefrontUrl && (
                    <Button
                      onClick={() => window.open(storefrontUrl, "_blank")}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">
                        {storefrontActive ? "View Live Storefront" : "Preview Storefront"}
                      </span>
                      <span className="sm:hidden">Preview</span>
                    </Button>
                  )}
                </div>

                {/* Status toggle - More compact on mobile */}
                <div className="flex items-center gap-2 sm:gap-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg px-3 sm:px-4 py-2 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] sm:text-xs font-medium text-white">
                      {!isFacelessProActive ? "Builder Mode" : "Storefront Status"}
                    </span>
                    {!isFacelessProActive && (
                      <span className="text-[9px] sm:text-[10px] text-cyan-400 mt-0.5 flex items-center gap-1">
                        <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                        Upgrade to go live
                      </span>
                    )}
                  </div>

                  <Switch
                    checked={storefrontActive}
                    onCheckedChange={handleToggleStorefront}
                    disabled={!isFacelessProActive || updating}
                    className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-700 scale-90 sm:scale-100"
                  />

                  {storefrontActive ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] sm:text-xs">
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-zinc-700 text-zinc-300 text-[10px] sm:text-xs">
                      {!isFacelessProActive ? "Preview" : "Offline"}
                    </Badge>
                  )}
                </div>

                {!isFacelessProActive && (
                  <Button
                    onClick={handleGoLiveClick}
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 font-medium w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                  >
                    Go Live Now
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs - Smaller on mobile */}
            <div className="space-y-2 sm:space-y-0 mt-4 sm:mt-0">
              <div className="flex justify-end sm:hidden">
                <Button
                  onClick={() => router.push("/dashboard/storefront-tabs")}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 text-[10px] h-7 px-2"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Manage Tabs
                </Button>
              </div>

              <div className="flex items-center justify-between border-b border-zinc-800/50">
                <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto scrollbar-hide pb-2 sm:pb-0">
                  {freeContent.length > 0 && (
                    <button
                      onClick={() => setActiveTab("free")}
                      className={`pb-2 sm:pb-4 text-[11px] sm:text-sm font-medium transition-all duration-200 relative whitespace-nowrap ${
                        activeTab === "free" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      Free Content
                      {activeTab === "free" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
                    </button>
                  )}

                  {premiumContent.length > 0 && (
                    <button
                      onClick={() => setActiveTab("premium")}
                      className={`pb-2 sm:pb-4 text-[11px] sm:text-sm font-medium transition-all duration-200 relative whitespace-nowrap ${
                        activeTab === "premium" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      Premium Content
                      {activeTab === "premium" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
                    </button>
                  )}

                  {ebooksContent.length > 0 && (
                    <button
                      onClick={() => setActiveTab("ebooks")}
                      className={`pb-2 sm:pb-4 text-[11px] sm:text-sm font-medium transition-all duration-200 relative whitespace-nowrap ${
                        activeTab === "ebooks" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      eBooks
                      {activeTab === "ebooks" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
                    </button>
                  )}

                  {visibleTabs
                    .filter((tab) => !["free_content", "premium_content", "ebooks"].includes(tab.type))
                    .map((tab) => {
                      const tabProducts = externalProducts.filter((p) => p.tabId === tab.id)
                      const tabType = tab.type as "free" | "premium" | "ebooks" | string

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tabType)}
                          className={`pb-2 sm:pb-4 text-[11px] sm:text-sm font-medium transition-all duration-200 relative whitespace-nowrap ${
                            activeTab === tabType ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                          }`}
                        >
                          {tab.name}
                          {activeTab === tabType && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
                        </button>
                      )
                    })}
                </div>

                <Button
                  onClick={() => router.push("/dashboard/storefront-tabs")}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 hidden sm:flex text-xs sm:text-sm"
                >
                  <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Manage Tabs
                </Button>
              </div>
            </div>

            {/* Content with action buttons */}
            <div className="pt-3 sm:pt-8">
              {storefrontTabs.find(
                (t) => t.type === activeTab && !["free_content", "premium_content", "ebooks"].includes(t.type),
              ) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {externalProducts
                    .filter((p) => p.tabId === storefrontTabs.find((t) => t.type === activeTab)?.id)
                    .sort((a, b) => a.order - b.order)
                    .map((product) => (
                      <div
                        key={product.id}
                        className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700/30 hover:border-zinc-600/40 transition-all duration-300 w-full relative group"
                      >
                        {(product.imageUrl || product.thumbnailUrl) && (
                          <div className="relative aspect-square bg-zinc-800 overflow-hidden">
                            <img
                              src={product.imageUrl || product.thumbnailUrl || "/placeholder.svg"}
                              alt={product.name || product.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        )}

                        <div className="p-4 sm:p-5 space-y-3 bg-gradient-to-br from-black via-black to-zinc-800/30 relative">
                          <div className="space-y-2">
                            <h3 className="text-white text-lg sm:text-xl font-semibold line-clamp-2 leading-tight">
                              {product.title || product.name}
                            </h3>
                            {product.description && (
                              <p className="text-zinc-400 text-sm sm:text-base line-clamp-3 leading-relaxed">
                                {product.description}
                              </p>
                            )}
                          </div>

                          <div className="space-y-3 pt-2">
                            {product.price && (
                              <div className="flex items-center justify-between">
                                <span className="text-white text-2xl sm:text-3xl font-light tracking-tight">
                                  ${product.price}
                                </span>
                              </div>
                            )}

                            <Button
                              onClick={() => window.open(product.ctaUrl || product.externalUrl, "_blank")}
                              className="w-full bg-white text-black hover:bg-zinc-100 rounded-md font-medium text-sm px-4 py-2.5"
                            >
                              {product.ctaText || "Shop Now"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : currentContent.length > 0 ? (
                <div className="space-y-6">
                  <div
                    className={
                      activeTab === "premium" || activeTab === "ebooks"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center"
                    }
                  >
                    {(activeTab === "premium" || activeTab === "ebooks") && (
                      <div
                        className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 group"
                        onClick={() =>
                          router.push(activeTab === "ebooks" ? "/dashboard/ebooks/create" : "/dashboard/bundles")
                        }
                      >
                        <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors flex items-center justify-center">
                          <Package className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                        </div>
                        <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium">
                          {activeTab === "ebooks" ? "Create eBook" : "Create Bundle"}
                        </p>
                      </div>
                    )}

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
                      : activeTab === "ebooks"
                        ? ebooksContent.map((item) => <EBookCard key={item.id} item={item} username={username} />)
                        : freeContent.map((item) => <VideoContentCard key={item.id} item={item} />)}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 sm:py-24">
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-zinc-900 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer flex items-center justify-center group"
                    onClick={() =>
                      router.push(
                        activeTab === "free"
                          ? "/dashboard/free-content"
                          : activeTab === "ebooks"
                            ? "/dashboard/ebooks/create"
                            : "/dashboard/bundles",
                      )
                    }
                  >
                    {activeTab === "premium" || activeTab === "ebooks" ? (
                      <Package className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    ) : (
                      <Play className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-white mb-2">No {activeTab} content yet</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mb-6">
                    {activeTab === "free"
                      ? "Upload your first piece of content"
                      : activeTab === "ebooks"
                        ? "Create your first eBook"
                        : "Create your first bundle"}
                  </p>
                  <Button
                    onClick={() =>
                      router.push(
                        activeTab === "free"
                          ? "/dashboard/free-content"
                          : activeTab === "ebooks"
                            ? "/dashboard/ebooks/create"
                            : "/dashboard/bundles",
                      )
                    }
                    className="bg-white text-black hover:bg-zinc-100 font-medium"
                  >
                    {activeTab === "free" ? (
                      <>
                        <UploadIcon className="w-4 h-4 mr-2" />
                        Upload Content
                      </>
                    ) : activeTab === "ebooks" ? (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Create eBook
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
      </div>
    </>
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
            className="transition-transform duration-300 hover:scale-110 disabled:opacity-50"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 md:h-6 md:w-6 text-white drop-shadow-lg" strokeWidth={1} />
            ) : (
              <Play className="h-8 w-8 md:h-6 md:w-6 text-white drop-shadow-lg" strokeWidth={1} />
            )}
          </button>
        </div>

        {item.fileUrl && (
          <button
            className={`absolute bottom-2 right-2 backdrop-blur-sm p-1 sm:p-1.5 rounded-full transition-all duration-200 hover:scale-110 bg-black/60 hover:bg-black/80 ${
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

function EBookCard({ item, username }: { item: ContentItem; username: string | null }) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const { user } = useFirebaseAuth()

  const handleClick = () => {
    if (username) {
      router.push(`/creator/${username}/ebook/${item.id}`)
    }
  }

  const formatPrice = (price: number | undefined | null): string => {
    if (typeof price === "number" && !isNaN(price) && isFinite(price)) {
      return (price / 100).toFixed(2)
    }
    return "0.00"
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700/30 hover:border-zinc-600/40 transition-all duration-300 w-full max-w-[340px] sm:max-w-[320px] relative cursor-pointer group"
    >
      {/* Cover Image Section */}
      <div className="relative aspect-square bg-zinc-800 overflow-hidden">
        {item.coverUrl || item.thumbnailUrl ? (
          <img
            src={item.coverUrl || item.thumbnailUrl}
            alt={item.title}
            className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? "scale-110" : "scale-100"}`}
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-600" />
          </div>
        )}

        {/* Page Count Badge */}
        {item.pageCount && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/90 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">
            <span className="text-xs sm:text-sm text-white font-medium">
              {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-5 space-y-3 bg-gradient-to-br from-black via-black to-zinc-800/30 relative">
        <div className="space-y-2">
          <h3 className="text-white text-lg sm:text-xl font-semibold line-clamp-2 leading-tight" title={item.title}>
            {item.title}
          </h3>
          {item.description && (
            <p className="text-zinc-400 text-sm sm:text-base line-clamp-2 leading-relaxed">{item.description}</p>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-2xl sm:text-3xl font-light tracking-tight">
              ${formatPrice(item.price)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (username) {
                  router.push(`/creator/${username}/ebook/${item.id}`)
                }
              }}
              className="flex-1 border border-white/20 text-white hover:bg-white/5 rounded-md font-medium text-sm px-4 py-2.5 transition-colors"
            >
              See Details
            </button>
            <UnlockButton
              ebookId={item.id}
              price={item.price || 0}
              title={item.title}
              stripePriceId={item.stripePriceId}
              user={user}
              creatorId={user?.uid}
              variant="default"
              className="flex-1 bg-white text-black hover:bg-zinc-100 rounded-md font-medium text-sm px-4 py-2.5 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
