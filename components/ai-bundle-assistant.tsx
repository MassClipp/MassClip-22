"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Loader2, Check, Wand2, TrendingUp, Target, DollarSign, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

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

interface AIBundleAssistantProps {
  contentItems: ContentItem[]
  onCreateBundle: (suggestion: BundleSuggestion) => void
  disabled?: boolean
}

export function AIBundleAssistant({ contentItems, onCreateBundle, disabled }: AIBundleAssistantProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<BundleSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleAnalyzeContent = async () => {
    if (!user || contentItems.length === 0) return

    try {
      setIsAnalyzing(true)
      console.log(`🤖 [AI Assistant] Analyzing ${contentItems.length} content items...`)

      const token = await user.getIdToken()
      const response = await fetch("/api/ai/analyze-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentItems: contentItems.map((item) => ({
            id: item.id,
            title: item.title || item.filename,
            contentType: item.contentType,
            mimeType: item.mimeType,
            duration: item.duration,
            fileSize: item.fileSize,
            filename: item.filename,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze content")
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions(true)

      console.log(`✅ [AI Assistant] Generated ${data.suggestions?.length || 0} suggestions`)

      toast({
        title: "AI Analysis Complete",
        description: `Generated ${data.suggestions?.length || 0} bundle suggestions based on your content`,
      })
    } catch (error) {
      console.error("❌ [AI Assistant] Error:", error)
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze content",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0:00"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (contentItems.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6 text-center">
          <Sparkles className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">Upload some content to get AI bundle suggestions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* AI Assistant Trigger */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wand2 className="h-5 w-5 text-purple-400" />
            AI Bundle Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-zinc-300 text-sm">
              Let AI analyze your {contentItems.length} uploads and suggest optimized bundles with titles, descriptions,
              and pricing.
            </p>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleAnalyzeContent}
                disabled={disabled || isAnalyzing || contentItems.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Bundle Ideas
                  </>
                )}
              </Button>

              {suggestions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="border-zinc-700 text-zinc-300"
                >
                  {showSuggestions ? "Hide" : "Show"} {suggestions.length} Suggestions
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              AI Bundle Suggestions
            </h3>

            <div className="grid gap-4">
              {suggestions.map((suggestion, index) => {
                const includedContent = contentItems.filter((item) => suggestion.contentIds.includes(item.id))
                const totalSize = includedContent.reduce((sum, item) => sum + (item.fileSize || 0), 0)
                const totalDuration = includedContent.reduce((sum, item) => sum + (item.duration || 0), 0)

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-white text-lg mb-2">{suggestion.title}</CardTitle>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                                {suggestion.category}
                              </Badge>
                              <Badge variant="outline" className="border-green-600 text-green-400">
                                <DollarSign className="h-3 w-3 mr-1" />${suggestion.price}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <p className="text-zinc-300 text-sm leading-relaxed">{suggestion.description}</p>

                        {/* Bundle Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-zinc-800/50 rounded-lg">
                          <div className="text-center">
                            <div className="text-lg font-medium text-white">{includedContent.length}</div>
                            <div className="text-xs text-zinc-400">Items</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-medium text-white">{formatFileSize(totalSize)}</div>
                            <div className="text-xs text-zinc-400">Total Size</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-medium text-white">{formatDuration(totalDuration)}</div>
                            <div className="text-xs text-zinc-400">Duration</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-medium text-green-400">${suggestion.price}</div>
                            <div className="text-xs text-zinc-400">Suggested Price</div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                          {suggestion.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* AI Reasoning */}
                        <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-blue-300 mb-1">AI Insight</p>
                              <p className="text-xs text-blue-200/80 leading-relaxed">{suggestion.reasoning}</p>
                            </div>
                          </div>
                        </div>

                        {/* Content Preview */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-zinc-400">Included Content:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {includedContent.slice(0, 6).map((item) => (
                              <div key={item.id} className="p-2 bg-zinc-800/50 rounded text-xs text-zinc-300 truncate">
                                {item.title || item.filename}
                              </div>
                            ))}
                            {includedContent.length > 6 && (
                              <div className="p-2 bg-zinc-800/50 rounded text-xs text-zinc-400 text-center">
                                +{includedContent.length - 6} more
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={() => onCreateBundle(suggestion)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Create This Bundle
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
