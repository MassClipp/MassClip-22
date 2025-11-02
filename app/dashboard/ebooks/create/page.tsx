"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Upload, X, Loader2, FileText, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

interface PageFile {
  id: string
  file: File
  preview: string
}

export default function CreateEBookPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const pagesInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string>("")
  const [pageFiles, setPageFiles] = useState<PageFile[]>([])
  const [uploading, setUploading] = useState(false)

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file for the cover",
          variant: "destructive",
        })
        return
      }
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handlePagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPages: PageFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }))
    setPageFiles((prev) => [...prev, ...newPages])
  }

  const removePage = (id: string) => {
    setPageFiles((prev) => {
      const page = prev.find((p) => p.id === id)
      if (page?.preview) {
        URL.revokeObjectURL(page.preview)
      }
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a title for your eBook",
        variant: "destructive",
      })
      return
    }

    if (!coverFile) {
      toast({
        title: "Missing Cover",
        description: "Please upload a cover image",
        variant: "destructive",
      })
      return
    }

    if (pageFiles.length === 0) {
      toast({
        title: "Missing Pages",
        description: "Please upload at least one page",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)
      const idToken = await user?.getIdToken()
      if (!idToken) throw new Error("Not authenticated")

      // Create eBook record first
      const createResponse = await fetch("/api/creator/ebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          pageCount: pageFiles.length,
        }),
      })

      if (!createResponse.ok) {
        throw new Error("Failed to create eBook")
      }

      const { ebookId } = await createResponse.json()

      // Upload cover
      const coverFormData = new FormData()
      coverFormData.append("file", coverFile)
      coverFormData.append("ebookId", ebookId)

      const coverResponse = await fetch("/api/upload/ebook-cover", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: coverFormData,
      })

      if (!coverResponse.ok) {
        throw new Error("Failed to upload cover")
      }

      // Upload pages
      for (let i = 0; i < pageFiles.length; i++) {
        const pageFormData = new FormData()
        pageFormData.append("file", pageFiles[i].file)
        pageFormData.append("ebookId", ebookId)
        pageFormData.append("pageNumber", (i + 1).toString())

        const pageResponse = await fetch("/api/upload/ebook-page", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: pageFormData,
        })

        if (!pageResponse.ok) {
          console.error(`Failed to upload page ${i + 1}`)
        }
      }

      toast({
        title: "Success",
        description: "eBook created successfully",
      })

      router.push("/dashboard/ebooks")
    } catch (error) {
      console.error("Error creating eBook:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create eBook",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">Create eBook</h1>
          <p className="text-zinc-400 text-sm">Upload your eBook cover and pages</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Details */}
          <div className="space-y-6">
            <Card className="bg-black border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">eBook Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    className="bg-zinc-900 border-zinc-800 text-white min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Cover Image *</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                />

                {coverPreview ? (
                  <div className="relative aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden">
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
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    className="aspect-[3/4] border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors"
                  >
                    <Upload className="h-12 w-12 text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-400">Click to upload cover</p>
                    <p className="text-xs text-zinc-600 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pages */}
          <div>
            <Card className="bg-black border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Pages * ({pageFiles.length})</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagesInputRef.current?.click()}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add Pages
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <input
                  ref={pagesInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handlePagesSelect}
                  className="hidden"
                />

                {pageFiles.length === 0 ? (
                  <div
                    onClick={() => pagesInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-700 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors"
                  >
                    <FileText className="h-12 w-12 text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-400">Click to upload pages</p>
                    <p className="text-xs text-zinc-600 mt-1">PNG, JPG, PDF</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {pageFiles.map((page, index) => (
                      <motion.div
                        key={page.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800"
                      >
                        <div className="flex-shrink-0 w-12 h-16 bg-zinc-800 rounded overflow-hidden">
                          {page.preview ? (
                            <img
                              src={page.preview || "/placeholder.svg"}
                              alt={`Page ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="h-6 w-6 text-zinc-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">Page {index + 1}</p>
                          <p className="text-xs text-zinc-500 truncate">{page.file.name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePage(page.id)}
                          className="flex-shrink-0 text-zinc-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={uploading}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading} className="bg-white text-black hover:bg-zinc-200">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create eBook"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
