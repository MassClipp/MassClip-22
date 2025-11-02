"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface EBook {
  id: string
  title: string
  description: string
  coverUrl: string
  pageCount: number
  pages: string[]
  status: "draft" | "published"
}

export default function EditEBookPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [ebook, setEbook] = useState<EBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState("")
  const [pageFiles, setPageFiles] = useState<File[]>([])
  const [pagePreviews, setPagePreviews] = useState<string[]>([])

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
      setTitle(data.ebook.title)
      setDescription(data.ebook.description)
      setCoverPreview(data.ebook.coverUrl)
      setPagePreviews(data.ebook.pages || [])
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

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPageFiles((prev) => [...prev, ...files])

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPagePreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePage = (index: number) => {
    setPageFiles((prev) => prev.filter((_, i) => i !== index))
    setPagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const idToken = await user?.getIdToken()

      // Upload cover if changed
      let coverUrl = ebook?.coverUrl || ""
      if (coverFile) {
        const coverFormData = new FormData()
        coverFormData.append("file", coverFile)
        coverFormData.append("ebookId", params.id)

        const coverResponse = await fetch("/api/upload/ebook-cover", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: coverFormData,
        })

        if (coverResponse.ok) {
          const coverData = await coverResponse.json()
          coverUrl = coverData.url
        }
      }

      // Upload new pages
      const newPageUrls: string[] = []
      for (const file of pageFiles) {
        const pageFormData = new FormData()
        pageFormData.append("file", file)
        pageFormData.append("ebookId", params.id)

        const pageResponse = await fetch("/api/upload/ebook-page", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: pageFormData,
        })

        if (pageResponse.ok) {
          const pageData = await pageResponse.json()
          newPageUrls.push(pageData.url)
        }
      }

      // Update eBook metadata
      const updateResponse = await fetch(`/api/creator/ebooks/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title,
          description,
          coverUrl,
          pages: [...(ebook?.pages || []), ...newPageUrls],
          pageCount: (ebook?.pages?.length || 0) + newPageUrls.length,
        }),
      })

      if (!updateResponse.ok) {
        throw new Error("Failed to update eBook")
      }

      toast({
        title: "Success",
        description: "eBook updated successfully",
      })

      router.push("/dashboard/ebooks")
    } catch (error) {
      console.error("Error updating eBook:", error)
      toast({
        title: "Error",
        description: "Failed to update eBook",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/ebooks")}
          className="mb-6 text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-light text-white mb-8">Edit eBook</h1>

        <div className="space-y-6">
          {/* eBook Details */}
          <Card className="bg-black border-zinc-800 p-6">
            <h2 className="text-xl font-medium text-white mb-4">eBook Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-zinc-300">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter eBook title"
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-zinc-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter eBook description"
                  rows={4}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
            </div>
          </Card>

          {/* Cover Image */}
          <Card className="bg-black border-zinc-800 p-6">
            <h2 className="text-xl font-medium text-white mb-4">Cover Image *</h2>
            <div className="space-y-4">
              {coverPreview && (
                <div className="relative w-48 aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden">
                  <img
                    src={coverPreview || "/placeholder.svg"}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCoverFile(null)
                      setCoverPreview("")
                    }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
            </div>
          </Card>

          {/* Pages */}
          <Card className="bg-black border-zinc-800 p-6">
            <h2 className="text-xl font-medium text-white mb-4">
              Pages * ({(ebook?.pages?.length || 0) + pageFiles.length})
            </h2>
            <div className="space-y-4">
              {pagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {pagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden">
                      <img
                        src={preview || "/placeholder.svg"}
                        alt={`Page ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index >= (ebook?.pages?.length || 0) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePage(index - (ebook?.pages?.length || 0))}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-1">
                        Page {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePagesChange}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
                <p className="text-xs text-zinc-500 mt-2">Upload images for your eBook pages</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={() => router.push("/dashboard/ebooks")} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-zinc-200">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
