"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Film,
  Lock,
  Calendar,
  Share2,
  Settings,
  Instagram,
  Twitter,
  Globe,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
  Upload,
  BarChart3,
} from "lucide-react"
import VimeoCard from "@/components/vimeo-card"
import PremiumVideoCard from "@/components/premium-video-card"
import PremiumPricingControl from "@/components/premium-pricing-control"
import StripeStatus from "@/components/stripe-status"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface CreatorProfileRedesignedProps {
  creatorId: string
  creatorData: any
  initialFreeVideos: any[]
  initialPremiumVideos: any[]
}

export default function CreatorProfileRedesigned({
  creatorId,
  creatorData,
  initialFreeVideos,
  initialPremiumVideos,
}: CreatorProfileRedesignedProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "free")
  const [isOwner, setIsOwner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [purchasedVideos, setPurchasedVideos] = useState<string[]>([])

  // Check if current user is the profile owner
  useEffect(() => {
    setIsOwner(user?.uid === creatorId)
  }, [user, creatorId])

  // Check Stripe connection status
  useEffect(() => {
    const checkStripeStatus = async () => {
      if (!isOwner) return

      try {
        const userDoc = await getDoc(doc(db, "users", creatorId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setStripeConnected(!!userData.stripeAccountId && userData.stripeOnboardingComplete)
        }
      } catch (error) {
        console.error("Error checking Stripe status:", error)
      }
    }

    checkStripeStatus()
  }, [isOwner, creatorId])

  // Fetch purchased videos for the current user
  useEffect(() => {
    const fetchPurchasedVideos = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setPurchasedVideos(userData.purchasedVideos || [])
        }
      } catch (error) {
        console.error("Error fetching purchased videos:", error)
      }
    }

    fetchPurchasedVideos()
  }, [user])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    // You could add a toast notification here
  }

  const stats = [
    {
      label: "Free Clips",
      value: creatorData.freeVideosCount || 0,
      icon: <Film className="h-4 w-4" />,
      color: "text-blue-500",
    },
    {
      label: "Premium Clips",
      value: creatorData.premiumVideosCount || 0,
      icon: <Lock className="h-4 w-4" />,
      color: "text-amber-500",
    },
    {
      label: "Total Views",
      value: creatorData.totalViews ? creatorData.totalViews.toLocaleString() : "0",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-green-500",
    },
    {
      label: "Subscribers",
      value: creatorData.subscriberCount || 0,
      icon: <Users className="h-4 w-4" />,
      color: "text-purple-500",
    },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-black to-black h-96" />

        {/* Content */}
        <div className="relative container mx-auto px-4 pt-20 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
            {/* Profile Info */}
            <div className="flex items-center gap-6">
              <Avatar className="h-32 w-32 border-4 border-zinc-800">
                <AvatarImage src={creatorData.profilePic || "/placeholder.svg"} alt={creatorData.displayName} />
                <AvatarFallback className="text-4xl bg-zinc-800">
                  {creatorData.displayName?.charAt(0) || creatorData.username?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{creatorData.displayName || creatorData.username}</h1>
                  {creatorData.verified && <CheckCircle className="h-6 w-6 text-blue-500" />}
                  {creatorData.isPro && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-black">PRO</Badge>
                  )}
                </div>

                <p className="text-zinc-400 mb-3">@{creatorData.username}</p>

                {creatorData.bio && <p className="text-zinc-300 max-w-2xl">{creatorData.bio}</p>}

                {/* Social Links */}
                <div className="flex items-center gap-3 mt-4">
                  {creatorData.socialLinks?.instagram && (
                    <a
                      href={`https://instagram.com/${creatorData.socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                    >
                      <Instagram className="h-4 w-4 text-zinc-400" />
                    </a>
                  )}
                  {creatorData.socialLinks?.twitter && (
                    <a
                      href={`https://twitter.com/${creatorData.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                    >
                      <Twitter className="h-4 w-4 text-zinc-400" />
                    </a>
                  )}
                  {creatorData.socialLinks?.website && (
                    <a
                      href={creatorData.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                    >
                      <Globe className="h-4 w-4 text-zinc-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 ml-auto">
              <Button variant="outline" size="sm" onClick={handleShare} className="border-zinc-700 hover:bg-zinc-800">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/profile")}
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => router.push("/dashboard/upload")}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">{stat.label}</span>
                    <span className={cn("", stat.color)}>{stat.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Member Since */}
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar className="h-4 w-4" />
            <span>Member since {format(creatorData.createdAt?.toDate() || new Date(), "MMMM yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="container mx-auto px-4 pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="bg-zinc-900/50 border border-zinc-800/50 p-1">
            <TabsTrigger value="free" className="data-[state=active]:bg-zinc-800">
              <Film className="h-4 w-4 mr-2" />
              Free Clips
            </TabsTrigger>
            <TabsTrigger value="premium" className="data-[state=active]:bg-zinc-800">
              <Lock className="h-4 w-4 mr-2" />
              Premium Clips
            </TabsTrigger>
            {isOwner && (
              <>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-zinc-800">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-800">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="free" className="mt-6">
            {initialFreeVideos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {initialFreeVideos.map((video) => (
                  <VimeoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Film className="h-12 w-12 text-zinc-600 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No free content yet</h3>
                  <p className="text-zinc-400 text-center max-w-md">
                    {isOwner
                      ? "Upload your first free video to get started"
                      : "This creator hasn't uploaded any free content yet"}
                  </p>
                  {isOwner && (
                    <Button
                      onClick={() => router.push("/dashboard/upload")}
                      className="mt-4 bg-red-600 hover:bg-red-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Video
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="premium" className="mt-6">
            {!isOwner && !stripeConnected && (
              <Card className="bg-amber-500/10 border-amber-500/20 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-medium text-white mb-1">Premium Content Not Available</h3>
                      <p className="text-zinc-400">This creator hasn't set up premium content yet. Check back later!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isOwner && !stripeConnected && (
              <Card className="bg-amber-500/10 border-amber-500/20 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white mb-1">Connect Stripe to Enable Premium Content</h3>
                      <p className="text-zinc-400 mb-4">
                        You need to connect your Stripe account to receive payments for premium content.
                      </p>
                      <Button
                        onClick={() => router.push("/dashboard/earnings")}
                        className="bg-amber-500 hover:bg-amber-600 text-black"
                      >
                        Set Up Payments
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {initialPremiumVideos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {initialPremiumVideos.map((video) => (
                  <PremiumVideoCard
                    key={video.id}
                    video={video}
                    creatorId={creatorId}
                    creatorUsername={creatorData.username}
                    isPurchased={purchasedVideos.includes(video.id)}
                    price={creatorData.premiumPrice || 4.99}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Lock className="h-12 w-12 text-zinc-600 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No premium content yet</h3>
                  <p className="text-zinc-400 text-center max-w-md">
                    {isOwner
                      ? "Upload premium videos to start earning"
                      : "This creator hasn't uploaded any premium content yet"}
                  </p>
                  {isOwner && stripeConnected && (
                    <Button
                      onClick={() => router.push("/dashboard/upload?premium=true")}
                      className="mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Premium Video
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isOwner && (
            <>
              <TabsContent value="analytics" className="mt-6">
                <Card className="bg-zinc-900/50 border-zinc-800/50">
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center">
                      <BarChart3 className="h-12 w-12 text-zinc-600 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Analytics Coming Soon</h3>
                      <p className="text-zinc-400 text-center max-w-md">
                        Detailed analytics about your content performance will be available here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6 space-y-6">
                {/* Stripe Status */}
                <StripeStatus />

                {/* Premium Pricing */}
                {stripeConnected && (
                  <PremiumPricingControl creatorId={creatorId} username={creatorData.username} isOwner={true} />
                )}

                {/* Quick Actions */}
                <Card className="bg-zinc-900/50 border-zinc-800/50">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/profile")}
                        className="justify-start border-zinc-700 hover:bg-zinc-800"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile Settings
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/earnings")}
                        className="justify-start border-zinc-700 hover:bg-zinc-800"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        View Earnings Dashboard
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard")}
                        className="justify-start border-zinc-700 hover:bg-zinc-800"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Go to Dashboard
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/upload")}
                        className="justify-start border-zinc-700 hover:bg-zinc-800"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Content
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
