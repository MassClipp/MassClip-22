"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Upload, X } from "lucide-react"
import { put } from "@vercel/blob"

export default function CreateEBookPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [coverImage, setCoverImage] = useState("")
  const [price, setPrice] = useState(0)
  const [pages, setPages] = useState<{ url: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const blob = await put(file.name, file, { access: "public" })
      setCoverImage(blob.url)
    } catch (error) {
      console.error("Error uploading cover:", error)
    } finally {
      setUploading(false)
    }
  }

  const handlePageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = files.map((file) => put(file.name, file, { access: "public" }))
      const blobs = await Promise.all(uploadPromises)
      const newPages = blobs.map((blob) => ({ url: blob.url }))
      setPages([...pages, ...newPages])
    } catch (error) {
      console.error("Error uploading pages:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePage = (index: number) => {
    setPages(pages.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      await fetch("/api/creator/ebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "current-user-id",
        },
        body: JSON.stringify({
          title,
          description,
          coverImage,
          pages,
          price,
        }),
      })
      router.push("/dashboard/ebooks")
    } catch (error) {
      console.error("Error creating eBook:", error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.push("/dashboard/ebooks")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to eBooks
        </Button>
        <h1 className="text-3xl font-bold mt-4">Create New eBook</h1>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter eBook title" />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter eBook description"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={(price / 100).toFixed(2)}
              onChange={(e) => setPrice(Math.round(Number.parseFloat(e.target.value) * 100))}
              placeholder="0.00"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Set a price to publish your eBook to the storefront</p>
        </div>

        <div>
          <Label>Cover Image</Label>
          {coverImage ? (
            <div className="relative w-full max-w-sm aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              <img src={coverImage || "/placeholder.svg"} alt="Cover" className="w-full h-full object-contain" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setCoverImage("")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
                id="cover-upload"
                disabled={uploading}
              />
              <Label htmlFor="cover-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload cover image"}
                </p>
              </Label>
            </div>
          )}
        </div>

        <div>
          <Label>Pages</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {pages.map((page, index) => (
              <Card key={index} className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={page.url || "/placeholder.svg"}
                  alt={`Page ${index + 1}`}
                  className="w-full h-full object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemovePage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePageUpload}
              className="hidden"
              id="pages-upload"
              disabled={uploading}
            />
            <Label htmlFor="pages-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload pages"}</p>
            </Label>
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={handleCreate} disabled={creating || !title || !coverImage}>
            {creating ? "Creating..." : "Create eBook"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard/ebooks")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
