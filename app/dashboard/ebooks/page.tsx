"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Plus, Loader2, BookOpen, Edit, Trash2, Eye, MoreVertical, Globe, GlobeLock } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"

interface EBook {
  id: string
  title: string
  description: string
  coverUrl: string
  pageCount: number
  status: "draft" | "published"
  price?: number
  stripeProductId?: string
  stripePriceId?: string
  createdAt: string
  updatedAt: string
}

export default function EBooksPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [ebooks, setEbooks] = useState<EBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchEBooks()
    }
  }, [user])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log("[v0] Page visible, refetching eBooks")
        fetchEBooks()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user])

  const fetchEBooks = async () => {
    if (!user) return

    try {
      setLoading(true)
      const idToken = await user.getIdToken()

      console.log("[v0] Fetching eBooks from API")
      const response = await fetch("/api/creator/ebooks", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch eBooks")
      }

      const data = await response.json()
      console.log("[v0] Received eBooks:", data.ebooks?.length || 0)
      setEbooks(data.ebooks || [])
    } catch (error) {
      console.error("[v0] Error fetching eBooks:", error)
      toast({
        title: "Error",
        description: "Failed to load eBooks",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this eBook?")) return

    try {
      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/ebooks/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete eBook")
      }

      setEbooks((prev) => prev.filter((ebook) => ebook.id !== id))
      toast({
        title: "Success",
        description: "eBook deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting eBook:", error)
      toast({
        title: "Error",
        description: "Failed to delete eBook",
        variant: "destructive",
      })
    }
  }

  const handleTogglePublish = async (id: string, currentStatus: "draft" | "published") => {
    const newStatus = currentStatus === "published" ? "draft" : "published"

    try {
      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/ebooks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update eBook status")
      }

      setEbooks((prev) => prev.map((ebook) => (ebook.id === id ? { ...ebook, status: newStatus } : ebook)))

      toast({
        title: "Success",
        description: `eBook ${newStatus === "published" ? "published" : "unpublished"} successfully`,
      })
    } catch (error) {
      console.error("Error updating eBook status:", error)
      toast({
        title: "Error",
        description: "Failed to update eBook status",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
        <span className="ml-3 text-zinc-400">Loading eBooks...</span>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">
            eBooks <span className="text-zinc-500 text-lg font-normal">({ebooks.length})</span>
          </h1>
          <p className="text-zinc-400 text-sm">Create and manage your digital eBooks</p>
        </div>

        <Button
          onClick={() => router.push("/dashboard/ebooks/create")}
          className="bg-white text-black hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create eBook
        </Button>
      </div>

      {ebooks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-medium text-white mb-2">No eBooks Yet</h3>
          <p className="text-zinc-400 mb-4">Create your first eBook to get started</p>
          <Button
            onClick={() => router.push("/dashboard/ebooks/create")}
            className="bg-white text-black hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First eBook
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
          {ebooks.map((ebook, index) => (
            <motion.div
              key={ebook.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="bg-black border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all group">
                <div className="relative aspect-square bg-zinc-900">
                  {ebook.coverUrl ? (
                    <img
                      src={ebook.coverUrl || "/placeholder.svg"}
                      alt={ebook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/ebooks/${ebook.id}`)}
                          className="text-zinc-300 hover:text-white"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/ebooks/${ebook.id}/edit`)}
                          className="text-zinc-300 hover:text-white"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        <DropdownMenuItem
                          onClick={() => handleTogglePublish(ebook.id, ebook.status)}
                          className="text-zinc-300 hover:text-white"
                        >
                          {ebook.status === "published" ? (
                            <>
                              <GlobeLock className="h-4 w-4 mr-2" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Globe className="h-4 w-4 mr-2" />
                              Publish to Storefront
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        <DropdownMenuItem
                          onClick={() => handleDelete(ebook.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant={ebook.status === "published" ? "default" : "secondary"}
                      className={
                        ebook.status === "published" ? "bg-emerald-500 text-white" : "bg-zinc-700 text-zinc-300"
                      }
                    >
                      {ebook.status}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg text-white truncate">{ebook.title}</CardTitle>
                  <p className="text-sm text-zinc-400 line-clamp-2">{ebook.description}</p>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{ebook.pageCount} pages</span>
                      <span>
                        {ebook.createdAt ? formatDistanceToNow(new Date(ebook.createdAt), { addSuffix: true }) : ""}
                      </span>
                    </div>
                    {ebook.price && (
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <span className="text-lg font-semibold text-white">${ebook.price.toFixed(2)}</span>
                        <span className="text-xs text-zinc-500">
                          {ebook.status === "published" ? "For Sale" : "Not Listed"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
