"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { VideoThumbnailGenerator } from "@/lib/video-thumbnail-generator"
import { Upload, Video, ImageIcon, FileText, Music, X, Eye } from "lucide-react"

interface UploadFormProps {
  onUploadComplete?: (uploadData: any) => void
}

export function UploadFormWithThumbnails({ onUploadComplete }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [thumbnailProgress, setThumbnailProgress] = useState(0)
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Auto-generate title from filename
    if (!title) {
      const nameWithoutExtension = selectedFile.name.split(".").slice(0, -1).join(".")
      setTitle(nameWithoutExtension)
    }

    // If it's a video, automatically generate thumbnail preview
    if (selectedFile.type.startsWith("video/")) {
      await generateThumbnailPreview(selectedFile)
    }
  }

  const generateThumbnailPreview = async (videoFile: File) => {
    setIsGeneratingThumbnail(true)
    setThumbnailProgress(0)

    try {
      console.log("🎬 [Upload Form] Generating thumbnail preview...")

      const result = await VideoThumbnailGenerator.generateThumbnail(videoFile, {
        timeInSeconds: 5,
        width: 480,
        height: 270,
        quality: 0.8,
      })

      if (result.success && result.thumbnailDataUrl) {
        setGeneratedThumbnail(result.thumbnailDataUrl)
        setThumbnailProgress(100)
        console.log("✅ [Upload Form] Thumbnail preview generated")
      } else {
        console.warn("⚠️ [Upload Form] Thumbnail preview failed:", result.error)
        toast({
          title: "Thumbnail Preview",
          description: "Could not generate thumbnail preview, but upload will continue",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("❌ [Upload Form] Thumbnail preview error:", error)
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }

  const uploadFile = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Get upload URL
      const uploadUrlResponse = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      })

      if (!uploadUrlResponse.ok) {
        throw new Error("Failed to get upload URL")
      }

      const { uploadUrl, publicUrl } = await uploadUrlResponse.json()

      // Upload file
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file")
      }

      return { success: true, url: publicUrl }
    } catch (error) {
      console.error("❌ [Upload] File upload error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!file || !user) {
      toast({
        title: "Error",
        description: "Please select a file and ensure you're logged in",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const authToken = await user.getIdToken()

      // Step 1: Upload the main file
      console.log("📤 [Upload] Uploading file...")
      setUploadProgress(20)

      const uploadResult = await uploadFile(file)
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "File upload failed")
      }

      setUploadProgress(50)

      // Step 2: Generate and upload thumbnail (for videos)
      let thumbnailUrl: string | undefined

      if (file.type.startsWith("video/")) {
        console.log("🖼️ [Upload] Generating thumbnail...")
        setUploadProgress(60)

        try {
          // Try client-side thumbnail generation first
          const thumbnailResult = await VideoThumbnailGenerator.generateAndUploadThumbnail(file, file.name, authToken, {
            timeInSeconds: 5,
            width: 480,
            height: 270,
            quality: 0.8,
          })

          if (thumbnailResult.success) {
            thumbnailUrl = thumbnailResult.thumbnailUrl
            console.log("✅ [Upload] Client-side thumbnail generated:", thumbnailUrl)
          } else {
            console.warn("⚠️ [Upload] Client-side thumbnail failed, trying server-side...")

            // Fallback to server-side generation
            const serverThumbnailResponse = await fetch("/api/generate-server-thumbnail", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                videoUrl: uploadResult.url,
                filename: file.name,
                timeInSeconds: 5,
                width: 480,
                height: 270,
              }),
            })

            if (serverThumbnailResponse.ok) {
              const serverResult = await serverThumbnailResponse.json()
              if (serverResult.success) {
                thumbnailUrl = serverResult.thumbnailUrl
                console.log("✅ [Upload] Server-side thumbnail generated:", thumbnailUrl)
              }
            }
          }
        } catch (thumbnailError) {
          console.error("❌ [Upload] Thumbnail generation failed:", thumbnailError)
          // Continue without thumbnail - will use fallback
        }
      }

      setUploadProgress(80)

      // Step 3: Create upload record in database
      console.log("💾 [Upload] Creating database record...")

      const metadata = {
        fileUrl: uploadResult.url,
        filename: file.name,
        title: title || file.name.split(".")[0],
        description,
        category,
        size: file.size,
        mimeType: file.type,
        thumbnailUrl:
          thumbnailUrl ||
          (file.type.startsWith("video/")
            ? "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=480&h=270&fit=crop&crop=center"
            : undefined),
      }

      const createRecordResponse = await fetch("/api/uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(metadata),
      })

      if (!createRecordResponse.ok) {
        throw new Error("Failed to create upload record")
      }

      const uploadRecord = await createRecordResponse.json()
      setUploadProgress(100)

      console.log("✅ [Upload] Upload completed successfully:", uploadRecord.id)

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully${thumbnailUrl ? " with thumbnail" : ""}`,
      })

      // Reset form
      setFile(null)
      setTitle("")
      setDescription("")
      setCategory("")
      setGeneratedThumbnail(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Callback
      onUploadComplete?.(uploadRecord)
    } catch (error) {
      console.error("❌ [Upload] Upload process failed:", error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("video/")) return <Video className="h-5 w-5" />
    if (mimeType.startsWith("audio/")) return <Music className="h-5 w-5" />
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  const clearFile = () => {
    setFile(null)
    setGeneratedThumbnail(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept="video/*,audio/*,image/*,.pdf,.doc,.docx"
                disabled={isUploading}
                className="flex-1"
              />
              {file && (
                <Button type="button" variant="outline" size="sm" onClick={clearFile} disabled={isUploading}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* File Preview */}
          {file && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                  </p>
                </div>
              </div>

              {/* Thumbnail Preview */}
              {file.type.startsWith("video/") && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-medium">Thumbnail Preview</span>
                  </div>

                  {isGeneratingThumbnail ? (
                    <div className="space-y-2">
                      <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Video className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                          <p className="text-sm text-muted-foreground">Generating thumbnail...</p>
                        </div>
                      </div>
                      <Progress value={thumbnailProgress} className="w-full" />
                    </div>
                  ) : generatedThumbnail ? (
                    <img
                      src={generatedThumbnail || "/placeholder.svg"}
                      alt="Generated thumbnail"
                      className="w-full max-w-xs h-32 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Thumbnail will be generated during upload</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your content"
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your content..."
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isUploading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cinema">Cinema</SelectItem>
                <SelectItem value="hustle-mentality">Hustle Mentality</SelectItem>
                <SelectItem value="introspection">Introspection</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Upload Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={!file || isUploading || !user} className="w-full">
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading... ({uploadProgress}%)
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Content
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
