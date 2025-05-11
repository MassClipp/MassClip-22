"use client"

import { useState, useRef, type DragEvent, type ChangeEvent } from "react"
import { formatFileSize } from "@/lib/upload-utils"
import { Progress } from "@/components/ui/progress"
import { Upload, X } from "lucide-react"

interface VideoUploadDropzoneProps {
  onFileSelected: (file: File) => void
  isUploading: boolean
  progress: number
  error: string | null
}

export function VideoUploadDropzone({ onFileSelected, isUploading, progress, error }: VideoUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      onFileSelected(file)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setSelectedFile(file)
      onFileSelected(file)
    }
  }

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } ${error ? "border-red-500" : ""} ${isUploading ? "pointer-events-none" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isUploading ? undefined : handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".mp4"
          className="hidden"
          disabled={isUploading}
        />

        {!selectedFile && !isUploading && (
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-12 w-12 text-gray-400" />
            <p className="text-lg font-medium">Drag and drop your video here</p>
            <p className="text-sm text-gray-500">or click to browse (MP4 only, max 300MB)</p>
          </div>
        )}

        {selectedFile && !isUploading && (
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClearFile()
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {isUploading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="animate-pulse bg-blue-100 p-3 rounded-full">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <p className="font-medium">Uploading {selectedFile?.name}...</p>
            <Progress value={progress} className="h-2 w-full" />
            <p className="text-sm text-gray-500">{progress}% complete</p>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
