"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { getClipsByCreator } from "@/app/actions/clip-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Instagram, Twitter, Youtube, TwitterIcon as TikTok, Globe, Lock, Download, Play, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { CreatorProfile, UserClip } from "@/lib/types"

interface CreatorProfilePageProps {
  profile: CreatorProfile
}

export default function CreatorProfilePage({ profile }: CreatorProfilePageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [freeClips, setFreeClips] = useState<UserClip[]>([])
  const [paidClips, setPaidClips] = useState<UserClip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [purchasedClipIds, setPurchasedClipIds] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchClips = async () => {
      setIsLoading(true)
      try {
        const { clips } = await getClipsByCreator(profile.uid)

        // Separate free and paid clips
        const free = clips.filter((clip) => !clip.isPaid)
        const paid = clips.filter((clip) => clip.isPaid)

        setFreeClips(free)
        setPaidClips(paid)

        // If user is logged in, fetch their purchased clips
        if (user) {
          const response = await fetch("/api/user/purchased-clips")
          if (response.ok) {
            const data = await response.json()
            setPurchasedClipIds(data.clips.map((clip: UserClip) => clip.id))
          }
        }
      } catch (error) {
        console.error("Error fetching clips:", error)
        toast({
          title: "Error",
          description: "Failed to load clips. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchClips()
  }, [profile.uid, user, toast])

  const handlePurchaseClip = async (clipId: string) => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=${encodeURIComponent(`/creator/${profile.username}`)}&clipId=${clipId}`)
      return
    }

    try {
      const response = await fetch("/api/purchase-clip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clipId,
          creatorId: profile.uid,
          price: paidClips.find((clip) => clip.id === clipId)?.price || 0,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to initiate purchase")
      }

      const data = await response.json()

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error("Error purchasing clip:", error)
      toast({
        title: "Purchase Error",
        description: "Failed to initiate purchase. Please try again.",
        variant: "destructive",
      })
    }
  }

  const isClipPurchased = (clipId: string) => {
    return purchasedClipIds.includes(clipId)
  }

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/creator/${profile.username}`

    // Try to use the Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.displayName} on MassClip`,
          text: `Check out ${profile.displayName}'s clips on MassClip!`,
          url: profileUrl,
        })
        return
      } catch (error) {
        console.error("Error sharing:", error)
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "Profile link copied to clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero section with cover image */}
      <div className="relative h-48 md:h-64 w-full">
        {profile.coverImage ? (
          <Image
            src={profile.coverImage || "/placeholder.svg"}
            alt={`${profile.displayName}'s cover`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black"></div>
        )}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Profile info section */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Profile image */}
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black bg-gray-800 flex-shrink-0">
            {profile.profileImage ? (
              <Image
                src={profile.profileImage || "/placeholder.svg"}
                alt={profile.displayName}
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Profile details */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.displayName}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-gray-400">@{profile.username}</p>

                  {/* URL indicator */}
                  <div className="hidden md:flex items-center text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">
                    <span>
                      {window.location.origin}/creator/{profile.username}
                    </span>
                  </div>
                </div>
              </div>

              {/* Share button */}
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
                onClick={handleShareProfile}
              >
                {copied ? (
                  <>
                    <span className="text-green-500 mr-2">✓</span>
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </>
                )}
              </Button>
            </div>

            {/* Bio */}
            {profile.bio && <p className="mt-4 text-gray-300">{profile.bio}</p>}

            {/* Social links */}
            {(profile.socialLinks?.instagram ||
              profile.socialLinks?.twitter ||
              profile.socialLinks?.youtube ||
              profile.socialLinks?.tiktok ||
              profile.socialLinks?.website) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {profile.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${profile.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <Instagram size={16} />
                    <span>{profile.socialLinks.instagram}</span>
                  </a>
                )}
                {profile.socialLinks?.twitter && (
                  <a
                    href={`https://twitter.com/${profile.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <Twitter size={16} />
                    <span>{profile.socialLinks.twitter}</span>
                  </a>
                )}
                {profile.socialLinks?.youtube && (
                  <a
                    href={`https://youtube.com/${profile.socialLinks.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <Youtube size={16} />
                    <span>YouTube</span>
                  </a>
                )}
                {profile.socialLinks?.tiktok && (
                  <a
                    href={`https://tiktok.com/@${profile.socialLinks.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <TikTok size={16} />
                    <span>{profile.socialLinks.tiktok}</span>
                  </a>
                )}
                {profile.socialLinks?.website && (
                  <a
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-crimson transition-colors"
                  >
                    <Globe size={16} />
                    <span>Website</span>
                  </a>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 flex gap-6">
              <div className="text-center">
                <p className="text-xl font-semibold text-white">{freeClips.length + paidClips.length}</p>
                <p className="text-sm text-gray-400">Clips</p>
              </div>
              {profile.isVerified && (
                <div className="flex items-center gap-1 bg-crimson/10 px-3 py-1 rounded-full">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#DC143C"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-xs text-crimson font-medium">Verified Creator</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs for clips */}
        <div className="mt-12">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid grid-cols-3 max-w-md mx-auto bg-gray-900/50">
              <TabsTrigger value="all">All Clips</TabsTrigger>
              <TabsTrigger value="free">Free</TabsTrigger>
              <TabsTrigger value="premium">Premium</TabsTrigger>
            </TabsList>

            {/* All clips tab */}
            <TabsContent value="all" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[9/16] bg-gray-800 rounded-lg"></div>
                      <div className="h-4 bg-gray-800 rounded mt-2 w-3/4"></div>
                      <div className="h-3 bg-gray-800 rounded mt-2 w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {freeClips.length === 0 && paidClips.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">No clips available yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {/* Combine and sort all clips by creation date (newest first) */}
                      {[...freeClips, ...paidClips]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((clip) => (
                          <ClipCard
                            key={clip.id}
                            clip={clip}
                            isPurchased={isClipPurchased(clip.id)}
                            onPurchase={() => handlePurchaseClip(clip.id)}
                          />
                        ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Free clips tab */}
            <TabsContent value="free" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[9/16] bg-gray-800 rounded-lg"></div>
                      <div className="h-4 bg-gray-800 rounded mt-2 w-3/4"></div>
                      <div className="h-3 bg-gray-800 rounded mt-2 w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {freeClips.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">No free clips available yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {freeClips
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((clip) => (
                          <ClipCard key={clip.id} clip={clip} isPurchased={false} onPurchase={() => {}} />
                        ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Premium clips tab */}
            <TabsContent value="premium" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[9/16] bg-gray-800 rounded-lg"></div>
                      <div className="h-4 bg-gray-800 rounded mt-2 w-3/4"></div>
                      <div className="h-3 bg-gray-800 rounded mt-2 w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {paidClips.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">No premium clips available yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {paidClips
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((clip) => (
                          <ClipCard
                            key={clip.id}
                            clip={clip}
                            isPurchased={isClipPurchased(clip.id)}
                            onPurchase={() => handlePurchaseClip(clip.id)}
                          />
                        ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// Clip card component
interface ClipCardProps {
  clip: UserClip
  isPurchased: boolean
  onPurchase: () => void
}

function ClipCard({ clip, isPurchased, onPurchase }: ClipCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <Card className="bg-gray-900 border-gray-800 overflow-hidden">
      <div
        className="relative aspect-[9/16] group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={clip.thumbnailUrl || "/placeholder.svg?height=480&width=270&query=video+thumbnail"}
            alt={clip.title}
            fill
            className={`object-cover transition-all duration-300 ${
              clip.isPaid && !isPurchased ? "blur-sm scale-110" : ""
            } ${isHovered ? "scale-105" : "scale-100"}`}
          />

          {/* Overlay for paid clips */}
          {clip.isPaid && !isPurchased && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
              <Lock className="w-8 h-8 text-white mb-2" />
              <p className="text-white text-center font-medium">Premium Clip</p>
              <p className="text-crimson font-bold text-lg mt-1">${clip.price?.toFixed(2)}</p>
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(clip.duration)}
          </div>

          {/* Play/preview overlay on hover */}
          <div
            className={`absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 transition-opacity duration-300 ${
              isHovered ? "opacity-100" : ""
            }`}
          >
            {clip.isPaid && !isPurchased ? (
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPurchase()
                }}
                className="bg-crimson hover:bg-crimson/90 text-white"
                size="sm"
              >
                Unlock Clip
              </Button>
            ) : (
              <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                <Play className="w-6 h-6 text-white" fill="white" />
              </div>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        <h3 className="font-medium text-white truncate">{clip.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400 truncate">{new Date(clip.createdAt).toLocaleDateString()}</p>

          {/* Download or purchase button */}
          {clip.isPaid ? (
            isPurchased ? (
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Download className="w-4 h-4 text-crimson" />
              </Button>
            ) : (
              <div className="text-xs font-medium text-crimson">${clip.price?.toFixed(2)}</div>
            )
          ) : (
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Download className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
