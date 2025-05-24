"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Film, Lock, Upload, DollarSign, TrendingUp, Clock, AlertCircle, Plus, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [userData, setUserData] = useState<any>(null)
  const [stats, setStats] = useState({
    freeVideos: 0,
    premiumVideos: 0,
    totalViews: 0,
    totalEarnings: 0,
    recentSales: 0,
  })
  const [recentVideos, setRecentVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stripeConnected, setStripeConnected] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

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

        // Fetch recent videos
        const recentVideosQuery = query(
          collection(db, "videos"),
          where("uid", "==", user.uid),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(5),
        )

        const recentVideosSnapshot = await getDocs(recentVideosQuery)
        const recentVideosData = recentVideosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }))

        setRecentVideos(recentVideosData)

        // Calculate total views
        let totalViews = 0
        freeVideosSnapshot.docs.concat(premiumVideosSnapshot.docs).forEach((doc) => {
          totalViews += doc.data().views || 0
        })

        // Fetch earnings data
        const salesQuery = query(collection(db, "users", user.uid, "sales"), orderBy("purchasedAt", "desc"), limit(50))

        const salesSnapshot = await getDocs(salesQuery)
        const salesData = salesSnapshot.docs.map((doc) => ({
          ...doc.data(),
          purchasedAt: doc.data().purchasedAt?.toDate() || new Date(),
        }))

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
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Dashboard</h1>
          <p className="text-zinc-400 mt-1">Welcome back, {userData?.displayName || user?.displayName || "Creator"}</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => router.push("/dashboard/upload")} className="bg-red-600 hover:bg-red-700">
            <Upload className="h-4 w-4 mr-2" />
            Upload Content
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
      </div>

      {!stripeConnected && (
        <Card className="bg-amber-500/10 border-amber-500/20">
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
                  className="mt-2 bg-amber-500 hover:bg-amber-600 text-black"
                >
                  Set Up Payments
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Free Videos</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Film className="h-5 w-5 text-blue-500 mr-2" />
              {stats.freeVideos}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Public content</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Premium Videos</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Lock className="h-5 w-5 text-amber-500 mr-2" />
              {stats.premiumVideos}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Paid content</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              {stats.totalViews.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Across all videos</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Earnings</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="h-5 w-5 text-purple-500 mr-2" />${stats.totalEarnings.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              {stats.recentSales} {stats.recentSales === 1 ? "sale" : "sales"} in 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Content</CardTitle>
            <CardDescription>Your most recently uploaded videos</CardDescription>
          </CardHeader>
          <CardContent>
            {recentVideos.length > 0 ? (
              <div className="space-y-4">
                {recentVideos.map((video) => (
                  <div key={video.id} className="flex items-start gap-4">
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
                      {video.type === "premium" && (
                        <div className="absolute top-1 right-1 bg-amber-500 text-black text-[10px] px-1 rounded-sm font-medium">
                          PRO
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
            ) : (
              <div className="text-center py-8">
                <Film className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-white mb-1">No videos yet</h3>
                <p className="text-zinc-500 mb-4">Upload your first video to get started</p>
                <Button onClick={() => router.push("/dashboard/upload")} className="bg-red-600 hover:bg-red-700">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Video
                </Button>
              </div>
            )}
          </CardContent>
          {recentVideos.length > 0 && (
            <CardFooter className="border-t border-zinc-800/50 px-6 py-4">
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

        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => router.push("/dashboard/upload?premium=true")}
              className="w-full justify-start bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Premium Video
            </Button>

            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="w-full justify-start bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
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
      </div>
    </div>
  )
}
