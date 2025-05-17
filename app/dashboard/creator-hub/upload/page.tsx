"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Upload, Loader2 } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export default function UploadClipPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams?.get("type") || "free"
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [isPaid, setIsPaid] = useState(type === "paid")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "4.99",
    tags: "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      // Simulate API call with a delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Upload successful",
        description: "Your clip has been uploaded.",
      })

      router.push("/dashboard/creator-hub")
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: "There was an error uploading your clip.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-zinc-900">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-zinc-900/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-zinc-900/20 to-transparent"></div>
      </div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-3xl mx-auto">
            <motion.div variants={itemVariants} className="mb-8">
              <Button
                variant="ghost"
                className="mb-2 -ml-4 text-zinc-400 hover:text-white"
                onClick={() => router.push("/dashboard/creator-hub")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Creator Hub
              </Button>
              <h1 className="text-3xl font-light tracking-tight text-white">Upload New Clip</h1>
              <p className="text-zinc-400 mt-1 font-light">Share your content with the community</p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Clip Details</CardTitle>
                  <CardDescription>Provide information about your clip</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      {/* File Upload */}
                      <div className="border-2 border-dashed border-zinc-700 rounded-lg p-10 text-center hover:border-crimson/70 transition-colors cursor-pointer">
                        <Upload className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
                        <p className="text-zinc-300 mb-2">Drag & drop your video file or click to browse</p>
                        <p className="text-xs text-zinc-500">MP4, MOV, or WebM (Max 500MB)</p>
                        <input type="file" className="hidden" accept="video/mp4,video/quicktime,video/webm" />
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-zinc-300">
                          Title <span className="text-crimson">*</span>
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          required
                          className="bg-zinc-800/70 border-zinc-700 text-white focus-visible:ring-crimson"
                          placeholder="Enter a title for your clip"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-zinc-300">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          className="bg-zinc-800/70 border-zinc-700 text-white focus-visible:ring-crimson min-h-[120px]"
                          placeholder="Describe your clip..."
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-zinc-300">
                          Category <span className="text-crimson">*</span>
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className="bg-zinc-800/70 border-zinc-700 text-white focus:ring-crimson">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                            <SelectItem value="transitions">Transitions</SelectItem>
                            <SelectItem value="effects">Effects</SelectItem>
                            <SelectItem value="titles">Titles</SelectItem>
                            <SelectItem value="lowerThirds">Lower Thirds</SelectItem>
                            <SelectItem value="intros">Intros & Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tags */}
                      <div className="space-y-2">
                        <Label htmlFor="tags" className="text-zinc-300">
                          Tags
                        </Label>
                        <Input
                          id="tags"
                          name="tags"
                          value={formData.tags}
                          onChange={handleChange}
                          className="bg-zinc-800/70 border-zinc-700 text-white focus-visible:ring-crimson"
                          placeholder="Enter tags separated by commas"
                        />
                        <p className="text-xs text-zinc-500">
                          Add tags to help users find your clip (e.g., smooth, cinematic, fast)
                        </p>
                      </div>

                      {/* Pricing Toggle */}
                      <div className="pt-4 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-medium">Paid Clip</h3>
                            <p className="text-sm text-zinc-400">Enable to set a price for this clip</p>
                          </div>
                          <Switch
                            checked={isPaid}
                            onCheckedChange={setIsPaid}
                            className="data-[state=checked]:bg-crimson"
                          />
                        </div>

                        {isPaid && (
                          <div className="mt-4 space-y-2">
                            <Label htmlFor="price" className="text-zinc-300">
                              Price (USD) <span className="text-crimson">*</span>
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400">
                                $
                              </span>
                              <Input
                                id="price"
                                name="price"
                                type="number"
                                min="0.99"
                                step="0.01"
                                value={formData.price}
                                onChange={handleChange}
                                className="bg-zinc-800/70 border-zinc-700 text-white focus-visible:ring-crimson pl-8"
                              />
                            </div>
                            <p className="text-xs text-zinc-500">
                              Minimum price is $0.99. You will receive 70% of the sale price.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    onClick={() => router.push("/dashboard/creator-hub")}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-crimson hover:bg-crimson/90 text-white"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Clip
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
