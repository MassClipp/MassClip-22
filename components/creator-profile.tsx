"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import CreatorVideosGrid from "@/components/creator-videos-grid"
import { Edit, Share2, Upload } from "lucide-react"

interface CreatorProfileProps {
  username: string
}

interface CreatorData {
  uid: string
  displayName: string
  username: string
  photoURL: string
  bio: string
  socialLinks: {
    twitter?: string
    instagram?: string
    youtube?: string
    tiktok?: string
  }
  followers: number
  following: number
}

export default function CreatorProfile({ username }: CreatorProfileProps) {
  const [creator, setCreator] = useState<CreatorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchCreator = async () => {
      try {
        // Query Firestore for the user with this username
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("username", "==", username))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          // No user found with this username
          router.push("/not-found")
          return
        }

        const creatorDoc = querySnapshot.docs[0]
        const creatorData = {
          uid: creatorDoc.id,
          ...creatorDoc.data(),
        } as CreatorData

        setCreator(creatorData)

        // Check if this is the current user's profile
        if (user && user.uid === creatorData.uid) {
          setIsOwnProfile(true)
        }
      } catch (error) {
        console.error("Error fetching creator:", error)
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchCreator()
    }
  }, [username, user, router])

  const handleEditProfile = () => {
    router.push("/dashboard/profile/edit")
  }

  const handleUpload = () => {
    router.push("/dashboard/upload")
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!creator) {
    return <div>Creator not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative">
        {/* Cover image/gradient */}
        <div className="h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-r from-zinc-900 via-red-900/30 to-zinc-900">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>

        {/* Profile info */}
        <div className="relative px-4 -mt-16 md:-mt-20">
          <div className="flex flex-col md:flex-row items-center md:items-end">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden bg-zinc-800">
              {creator.photoURL ? (
                <img
                  src={creator.photoURL || "/placeholder.svg"}
                  alt={creator.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-500">
                  {creator.displayName?.charAt(0) || username.charAt(0)}
                </div>
              )}
            </div>

            {/* Creator info */}
            <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left flex-1">
              <h1 className="text-2xl md:text-3xl font-bold">{creator.displayName || username}</h1>
              <p className="text-zinc-400">@{username}</p>
            </div>

            {/* Action buttons */}
            <div className="mt-4 md:mt-0 flex space-x-2">
              {isOwnProfile ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleEditProfile}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    size="sm"
                    onClick={handleUpload}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    size="sm"
                  >
                    Follow
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          {creator.bio && (
            <div className="mt-6 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4">
              <p className="text-zinc-300">{creator.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Videos grid */}
      <CreatorVideosGrid creatorId={creator.uid} isOwnProfile={isOwnProfile} />
    </div>
  )
}
