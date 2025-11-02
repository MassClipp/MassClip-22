"use client"

import { useState, useEffect, type KeyboardEvent } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, BookOpen, Edit, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

interface EBook {
  id: string
  title: string
  description: string
  coverUrl: string
  pageCount: number
  pages: string[]
  status: "draft" | "published"
  createdAt: string
  updatedAt: string
}

export default function ViewEBookPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [ebook, setEbook] = useState<EBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    if (user && params.id) {
      fetchEBook()
    }
  }, [user, params.id])

  const fetchEBook = async () => {
    if (!user) return

    try {
      setLoading(true)
      const idToken = await user.getIdToken()

      const response = await fetch(`/api/creator/ebooks/${params.id}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch eBook")
      }

      const data = await response.json()
      console.log("[v0] eBook data received:", data)
      setEbook(data.ebook)
    } catch (error) {
      console.error("[v0] Error fetching eBook:", error)
      toast({
        title: "Error",
        description: "Failed to load eBook",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const nextPage = () => {
    if (ebook && currentPage < ebook.pages.length) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextPage()
      if (e.key === "ArrowLeft") prevPage()
    }
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentPage, ebook])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (!ebook) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">eBook Not Found</h3>
          <Button onClick={() => router.push("/dashboard/ebooks")} variant="outline" className="mt-4">
            Back to eBooks
          </Button>
        </div>
      </div>
    )
  }

  const allPages = [ebook.coverUrl, ...ebook.pages]
  const totalPages = allPages.length

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/ebooks")}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-base sm:text-lg font-medium text-white">{ebook.title}</h1>
              <p className="text-xs sm:text-sm text-zinc-500">
                Page {currentPage + 1} of {totalPages}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={ebook.status === "published" ? "default" : "secondary"}
              className={ebook.status === "published" ? "bg-emerald-500 text-white" : "bg-zinc-700 text-zinc-300"}
            >
              {ebook.status}
            </Badge>
            <Button onClick={() => router.push(`/dashboard/ebooks/${ebook.id}/edit`)} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="py-8 px-4 sm:px-6 lg:px-8 pb-32">
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative w-full bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800"
            >
              <img
                src={allPages[currentPage] || "/placeholder.svg"}
                alt={currentPage === 0 ? "Cover" : `Page ${currentPage}`}
                className="w-full h-auto object-contain"
              />
              {currentPage === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 sm:p-8">
                  <h2 className="text-xl sm:text-3xl font-light text-white mb-2">{ebook.title}</h2>
                  <p className="text-zinc-300 text-sm sm:text-base">{ebook.description}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={prevPage}
              disabled={currentPage === 0}
              variant="outline"
              size="lg"
              className="disabled:opacity-30 bg-transparent border-zinc-700 hover:bg-zinc-800"
            >
              <ChevronLeft className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {/* Page indicators */}
            <div className="flex gap-2 overflow-x-auto max-w-xs sm:max-w-md scrollbar-hide">
              {allPages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`flex-shrink-0 h-2 rounded-full transition-all ${
                    index === currentPage ? "bg-white w-8" : "bg-zinc-600 hover:bg-zinc-500 w-2"
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              variant="outline"
              size="lg"
              className="disabled:opacity-30 bg-transparent border-zinc-700 hover:bg-zinc-800"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-5 w-5 sm:ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
