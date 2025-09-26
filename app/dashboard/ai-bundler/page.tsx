"use client"

import { useState, useEffect } from "react"
import { Sparkles, Upload, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { AIBundleAssistant } from "@/components/ai-bundle-assistant"

interface ContentItem {
  id: string
  title: string
  contentType: string
  mimeType: string
  duration?: number
  fileSize: number
  filename: string
}

interface BundleSuggestion {
  title: string
  description: string
  price: number
  contentIds: string[]
  category: string
  tags: string[]
  reasoning: string
}

export default function AIBundlerPage() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Fetch user's content
  const fetchUserContent = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log("🔍 [AI Bundler] Fetching user content...")

      const token = await user.getIdToken()
      const response = await fetch("/api/creator/uploads", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch content")
      }

      const data = await response.json()
      const uploads = data.uploads || []

      // Filter and format content for AI analysis
      const validContent = uploads
        .filter((upload: any) => upload.fileUrl && upload.fileUrl.startsWith("http"))
        .map((upload: any) => ({
          id: upload.id,
          title: upload.title || upload.filename || "Untitled",
          filename: upload.filename || upload.title || "Unknown",
          contentType: getContentType(upload.mimeType || upload.type || ""),
          mimeType: upload.mimeType || upload.type || "application/octet-stream",
          duration: upload.duration,
          fileSize: upload.fileSize || upload.size || 0,
        }))

      setContentItems(validContent)
      console.log(`✅ [AI Bundler] Loaded ${validContent.length} content items`)
    } catch (error) {
      console.error("❌ [AI Bundler] Error fetching content:", error)
      toast({
        title: "Error",
        description: "Failed to load your content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getContentType = (mimeType: string): string => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("image/")) return "image"
    return "document"
  }

  // Handle creating a bundle from AI suggestion
  const handleCreateBundle = async (suggestion: BundleSuggestion) => {
    try {
      setCreating(true)
      console.log("🤖 [AI Bundler] Creating bundle from AI suggestion:", suggestion.title)

      const token = await user?.getIdToken()
      if (!token) throw new Error("Not authenticated")

      // Create the bundle
      const response = await fetch("/api/creator/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
          price: suggestion.price,
          currency: "usd",
          type: "one_time",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create bundle")
      }

      const data = await response.json()
      const bundleId = data.bundleId

      // Add content to the bundle
      if (suggestion.contentIds.length > 0) {
        const addContentResponse = await fetch(`/api/creator/bundles/${bundleId}/add-content`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            contentIds: suggestion.contentIds,
          }),
        })

        if (!addContentResponse.ok) {
          console.warn("⚠️ [AI Bundler] Failed to add content to bundle, but bundle was created")
        }
      }

      toast({
        title: "Bundle Created Successfully!",
        description: `"${suggestion.title}" has been created with ${suggestion.contentIds.length} items`,
      })

      // Redirect to bundles page
      router.push("/dashboard/bundles")
    } catch (error) {
      console.error("❌ [AI Bundler] Error creating bundle:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bundle",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserContent()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
        <span className="ml-3 text-zinc-400">Loading your content...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light text-white flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-purple-400" />
          AI Bundle Assistant
        </h1>
        <p className="text-zinc-400">
          Let AI analyze your content and suggest optimized bundles with titles, descriptions, and pricing
        </p>
      </div>

      {/* Content Overview */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Your Content Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <div className="text-2xl font-light text-white">{contentItems.length}</div>
              <div className="text-sm text-zinc-400">Total Items</div>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <div className="text-2xl font-light text-white">
                {contentItems.filter((item) => item.contentType === "video").length}
              </div>
              <div className="text-sm text-zinc-400">Videos</div>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <div className="text-2xl font-light text-white">
                {contentItems.filter((item) => item.contentType === "audio").length}
              </div>
              <div className="text-sm text-zinc-400">Audio</div>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <div className="text-2xl font-light text-white">
                {contentItems.filter((item) => item.contentType === "image").length}
              </div>
              <div className="text-sm text-zinc-400">Images</div>
            </div>
          </div>

          {contentItems.length === 0 && (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 mb-4">No content found. Upload some files first.</p>
              <Button
                onClick={() => router.push("/dashboard/upload")}
                className="bg-white text-black hover:bg-zinc-100"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Content
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Assistant */}
      <AIBundleAssistant contentItems={contentItems} onCreateBundle={handleCreateBundle} disabled={creating} />

      {/* Quick Actions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <h3 className="text-lg font-medium text-white mb-1">Manual Bundle Creation</h3>
              <p className="text-sm text-zinc-400">Prefer to create bundles manually? Go to the bundles page.</p>
            </div>
            <Button
              onClick={() => router.push("/dashboard/bundles")}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Manage Bundles
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
