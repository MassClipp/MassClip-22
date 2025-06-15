"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface RealTimeStats {
  totalDownloads: number
  totalEarnings: number
  totalVideos: number
  profileViews: number
  totalSales: number
  thisMonthSales: number
  thisMonthEarnings: number
  recentDownloads: any[]
  topPerformingVideos: any[]
  loading: boolean
  error: string | null
}

export function useRealTimeStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<RealTimeStats>({
    totalDownloads: 0,
    totalEarnings: 0,
    totalVideos: 0,
    profileViews: 0,
    totalSales: 0,
    thisMonthSales: 0,
    thisMonthEarnings: 0,
    recentDownloads: [],
    topPerformingVideos: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!user) {
      setStats((prev) => ({ ...prev, loading: false }))
      return
    }

    console.log("🔄 Setting up real-time stats listeners for user:", user.uid)

    const unsubscribers: (() => void)[] = []

    // Listen to user document for main stats
    const userDocRef = doc(db, "users", user.uid)
    const unsubscribeUser = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data()
          console.log("📊 Real user stats from database:", userData)

          setStats((prev) => ({
            ...prev,
            totalDownloads: userData.totalDownloads || 0,
            totalEarnings: userData.totalEarnings || 0,
            totalVideos: userData.totalVideos || 0,
            profileViews: userData.profileViews || 0, // Use actual database value
            totalSales: userData.totalSales || 0,
            loading: false,
          }))
        } else {
          console.log("❌ User document does not exist")
          setStats((prev) => ({ ...prev, loading: false }))
        }
      },
      (error) => {
        console.error("Error listening to user stats:", error)
        setStats((prev) => ({ ...prev, error: error.message, loading: false }))
      },
    )
    unsubscribers.push(unsubscribeUser)

    // Listen to monthly stats for current month
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const monthlyStatsRef = doc(db, "analytics", user.uid, "monthly_stats", currentMonth)

    const unsubscribeMonthly = onSnapshot(
      monthlyStatsRef,
      (doc) => {
        if (doc.exists()) {
          const monthlyData = doc.data()
          console.log("📅 Monthly stats updated:", monthlyData)

          setStats((prev) => ({
            ...prev,
            thisMonthSales: monthlyData.sales || 0,
            thisMonthEarnings: monthlyData.sales_amount || 0,
          }))
        }
      },
      (error) => {
        console.error("Error listening to monthly stats:", error)
      },
    )
    unsubscribers.push(unsubscribeMonthly)

    // Listen to recent downloads
    const downloadsQuery = query(
      collection(db, "analytics", user.uid, "downloads"),
      orderBy("timestamp", "desc"),
      limit(10),
    )

    const unsubscribeDownloads = onSnapshot(
      downloadsQuery,
      (snapshot) => {
        const recentDownloads = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }))

        console.log("📥 Recent downloads updated:", recentDownloads.length)
        setStats((prev) => ({ ...prev, recentDownloads }))
      },
      (error) => {
        console.error("Error listening to downloads:", error)
      },
    )
    unsubscribers.push(unsubscribeDownloads)

    // Listen to user's uploads for top performing videos
    const uploadsQuery = query(
      collection(db, "uploads"),
      where("userId", "==", user.uid),
      orderBy("downloadCount", "desc"),
      limit(5),
    )

    const unsubscribeUploads = onSnapshot(
      uploadsQuery,
      (snapshot) => {
        const topPerformingVideos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        console.log("🏆 Top performing videos updated:", topPerformingVideos.length)
        setStats((prev) => ({ ...prev, topPerformingVideos }))
      },
      (error) => {
        console.error("Error listening to uploads:", error)
      },
    )
    unsubscribers.push(unsubscribeUploads)

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up real-time stats listeners")
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [user])

  return stats
}
