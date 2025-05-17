"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { getFirestore, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Lock,
  Download,
  Play,
  Share2,
  Clock,
  Heart,
  CheckIcon as CheckVerified,
  InstagramIcon as TiktokIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Custom TikTok icon since it's not in Lucide
// function TiktokIcon(props: any) {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       {...props}
//     >
//       <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
//     </svg>
//   )
// }

export default function CreatorPublicProfile({ profile }) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [clips, setClips] = useState([])
  const [freeClips, setFreeClips] = useState([])
  const [paidClips, setPaidClips] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [purchasedClipIds, setPurchasedClipIds] = useState([])
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({
    totalClips: 0,
    totalViews: 0,
    totalSales: 0,
  })

  useEffect(() => {
    const fetchClips = async () => {
      setIsLoading(true)
      try {
        const db = getFirestore()

        // Fetch clips created by this user
        const clipsRef = collection(db, "clips")
        const q = query(
          clipsRef,
          where("creatorId", "==", profile.id),
          where("isPublished", "==", true),
          orderBy("createdAt", "desc"),
        )

        const querySnapshot = await getDocs(q)
        const clipsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }))

        // Separate free and paid clips
        const free = clipsData.filter((clip) => !clip.isPaid)
        const paid = clipsData.filter((clip) => clip.isPaid)

        setClips(clipsData)
        setFreeClips(free)
        setPaidClips(paid)

        // Calculate stats
        setStats({
          totalClips: clipsData.length,
          totalViews: clipsData.reduce((sum, clip) => sum + (clip.views || 0), 0),
          totalSales: paid.reduce((sum, clip) => sum + (clip.sales || 0) * (clip.price || 0), 0),
        })

        // If user is logged in, fetch their purchased clips
        if (user) {
          const purchasesRef = collection(db, "purchases")
          const purchasesQuery = query(
            purchasesRef,
            where("userId", "==", user.uid),
            where("status", "==", "completed"),
          )

          const purchasesSnapshot = await getDocs(purchasesQuery)
          const purchasedIds = purchasesSnapshot.docs.map((doc) => doc.data().clipId)
          setPurchasedClipIds(purchasedIds)
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
  }, [profile.id, user, toast])

  const handlePurchaseClip = async (clipId) => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=${encodeURIComponent(`/creator/${profile.username}`)}&clipId=${clipId}`)
      return
    }

    try {
      const clipToPurchase = paidClips.find((clip) => clip.id === clipId)

      if (!clipToPurchase) {
        throw new Error("Clip not found")
      }

      // Redirect to checkout
      router.push(`/checkout?clipId=${clipId}&creatorId=${profile.id}`)
    } catch (error) {
      console.error("Error initiating purchase:", error)
      toast({
        title: "Error",
        description: "Failed to initiate purchase. Please try again.",
        variant: "destructive",
      })
    }
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
        description: "Profile link copied to clipboard",
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

  const isClipPurchased = (clipId) => {
    return purchasedClipIds.includes(clipId)
  }

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Cover image */}
      <div className="relative h-48 md:h-64 lg:h-80 w-full">
        {profile.coverImage ? (
          <Image
            src={profile.coverImage || "/placeholder.svg"}
            alt={`${profile.displayName}'s cover`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-black to-gray-900"></div>
        )}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-4 -mt-24 md:-mt-32 relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Profile image */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-black bg-gray-800 shadow-xl">
            {profile.profileImage ? (
              <Image
                src={profile.profileImage || "/placeholder.svg"}
                alt={profile.displayName}
                width={160}
                height={160}
                className="object-cover w-full h-full"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-4xl">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Profile name and verification */}
          <div className="mt-4 flex items-center justify-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{profile.displayName}</h1>
            {profile.isVerified && (
              <span className="ml-2 text-crimson">
                <CheckVerified className="h-6 w-6" />
              </span>
            )}
          </div>

          {/* Username */}
          <p className="text-gray-400 text-lg">@{profile.username}</p>

          {/* Bio */}
          {profile.bio && <p className="mt-4 text-gray-300 max-w-xl text-center">{profile.bio}</p>}

          {/* Stats */}
          <div className="mt-6 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-xl font-semibold text-white">{formatNumber(stats.totalClips)}</p>
              <p className="text-sm text-gray-400">Clips</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-white">{formatNumber(stats.totalViews)}</p>
              <p className="text-sm text-gray-400">Views</p>
            </div>
            {profile.followers && (
              <div className="text-center">
                <p className="text-xl font-semibold text-white">{formatNumber(profile.followers)}</p>
                <p className="text-sm text-gray-400">Followers</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button className="bg-crimson hover:bg-crimson/90 text-white" onClick={handleShareProfile}>
              {copied ? (
                <>
                  <span className="mr-2">✓</span>
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Profile
                </>
              )}
            </Button>

            {user && user.uid !== profile.id && (
              <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                <Heart className="h-4 w-4 mr-2" />
                Follow
              </Button>
            )}

            {user && user.uid === profile.id && (
              <Button
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800"
                onClick={() => router.push("/dashboard/creator-hub")}
              >
                Edit Profile
              </Button>
            )}
          </div>

          {/* Social links */}
          {profile.socialLinks && Object.values(profile.socialLinks).some((link) => link) && (
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {profile.socialLinks.instagram && (
                <a
                  href={`https://instagram.com/${profile.socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-crimson transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.twitter && (
                <a
                  href={`https://twitter.com/${profile.socialLinks.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-crimson transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.tiktok && (
                <a
                  href={`https://tiktok.com/@${profile.socialLinks.tiktok}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-crimson transition-colors"
                  aria-label="TikTok"
                >
                  <TiktokIcon className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.youtube && (
                <a
                  href={profile.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-crimson transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.website && (
                <a
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-crimson transition-colors"
                  aria-label="Website"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Content tabs */}
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
                  {clips.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">No clips available yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {clips.map((clip) => (
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
                      {freeClips.map((clip) => (
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
                      {paidClips.map((clip) => (
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
function ClipCard({ clip, isPurchased, onPurchase }) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatViews = (views) => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + "M"
    }
    if (views >= 1000) {
      return (views / 1000).toFixed(1) + "K"
    }
    return views.toString()
  }

  return (
    <Card className="bg-gray-900 border-gray-800 overflow-hidden group">
      <Link href={`/clip/${clip.id}`}>
        <div
          className="relative aspect-[9/16] group cursor-pointer"
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
              {formatDuration(clip.duration || 0)}
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
      </Link>

      <CardContent className="p-3">
        <Link href={`/clip/${clip.id}`}>
          <h3 className="font-medium text-white truncate group-hover:text-crimson transition-colors">{clip.title}</h3>
        </Link>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center text-xs text-gray-400">
            <span className="flex items-center mr-3">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(clip.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center">
              <Play className="h-3 w-3 mr-1" />
              {formatViews(clip.views || 0)} views
            </span>
          </div>

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
