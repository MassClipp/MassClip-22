"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Share2, Edit, Instagram, Twitter, Globe, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

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
  const { user: userData } = useAuth()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "free"
  const [activeTab, setActiveTab] = useState(defaultTab)
  const isOwner = userData && userData.uid === creator.uid
  const [freeVideos, setFreeVideos] = useState([])
  const [premiumVideos, setPremiumVideos] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Set active tab based on URL query parameter
  // useEffect(() => {
  //   const tab = searchParams.get("tab")
  //   if (tab === "premium") {
  //     setActiveTab("premium")
  //   } else {
  //     setActiveTab("free")
  //   }
  // }, [searchParams])

  useEffect(() => {
    const fetchVideos = async () => {
      if (!userData?.uid) return

      setIsLoading(true)
      try {
        // Fetch free videos
        const freeQuery = query(
          collection(db, `users/${userData.uid}/freeClips`),
          orderBy("createdAt", "desc"),
          limit(12),
        )
        const freeSnapshot = await getDocs(freeQuery)
        const freeData = freeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Fetch premium videos
        const premiumQuery = query(
          collection(db, `users/${userData.uid}/premiumClips`),
          orderBy("createdAt", "desc"),
          limit(12),
        )
        const premiumSnapshot = await getDocs(premiumQuery)
        const premiumData = premiumSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setFreeVideos(freeData)
        setPremiumVideos(premiumData)
      } catch (error) {
        console.error("Error fetching videos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [userData?.uid])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.displayName} on MassClip`,
          text: `Check out ${creator.displayName}'s content on MassClip`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert("Profile link copied to clipboard!")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900">
      {/* Hero Section */}
      <div className="relative">
        {/* Background gradient with subtle animated lines */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 to-black/90 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-500 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-500 to-transparent"></div>
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-500 to-transparent"></div>
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-500 to-transparent"></div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 shadow-xl">
                {creator.profilePic ? (
                  <Image
                    src={creator.profilePic || "/placeholder.svg"}
                    alt={creator.displayName}
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 text-4xl font-light">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Premium indicator for pro users */}
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-medium px-2 py-0.5 rounded-full shadow-lg">
                PRO
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-1">{creator.displayName}</h1>
              <p className="text-zinc-400 text-sm mb-4">@{creator.username}</p>

              {creator.bio && <p className="text-zinc-300 max-w-2xl mb-6 text-sm md:text-base">{creator.bio}</p>}

              {/* Social Links */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                {creator.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${creator.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>Instagram</span>
                  </a>
                )}

                {creator.socialLinks?.twitter && (
                  <a
                    href={`https://twitter.com/${creator.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                    <span>Twitter</span>
                  </a>
                )}

                {creator.socialLinks?.website && (
                  <a
                    href={creator.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {/* Member since */}
                <div className="text-zinc-500 text-xs">Member since {formatDate(creator.createdAt)}</div>

                {/* Content counts */}
                <div className="flex gap-3 text-xs">
                  <div className="text-zinc-400">
                    <span className="text-white font-medium">{creator.freeClips?.length || 0}</span> free clips
                  </div>
                  <div className="text-zinc-400">
                    <span className="text-white font-medium">{creator.paidClips?.length || 0}</span> premium clips
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button
                variant="outline"
                size="sm"
                className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-white"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-white"
                  onClick={() => (window.location.href = "/dashboard/profile/edit")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      {/* <div className="container mx-auto px-4 pb-20">
        <div className="border-b border-zinc-800 mb-8">
          <div className="flex">
            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative",
                activeTab === "free" ? "text-white" : "text-zinc-400 hover:text-white",
              )}
              onClick={() => setActiveTab("free")}
            >
              Free Clips
              {activeTab === "free" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson"></div>}
            </button>

            <button
              className={cn(
                "px-6 py-3 text-sm font-medium relative",
                activeTab === "premium" ? "text-white" : "text-zinc-400 hover:text-white",
              )}
              onClick={() => setActiveTab("premium")}
            >
              Premium Clips
              {activeTab === "premium" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson"></div>}
            </button>
          </div>
        </div> */}

      {/* Content Area */}
      {/* <div>
          {activeTab === "free" && (
            <div>
              {creator.freeClips && creator.freeClips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Free clips would be rendered here */}
      {/* <div className="text-zinc-400">Free clips would be displayed here</div>
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-light text-white mb-2">No Free Clips Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      {isOwner
                        ? "Share your first free clip to attract viewers and showcase your content."
                        : `${creator.displayName} hasn't shared any free clips yet.`}
                    </p>

                    {isOwner && (
                      <Button
                        className="bg-crimson hover:bg-crimson/90 text-white"
                        onClick={() => (window.location.href = "/dashboard/clips/add")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Clip
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "premium" && (
            <div>
              {creator.paidClips && creator.paidClips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Premium clips would be rendered here */}
      {/* <div className="text-zinc-400">Premium clips would be displayed here</div>
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-light text-white mb-2">No Premium Clips Yet</h3>
                    <p className="text-zinc-400 mb-6">
                      {isOwner
                        ? "Add premium clips to monetize your content and provide exclusive value to your subscribers."
                        : `${creator.displayName} hasn't shared any premium clips yet.`}
                    </p>

                    {isOwner && (
                      <Button
                        className="bg-crimson hover:bg-crimson/90 text-white"
                        onClick={() => (window.location.href = "/dashboard/clips/add")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Premium Clip
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div> */}
      <div className="container mx-auto px-4 pb-20">
        <div className="mt-8">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-zinc-800 border-b border-zinc-700 w-full justify-start rounded-none p-0">
              <TabsTrigger
                value="free"
                className="data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none rounded-none px-6 py-3"
              >
                Free Videos
              </TabsTrigger>
              <TabsTrigger
                value="premium"
                className="data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none rounded-none px-6 py-3"
              >
                Premium Videos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="free" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-video bg-zinc-800 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : freeVideos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {freeVideos.map((video) => (
                    <div key={video.id} className="overflow-hidden bg-zinc-900 border-zinc-800 rounded-lg">
                      <div className="aspect-video relative overflow-hidden">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl || "/placeholder.svg"}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <span className="text-zinc-500">No thumbnail</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                          <h3 className="font-medium text-white line-clamp-2">{video.title}</h3>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-zinc-400">No free videos available yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="premium" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-video bg-zinc-800 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : premiumVideos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {premiumVideos.map((video) => (
                    <div key={video.id} className="overflow-hidden bg-zinc-900 border-zinc-800 rounded-lg">
                      <div className="aspect-video relative overflow-hidden">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl || "/placeholder.svg"}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <span className="text-zinc-500">No thumbnail</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-between p-4">
                          <div className="self-end bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                            <Lock className="w-3 h-3 mr-1" />
                            Premium
                          </div>
                          <h3 className="font-medium text-white line-clamp-2">{video.title}</h3>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-zinc-400">No premium videos available yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
