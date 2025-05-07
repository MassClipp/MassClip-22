"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, Info, X, Check, Film, FileVideo, AlertCircle, Clock, ChevronLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  // Handle drop event
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

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
        return prev + 5
      })
    }, 300)

    // Cleanup interval on component unmount
    return () => clearInterval(interval)
  }, [selectedFile, toast])

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="mb-4 text-zinc-400 hover:text-white flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Upload Your Clip
            </h1>
            <p className="text-muted-foreground mt-2">Share your content with the MassClip community</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-crimson text-crimson hover:bg-crimson/10">
            <Info className="h-4 w-4" />
            Upload Guidelines
          </Button>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/40 p-1 rounded-lg">
            <TabsTrigger value="upload" className="data-[state=active]:bg-crimson data-[state=active]:text-white">
              Upload
            </TabsTrigger>
            <TabsTrigger value="my-uploads" className="data-[state=active]:bg-crimson data-[state=active]:text-white">
              My Uploads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Upload Area */}
              <Card className="md:col-span-2 border-0 bg-gradient-to-br from-black to-zinc-900 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Upload className="h-5 w-5 text-crimson" />
                    Upload Video
                  </CardTitle>
                  <CardDescription>Drag and drop your video file or click to browse</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
                      dragActive
                        ? "border-crimson bg-crimson/5 scale-[1.01] shadow-lg shadow-crimson/10"
                        : selectedFile
                          ? "border-green-500/50 bg-green-500/5"
                          : "border-zinc-800 hover:border-zinc-700"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {selectedFile ? (
                      <>
                        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                          <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-lg">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                          className="mt-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-crimson to-crimson-dark flex items-center justify-center mb-4 shadow-lg shadow-crimson/20">
                          <Upload className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-xl mb-1">Click to upload or drag and drop</p>
                          <p className="text-sm text-muted-foreground">MP4, MOV or WebM (max. 500MB)</p>
                        </div>
                        <Input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          id="file-upload"
                          onChange={handleFileChange}
                        />
                        <label htmlFor="file-upload">
                          <Button
                            variant="outline"
                            size="lg"
                            className="cursor-pointer mt-4 border-crimson text-crimson hover:bg-crimson/10 transition-all duration-300"
                            asChild
                          >
                            <span>Browse files</span>
                          </Button>
                        </label>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="border-0 bg-gradient-to-br from-black to-zinc-900 shadow-xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileVideo className="h-5 w-5 text-crimson" />
                    Preview
                  </CardTitle>
                  <CardDescription>How your clip will appear</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-0">
                  {selectedFile ? (
                    <div className="aspect-video w-full bg-black rounded-md flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                      <Film className="h-16 w-16 text-white/70" />
                      <div className="absolute bottom-3 left-3 right-3 z-20">
                        <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-black/50 text-xs border-zinc-700">
                            HD
                          </Badge>
                          <span className="text-xs text-zinc-400">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-zinc-900 rounded-md flex items-center justify-center">
                      <div className="text-center p-6">
                        <FileVideo className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">No file selected</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Metadata Form */}
            <Card className="border-0 bg-gradient-to-br from-black to-zinc-900 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Info className="h-5 w-5 text-crimson" />
                  Clip Details
                </CardTitle>
                <CardDescription>Provide information about your clip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium flex items-center gap-1">
                      Title <span className="text-crimson">*</span>
                    </label>
                    <Input
                      id="title"
                      placeholder="Enter a title for your clip"
                      className="bg-zinc-900/50 border-zinc-800 focus:border-crimson focus-visible:ring-crimson"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="category" className="text-sm font-medium flex items-center gap-1">
                      Category <span className="text-crimson">*</span>
                    </label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select a category</option>
                      <option value="motivation">Motivation</option>
                      <option value="fitness">Fitness</option>
                      <option value="business">Business</option>
                      <option value="lifestyle">Lifestyle</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    placeholder="Describe your clip"
                    rows={3}
                    className="bg-zinc-900/50 border-zinc-800 focus:border-crimson focus-visible:ring-crimson resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="tags" className="text-sm font-medium">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <Badge key={tag} className="bg-zinc-800 hover:bg-zinc-700 text-white gap-1 px-3 py-1">
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-zinc-600"
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove {tag} tag</span>
                        </button>
                      </Badge>
                    ))}
                    {tags.length === 0 && <span className="text-xs text-zinc-500 italic">No tags added yet</span>}
                  </div>
                  <Input
                    id="tags"
                    placeholder="Add tags (press Enter to add)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="bg-zinc-900/50 border-zinc-800 focus:border-crimson focus-visible:ring-crimson"
                  />
                  <p className="text-xs text-muted-foreground">Tags help others discover your content</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-zinc-800/50 p-6">
                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                  <Clock className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="bg-gradient-to-r from-crimson to-crimson-dark hover:from-crimson-dark hover:to-crimson text-white transition-all duration-300 shadow-lg shadow-crimson/20 hover:shadow-crimson/30"
                >
                  {isUploading ? (
                    <>
                      <span className="mr-2">{uploadProgress}%</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Clip
                    </>
                  )}
                </Button>
              </CardFooter>
              {isUploading && (
                <div className="px-6 pb-6">
                  <Progress
                    value={uploadProgress}
                    className="h-2 bg-zinc-800"
                    indicatorClassName="bg-gradient-to-r from-crimson to-crimson-light"
                  />
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="my-uploads" className="animate-fadeIn">
            <Card className="border-0 bg-gradient-to-br from-black to-zinc-900 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileVideo className="h-5 w-5 text-crimson" />
                  My Uploaded Clips
                </CardTitle>
                <CardDescription>Manage your previously uploaded content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="text-center py-16">
                    <div className="h-20 w-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
                      <Film className="h-10 w-10 text-zinc-700" />
                    </div>
                    <h3 className="text-xl font-medium">No uploads yet</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-6">Your uploaded clips will appear here</p>
                    <Button className="bg-gradient-to-r from-crimson to-crimson-dark hover:from-crimson-dark hover:to-crimson text-white transition-all duration-300 shadow-lg shadow-crimson/20 hover:shadow-crimson/30">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Clip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-0 bg-gradient-to-br from-black to-zinc-900 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-crimson" />
              Upload Guidelines
            </CardTitle>
            <CardDescription>Please follow these guidelines when uploading content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-3 text-white">Technical Requirements</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">1</span>
                    </div>
                    <span>
                      Maximum file size: <span className="text-white">500MB</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">2</span>
                    </div>
                    <span>
                      Supported formats: <span className="text-white">MP4, MOV, WebM</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">3</span>
                    </div>
                    <span>
                      Recommended resolution: <span className="text-white">1080p (1920x1080) or higher</span>
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-3 text-white">Content Guidelines</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">1</span>
                    </div>
                    <span>Content must comply with our community guidelines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">2</span>
                    </div>
                    <span>You must own the rights to the content you upload</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">3</span>
                    </div>
                    <span>No copyrighted material without proper licensing</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
