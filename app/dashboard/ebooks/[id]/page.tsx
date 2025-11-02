"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, BookOpen, Edit, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

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
      setEbook(data.ebook)
    } catch (error) {
      console.error("Error fetching eBook:", error)
      toast({
        title: "Error",
        description: "Failed to load eBook",
        variant: "destructive",
      })
      router.push("/dashboard/ebooks")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (!ebook) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">eBook Not Found</h3>
          <Button onClick={() => router.push("/dashboard/ebooks")} variant="outline">
            Back to eBooks
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/ebooks")}
          className="mb-6 text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover Image */}
          <div className="md:w-1/3">
            <Card className="bg-black border-zinc-800 overflow-hidden">
              <div className="aspect-[3/4] bg-zinc-900">
                {ebook.coverUrl ? (
                  <img
                    src={ebook.coverUrl || "/placeholder.svg"}
                    alt={ebook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-24 w-24 text-zinc-700" />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Details */}
          <div className="md:w-2/3 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-light text-white">{ebook.title}</h1>
                <Badge
                  variant={ebook.status === "published" ? "default" : "secondary"}
                  className={ebook.status === "published" ? "bg-white text-black" : "bg-zinc-700 text-zinc-300"}
                >
                  {ebook.status}
                </Badge>
              </div>
              <p className="text-zinc-400">{ebook.description}</p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => router.push(`/dashboard/ebooks/${ebook.id}/edit`)}
                className="bg-white text-black hover:bg-zinc-200"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit eBook
              </Button>
            </div>

            <div className="border-t border-zinc-800 pt-6">
              <h2 className="text-xl font-medium text-white mb-4">Pages ({ebook.pageCount})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ebook.pages.map((pageUrl, index) => (
                  <Card key={index} className="bg-zinc-900 border-zinc-800 overflow-hidden group cursor-pointer">
                    <div className="aspect-[3/4] relative">
                      <img
                        src={pageUrl || "/placeholder.svg"}
                        alt={`Page ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Download className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="p-2 text-center text-sm text-zinc-400">Page {index + 1}</div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
