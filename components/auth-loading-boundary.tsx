"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface AuthLoadingBoundaryProps {
  children: React.ReactNode
  loading: boolean
  error?: string | null
}

export function AuthLoadingBoundary({ children, loading, error }: AuthLoadingBoundaryProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (!loading) {
      // Small delay to prevent flash of content
      const timer = setTimeout(() => setShowContent(true), 100)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (loading || !showContent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-white">Authentication Error</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
