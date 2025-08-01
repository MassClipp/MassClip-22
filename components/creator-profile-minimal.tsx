"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Users, ExternalLink, Settings } from "lucide-react"
import { motion } from "framer-motion"
import UnlockButton from "@/components/unlock-button"
import { useRouter } from "next/navigation"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  createdAt: string
  socialLinks: {
    twitter?: string
    instagram?: string
    youtube?: string
    tiktok?: string
    website?: string
  }
  email?: string
  updatedAt?: string
}

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  currency: string
  coverImage?: string
  active: boolean
  contentItems: string[]
  priceId?: string
  createdAt?: any
  updatedAt?: any
}

interface CreatorProfileMinimalProps {
  creator: Creator
}

export default function CreatorProfileMinimal({ creator }: CreatorProfileMinimalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if current user is the owner of this profile
  const isOwner = user && user.uid === creator.uid

  // Fetch creator's product boxes
  const fetchProductBoxes = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Profile] Fetching product boxes for creator: ${creator.uid}`)

      const response = await fetch(`/api/creator/${creator.uid}/product-boxes`)

      if (!response.ok) {
        if (response.status === 404) {
          console.log("📦 [Profile] No product boxes found for creator")
          setProductBoxes([])
          return
        }
        throw new Error(`Failed to fetch product boxes: ${response.status}`)
      }

      const data = await response.json()
      const boxes = data.productBoxes || []

      // Only show active product boxes to visitors
      const visibleBoxes = isOwner ? boxes : boxes.filter((box: ProductBox) => box.active)

      setProductBoxes(visibleBoxes)
      console.log(`✅ [Profile] Loaded ${visibleBoxes.length} product boxes`)
    } catch (err) {
      console.error("❌ [Profile] Error fetching product boxes:", err)
      setError(err instanceof Error ? err.message : "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (creator.uid) {
      fetchProductBoxes()
    }
  }, [creator.uid, isOwner])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    } catch {
      return "Recently"
    }
  }

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "twitter":
        return "🐦"
      case "instagram":
        return "📷"
      case "youtube":
        return "📺"
      case "tiktok":
        return "🎵"
      case "website":
        return "🌐"
      default:
        return "🔗"
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Avatar className="w-32 h-32 mx-auto mb-6 border-4 border-red-600">
            <AvatarImage src={creator.profilePic || "/placeholder-user.jpg"} alt={creator.displayName} />
            <AvatarFallback className="text-2xl bg-zinc-800 text-white">
              {creator.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-4xl font-bold mb-2">{creator.displayName}</h1>
          <p className="text-xl text-zinc-400 mb-4">@{creator.username}</p>

          {creator.bio && <p className="text-zinc-300 max-w-2xl mx-auto mb-6">{creator.bio}</p>}

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-zinc-400">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm">Member since {formatDate(creator.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Users className="w-4 h-4" />
              <span className="text-sm">
                {productBoxes.length} bundle{productBoxes.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Social Links */}
          {creator.socialLinks && Object.keys(creator.socialLinks).length > 0 && (
            <div className="flex items-center justify-center gap-4 mb-8">
              {Object.entries(creator.socialLinks).map(([platform, url]) => {
                if (!url) return null
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
                  >
                    <span>{getSocialIcon(platform)}</span>
                    <span className="capitalize">{platform}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )
              })}
            </div>
          )}

          {/* Owner Actions */}
          {isOwner && (
            <div className="mb-8">
              <Button onClick={() => router.push("/dashboard/bundles")} className="bg-red-600 hover:bg-red-700">
                <Settings className="w-4 h-4 mr-2" />
                Manage Bundles
              </Button>
            </div>
          )}
        </motion.div>

        <Separator className="bg-zinc-800 mb-8" />

        {/* Premium Content Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Premium Content</h2>
            {isOwner && (
              <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                Owner View
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse">
                  <div className="aspect-video bg-zinc-800 rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-zinc-800 rounded mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-2/3 mb-4" />
                    <div className="h-10 bg-zinc-800 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={fetchProductBoxes} variant="outline" className="border-zinc-700 bg-transparent">
                Try Again
              </Button>
            </div>
          ) : productBoxes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-medium text-white mb-2">
                {isOwner ? "No Bundles Created Yet" : "No Premium Content Available"}
              </h3>
              <p className="text-zinc-400 mb-4">
                {isOwner
                  ? "Create your first premium content bundle to get started"
                  : "This creator hasn't published any premium content yet"}
              </p>
              {isOwner && (
                <Button onClick={() => router.push("/dashboard/bundles")} className="bg-red-600 hover:bg-red-700">
                  Create Your First Bundle
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productBoxes.map((productBox, index) => (
                <motion.div
                  key={productBox.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden">
                    {/* Cover Image */}
                    <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                      {productBox.coverImage ? (
                        <img
                          src={productBox.coverImage || "/placeholder.svg"}
                          alt={productBox.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-4xl">📦</div>
                        </div>
                      )}
                      {!productBox.active && isOwner && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="bg-yellow-600 text-white">
                            Inactive
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{productBox.title}</h3>
                      {productBox.description && (
                        <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{productBox.description}</p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-green-400">
                          ${(productBox.price / 100).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {productBox.contentItems.length} item{productBox.contentItems.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      <UnlockButton
                        productBoxId={productBox.id}
                        priceId={productBox.priceId || ""}
                        price={productBox.price}
                        currency={productBox.currency}
                        title="Unlock"
                        disabled={!productBox.priceId}
                        creatorUid={creator.uid} // Pass creator UID for ownership check
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
