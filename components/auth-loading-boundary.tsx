"use client"

import type React from "react"

import { useEffect, useState } from "react"

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
          {/* Minimal white spinner */}
          <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-white">Authentication Error</h2>
          <p className="text-white/60">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/10"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
