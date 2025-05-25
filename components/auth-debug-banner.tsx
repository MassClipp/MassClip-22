"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

export function AuthDebugBanner() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      console.log("🔥 Auth state updated:", currentUser?.email || "Not logged in")
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview") {
    return null
  }

  return (
    <div className="sticky top-0 z-50 w-full text-center text-sm font-medium">
      {loading ? (
        <div className="bg-gray-600 text-white p-2">Loading auth state...</div>
      ) : user ? (
        <div className="bg-green-600 text-white p-2">
          Logged in as {user.email} (UID: {user.uid.substring(0, 8)}...)
        </div>
      ) : (
        <div className="bg-red-600 text-white p-2">Not logged in</div>
      )}
    </div>
  )
}
