"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Eye } from "lucide-react"
import { ProfileViewSystem } from "@/lib/profile-view-system"

const Dashboard = () => {
  const { user } = useAuth()
  const [profileViews, setProfileViews] = useState(0)

  useEffect(() => {
    const fetchProfileViews = async () => {
      if (user?.uid) {
        try {
          const stats = await ProfileViewSystem.getProfileViewStats(user.uid)
          setProfileViews(stats.totalViews)
        } catch (error) {
          console.error("Error fetching profile views:", error)
          // Fallback to direct Firestore query
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setProfileViews(userDoc.data().profileViews || 0)
          }
        }
      }
    }

    fetchProfileViews()
  }, [user?.uid])

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Profile Views</p>
              <p className="text-white text-3xl font-bold">{profileViews.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">All time</p>
            </div>
            <Eye className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        {/* Add more cards here */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-white">Other Stats</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-white">More Stats</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
