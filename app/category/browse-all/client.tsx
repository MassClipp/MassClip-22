"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Grid } from "lucide-react"
import { Button } from "@/components/ui/button"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"

export default function BrowseAllClient() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const loaderRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(true)
  const observer = useRef<IntersectionObserver | null>(null)

  // Fetch videos directly instead of using a hook that might cause circular dependencies
  async function fetchVideos(pageNum: number) {
    try {
      setLoading(true)
      const response = await fetch(`/api/vimeo?page=${pageNum}`)
      if (!response.ok) throw new Error("Failed to fetch videos")
      const data = await response.json()

      if (isMounted.current) {
        if (data.length === 0) {
          setHasMore(false)
        } else {
          setVideos((prev) => (pageNum === 1 ? data : [...prev, ...data]))
          setPage(pageNum)
        }
        setLoading(false)
      }
    } catch (error) {
      console.error("Error fetching videos:", error)
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (typeof window !== "undefined") {
      isMounted.current = true
      fetchVideos(1)

      const options = {
        root: null,
        rootMargin: "20px",
        threshold: 0.1,
      }

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          fetchVideos(page + 1)
        }
      }, options)

      if (loaderRef.current) {
        observer.current.observe(loaderRef.current)
      }

      return () => {
        isMounted.current = false
        if (observer.current) {
          observer.current.disconnect()
        }
      }
    }
  }, [page, loading, hasMore])

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
      </div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10 px-6">
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-6 text-zinc-400 hover:text-white hover:bg-zinc-900/50 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-zinc-900/50 rounded-sm flex items-center justify-center mr-4">
              <Grid className="h-5 w-5 text-crimson" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white">Browse All</h1>
          </div>

          <p className="text-zinc-400 max-w-2xl">Explore our complete collection of premium video clips.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {videos.map((video, index) => (
            <div key={`video-${video.uri || index}`} className="group">
              <VimeoCard video={video} />
            </div>
          ))}

          {loading && (
            <>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="aspect-[9/16] rounded-md bg-zinc-900/50 animate-pulse"></div>
              ))}
            </>
          )}
        </div>

        {hasMore && <div ref={loaderRef} className="h-20"></div>}

        {!hasMore && videos.length > 0 && (
          <div className="text-center py-10 text-zinc-500">You've reached the end of the collection.</div>
        )}
      </main>
    </div>
  )
}
