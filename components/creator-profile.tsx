"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  freeClips: any[]
  paidClips: any[]
  createdAt: any
}

interface CreatorProfileProps {
  username: string
}

export function CreatorProfile({ username }: CreatorProfileProps) {
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()

  const isOwner = user && creator && user.uid === creator.uid

  useEffect(() => {
    async function fetchCreator() {
      try {
        setLoading(true)

        // Query Firestore for the creator with this username
        const creatorsRef = collection(db, "creators")
        const querySnapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

        if (querySnapshot.empty) {
          setError("Creator not found")
          setLoading(false)
          return
        }

        const creatorData = querySnapshot.docs[0].data() as Creator
        setCreator(creatorData)
      } catch (error) {
        console.error("Error fetching creator:", error)
        setError("Error loading creator profile")
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchCreator()
    }
  }, [username])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !creator) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{error || "Creator not found"}</h2>
        <p className="text-gray-600">The creator profile you're looking for doesn't exist or has been removed.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-4 border-white">
              {creator.profilePic ? (
                <Image
                  src={creator.profilePic || "/placeholder.svg"}
                  alt={creator.displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                  {creator.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold">{creator.displayName}</h1>
              <p className="text-blue-100">@{creator.username}</p>

              {creator.bio && <p className="mt-2 max-w-2xl">{creator.bio}</p>}
            </div>

            <div className="ml-auto mt-4 md:mt-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/creator/${creator.username}`)
                  alert("Profile link copied to clipboard!")
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md transition"
              >
                Share Profile
              </button>

              {isOwner && (
                <button className="ml-2 bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-gray-100 transition">
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="free" className="p-6">
          <TabsList className="mb-6">
            <TabsTrigger value="free">Free Clips</TabsTrigger>
            <TabsTrigger value="premium">Premium Clips</TabsTrigger>
          </TabsList>

          <TabsContent value="free">
            {creator.freeClips && creator.freeClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.freeClips.map((clip, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="aspect-video relative">
                      {/* Placeholder for video thumbnail */}
                      <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">Video Thumbnail</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-lg">{clip.title || `Free Clip ${index + 1}`}</h3>
                      <p className="text-gray-600 text-sm mt-1">{clip.description || "No description available"}</p>
                      <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition">
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-medium text-gray-700">No Free Clips Available</h3>
                <p className="text-gray-500 mt-2">This creator hasn't added any free clips yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="premium">
            {creator.paidClips && creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.paidClips.map((clip, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="aspect-video relative">
                      {/* Placeholder for video thumbnail with blur/lock overlay */}
                      <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-white">Premium Content</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-lg">{clip.title || `Premium Clip ${index + 1}`}</h3>
                      <p className="text-gray-600 text-sm mt-1">{clip.description || "No description available"}</p>
                      <button className="mt-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:from-yellow-600 hover:to-yellow-700 transition">
                        Unlock Premium
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-medium text-gray-700">No Premium Clips Available</h3>
                <p className="text-gray-500 mt-2">This creator hasn't added any premium clips yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
