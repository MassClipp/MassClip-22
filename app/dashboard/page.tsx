"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Film,
  Lock,
  Upload,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  ExternalLink,
  Zap,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { useRecentVideos } from "@/hooks/use-recent-videos"
import { useToast } from "@/components/ui/use-toast"

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
}

// Motivational quotes
const quotes = [
  {
    text: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
  },
  {
    text: "Your time is limited, don't waste it living someone else's life.",
    author: "Steve Jobs",
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill",
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [userData, setUserData] = useState<any>(null)
  const [stats, setStats] = useState({
    freeVideos: 0,
    premiumVideos: 0,
    totalViews: 0,
    totalEarnings: 0,
    recentSales: 0,
  })
  const {
    videos: recentVideos,
    loading: loadingVideos,
    error: videosError,
    refetch: refetchVideos,
  } = useRecentVideos(5)
  const [loading, setLoading] = useState(true)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Random quote
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]

  // Function to refresh data
  const refreshData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setRefreshing(true)

      // Fetch user data
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData(data)
        setStripeConnected(!!data.stripeAccountId && data.stripeOnboardingComplete)
      }

      // Fetch video counts
      const freeVideosQuery = query(
        collection(db, "videos"),
        where("uid", "==", user.uid),
        where("type", "==", "free"),
        where("status", "==", "active"),
      )

      const premiumVideosQuery = query(
        collection(db, "videos"),
        where("uid", "==", user.uid),
        where("type", "==", "premium"),
        where("status", "==", "active"),
      )

      const [freeVideosSnapshot, premiumVideosSnapshot] = await Promise.all([
        getDocs(freeVideosQuery),
        getDocs(premiumVideosQuery),
      ])

      // Also refresh the recent videos
      refetchVideos()

      // Calculate total views
      let totalViews = 0
      freeVideosSnapshot.docs.concat(premiumVideosSnapshot.docs).forEach((doc) => {
        totalViews += doc.data().views || 0
      })

      // Fetch earnings data
      const salesQuery = query(collection(db, "users", user.uid, "sales"), orderBy("purchasedAt", "desc"), limit(50))

      const salesSnapshot = await getDocs(salesQuery)
      const salesData = salesSnapshot.docs.map((doc) => {
        const data = doc.data()
        let purchasedAt
        if (data.purchasedAt instanceof Timestamp) {
          purchasedAt = data.purchasedAt.toDate()
        } else if (data.purchasedAt && typeof data.purchasedAt.toDate === "function") {
          purchasedAt = data.purchasedAt.toDate()
        } else if (data.purchasedAt && data.purchasedAt._seconds) {
          purchasedAt = new Date(data.purchasedAt._seconds * 1000)
        } else {
          purchasedAt = new Date()
        }

        return {
          ...data,
          purchasedAt,
        }
      })

      // Calculate total earnings
      const totalEarnings = salesData.reduce((sum, sale) => sum + (sale.netAmount || 0), 0)

      // Calculate recent sales (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentSales = salesData.filter((sale) => sale.purchasedAt >= thirtyDaysAgo).length

      setStats({
        freeVideos: freeVideosSnapshot.size,
        premiumVideos: premiumVideosSnapshot.size,
        totalViews,
        totalEarnings,
        recentSales,
      })

      if (refreshing) {
        toast({
          title: "Dashboard refreshed",
          description: "Your dashboard data has been updated.",
        })
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      if (refreshing) {
        toast({
          title: "Refresh failed",
          description: "There was an error refreshing your dashboard data.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    refreshData()
  }, [user])

  // Handle video error
  useEffect(() => {
    if (videosError) {
      console.error("Error loading recent videos:", videosError)
      toast({
        title: "Error loading videos",
        description: "There was a problem loading your recent videos. Please try refreshing.",
        variant: "destructive",
      })
    }
  }, [videosError, toast])

  if (loading && recentVideos.length === 0 && !loadingVideos) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Creator Dashboard
          </h1>
          <p className="text-zinc-400 mt-1">Welcome back, {userData?.displayName || user?.displayName || "Creator"}</p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/dashboard/upload")}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-none shadow-lg shadow-red-900/20"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Content
          </Button>

          <Button
            variant="outline"
            onClick={() => refreshData()}
            disabled={refreshing}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          {userData?.username && (
            <Button
              variant="outline"
              onClick={() => window.open(`/creator/${userData.username}`, "_blank")}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          )}
        </div>
      </motion.div>

      {!stripeConnected && (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-500/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500/20 p-3 rounded-full">
                  <AlertCircle className="h-6 w-6 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-white">Connect Stripe to Receive Payments</h3>
                  <p className="text-zinc-400">
                    You need to connect your Stripe account to receive payments for your premium content.
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard/earnings")}
                    className="mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black border-none shadow-lg shadow-amber-900/20"
                  >
                    Set Up Payments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative group">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/0 to-blue-600/0 group-hover:from-blue-600/5 group-hover:via-blue-600/10 group-hover:to-blue-600/5 transition-all duration-700"></div>
          <CardHeader className="pb-2 relative">
            <CardDescription>Free Videos</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Film className="h-5 w-5 text-blue-500 mr-2" />
              {stats.freeVideos}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm text-zinc-500">Public content</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative group">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/0 via-amber-600/0 to-amber-600/0 group-hover:from-amber-600/5 group-hover:via-amber-600/10 group-hover:to-amber-600/5 transition-all duration-700"></div>
          <CardHeader className="pb-2 relative">
            <CardDescription>Premium Videos</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Lock className="h-5 w-5 text-amber-500 mr-2" />
              {stats.premiumVideos}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm text-zinc-500">Paid content</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative group">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/0 via-green-600/0 to-green-600/0 group-hover:from-green-600/5 group-hover:via-green-600/10 group-hover:to-green-600/5 transition-all duration-700"></div>
          <CardHeader className="pb-2 relative">
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              {stats.totalViews.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm text-zinc-500">Across all videos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative group">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/0 to-purple-600/0 group-hover:from-purple-600/5 group-hover:via-purple-600/10 group-hover:to-purple-600/5 transition-all duration-700"></div>
          <CardHeader className="pb-2 relative">
            <CardDescription>Total Earnings</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="h-5 w-5 text-purple-500 mr-2" />${stats.totalEarnings.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm text-zinc-500">
              {stats.recentSales} {stats.recentSales === 1 ? "sale" : "sales"} in 30 days
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm lg:col-span-2 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
          <CardHeader className="relative">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Content</CardTitle>
                <CardDescription>Your most recently uploaded videos</CardDescription>
              </div>
              {loadingVideos && (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-500"></div>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative">
            {recentVideos.length > 0 ? (
              <div className="space-y-4">
                {recentVideos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="aspect-[9/16] w-16 bg-zinc-800 rounded-md overflow-hidden relative">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl || "/placeholder.svg"}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <Film className="h-6 w-6 text-zinc-600" />
                        </div>
                      )}
                      {video.type === "premium" ? (
                        <div className="absolute top-1 right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[10px] px-1 rounded-sm font-medium">
                          PREMIUM
                        </div>
                      ) : (
                        <div className="absolute top-1 right-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] px-1 rounded-sm font-medium">
                          FREE
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">{video.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(video.createdAt, "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {video.views || 0} views
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : loadingVideos ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Film className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-white mb-1">No videos yet</h3>
                <p className="text-zinc-500 mb-4">Upload your first video to get started</p>
                <Button
                  onClick={() => router.push("/dashboard/upload")}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-none shadow-lg shadow-red-900/20"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Video
                </Button>
              </div>
            )}
          </CardContent>
          {recentVideos.length > 0 && (
            <CardFooter className="border-t border-zinc-800/50 px-6 py-4 relative">
              <Button
                variant="ghost"
                className="w-full justify-center text-zinc-400 hover:text-white hover:bg-zinc-800"
                onClick={() => userData?.username && window.open(`/creator/${userData.username}`, "_blank")}
              >
                View All Videos
              </Button>
            </CardFooter>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
            <CardHeader className="relative">
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              <Button
                onClick={() => router.push("/dashboard/upload?premium=true")}
                className="w-full justify-start bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black border-none shadow-lg shadow-amber-900/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Premium Video
              </Button>

              <Button
                onClick={() => router.push("/dashboard/upload")}
                className="w-full justify-start bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-none shadow-lg shadow-red-900/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Free Video
              </Button>

              <Button
                onClick={() => router.push("/dashboard/earnings")}
                variant="outline"
                className="w-full justify-start border-zinc-700 hover:bg-zinc-800"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                View Earnings
              </Button>

              <Button
                onClick={() => router.push("/dashboard/profile")}
                variant="outline"
                className="w-full justify-start border-zinc-700 hover:bg-zinc-800"
              >
                <Film className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-amber-600/5 to-purple-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-red-500/20 to-amber-500/20 p-2 rounded-full">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-zinc-300 italic mb-2">"{randomQuote.text}"</p>
                  <p className="text-xs text-zinc-500">— {randomQuote.author}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  )
}
