"use client"

import { useState, useCallback, useRef } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Upload, File, ImageIcon, Video, Music, FileText, X, CheckCircle, AlertCircle, Loader2, Eye } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"

interface FileUpload {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "completed" | "error"
  error?: string
  contentId?: string
  publicUrl?: string
}

interface ProductBoxFileUploaderProps {
  productBoxId: string
  onUploadComplete?: (contentId: string) => void
}

const SUPPORTED_TYPES = {
  // Documents
  "application/pdf": { icon: FileText, label: "PDF", color: "bg-red-100 text-red-700" },
  "application/msword": { icon: FileText, label: "DOC", color: "bg-blue-100 text-blue-700" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    icon: FileText,
    label: "DOCX",
    color: "bg-blue-100 text-blue-700",
  },
  "text/plain": { icon: FileText, label: "TXT", color: "bg-gray-100 text-gray-700" },

  // Images
  "image/jpeg": { icon: ImageIcon, label: "JPEG", color: "bg-green-100 text-green-700" },
  "image/png": { icon: ImageIcon, label: "PNG", color: "bg-green-100 text-green-700" },
  "image/gif": { icon: ImageIcon, label: "GIF", color: "bg-green-100 text-green-700" },
  "image/webp": { icon: ImageIcon, label: "WEBP", color: "bg-green-100 text-green-700" },

  // Videos
  "video/mp4": { icon: Video, label: "MP4", color: "bg-purple-100 text-purple-700" },
  "video/quicktime": { icon: Video, label: "MOV", color: "bg-purple-100 text-purple-700" },
  "video/x-msvideo": { icon: Video, label: "AVI", color: "bg-purple-100 text-purple-700" },
  "video/webm": { icon: Video, label: "WEBM", color: "bg-purple-100 text-purple-700" },

  // Audio
  "audio/mpeg": { icon: Music, label: "MP3", color: "bg-orange-100 text-orange-700" },
  "audio/wav": { icon: Music, label: "WAV", color: "bg-orange-100 text-orange-700" },
  "audio/mp4": { icon: Music, label: "M4A", color: "bg-orange-100 text-orange-700" },
  "audio/ogg": { icon: Music, label: "OGG", color: "bg-orange-100 text-orange-700" },
}

const MAX_FILE_SIZES = {
  document: 50 * 1024 * 1024, // 50MB
  image: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 50 * 1024 * 1024, // 50MB
}

export default function ProductBoxFileUploader({ productBoxId, onUploadComplete }: ProductBoxFileUploaderProps) {
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const { toast } = useToast()
  const uploadIdCounter = useRef(0)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileCategory = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "image"
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    return "document"
  }

  const validateFile = (file: File) => {
    const supportedType = SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]
    if (!supportedType) {
      return `Unsupported file type: ${file.type}`
    }

    const category = getFileCategory(file.type)
    const maxSize = MAX_FILE_SIZES[category as keyof typeof MAX_FILE_SIZES]
    if (file.size > maxSize) {
      return `File too large. Maximum size for ${category} files is ${formatFileSize(maxSize)}`
    }

    return null
  }

  const uploadFile = async (upload: FileUpload) => {
    try {
      console.log(`🔍 [File Uploader] Starting upload for: ${upload.file.name}`)

      // Update status to uploading
      setUploads((prev) => prev.map((u) => (u.id === upload.id ? { ...u, status: "uploading", progress: 0 } : u)))

      // Get presigned URL
      const response = await fetch("/api/upload/product-box-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: upload.file.name,
          fileType: upload.file.type,
          fileSize: upload.file.size,
          productBoxId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to prepare upload")
      }

      const { uploadUrl, contentId, publicUrl } = await response.json()

      // Upload to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: upload.file,
        headers: {
          "Content-Type": upload.file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage")
      }

      // Update content status
      await fetch("/api/upload/product-box-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          status: "completed",
        }),
      })

      // Update upload status
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: "completed",
                progress: 100,
                contentId,
                publicUrl,
              }
            : u,
        ),
      )

      toast({
        title: "Upload Complete!",
        description: `${upload.file.name} has been uploaded successfully.`,
      })

      if (onUploadComplete) {
        onUploadComplete(contentId)
      }

      console.log(`✅ [File Uploader] Upload completed: ${upload.file.name}`)
    } catch (error) {
      console.error(`❌ [File Uploader] Upload failed:`, error)

      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : u,
        ),
      )

      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      })
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newUploads: FileUpload[] = []

      acceptedFiles.forEach((file) => {
        const validationError = validateFile(file)

        if (validationError) {
          toast({
            title: "Invalid File",
            description: validationError,
            variant: "destructive",
          })
          return
        }

        const uploadId = `upload_${++uploadIdCounter.current}_${Date.now()}`
        const newUpload: FileUpload = {
          id: uploadId,
          file,
          progress: 0,
          status: "pending",
        }

        newUploads.push(newUpload)
      })

      if (newUploads.length > 0) {
        setUploads((prev) => [...prev, ...newUploads])

        // Start uploads
        newUploads.forEach((upload) => {
          uploadFile(upload)
        })
      }
    },
    [productBoxId, toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.keys(SUPPORTED_TYPES).reduce(
      (acc, type) => {
        acc[type] = []
        return acc
      },
      {} as Record<string, string[]>,
    ),
    multiple: true,
  })

  const removeUpload = (uploadId: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId))
  }

  const retryUpload = (upload: FileUpload) => {
    uploadFile(upload)
  }

  const FileIcon = ({ mimeType }: { mimeType: string }) => {
    const typeInfo = SUPPORTED_TYPES[mimeType as keyof typeof SUPPORTED_TYPES]
    if (!typeInfo) return <File className="h-5 w-5" />

    const IconComponent = typeInfo.icon
    return <IconComponent className="h-5 w-5" />
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Content Files
          </CardTitle>
          <CardDescription>Add documents, images, videos, and audio files to your product box</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-red-600 font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 font-medium mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-gray-500">Supports: PDF, DOC, Images, Videos, Audio files</p>
              </div>
            )}
          </div>

          {/* Supported File Types */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Supported file types:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SUPPORTED_TYPES).map(([type, info]) => (
                <Badge key={type} variant="outline" className={`text-xs ${info.color}`}>
                  {info.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AnimatePresence>
                {uploads.map((upload) => {
                  const typeInfo = SUPPORTED_TYPES[upload.file.type as keyof typeof SUPPORTED_TYPES]

                  return (
                    <motion.div
                      key={upload.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <FileIcon mimeType={upload.file.type} />
                          <div>
                            <p className="font-medium text-sm">{upload.file.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(upload.file.size)} • {typeInfo?.label}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {upload.status === "completed" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(upload.publicUrl, "_blank")}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            </>
                          )}

                          {upload.status === "error" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => retryUpload(upload)}>
                                Retry
                              </Button>
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            </>
                          )}

                          {upload.status === "uploading" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}

                          <Button size="sm" variant="ghost" onClick={() => removeUpload(upload.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {upload.status === "uploading" && <Progress value={upload.progress} className="h-2" />}

                      {upload.error && <p className="text-sm text-red-600 mt-2">{upload.error}</p>}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
