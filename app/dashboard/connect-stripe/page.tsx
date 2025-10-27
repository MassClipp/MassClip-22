"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from 'lucide-react'

export default function ConnectStripePage() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to earnings page
    // This prevents users from seeing debug information
    router.replace("/dashboard/earnings")
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  )
}
