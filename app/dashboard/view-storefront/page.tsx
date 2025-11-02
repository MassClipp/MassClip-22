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
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import BundleCard from "@/components/bundle-card"
import { useOnboarding } from "@/hooks/use-onboarding"
import { OnboardingIndicator } from "@/components/onboarding-indicator"

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
  const [socialLinks, setSocialLinks] = useState<{
    instagram?: string
    twitter?: string
    website?: string
  }>({})
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [premiumContent, setPremiumContent] = useState<ContentItem[]>([])
  const [ebooksContent, setEbooksContent] = useState<ContentItem[]>([])
  const [activeTab, setActiveTab] = useState<"free" | "premium" | "ebooks">("free")
  const [createdAt, setCreatedAt] = useState<string>("")

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
  }>({})
  const [storefrontActive, setStorefrontActive] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [trialEligible, setTrialEligible] = useState(false)

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

    if (!isProUser && !storefrontActive && !planData?.plan?.includes("starter")) {
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
        body: JSON.JSONstringify({
          idToken,
          plan: "creator_vip",
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

  return (
    <div className="min-h-screen bg-black fixed inset-0 overflow-y-auto">
      <OnboardingIndicator />
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900/40 via-black to-zinc-800/30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-zinc-900/20 via-transparent to-zinc-800/10 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        <div className="mb-8 sm:mb-16">
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
                    <Button
                      size="sm"
                      onClick={handleSaveBio}
                      className="bg-white text-black hover:bg-zinc-100 h-7 px-2"
                    >
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

              {/* Social Links */}
              {isEditingSocials ? (
                <div className="space-y-2 w-full max-w-xs">
                  <Input
                    value={tempSocials.instagram || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, instagram: e.target.value })}
                    placeholder="Instagram username"
                    className="bg-zinc-900/50 border-zinc-700 text-white text-sm"
                  />
                  <Input
                    value={tempSocials.twitter || ""}
                    onChange={(e) => setTempSocials({ ...tempSocials, twitter: e.target.value })}
                    placeholder="Twitter username"
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
                <div className="flex gap-2 justify-center">
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

          {/* Desktop Layout - Horizontal */}
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

          <div className="mb-8 sm:mb-12">
            {/* Stats Row */}
            <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-8 mb-6 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-zinc-500">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Member since {getMemberSince()}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{freeContent.length} free</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{premiumContent.length} premium</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{ebooksContent.length} eBooks</span>
              </div>
            </div>

            {/* Go Live Controls - Centered on mobile, right-aligned on desktop */}
            <div className="flex flex-col items-center sm:items-end gap-3">
              {username && (
                <Button
                  onClick={() => window.open(`/creator/${username}`, "_blank")}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white mb-2"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Storefront
                </Button>
              )}
              <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg px-4 py-2.5">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium text-white">Go Live</span>
                  {!isProUser && trialEligible && <span className="text-[10px] text-zinc-500 mt-0.5">Free trial</span>}
                </div>
                <Switch
                  checked={storefrontActive}
                  onCheckedChange={handleToggleStorefront}
                  disabled={updating || (!isProUser && !storefrontActive && !planData?.plan?.includes("starter"))}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-zinc-700"
                />
                {storefrontActive ? (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Live</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-zinc-700 text-zinc-300">
                    Offline
                  </Badge>
                )}
              </div>
              {!isProUser && !planData?.plan?.includes("starter") && (
                <Button
                  onClick={handleGoLiveClick}
                  className="bg-white text-black hover:bg-zinc-100 font-medium text-sm px-6"
                >
                  Go Live
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-center sm:justify-start gap-6 sm:gap-8 border-b border-zinc-800/50">
              <button
                onClick={() => setActiveTab("free")}
                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-medium transition-all duration-200 relative ${
                  activeTab === "free" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Free Content
                {activeTab === "free" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
              </button>
              <button
                onClick={() => setActiveTab("premium")}
                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-medium transition-all duration-200 relative ${
                  activeTab === "premium" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Premium Content
                {activeTab === "premium" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
              </button>
              <button
                onClick={() => setActiveTab("ebooks")}
                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-medium transition-all duration-200 relative ${
                  activeTab === "ebooks" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                eBooks
                {activeTab === "ebooks" && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
              </button>
            </div>
          </div>

          {/* Content with action buttons */}
          <div className="pt-4 sm:pt-8">
            {currentContent.length > 0 ? (
              <div
                className={
                  activeTab === "premium" || activeTab === "ebooks"
                    ? "flex flex-col items-center gap-6 sm:grid sm:grid-cols-3 sm:gap-8 sm:justify-items-center"
                    : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center"
                }
              >
                <div
                  className={
                    activeTab === "premium" || activeTab === "ebooks"
                      ? "w-full max-w-sm aspect-[3/4] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 group"
                      : "w-full aspect-[9/16] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 group"
                  }
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
                  <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors flex items-center justify-center">
                    {activeTab === "free" ? (
                      <UploadIcon className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                    ) : (
                      <Package className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium">
                    {activeTab === "free" ? "Add Content" : activeTab === "ebooks" ? "Create eBook" : "Create Bundle"}
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
                  : activeTab === "ebooks"
                    ? ebooksContent.map((item) => <EBookCard key={item.id} item={item} username={username} />)
                    : freeContent.map((item) => <VideoContentCard key={item.id} item={item} />)}
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

function EBookCard({ item, username }: { item: ContentItem; username: string | null }) {
  const router = useRouter()

  const handleClick = () => {
    if (username) {
      router.push(`/creator/${username}/ebook/${item.id}`)
    }
  }

  return (
    <div className="group cursor-pointer w-full max-w-sm" onClick={handleClick}>
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 transition-all duration-300 border border-zinc-800 group-hover:border-white/50">
        {item.coverUrl || item.thumbnailUrl ? (
          <img src={item.coverUrl || item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Package className="w-16 h-16 text-zinc-600" />
          </div>
        )}

        {/* Price badge */}
        {item.price && (
          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-white text-sm font-medium">${(item.price / 100).toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3
          className="text-white text-sm font-medium line-clamp-2 leading-tight group-hover:text-zinc-300 transition-colors"
          title={item.title}
        >
          {item.title}
        </h3>
        {item.pageCount && (
          <p className="text-zinc-500 text-xs">
            {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
          </p>
        )}
        {item.description && <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">{item.description}</p>}
      </div>
    </div>
  )
}
