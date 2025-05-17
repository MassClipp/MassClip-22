"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Share2,
  CheckCircle,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Clock,
  Play,
  Lock,
  Heart,
  MessageCircle,
  Eye,
  Users,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface CreatorProfileProps {
  profile: any
}

export default function CreatorProfilePage({ profile }: CreatorProfileProps) {
  const [freeClips, setFreeClips] = useState<any[]>([])
  const [paidClips, setPaidClips] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    const fetchCreatorContent = async () => {
      try {
        // Fetch free clips
        const freeClipsQuery = query(
          collection(db, "clips"),
          where("creatorId", "==", profile.uid),
          where("isPaid", "==", false),
          orderBy("createdAt", "desc"),
          limit(8),
        )

        // Fetch paid clips
        const paidClipsQuery = query(
          collection(db, "clips"),
          where("creatorId", "==", profile.uid),
          where("isPaid", "==", true),
          orderBy("createdAt", "desc"),
          limit(8),
        )

        const [freeClipsSnapshot, paidClipsSnapshot] = await Promise.all([
          getDocs(freeClipsQuery),
          getDocs(paidClipsQuery),
        ])

        const freeClipsData = freeClipsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }))

        const paidClipsData = paidClipsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }))

        setFreeClips(freeClipsData)
        setPaidClips(paidClipsData)
      } catch (error) {
        console.error("Error fetching creator content:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCreatorContent()
  }, [profile.uid])

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/creator/${profile.username}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.displayName} on MassClip`,
          text: `Check out ${profile.displayName}'s clips on MassClip`,
          url: shareUrl,
        })
      } catch (error) {
        console.error("Error sharing:", error)
        copyToClipboard(shareUrl)
      }
    } else {
      copyToClipboard(shareUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Link copied!",
      description: "Profile link copied to clipboard",
    })
  }

  // Combine clips for "All" tab
  const allClips = [...freeClips, ...paidClips].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Cover Image */}
      <div className="relative h-64 md:h-80 w-full">
        {profile.coverImage ? (
          <Image
            src={profile.coverImage || "/placeholder.svg"}
            alt={`${profile.displayName}'s cover`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black"></div>
        )}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
      </div>

      {/* Profile Header */}
      <div className="container mx-auto px-4 -mt-24 relative z-10">
        <div className="flex flex-col items-center">
          {/* Profile Image */}
          <div className="w-36 h-36 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden bg-gray-800 shadow-xl">
            {profile.profileImage ? (
              <Image
                src={profile.profileImage || "/placeholder.svg"}
                alt={profile.displayName}
                width={160}
                height={160}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-5xl font-bold">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center">
              <h1 className="text-3xl md:text-4xl font-bold">{profile.displayName}</h1>
              {profile.isVerified && <CheckCircle className="ml-2 text-blue-500 h-6 w-6" />}
            </div>
            <p className="text-gray-400 text-lg mt-1">@{profile.username}</p>

            {/* Stats */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <Play className="h-4 w-4 mr-1 text-gray-400" />
                  <span className="font-bold">{allClips.length}</span>
                </div>
                <span className="text-xs text-gray-500">Clips</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 text-gray-400" />
                  <span className="font-bold">{profile.followers || 0}</span>
                </div>
                <span className="text-xs text-gray-500">Followers</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1 text-gray-400" />
                  <span className="font-bold">{profile.totalViews || 0}</span>
                </div>
                <span className="text-xs text-gray-500">Views</span>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && <p className="mt-4 max-w-2xl mx-auto text-gray-300">{profile.bio}</p>}

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mt-6">
              <Button className="bg-crimson hover:bg-crimson/90 text-white" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Follow
              </Button>
              <Button
                variant="outline"
                className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
                size="sm"
                onClick={handleShareProfile}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
                size="sm"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>

            {/* Social Links */}
            {profile.socialLinks && Object.values(profile.socialLinks).some((link) => !!link) && (
              <div className="flex justify-center gap-4 mt-6">
                {profile.socialLinks.instagram && (
                  <a
                    href={`https://instagram.com/${profile.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {profile.socialLinks.twitter && (
                  <a
                    href={`https://twitter.com/${profile.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {profile.socialLinks.youtube && (
                  <a
                    href={`https://youtube.com/${profile.socialLinks.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
                {profile.socialLinks.website && (
                  <a
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="mt-12 pb-20">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 max-w-md mx-auto bg-gray-900/50">
              <TabsTrigger value="all">All Clips</TabsTrigger>
              <TabsTrigger value="free">Free</TabsTrigger>
              <TabsTrigger value="premium">Premium</TabsTrigger>
            </TabsList>

            {/* All Clips Tab */}
            <TabsContent value="all" className="mt-8">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <ClipCardSkeleton key={i} />
                  ))}
                </div>
              ) : allClips.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {allClips.map((clip) => (
                      <ClipCard key={clip.id} clip={clip} isPremium={clip.isPaid} />
                    ))}
                  </div>
                  {allClips.length > 8 && (
                    <div className="flex justify-center mt-8">
                      <Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800">
                        View All Clips
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No clips available yet.</p>
                </div>
              )}
            </TabsContent>

            {/* Free Clips Tab */}
            <TabsContent value="free" className="mt-8">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <ClipCardSkeleton key={i} />
                  ))}
                </div>
              ) : freeClips.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {freeClips.map((clip) => (
                      <ClipCard key={clip.id} clip={clip} isPremium={false} />
                    ))}
                  </div>
                  {freeClips.length > 8 && (
                    <div className="flex justify-center mt-8">
                      <Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800">
                        View All Free Clips
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No free clips available yet.</p>
                </div>
              )}
            </TabsContent>

            {/* Premium Clips Tab */}
            <TabsContent value="premium" className="mt-8">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <ClipCardSkeleton key={i} />
                  ))}
                </div>
              ) : paidClips.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {paidClips.map((clip) => (
                      <ClipCard key={clip.id} clip={clip} isPremium={true} />
                    ))}
                  </div>
                  {paidClips.length > 8 && (
                    <div className="flex justify-center mt-8">
                      <Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800">
                        View All Premium Clips
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No premium clips available yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// Clip Card Component
function ClipCard({ clip, isPremium }: { clip: any; isPremium: boolean }) {
  return (
    <Card className="bg-gray-900 border-gray-800 overflow-hidden hover:border-gray-700 transition-all group">
      <div className="aspect-video relative">
        <Image
          src={clip.thumbnailUrl || "/placeholder.svg?height=180&width=320&query=video+thumbnail"}
          alt={clip.title}
          fill
          className="object-cover"
        />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-crimson flex items-center justify-center">
            <Play className="h-6 w-6 text-white" fill="white" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 text-xs rounded">
          {formatDuration(clip.duration || 0)}
        </div>

        {/* Premium Badge */}
        {isPremium && (
          <div className="absolute top-2 right-2 bg-crimson px-2 py-1 text-xs font-bold rounded">
            <div className="flex items-center">
              <Lock className="h-3 w-3 mr-1" />
              PREMIUM
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-medium text-white mb-1 line-clamp-1">{clip.title}</h3>
        <div className="flex justify-between items-center text-sm text-gray-400">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>{formatTimeAgo(clip.createdAt)}</span>
          </div>
          {isPremium && clip.price && <span className="font-bold text-crimson">${clip.price.toFixed(2)}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton Loading State
function ClipCardSkeleton() {
  return (
    <Card className="bg-gray-900 border-gray-800 overflow-hidden">
      <div className="aspect-video bg-gray-800 animate-pulse"></div>
      <CardContent className="p-4">
        <div className="h-5 bg-gray-800 rounded animate-pulse mb-2"></div>
        <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3"></div>
      </CardContent>
    </Card>
  )
}

// Helper Functions
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true })
}
