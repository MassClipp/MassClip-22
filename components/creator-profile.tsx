"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Instagram, Twitter, Globe, Video, ShoppingBag } from "lucide-react"
import { useRouter } from "next/navigation"
import { VimeoCard } from "@/components/vimeo-card"
import { LockedClipCard } from "@/components/locked-clip-card"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  freeClips: any[]
  paidClips: any[]
  createdAt: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
}

export default function CreatorProfile({ creator }: { creator: Creator }) {
  const { user } = useAuth()
  const router = useRouter()
  const isOwner = user && user.uid === creator.uid

  const [activeTab, setActiveTab] = useState("free")
  const [freeVideos, setFreeVideos] = useState<any[]>([])
  const [premiumVideos, setPremiumVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch videos from Firestore
  useEffect(() => {
    async function fetchVideos() {
      setIsLoading(true)
      try {
        console.log("Fetching videos for creator:", creator.username)

        // Fetch free videos
        const freeQuery = query(
          collection(db, "freeClips"),
          where("username", "==", creator.username),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(20),
        )

        const freeSnapshot = await getDocs(freeQuery)
        const freeData = freeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        console.log("Free videos found:", freeData.length)
        setFreeVideos(freeData)

        // Fetch premium videos
        const premiumQuery = query(
          collection(db, "premiumClips"),
          where("username", "==", creator.username),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(20),
        )

        const premiumSnapshot = await getDocs(premiumQuery)
        const premiumData = premiumSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        console.log("Premium videos found:", premiumData.length)
        setPremiumVideos(premiumData)
      } catch (error) {
        console.error("Error fetching videos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [creator.username])

  const handleAddClip = () => {
    router.push("/dashboard/upload")
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Profile header */}
      <div className="relative">
        {/* Cover image - dark gradient */}
        <div className="h-48 bg-gradient-to-r from-zinc-900 to-zinc-800"></div>

        {/* Profile info */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            {/* Profile picture */}
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-black">
              {creator.profilePic ? (
                <Image
                  src={creator.profilePic || "/placeholder.svg"}
                  alt={creator.displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{creator.displayName.charAt(0)}</span>
                </div>
              )}
              {isOwner && (
                <div className="absolute bottom-0 right-0 bg-amber-500 text-xs font-bold text-black px-1.5 py-0.5 rounded-sm">
                  PRO
                </div>
              )}
            </div>

            <div className="flex-1 md:pb-4">
              <h1 className="text-2xl font-bold text-white">{creator.displayName}</h1>
              <p className="text-zinc-400">@{creator.username}</p>

              {creator.bio && <p className="mt-2 text-zinc-300 max-w-2xl">{creator.bio}</p>}

              {/* Social links */}
              {creator.socialLinks && (
                <div className="flex gap-3 mt-3">
                  {creator.socialLinks.instagram && (
                    <a
                      href={`https://instagram.com/${creator.socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {creator.socialLinks.twitter && (
                    <a
                      href={`https://twitter.com/${creator.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {creator.socialLinks.website && (
                    <a
                      href={creator.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="md:ml-auto flex gap-3 mt-4 md:mt-0">
              {isOwner ? (
                <Button
                  onClick={() => router.push("/dashboard/profile/edit")}
                  variant="outline"
                  className="border-zinc-700 hover:bg-zinc-800 text-white"
                >
                  Edit Profile
                </Button>
              ) : (
                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-white">
                  Share
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-md">
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-zinc-400 text-xs mb-1">Member since</div>
              <div className="font-medium">May 2025</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-zinc-400 text-xs mb-1 flex items-center justify-center">
                <Video className="h-3 w-3 mr-1" />
                Free clips
              </div>
              <div className="font-medium">{freeVideos.length}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-zinc-400 text-xs mb-1 flex items-center justify-center">
                <ShoppingBag className="h-3 w-3 mr-1" />
                Premium clips
              </div>
              <div className="font-medium">{premiumVideos.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content tabs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <Tabs defaultValue="free" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/50 border-b border-zinc-800/50 w-full justify-start rounded-none p-0">
            <TabsTrigger
              value="free"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:text-white py-3 px-6"
            >
              Free Clips
            </TabsTrigger>
            <TabsTrigger
              value="premium"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:text-white py-3 px-6"
            >
              Premium Clips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="free" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-zinc-500">Loading clips...</div>
            ) : freeVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeVideos.map((video) => (
                  <VimeoCard
                    key={video.id}
                    title={video.title}
                    thumbnailUrl={video.thumbnailUrl || "/placeholder.svg"}
                    videoUrl={video.url}
                    views={video.views || 0}
                    duration={video.duration || 0}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 mb-4">
                  <Video className="h-8 w-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No Free Clips Yet</h3>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Share your first free clip to attract viewers and showcase your content.
                </p>
                {isOwner && (
                  <Button onClick={handleAddClip} className="mt-6 bg-red-500 hover:bg-red-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Clip
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="premium" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-zinc-500">Loading premium content...</div>
            ) : premiumVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {premiumVideos.map((video) => (
                  <LockedClipCard
                    key={video.id}
                    title={video.title}
                    thumbnailUrl={video.thumbnailUrl || "/placeholder.svg"}
                    price={video.price || 5}
                    duration={video.duration || 0}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 mb-4">
                  <ShoppingBag className="h-8 w-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No Premium Content Yet</h3>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Share exclusive premium content that your subscribers can purchase.
                </p>
                {isOwner && (
                  <Button
                    onClick={() => router.push("/dashboard/upload?type=premium")}
                    className="mt-6 bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Premium Clip
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
