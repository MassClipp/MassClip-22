"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function UploadDebug() {
  const { user } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkUploads = async () => {
    if (!user) {
      setDebugInfo({ error: "User not authenticated" })
      return
    }

    setIsLoading(true)
    try {
      // Check free clips
      const freeQuery = query(collection(db, `users/${user.uid}/freeClips`), orderBy("createdAt", "desc"), limit(5))
      const freeSnapshot = await getDocs(freeQuery)
      const freeClips = freeSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Check premium clips
      const premiumQuery = query(
        collection(db, `users/${user.uid}/premiumClips`),
        orderBy("createdAt", "desc"),
        limit(5),
      )
      const premiumSnapshot = await getDocs(premiumQuery)
      const premiumClips = premiumSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      setDebugInfo({
        userId: user.uid,
        username: user.displayName,
        freeClipsCount: freeSnapshot.size,
        premiumClipsCount: premiumSnapshot.size,
        freeClips,
        premiumClips,
      })
    } catch (error) {
      console.error("Debug error:", error)
      setDebugInfo({ error: String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mt-8">
      <h3 className="text-lg font-medium text-white mb-4">Upload Debug Tool</h3>

      <Button onClick={checkUploads} disabled={isLoading} className="mb-4">
        {isLoading ? "Checking..." : "Check My Uploads"}
      </Button>

      {debugInfo && (
        <div className="mt-4">
          <h4 className="text-md font-medium text-white mb-2">Debug Information</h4>
          <pre className="bg-black p-4 rounded text-xs text-green-400 overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
