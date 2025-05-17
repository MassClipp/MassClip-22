"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import type { CreatorProfile, UserClip } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Clock, Download, Lock, Check, DollarSign, Instagram, Twitter, Youtube, Globe } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Image from "next/image"

interface CreatorProfileClientProps {
  profile: CreatorProfile
}

interface ClipStatus {
  clipId: string
  isPurchased: boolean
  isProcessing: boolean
}

export default function CreatorProfileClient({ profile }: CreatorProfileClientProps) {
  const { user } = useAuth()
  const [clips, setClips] = useState<UserClip[]>([])
  const [freeClips, setFreeClips] = useState<UserClip[]>([])
  const [paidClips, setPaidClips] = useState<UserClip[]>([])
  const [featuredClips, setFeaturedClips] = useState<UserClip[]>([])
  const [purchasedClips, setPurchasedClips] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [clipStatus, setClipStatus] = useState<ClipStatus[]>([])

  // Fetch clips from creator profile
  useEffect(() => {
    async function fetchCreatorClips() {
      try {
        setLoading(true)
        const response = await fetch(`/api/creator-clips?creatorId=${profile.uid}`)
        const data = await response.json()

        if (data.clips) {
          setClips(data.clips)

          // Filter clips
          setFreeClips(data.clips.filter((clip: UserClip) => !clip.isPaid))
          setPaidClips(data.clips.filter((clip: UserClip) => clip.isPaid))
          setFeaturedClips(data.clips.filter((clip: UserClip) => clip.isFeatured))
        }
      } catch (error) {
        console.error("Error fetching clips:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCreatorClips()
  }, [profile.uid])

  // Fetch purchased clips if user is logged in
  useEffect(() => {
    async function fetchPurchasedClips() {
      if (!user) return

      try {
        const response = await fetch(`/api/purchased-clips?userId=${user.uid}`)
        const data = await response.json()

        if (data.purchasedClips) {
          setPurchasedClips(data.purchasedClips)

          // Update clip status
          const newClipStatus = clips.map((clip) => ({
            clipId: clip.id,
            isPurchased: data.purchasedClips.includes(clip.id),
            isProcessing: false,
          }))

          setClipStatus(newClipStatus)
        }
      } catch (error) {
        console.error("Error fetching purchased clips:", error)
      }
    }

    fetchPurchasedClips()
  }, [user, clips])

  // Handle clip purchase
  const handlePurchaseClip = async (clipId: string, price: number) => {
    if (!user) {
      // Redirect to login
      window.location.href = `/login?redirect=/creator/${profile.username}`
      return
    }

    // Update processing status
    setClipStatus((prev) =>
      prev.map((status) => (status.clipId === clipId ? { ...status, isProcessing: true } : status)),
    )

    try {
      const response = await fetch("/api/purchase-clip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clipId,
          creatorId: profile.uid,
          price,
        }),
      })

      const data = await response.json()

      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl
      } else {
        throw new Error(data.error || "Failed to create checkout session")
      }
    } catch (error) {
      console.error("Error purchasing clip:", error)

      // Reset processing status
      setClipStatus((prev) =>
        prev.map((status) => (status.clipId === clipId ? { ...status, isProcessing: false } : status)),
      )
    }
  }

  // Check if clip is purchased
  const isClipPurchased = (clipId: string) => {
    const status = clipStatus.find((status) => status.clipId === clipId)
    return status?.isPurchased || false
  }

  // Check if clip is processing purchase
  const isProcessingPurchase = (clipId: string) => {
    const status = clipStatus.find((status) => status.clipId === clipId)
    return status?.isProcessing || false
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative h-56 md:h-80 bg-gradient-to-b from-zinc-900 to-black">
        {profile.coverImage && (
          <div className="absolute inset-0">
            <Image
              src={profile.coverImage || "/placeholder.svg"}
              alt={`${profile.displayName}'s cover`}
              layout="fill"
              objectFit="cover"
              priority
              className="opacity-60"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50" />
          </div>
        )}

        <div className="absolute bottom-0 w-full transform translate-y-1/2">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-end md:items-center">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                {profile.profileImage ? (
                  <Image
                    src={profile.profileImage || "/placeholder.svg"}
                    alt={profile.displayName}
                    layout="fill"
                    objectFit="cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <User className="w-12 h-12 text-zinc-600" />
                  </div>
                )}
                {profile.isVerified && (
                  <div className="absolute bottom-0 right-0 bg-blue-600 p-1 rounded-full border-2 border-black">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              <div className="mt-4 md:mt-0 md:ml-6 bg-black bg-opacity-80 p-4 rounded-lg backdrop-blur-sm border border-zinc-800">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.displayName}</h1>
                <p className="text-zinc-400">@{profile.username}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Creator Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-2">
            {profile.bio && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">About</h2>
                <p className="text-zinc-300">{profile.bio}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mb-6">
              {profile.socialLinks?.instagram && (
                <a
                  href={`https://instagram.com/${profile.socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-zinc-400 hover:text-pink-500 transition-colors"
                >
                  <Instagram className="h-5 w-5 mr-2" />
                  <span>{profile.socialLinks.instagram}</span>
                </a>
              )}

              {profile.socialLinks?.twitter && (
                <a
                  href={`https://twitter.com/${profile.socialLinks.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-zinc-400 hover:text-blue-400 transition-colors"
                >
                  <Twitter className="h-5 w-5 mr-2" />
                  <span>{profile.socialLinks.twitter}</span>
                </a>
              )}

              {profile.socialLinks?.youtube && (
                <a
                  href={`https://youtube.com/${profile.socialLinks.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Youtube className="h-5 w-5 mr-2" />
                  <span>{profile.socialLinks.youtube}</span>
                </a>
              )}

              {profile.socialLinks?.website && (
                <a
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  <Globe className="h-5 w-5 mr-2" />
                  <span>Website</span>
                </a>
              )}
            </div>
          </div>

          <div>
            <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Creator Stats</h2>
                </div>
                {profile.isVerified && <Badge className="bg-blue-600 text-white">Verified Creator</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 p-3 rounded-lg">
                  <p className="text-zinc-400 text-sm">Total Clips</p>
                  <p className="text-2xl font-bold">{clips.length}</p>
                </div>

                <div className="bg-zinc-800/50 p-3 rounded-lg">
                  <p className="text-zinc-400 text-sm">Views</p>
                  <p className="text-2xl font-bold">{profile.totalViews?.toLocaleString() || "0"}</p>
                </div>

                <div className="bg-zinc-800/50 p-3 rounded-lg col-span-2">
                  <p className="text-zinc-400 text-sm">Member Since</p>
                  <p className="text-lg font-medium">
                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clips */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-zinc-900/50 border-b border-zinc-800 w-full justify-start rounded-none mb-8">
            <TabsTrigger
              value="all"
              className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
            >
              All Clips
            </TabsTrigger>
            <TabsTrigger
              value="free"
              className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
            >
              Free Clips
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
            >
              Paid Clips
            </TabsTrigger>
            {featuredClips.length > 0 && (
              <TabsTrigger
                value="featured"
                className="text-white data-[state=active]:bg-zinc-800/50 data-[state=active]:border-b-2 data-[state=active]:border-crimson rounded-none px-6 py-3"
              >
                Featured
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="bg-zinc-900/50 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-video bg-zinc-800" />
                    <div className="p-4">
                      <div className="h-4 bg-zinc-800 rounded mb-2 w-3/4" />
                      <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : clips.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400 text-lg">No clips available yet</p>
                <p className="text-zinc-500">This creator hasn't uploaded any clips</p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {clips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    creatorId={profile.uid}
                    isPurchased={isClipPurchased(clip.id)}
                    isProcessingPurchase={isProcessingPurchase(clip.id)}
                    onPurchase={handlePurchaseClip}
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="free">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-zinc-900/50 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-video bg-zinc-800" />
                    <div className="p-4">
                      <div className="h-4 bg-zinc-800 rounded mb-2 w-3/4" />
                      <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : freeClips.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400 text-lg">No free clips available</p>
                <p className="text-zinc-500">This creator hasn't uploaded any free clips yet</p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {freeClips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    creatorId={profile.uid}
                    isPurchased={isClipPurchased(clip.id)}
                    isProcessingPurchase={isProcessingPurchase(clip.id)}
                    onPurchase={handlePurchaseClip}
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="paid">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-zinc-900/50 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-video bg-zinc-800" />
                    <div className="p-4">
                      <div className="h-4 bg-zinc-800 rounded mb-2 w-3/4" />
                      <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paidClips.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400 text-lg">No premium clips available</p>
                <p className="text-zinc-500">This creator hasn't uploaded any premium clips yet</p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {paidClips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    creatorId={profile.uid}
                    isPurchased={isClipPurchased(clip.id)}
                    isProcessingPurchase={isProcessingPurchase(clip.id)}
                    onPurchase={handlePurchaseClip}
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>

          {featuredClips.length > 0 && (
            <TabsContent value="featured">
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {featuredClips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    creatorId={profile.uid}
                    isPurchased={isClipPurchased(clip.id)}
                    isProcessingPurchase={isProcessingPurchase(clip.id)}
                    onPurchase={handlePurchaseClip}
                  />
                ))}
              </motion.div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

interface ClipCardProps {
  clip: UserClip
  creatorId: string
  isPurchased: boolean
  isProcessingPurchase: boolean
  onPurchase: (clipId: string, price: number) => void
}

function ClipCard({ clip, creatorId, isPurchased, isProcessingPurchase, onPurchase }: ClipCardProps) {
  return (
    <motion.div
      className="bg-zinc-900/50 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all group"
      whileHover={{ translateY: -5 }}
    >
      <div className="relative aspect-video">
        <Image
          src={clip.thumbnailUrl || "/placeholder.svg"}
          alt={clip.title}
          layout="fill"
          objectFit="cover"
          className="group-hover:scale-105 transition-transform duration-500 ease-in-out"
        />

        {/* Free badge or Price badge */}
        <div className="absolute top-2 left-2 z-10">
          {clip.isPaid ? (
            <Badge className="bg-black/70 text-white border-zinc-700">
              <DollarSign className="h-3 w-3 mr-1" />${clip.price?.toFixed(2)}
            </Badge>
          ) : (
            <Badge className="bg-green-900/70 text-green-400 border-green-800">Free</Badge>
          )}
        </div>

        {/* Duration badge */}
        {clip.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {Math.floor(clip.duration / 60)}:{(clip.duration % 60).toString().padStart(2, "0")}
          </div>
        )}

        {/* Lock overlay for paid clips */}
        {clip.isPaid && !isPurchased && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Lock className="h-12 w-12 text-white/70" />
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-white font-medium mb-1 truncate">{clip.title}</h3>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-xs text-zinc-400">
            <Clock className="h-3 w-3 mr-1" />
            <span>{formatDistanceToNow(new Date(clip.createdAt), { addSuffix: true })}</span>
          </div>
        </div>

        {clip.isPaid ? (
          isPurchased ? (
            <Button className="w-full bg-crimson hover:bg-crimson/90">
              <Download className="h-4 w-4 mr-2" />
              Download Now
            </Button>
          ) : (
            <Button
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
              onClick={() => onPurchase(clip.id, clip.price || 0)}
              disabled={isProcessingPurchase}
            >
              {isProcessingPurchase ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-zinc-500 border-t-white rounded-full mr-2" />
                  Processing...
                </div>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Purchase
                </>
              )}
            </Button>
          )
        ) : (
          <Button className="w-full bg-crimson hover:bg-crimson/90">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>
    </motion.div>
  )
}
