"use client"

import type React from "react"

import { useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Upload, FileVideo, X, Check, Tag, Info, ChevronDown, Trash2 } from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { toast } = useToast()
  const isMobile = useMobile()

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }, [])

  // Handle drop event
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0]
        if (file.type.startsWith("video/")) {
          setSelectedFile(file)
          toast({
            title: "File selected",
            description: `${file.name} has been selected for upload.`,
          })
        } else {
          toast({
            title: "Invalid file type",
            description: "Please upload a video file.",
            variant: "destructive",
          })
        }
      }
    },
    [toast],
  )

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        if (file.type.startsWith("video/")) {
          setSelectedFile(file)
          toast({
            title: "File selected",
            description: `${file.name} has been selected for upload.`,
          })
        } else {
          toast({
            title: "Invalid file type",
            description: "Please upload a video file.",
            variant: "destructive",
          })
        }
      }
    },
    [toast],
  )

  // Handle tag input
  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && tagInput.trim() !== "") {
        e.preventDefault()
        if (!tags.includes(tagInput.trim())) {
          setTags([...tags, tagInput.trim()])
          setTagInput("")
        }
      }
    },
    [tagInput, tags],
  )

  // Remove tag
  const removeTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter((tag) => tag !== tagToRemove))
    },
    [tags],
  )

  // Mock upload function with progress simulation
  const handleUpload = useCallback(() => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          toast({
            title: "Upload complete",
            description: "Your clip has been successfully uploaded.",
          })
          return 100
        }
        return prev + 2
      })
    }, 100)

    // Cleanup interval on component unmount
    return () => clearInterval(interval)
  }, [selectedFile, toast])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-4">
            {selectedFile && !isUploading && (
              <button
                onClick={handleUpload}
                className="bg-gradient-to-r from-crimson to-crimson-dark text-white px-4 py-2 rounded-full text-sm font-medium hover:from-crimson-dark hover:to-crimson transition-all duration-300 shadow-lg shadow-crimson/20 hover:shadow-crimson/30"
              >
                Upload Now
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Upload Content</h1>
          <p className="text-zinc-400 mb-8 md:mb-12">Share your premium content with your audience</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Upload Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`
                relative rounded-xl overflow-hidden transition-all duration-300
                ${selectedFile ? "bg-zinc-900/50 border border-zinc-800" : "bg-gradient-to-b from-zinc-900/50 to-black border border-zinc-800 hover:border-zinc-700"}
                ${isDragging ? "border-crimson/50 shadow-lg shadow-crimson/10 scale-[1.01]" : ""}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="p-8 md:p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="relative w-full h-2 bg-zinc-800 rounded-full mb-4 overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-crimson to-crimson-light rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm font-medium mb-1">Uploading {selectedFile.name}</p>
                    <p className="text-xs text-zinc-400">{uploadProgress}% complete</p>
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="p-8 md:p-12">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <FileVideo className="w-8 h-8 md:w-10 md:h-10 text-zinc-400" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="font-medium text-lg md:text-xl mb-1 break-all">{selectedFile.name}</p>
                      <p className="text-sm text-zinc-400 mb-4">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                      </p>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove file</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 md:p-12 lg:p-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center mb-6">
                      <Upload className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-medium mb-2">Drag & drop your video</h3>
                    <p className="text-zinc-400 text-sm mb-6 max-w-md">Upload MP4, MOV or WebM files up to 500MB</p>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload">
                      <span className="inline-block bg-white text-black px-6 py-3 rounded-full text-sm font-medium cursor-pointer hover:bg-zinc-200 transition-colors">
                        Select File
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 md:p-8"
            >
              <h3 className="text-lg font-medium mb-6">Basic Information</h3>

              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-zinc-400 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    placeholder="Add a title that describes your content"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-zinc-400 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    placeholder="Describe your content to your audience"
                    rows={4}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-zinc-800 text-white text-xs px-3 py-1.5 rounded-full"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-zinc-700 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          <span className="sr-only">Remove {tag}</span>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Tag className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Add tags (press Enter to add)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Advanced Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-6 md:p-8 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Info className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span className="font-medium">Advanced Settings</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`}
                />
              </button>

              {showAdvanced && (
                <div className="p-6 md:p-8 pt-0 border-t border-zinc-800">
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-zinc-400 mb-2">
                        Category
                      </label>
                      <select
                        id="category"
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="">Select a category</option>
                        <option value="motivation">Motivation</option>
                        <option value="fitness">Fitness</option>
                        <option value="business">Business</option>
                        <option value="lifestyle">Lifestyle</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="visibility" className="block text-sm font-medium text-zinc-400 mb-2">
                        Visibility
                      </label>
                      <select
                        id="visibility"
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="unlisted">Unlisted</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="premium"
                        className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-crimson focus:ring-crimson/50"
                      />
                      <label htmlFor="premium" className="ml-2 text-sm text-zinc-300">
                        Mark as premium content (subscribers only)
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-8">
            {/* Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Preview</h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center mb-4">
                  {selectedFile ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <FileVideo className="w-12 h-12 text-zinc-700" />
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <FileVideo className="w-12 h-12 text-zinc-800 mx-auto mb-2" />
                      <p className="text-xs text-zinc-600">No file selected</p>
                    </div>
                  )}
                </div>
                {selectedFile && (
                  <div className="text-sm text-zinc-400">
                    <p className="mb-1">
                      <span className="text-zinc-500">Format:</span> {selectedFile.type.split("/")[1].toUpperCase()}
                    </p>
                    <p>
                      <span className="text-zinc-500">Size:</span> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Upload Guidelines */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-medium mb-4">Upload Guidelines</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">
                    Maximum file size: <span className="text-white">500MB</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">
                    Supported formats: <span className="text-white">MP4, MOV, WebM</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">
                    Recommended resolution: <span className="text-white">1080p or higher</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-crimson" />
                  </div>
                  <span className="text-zinc-300">You must own the rights to the content you upload</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Bar (Mobile Only) */}
      {isMobile && selectedFile && !isUploading && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-zinc-800 p-4 z-50">
          <button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-crimson to-crimson-dark text-white py-3 rounded-lg text-sm font-medium hover:from-crimson-dark hover:to-crimson transition-all duration-300 shadow-lg shadow-crimson/20 hover:shadow-crimson/30"
          >
            Upload Now
          </button>
        </div>
      )}
    </div>
  )
}
