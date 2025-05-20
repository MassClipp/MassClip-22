"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function DirectVideoPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const creatorId = searchParams.get("creatorId")
  const isPremium = searchParams.get("isPremium") === "true"

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVideo = async () => {
      if (!creatorId || !id) return

      try {
        const collectionName = isPremium ? "premiumClips" : "freeClips"
        const videoRef = doc(db, `users/${creatorId}/${collectionName}/${id}`)
        const videoDoc = await getDoc(videoRef)

        if (videoDoc.exists()) {
          setVideoUrl(videoDoc.data().url)
        }
      } catch (error) {
        console.error("Error fetching video:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [id, creatorId, isPremium])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-zinc-700 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Video not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-sm" style={{ aspectRatio: "9/16" }}>
        <video src={videoUrl} controls autoPlay playsInline className="w-full h-full object-cover rounded-lg">
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  )
}
