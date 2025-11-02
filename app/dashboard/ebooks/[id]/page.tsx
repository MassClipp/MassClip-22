"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, ArrowLeft, Pencil } from "lucide-react"

interface EBook {
  id: string
  title: string
  description: string
  coverImage: string
  pages: { url: string }[]
  price: number
  published: boolean
}

export default function ViewEBookPage() {
  const router = useRouter()
  const params = useParams()
  const [ebook, setEbook] = useState<EBook | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchEBook = async () => {
    try {
      const response = await fetch(`/api/creator/ebooks/${params.id}`, {
        headers: {
          "x-user-id": "current-user-id",
        },
      })
      const data = await response.json()
      setEbook(data.ebook)
    } catch (error) {
      console.error("Error fetching eBook:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEBook()
  }, [params.id])

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < (ebook?.pages?.length || 0) + 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrevious()
    if (e.key === "ArrowRight") handleNext()
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentPage])

  useEffect(() => {
    setCurrentPage(0)
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading eBook...</div>
      </div>
    )
  }

  if (!ebook) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold mb-4">eBook Not Found</div>
        <Button onClick={() => router.push("/dashboard/ebooks")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to eBooks
        </Button>
      </div>
    )
  }

  const allPages = [
    { url: ebook.coverImage, isCover: true },
    ...(ebook.pages || []).map((p) => ({ ...p, isCover: false })),
  ]

  const totalPages = allPages.length

  return (
    <div className="min-h-screen py-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/ebooks")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{ebook.title}</h1>
              <p className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={ebook.published ? "default" : "secondary"}
              className={ebook.published ? "bg-green-600" : ""}
            >
              {ebook.published ? "published" : "draft"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/ebooks/${params.id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* eBook Viewer */}
      <div className="flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-4xl">
          <img
            src={allPages[currentPage].url || "/placeholder.svg"}
            alt={`Page ${currentPage + 1}`}
            className="w-full max-h-[calc(100vh-16rem)] object-contain mx-auto"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/90 backdrop-blur-sm border rounded-full px-6 py-3 shadow-lg">
        <Button variant="ghost" size="sm" onClick={handlePrevious} disabled={currentPage === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {allPages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentPage ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={handleNext} disabled={currentPage === totalPages - 1}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
