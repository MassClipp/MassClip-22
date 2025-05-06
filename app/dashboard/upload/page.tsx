"use client"

import type React from "react"

import { useState } from "react"
import { Upload, Info, X, Check, Film } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const { toast } = useToast()

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
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
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }

  // Handle tag input
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
        setTagInput("")
      }
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // Mock upload function (non-functional as requested)
  const handleUpload = () => {
    toast({
      title: "Upload initiated",
      description: "This is a UI mockup. Upload functionality is not implemented.",
    })
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Upload Your Clip</h1>
          <Button variant="outline" size="sm" className="gap-2">
            <Info className="h-4 w-4" />
            Upload Guidelines
          </Button>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="my-uploads">My Uploads</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Upload Area */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Upload Video</CardTitle>
                  <CardDescription>Drag and drop your video file or click to browse</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center gap-4 transition-colors ${
                      dragActive ? "border-primary bg-primary/5" : "border-border"
                    } ${selectedFile ? "bg-secondary/10" : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {selectedFile ? (
                      <>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Click to upload or drag and drop</p>
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
                          <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                            <span>Browse files</span>
                          </Button>
                        </label>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>How your clip will appear</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  {selectedFile ? (
                    <div className="aspect-video w-full bg-black rounded-md flex items-center justify-center">
                      <Film className="h-12 w-12 text-white/50" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No file selected</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Metadata Form */}
            <Card>
              <CardHeader>
                <CardTitle>Clip Details</CardTitle>
                <CardDescription>Provide information about your clip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input id="title" placeholder="Enter a title for your clip" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="category" className="text-sm font-medium">
                      Category
                    </label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <Textarea id="description" placeholder="Describe your clip" rows={3} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="tags" className="text-sm font-medium">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove {tag} tag</span>
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    id="tags"
                    placeholder="Add tags (press Enter to add)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                  <p className="text-xs text-muted-foreground">Tags help others discover your content</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-6">
                <Button variant="outline">Save as Draft</Button>
                <Button onClick={handleUpload} disabled={!selectedFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Clip
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="my-uploads">
            <Card>
              <CardHeader>
                <CardTitle>My Uploaded Clips</CardTitle>
                <CardDescription>Manage your previously uploaded content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="text-center py-12">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No uploads yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">Your uploaded clips will appear here</p>
                    <Button variant="outline" className="mt-4">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Clip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Upload Guidelines</CardTitle>
            <CardDescription>Please follow these guidelines when uploading content</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc pl-5">
              <li>Maximum file size: 500MB</li>
              <li>Supported formats: MP4, MOV, WebM</li>
              <li>Recommended resolution: 1080p (1920x1080) or higher</li>
              <li>Content must comply with our community guidelines</li>
              <li>You must own the rights to the content you upload</li>
              <li>No copyrighted material without proper licensing</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
