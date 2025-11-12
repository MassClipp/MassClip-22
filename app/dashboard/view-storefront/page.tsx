"use client"
import { getDoc } from "firebase/firestore"
import { useState, useEffect } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, Edit2, Check, X, Plus, Paintbrush, ExternalLink, Lock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useOnboarding } from "@/hooks/use-onboarding"
import { BuilderModeBanner } from "@/components/builder-mode-banner"
import { applyThemeToStyles, type StorefrontTheme } from "@/lib/storefront-themes"
import { StorefrontThemeSelector } from "@/components/storefront-theme-selector"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { VideoContentCard } from "@/components/video-content-card"
import { EBookCard } from "@/components/ebook-card"

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

  const [showThemePanel, setShowThemePanel] = useState(false)
  const [storefrontTheme, setStorefrontTheme] = useState<StorefrontTheme>({
    primaryColor: "#000000",
    accentGradient: ["#000000", "#0a0a0a"],
    preset: "default",
  })
  const [savingTheme, setSavingTheme] = useState(false)

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

          // Handle createdAt timestamp
          if (userData.createdAt) {
            if (userData.createdAt.toDate) {
              setCreatedAt(userData.createdAt.toDate().toISOString())
            } else {
              setCreatedAt(userData.createdAt)
            }
          }

          if (userData.storefrontTheme) {
            setStorefrontTheme(userData.storefrontTheme)
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

  const handleSaveTheme = async (theme: StorefrontTheme) => {
    if (!user) return

    try {
      setSavingTheme(true)
      const userDocRef = doc(db, "users", user.uid)

      await updateDoc(userDocRef, {
        storefrontTheme: theme,
        storefrontThemeUpdatedAt: new Date(),
      })

      setStorefrontTheme(theme)

      toast({
        title: "Theme Updated",
        description: "Your storefront design has been saved successfully",
      })
    } catch (error) {
      console.error("[v0] Error saving theme:", error)
      toast({
        title: "Error",
        description: "Failed to save theme",
        variant: "destructive",
      })
    } finally {
      setSavingTheme(false)
    }
  }

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
        body: JSON.stringify({
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

  const isFacelessprenuer =
    planData?.plan === "facelessprenuer" || (planData?.status === "active" && planData?.plan === "facelessprenuer")

  console.log("[v0] Faceless Pro status:", {
    isFacelessProActive,
    planData,
    isProUser,
  })

  return (
    <div className="min-h-screen pb-24" style={applyThemeToStyles(storefrontTheme)}>
      {!isFacelessProActive && <BuilderModeBanner onUpgrade={handleGoLiveClick} />}

      {/* Hero Section */}
      <div className="relative">
        {/* Mobile Layout - Centered Tree */}
        <div className="block sm:hidden">
          <div className="flex flex-col items-center text-center space-y-4 mb-6">
            {/* Profile Picture */}
            <div className="relative group">
              <Avatar
                className="w-24 h-24 border-2 border-white/20 cursor-pointer"
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
                <Edit2 className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Name and Username */}
            <div className="space-y-1">
              <h1 className="text-2xl font-light text-white tracking-tight">{displayName || username}</h1>
              {isEditingUsername ? (
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-zinc-500 text-sm">@</span>
                  <Input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm h-7 w-32"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveUsername}
                    className="bg-white text-black hover:bg-zinc-100 font-medium"
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
                  className="group/username cursor-pointer flex items-center gap-1 justify-center"
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

            {/* Bio */}
            {isEditingBio ? (
              <div className="space-y-2 w-full max-w-sm">
                <Textarea
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  placeholder="Write your bio..."
                  className="bg-zinc-900/50 border-zinc-700 text-white text-sm resize-none"
                  rows={3}
                />
                <div className="flex gap-2 justify-center">
                  <Button size="sm" onClick={handleSaveBio} className="bg-white text-black hover:bg-zinc-100 h-7 px-2">
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
                    className="text-zinc-400 hover:text-white h-7 px-2"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="group cursor-pointer w-full max-w-sm"
                onClick={() => {
                  setTempBio(bio)
                  setIsEditingBio(true)
                }}
              >
                {bio ? (
                  <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300 transition-colors">
                    {bio}
                  </p>
                ) : (
                  <p className="text-zinc-600 text-sm leading-relaxed group-hover:text-zinc-500 transition-colors italic">
                    Click to add a bio
                  </p>
                )}
                <Edit2 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1 mx-auto" />
              </div>
            )}

            {/* Links Section */}
            <div className="w-full max-w-sm space-y-3">
              <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider text-center">Links</h3>

              {isEditingSocials ? (
                <div className="space-y-2">
                  <Input
                    value={tempSocials.instagram || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, instagram: e.target.value })}
                    placeholder="Instagram username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.twitter || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, twitter: e.target.value })}
                    placeholder="Twitter/X username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.tiktok || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, tiktok: e.target.value })}
                    placeholder="TikTok username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.youtube || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, youtube: e.target.value })}
                    placeholder="YouTube channel URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.twitch || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, twitch: e.target.value })}
                    placeholder="Twitch username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.discord || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, discord: e.target.value })}
                    placeholder="Discord invite link"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.skool || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, skool: e.target.value })}
                    placeholder="Skool community URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.shopify || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, shopify: e.target.value })}
                    placeholder="Shopify store URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.facebook || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, facebook: e.target.value })}
                    placeholder="Facebook profile/page"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.linkedin || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, linkedin: e.target.value })}
                    placeholder="LinkedIn profile URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.github || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, github: e.target.value })}
                    placeholder="GitHub username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.spotify || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, spotify: e.target.value })}
                    placeholder="Spotify artist URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.appleMusic || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, appleMusic: e.target.value })}
                    placeholder="Apple Music URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.email || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, email: e.target.value })}
                    placeholder="Contact email"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.website || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, website: e.target.value })}
                    placeholder="Website URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <div className="flex gap-2 justify-center">
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
                <div className="flex gap-2 justify-center flex-wrap">
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

        {/* Desktop Layout */}
        <div className="hidden sm:block">
          <div className="flex items-center justify-between px-4 py-6 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg">
            {/* Profile Picture */}
            <div className="relative group">
              <Avatar
                className="w-24 h-24 border-2 border-white/20 cursor-pointer"
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
                <Edit2 className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Name and Username */}
            <div className="space-y-1">
              <h1 className="text-2xl font-light text-white tracking-tight">{displayName || username}</h1>
              {isEditingUsername ? (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">@</span>
                  <Input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm h-7 w-32"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveUsername}
                    className="bg-white text-black hover:bg-zinc-100 font-medium"
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

            {/* Bio */}
            {isEditingBio ? (
              <div className="space-y-2 w-full max-w-sm">
                <Textarea
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  placeholder="Write your bio..."
                  className="bg-zinc-900/50 border-zinc-700 text-white text-sm resize-none"
                  rows={3}
                />
                <div className="flex gap-2 justify-center">
                  <Button size="sm" onClick={handleSaveBio} className="bg-white text-black hover:bg-zinc-100 h-7 px-2">
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
                    className="text-zinc-400 hover:text-white h-7 px-2"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="group cursor-pointer w-full max-w-sm"
                onClick={() => {
                  setTempBio(bio)
                  setIsEditingBio(true)
                }}
              >
                {bio ? (
                  <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300 transition-colors">
                    {bio}
                  </p>
                ) : (
                  <p className="text-zinc-600 text-sm leading-relaxed group-hover:text-zinc-500 transition-colors italic">
                    Click to add a bio
                  </p>
                )}
                <Edit2 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            )}

            {/* Links Section */}
            <div className="w-full max-w-sm space-y-3">
              <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Links</h3>

              {isEditingSocials ? (
                <div className="space-y-2">
                  <Input
                    value={tempSocials.instagram || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, instagram: e.target.value })}
                    placeholder="Instagram username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.twitter || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, twitter: e.target.value })}
                    placeholder="Twitter/X username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.tiktok || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, tiktok: e.target.value })}
                    placeholder="TikTok username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.youtube || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, youtube: e.target.value })}
                    placeholder="YouTube channel URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.twitch || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, twitch: e.target.value })}
                    placeholder="Twitch username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.discord || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, discord: e.target.value })}
                    placeholder="Discord invite link"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.skool || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, skool: e.target.value })}
                    placeholder="Skool community URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.shopify || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, shopify: e.target.value })}
                    placeholder="Shopify store URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.facebook || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, facebook: e.target.value })}
                    placeholder="Facebook profile/page"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.linkedin || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, linkedin: e.target.value })}
                    placeholder="LinkedIn profile URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.github || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, github: e.target.value })}
                    placeholder="GitHub username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.spotify || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, spotify: e.target.value })}
                    placeholder="Spotify artist URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.appleMusic || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, appleMusic: e.target.value })}
                    placeholder="Apple Music URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.email || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, email: e.target.value })}
                    placeholder="Contact email"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.website || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, website: e.target.value })}
                    placeholder="Website URL"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <div className="flex gap-2 justify-center">
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
                <div className="flex gap-2 justify-center flex-wrap">
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

      {/* Storefront Controls */}
      <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
        {isFacelessProActive && (
          <Button
            onClick={() => setShowThemePanel(!showThemePanel)}
            variant="outline"
            size="sm"
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white w-full sm:w-auto"
          >
            <Paintbrush className="w-4 h-4 mr-2" />
            Customize Design
          </Button>
        )}

        {storefrontUrl && (
          <Button
            onClick={() => window.open(storefrontUrl, "_blank")}
            variant="outline"
            size="sm"
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white w-full sm:w-auto"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {storefrontActive ? "View Live Storefront" : "Preview Storefront"}
          </Button>
        )}

        <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg px-4 py-2.5 w-full sm:w-auto justify-center sm:justify-start">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-white">
              {!isFacelessProActive ? "Builder Mode" : "Storefront Status"}
            </span>
            {!isFacelessProActive && (
              <span className="text-[10px] text-cyan-400 mt-0.5 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Upgrade to go live
              </span>
            )}
          </div>

          <Switch
            checked={storefrontActive}
            onCheckedChange={handleToggleStorefront}
            disabled={!isFacelessProActive || updating}
            className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-700"
          />

          {storefrontActive ? (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Live</Badge>
          ) : (
            <Badge variant="secondary" className="bg-zinc-700 text-zinc-300 text-xs">
              {!isFacelessProActive ? "Preview" : "Offline"}
            </Badge>
          )}
        </div>

        {!isFacelessProActive && (
          <Button
            onClick={handleGoLiveClick}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 font-medium w-full sm:w-auto"
          >
            Go Live Now
          </Button>
        )}
      </div>

      {/* Theme Customization Panel */}
      {showThemePanel && isFacelessProActive && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Customize Storefront Design</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowThemePanel(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              <StorefrontThemeSelector
                currentTheme={storefrontTheme}
                onThemeChange={handleSaveTheme}
                canCustomize={isFacelessprenuer}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {currentContent.map((item) =>
          item.type === "video" ? (
            <VideoContentCard key={item.id} item={item} />
          ) : item.type === "ebook" ? (
            <EBookCard key={item.id} item={item} username={username} />
          ) : (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-white text-sm sm:text-base font-medium">{item.title}</h3>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">{item.description}</p>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
