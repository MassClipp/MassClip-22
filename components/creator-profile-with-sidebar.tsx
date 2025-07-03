"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Calendar, ExternalLink, Instagram, Twitter, Youtube, Globe, Users, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import VideoCard from "@/components/video-card"
import EnhancedProductBoxDisplay from "@/components/enhanced-product-box-display"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  createdAt: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    youtube?: string
    website?: string
  }
}

interface Upload {
  id: string
  title: string
  description?: string
  fileUrl: string
  thumbnailUrl?: string
  mimeType: string
  fileSize: number
  duration?: number
  createdAt: any
  userId: string
  username: string
  isPublic: boolean
  downloadCount?: number
  tags?: string[]
}

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  currency: string
  coverImage?: string
  customPreviewThumbnail?: string
  active: boolean
  contentItems: string[]
  createdAt: any
  updatedAt: any
  userId: string
  username: string
  productId?: string
  priceId?: string
}

interface CreatorProfileWithSidebarProps {
  creator: Creator
}

export default function CreatorProfileWithSidebar({ creator }: CreatorProfileWithSidebarProps) {
  const { user } = useAuth()
  const [freeContent, setFreeContent] = useState<Upload[]>([])
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [loading, setLoading] = useState(true)
  const [productBoxLoading, setProductBoxLoading] = useState(true)
  const [profileViews, setProfileViews] = useState<number>(0)

  // Fetch creator's free content
  const fetchFreeContent = async () => {
    try {
      console.log(`🔍 [Creator Profile] Fetching free content for creator: ${creator.uid}`)

      // Query uploads collection for public content by this creator
      const uploadsQuery = query(
        collection(db, "uploads"),
        where("userId", "==", creator.uid),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        limit(20),
      )

      const uploadsSnapshot = await getDocs(uploadsQuery)
      const uploads: Upload[] = []

      uploadsSnapshot.forEach((doc) => {
        const data = doc.data()
        uploads.push({
          id: doc.id,
          title: data.title || data.filename || "Untitled",
          description: data.description || "",
          fileUrl: data.fileUrl || data.publicUrl || "",
          thumbnailUrl: data.thumbnailUrl || "",
          mimeType: data.mimeType || data.fileType || "video/mp4",
          fileSize: data.fileSize || data.size || 0,
          duration: data.duration || 0,
          createdAt: data.createdAt || data.uploadedAt,
          userId: data.userId,
          username: data.username || creator.username,
          isPublic: data.isPublic !== false,
          downloadCount: data.downloadCount || 0,
          tags: data.tags || [],
        })
      })

      // Filter out uploads without valid URLs
      const validUploads = uploads.filter((upload) => upload.fileUrl && upload.fileUrl.startsWith("http"))

      setFreeContent(validUploads)
      console.log(`✅ [Creator Profile] Loaded ${validUploads.length} free content items`)
    } catch (error) {
      console.error("❌ [Creator Profile] Error fetching free content:", error)
      setFreeContent([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch creator's product boxes (premium content) - Enhanced version
  const fetchProductBoxes = async () => {
    try {
      console.log(`🔍 [Creator Profile] Fetching product boxes for creator: ${creator.uid}`)
      setProductBoxLoading(true)

      // Try multiple collection sources for better compatibility
      const collections = ["bundles", "productBoxes"]
      const allProductBoxes: ProductBox[] = []

      for (const collectionName of collections) {
        try {
          console.log(`🔍 [Creator Profile] Checking ${collectionName} collection...`)

          const productBoxQuery = query(
            collection(db, collectionName),
            where("userId", "==", creator.uid),
            where("active", "==", true),
            orderBy("createdAt", "desc"),
          )

          const productBoxSnapshot = await getDocs(productBoxQuery)
          console.log(`📊 [Creator Profile] Found ${productBoxSnapshot.size} items in ${collectionName}`)

          productBoxSnapshot.forEach((doc) => {
            const data = doc.data()

            // Check if we already have this product box (avoid duplicates)
            if (!allProductBoxes.find((pb) => pb.id === doc.id)) {
              const productBox: ProductBox = {
                id: doc.id,
                title: data.title || "Untitled Bundle",
                description: data.description || "",
                price: data.price || 0,
                currency: data.currency || "usd",
                coverImage: data.coverImage || data.customPreviewThumbnail || "",
                customPreviewThumbnail: data.customPreviewThumbnail || data.coverImage || "",
                active: data.active !== false,
                contentItems: data.contentItems || [],
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                userId: data.userId || creator.uid,
                username: data.username || creator.username,
                productId: data.productId,
                priceId: data.priceId,
              }

              // Only include active bundles with valid pricing
              if (productBox.active && productBox.price > 0) {
                allProductBoxes.push(productBox)
                console.log(`✅ [Creator Profile] Added product box: ${productBox.title} ($${productBox.price})`)
              }
            }
          })
        } catch (collectionError) {
          console.log(`⚠️ [Creator Profile] ${collectionName} collection not accessible:`, collectionError)
        }
      }

      // Sort by creation date (newest first)
      allProductBoxes.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
        const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
        return bTime - aTime
      })

      setProductBoxes(allProductBoxes)
      console.log(`✅ [Creator Profile] Total active product boxes loaded: ${allProductBoxes.length}`)
    } catch (error) {
      console.error("❌ [Creator Profile] Error fetching product boxes:", error)
      setProductBoxes([])
    } finally {
      setProductBoxLoading(false)
    }
  }

  // Fetch profile view stats
  const fetchProfileViews = async () => {
    try {
      const viewsQuery = query(collection(db, "profileViews"), where("profileUserId", "==", creator.uid))
      const viewsSnapshot = await getDocs(viewsQuery)
      setProfileViews(viewsSnapshot.size)
    } catch (error) {
      console.error("Error fetching profile views:", error)
    }
  }

  useEffect(() => {
    fetchFreeContent()
    fetchProductBoxes()
    fetchProfileViews()
  }, [creator.uid])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    } catch {
      return "Recently"
    }
  }

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4" />
      case "twitter":
        return <Twitter className="h-4 w-4" />
      case "youtube":
        return <Youtube className="h-4 w-4" />
      case "website":
        return <Globe className="h-4 w-4" />
      default:
        return <ExternalLink className="h-4 w-4" />
    }
  }

  const formatSocialUrl = (platform: string, value: string) => {
    if (value.startsWith("http")) return value

    switch (platform) {
      case "instagram":
        return `https://instagram.com/${value.replace("@", "")}`
      case "twitter":
        return `https://twitter.com/${value.replace("@", "")}`
      case "youtube":
        return value.includes("youtube.com") ? value : `https://youtube.com/@${value}`
      default:
        return value.startsWith("http") ? value : `https://${value}`
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-zinc-900/50 border-zinc-800 sticky top-8">
              <CardContent className="p-6">
                {/* Profile Header */}
                <div className="text-center mb-6">
                  <Avatar className="w-24 h-24 mx-auto mb-4 ring-2 ring-red-500/20">
                    <AvatarImage src={creator.profilePic || "/placeholder.svg"} alt={creator.displayName} />
                    <AvatarFallback className="bg-zinc-800 text-white text-xl">
                      {creator.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-2xl font-bold text-white mb-1">{creator.displayName}</h1>
                  <p className="text-zinc-400 mb-2">@{creator.username}</p>
                  {creator.bio && <p className="text-sm text-zinc-300 leading-relaxed">{creator.bio}</p>}
                </div>

                <Separator className="bg-zinc-800 mb-6" />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="h-4 w-4 text-zinc-400 mr-1" />
                    </div>
                    <p className="text-xs text-zinc-500">Member since</p>
                    <p className="text-sm font-medium text-white">{formatDate(creator.createdAt)}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="h-4 w-4 text-zinc-400 mr-1" />
                    </div>
                    <p className="text-xs text-zinc-500">Free content</p>
                    <p className="text-sm font-medium text-white">{freeContent.length}</p>
                  </div>
                </div>

                {/* Social Links */}
                {creator.socialLinks && Object.keys(creator.socialLinks).length > 0 && (
                  <>
                    <Separator className="bg-zinc-800 mb-4" />
                    <div className="space-y-2">
                      {Object.entries(creator.socialLinks).map(([platform, value]) => {
                        if (!value) return null
                        return (
                          <Button
                            key={platform}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800"
                            asChild
                          >
                            <a href={formatSocialUrl(platform, value)} target="_blank" rel="noopener noreferrer">
                              {getSocialIcon(platform)}
                              <span className="ml-2 capitalize">{platform}</span>
                            </a>
                          </Button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Profile Views */}
                {profileViews > 0 && (
                  <>
                    <Separator className="bg-zinc-800 my-4" />
                    <div className="flex items-center justify-center text-zinc-400">
                      <Eye className="h-4 w-4 mr-2" />
                      <span className="text-sm">{profileViews} profile views</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="free" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 border border-zinc-800">
                <TabsTrigger
                  value="free"
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
                >
                  Free Content
                </TabsTrigger>
                <TabsTrigger
                  value="premium"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-zinc-400"
                >
                  Premium Content
                </TabsTrigger>
              </TabsList>

              {/* Free Content Tab */}
              <TabsContent value="free" className="mt-6">
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="aspect-[9/16] bg-zinc-900 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : freeContent.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {freeContent.map((upload, index) => (
                      <motion.div
                        key={upload.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <VideoCard
                          id={upload.id}
                          title={upload.title}
                          description={upload.description}
                          fileUrl={upload.fileUrl}
                          thumbnailUrl={upload.thumbnailUrl}
                          mimeType={upload.mimeType}
                          fileSize={upload.fileSize}
                          duration={upload.duration}
                          createdAt={upload.createdAt}
                          userId={upload.userId}
                          username={upload.username}
                          downloadCount={upload.downloadCount}
                          tags={upload.tags}
                          showCreator={false}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎬</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Free Content Yet</h3>
                    <p className="text-zinc-400">This creator hasn't shared any free content yet.</p>
                  </div>
                )}
              </TabsContent>

              {/* Premium Content Tab */}
              <TabsContent value="premium" className="mt-6">
                {productBoxLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-zinc-900 rounded-lg p-6 animate-pulse">
                        <div className="aspect-video bg-zinc-800 rounded-lg mb-4" />
                        <div className="h-4 bg-zinc-800 rounded mb-2" />
                        <div className="h-3 bg-zinc-800 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : productBoxes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {productBoxes.map((productBox, index) => (
                      <motion.div
                        key={productBox.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <EnhancedProductBoxDisplay
                          id={productBox.id}
                          title={productBox.title}
                          description={productBox.description}
                          price={productBox.price}
                          currency={productBox.currency}
                          coverImage={productBox.coverImage || productBox.customPreviewThumbnail}
                          contentItems={productBox.contentItems}
                          creatorId={productBox.userId}
                          creatorName={creator.displayName}
                          creatorUsername={creator.username}
                          isOwner={user?.uid === creator.uid}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💎</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Premium Content Yet</h3>
                    <p className="text-zinc-400">This creator hasn't created any premium content bundles yet.</p>
                    {user?.uid === creator.uid && (
                      <Button className="mt-4 bg-red-600 hover:bg-red-700" asChild>
                        <a href="/dashboard/bundles">Create Your First Bundle</a>
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
