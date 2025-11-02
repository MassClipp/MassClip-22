"use client"

import { useState } from "react"
import { collection, getDocs, query, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

export function VideoDiagnostic() {
  const { user } = useAuth()
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const checkVideos = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get all videos (limited to 20 for diagnostic)
      const videosQuery = query(collection(db, "videos"), limit(20))
      const snapshot = await getDocs(videosQuery)

      const videoData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log("All videos in database:", videoData)
      setVideos(videoData)
    } catch (error) {
      console.error("Error fetching videos:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50">
      <CardHeader>
        <CardTitle>Video Diagnostic</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={checkVideos} disabled={loading}>
          {loading ? "Checking..." : "Check Videos in Database"}
        </Button>

        {videos.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-zinc-400">Found {videos.length} videos:</p>
            {videos.map((video) => (
              <div key={video.id} className="text-xs bg-zinc-800 p-2 rounded">
                <p>ID: {video.id}</p>
                <p>Title: {video.title}</p>
                <p>Username: {video.username || "N/A"}</p>
                <p>UID: {video.uid || "N/A"}</p>
                <p>Type: {video.type}</p>
                <p>Status: {video.status}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
