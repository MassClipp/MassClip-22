"use client"

import { useState, useEffect } from "react"
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
    <div className="min-h-screen bg-black">
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
              <h1 className="text-lg font-medium text-white">{ebook.title}</h1>
              <p className="text-sm text-zinc-500">
                Page {currentPage + 1} of {totalPages}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={ebook.status === "published" ? "default" : "secondary"}
              className={ebook.status === "published" ? "bg-white text-black" : "bg-zinc-700 text-zinc-300"}
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

      <div className="pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden shadow-2xl"
            >
              <img
                src={allPages[currentPage] || "/placeholder.svg"}
                alt={currentPage === 0 ? "Cover" : `Page ${currentPage}`}
                className="w-full h-full object-contain"
              />
              {currentPage === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <h2 className="text-2xl font-light text-white mb-2">{ebook.title}</h2>
                  <p className="text-zinc-300 text-sm">{ebook.description}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={prevPage}
              disabled={currentPage === 0}
              variant="outline"
              size="lg"
              className="disabled:opacity-50 bg-transparent"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>

            {/* Page indicators */}
            <div className="flex gap-2 overflow-x-auto max-w-md">
              {allPages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentPage ? "bg-white w-8" : "bg-zinc-600 hover:bg-zinc-500"
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
              className="disabled:opacity-50 bg-transparent"
            >
              Next
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
