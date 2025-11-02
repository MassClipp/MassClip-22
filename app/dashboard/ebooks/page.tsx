"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, Pencil, Trash2, Globe } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface EBook {
  id: string
  title: string
  description: string
  coverImage: string
  pages: { url: string }[]
  price: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export default function EBooksPage() {
  const router = useRouter()
  const [ebooks, setEbooks] = useState<EBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEBooks()
  }, [])

  const fetchEBooks = async () => {
    try {
      const response = await fetch("/api/creator/ebooks", {
        headers: {
          "x-user-id": "current-user-id", // Replace with actual user ID from auth
        },
      })
      const data = await response.json()
      setEbooks(data.ebooks || [])
    } catch (error) {
      console.error("Error fetching eBooks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this eBook?")) return

    try {
      await fetch(`/api/creator/ebooks/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": "current-user-id",
        },
      })
      fetchEBooks()
    } catch (error) {
      console.error("Error deleting eBook:", error)
    }
  }

  const handleTogglePublish = async (ebook: EBook) => {
    if (!ebook.published && (!ebook.price || ebook.price <= 0)) {
      alert("Please set a price before publishing your eBook to the storefront.")
      router.push(`/dashboard/ebooks/${ebook.id}/edit`)
      return
    }

    try {
      await fetch(`/api/creator/ebooks/${ebook.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "current-user-id",
        },
        body: JSON.stringify({ published: !ebook.published }),
      })
      fetchEBooks()
    } catch (error) {
      console.error("Error toggling publish status:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading eBooks...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">eBooks ({ebooks.length})</h1>
          <p className="text-muted-foreground mt-1">Create and manage your digital eBooks</p>
        </div>
        <Button onClick={() => router.push("/dashboard/ebooks/create")}>
          <span className="mr-2">+</span> Create eBook
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ebooks.map((ebook) => (
          <Card key={ebook.id} className="overflow-hidden">
            <div className="relative aspect-[3/4] bg-muted">
              {ebook.coverImage && (
                <img
                  src={ebook.coverImage || "/placeholder.svg"}
                  alt={ebook.title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-2 left-2">
                <Badge
                  variant={ebook.published ? "default" : "secondary"}
                  className={ebook.published ? "bg-green-600" : ""}
                >
                  {ebook.published ? "published" : "draft"}
                </Badge>
              </div>
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/ebooks/${ebook.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/ebooks/${ebook.id}/edit`)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTogglePublish(ebook)}>
                      <Globe className="h-4 w-4 mr-2" />
                      {ebook.published ? "Unpublish" : "Publish to Storefront"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(ebook.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1">{ebook.title}</h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{ebook.description}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{ebook.pages?.length || 0} pages</span>
                <span>{formatDistanceToNow(new Date(ebook.createdAt), { addSuffix: true })}</span>
              </div>
              {ebook.price > 0 && <div className="mt-2 text-sm font-semibold">${(ebook.price / 100).toFixed(2)}</div>}
            </div>
          </Card>
        ))}
      </div>

      {ebooks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No eBooks yet. Create your first one!</p>
          <Button onClick={() => router.push("/dashboard/ebooks/create")}>Create eBook</Button>
        </div>
      )}
    </div>
  )
}
