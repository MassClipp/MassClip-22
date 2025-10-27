"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Plus,
  Instagram,
  Twitter,
  Globe,
  Edit2,
  Check,
  X,
  Package,
  Upload,
  Calendar,
  Users,
  Heart,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ContentItem {
  id: string
  title: string
  thumbnailUrl: string
  fileUrl: string
  type: string
  isPremium: boolean
}

export default function ViewStorefrontPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [profilePic, setProfilePic] = useState("")
  const [socialLinks, setSocialLinks] = useState({ instagram: "", twitter: "", website: "" })
  const [freeContent, setFreeContent] = useState<ContentItem[]>([])
  const [premiumContent, setPremiumContent] = useState<ContentItem[]>([])
  const [createdAt, setCreatedAt] = useState<string>("")

  // Editing states
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [isEditingSocials, setIsEditingSocials] = useState(false)
  const [tempBio, setTempBio] = useState("")
  const [tempSocials, setTempSocials] = useState({ instagram: "", twitter: "", website: "" })

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        setLoading(true)
        const token = await user.getIdToken()

        // Fetch user profile
        const profileResponse = await fetch(`/api/user-profile?uid=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setUsername(profileData.username)
          setDisplayName(profileData.displayName || profileData.username)
          setBio(profileData.bio || "")
          setProfilePic(profileData.profilePic || profileData.photoURL || "")
          setSocialLinks(profileData.socialLinks || { instagram: "", twitter: "", website: "" })
          setCreatedAt(profileData.createdAt || "")
        }

        // Fetch free content
        const freeResponse = await fetch(`/api/creator/${user.uid}/free-content`)
        if (freeResponse.ok) {
          const freeData = await freeResponse.json()
          setFreeContent(freeData.content || [])
        }

        // Fetch premium content
        const premiumResponse = await fetch(`/api/creator/${user.uid}/premium-content`)
        if (premiumResponse.ok) {
          const premiumData = await premiumResponse.json()
          setPremiumContent(premiumData.content || [])
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
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
      await updateDoc(userDocRef, { bio: tempBio })
      setBio(tempBio)
      setIsEditingBio(false)
      toast({
        title: "Bio Updated",
        description: "Your bio has been saved successfully",
      })
    } catch (error) {
      console.error("Error updating bio:", error)
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
      await updateDoc(userDocRef, { socialLinks: tempSocials })
      setSocialLinks(tempSocials)
      setIsEditingSocials(false)
      toast({
        title: "Social Links Updated",
        description: "Your social links have been saved successfully",
      })
    } catch (error) {
      console.error("Error updating social links:", error)
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

  if (authLoading || loading) {
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
          <p className="text-zinc-400">Please complete your profile to view your storefront.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative -m-6">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-black to-zinc-800/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/30 via-transparent to-zinc-800/10 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-8 sm:mb-16">
          <div className="flex items-start justify-between">
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
                      className="bg-zinc-900/50 border-zinc-700 text-white text-sm max-w-md"
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
                    <div className="flex gap-2 items-center">
                      <Instagram className="w-4 h-4 text-zinc-400" />
                      <Input
                        value={tempSocials.instagram}
                        onChange={(e) => setTempSocials({ ...tempSocials, instagram: e.target.value })}
                        placeholder="Instagram username"
                        className="bg-zinc-900/50 border-zinc-700 text-white text-sm h-8"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Twitter className="w-4 h-4 text-zinc-400" />
                      <Input
                        value={tempSocials.twitter}
                        onChange={(e) => setTempSocials({ ...tempSocials, twitter: e.target.value })}
                        placeholder="Twitter username"
                        className="bg-zinc-900/50 border-zinc-700 text-white text-sm h-8"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Globe className="w-4 h-4 text-zinc-400" />
                      <Input
                        value={tempSocials.website}
                        onChange={(e) => setTempSocials({ ...tempSocials, website: e.target.value })}
                        placeholder="Website URL"
                        className="bg-zinc-900/50 border-zinc-700 text-white text-sm h-8"
                      />
                    </div>
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
            <div className="pb-4 text-sm font-medium text-white relative">
              Free Content
              <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />
            </div>
          </div>
        </div>

        <div className="mb-16">
          {freeContent.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {freeContent.map((item) => (
                <div key={item.id} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-zinc-900">
                  <img
                    src={item.thumbnailUrl || "/placeholder.svg"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <button
                onClick={() => router.push("/dashboard/upload")}
                className="aspect-[9/16] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors flex flex-col items-center justify-center gap-2 group"
              >
                <Upload className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                <span className="text-sm text-zinc-600 group-hover:text-zinc-400 transition-colors">Add Content</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-16">
              <Button
                onClick={() => router.push("/dashboard/upload")}
                className="bg-white text-black hover:bg-zinc-100"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Content
              </Button>
            </div>
          )}
        </div>

        {/* Premium Content Section */}
        <div className="mb-8">
          <div className="flex items-center gap-8 border-b border-zinc-800/50">
            <div className="pb-4 text-sm font-medium text-white relative">
              Premium Content
              <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />
            </div>
          </div>
        </div>

        <div>
          {premiumContent.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {premiumContent.map((item) => (
                <div key={item.id} className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg p-4">
                  <div className="aspect-video rounded-lg overflow-hidden bg-zinc-800 mb-3">
                    <img
                      src={item.thumbnailUrl || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-white font-medium mb-1">{item.title}</h3>
                </div>
              ))}
              <button
                onClick={() => router.push("/dashboard/bundles")}
                className="bg-zinc-900/30 border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors rounded-lg p-4 flex flex-col items-center justify-center gap-2 group min-h-[200px]"
              >
                <Package className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                <span className="text-sm text-zinc-600 group-hover:text-zinc-400 transition-colors">Create Bundle</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-16">
              <Button
                onClick={() => router.push("/dashboard/bundles")}
                className="bg-white text-black hover:bg-zinc-100"
              >
                <Package className="w-4 h-4 mr-2" />
                Create Your First Bundle
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
