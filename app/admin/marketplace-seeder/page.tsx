"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"

export default function MarketplaceSeederPage() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [bundlesCreated, setBundlesCreated] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Pexels import state
  const [pexelsSearchTerms, setPexelsSearchTerms] = useState("gym, sunset, business, nature, technology")
  const [pexelsVideosPerTerm, setPexelsVideosPerTerm] = useState(10)

  // Freesound import state
  const [freesoundTags, setFreesoundTags] = useState("ambient, cinematic, upbeat, calm, energetic")
  const [freesoundPerTag, setFreesoundPerTag] = useState(10)

  // Existing content state
  const [useExistingContent, setUseExistingContent] = useState(true)

  const addProgress = (message: string) => {
    setProgress((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const handleGenerateBundles = async () => {
    setLoading(true)
    setProgress([])
    setBundlesCreated(0)
    setError(null)

    try {
      addProgress("🚀 Starting marketplace seeding process...")

      // Step 1: Import content from third-party sources
      if (pexelsSearchTerms.trim()) {
        addProgress("📥 Importing content from Pexels...")
        const pexelsResponse = await fetch("/api/admin/import-pexels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            searchTerms: pexelsSearchTerms.split(",").map((t) => t.trim()),
            videosPerTerm: pexelsVideosPerTerm,
          }),
        })
        const pexelsData = await pexelsResponse.json()
        addProgress(`✅ Imported ${pexelsData.imported} videos from Pexels`)
      }

      if (freesoundTags.trim()) {
        addProgress("📥 Importing audio from Freesound...")
        const freesoundResponse = await fetch("/api/admin/import-freesound", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tags: freesoundTags.split(",").map((t) => t.trim()),
            soundsPerTag: freesoundPerTag,
          }),
        })
        const freesoundData = await freesoundResponse.json()
        addProgress(`✅ Imported ${freesoundData.imported} audio files from Freesound`)
      }

      // Step 2: Analyze and bundle content
      addProgress("🤖 Analyzing content with AI...")
      const bundleResponse = await fetch("/api/admin/auto-bundle-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useExistingContent,
          targetBundleCount: 50,
        }),
      })

      if (!bundleResponse.ok) {
        throw new Error("Failed to create bundles")
      }

      const bundleData = await bundleResponse.json()
      setBundlesCreated(bundleData.bundlesCreated)
      addProgress(`✅ Created ${bundleData.bundlesCreated} bundles successfully!`)
      addProgress("🎉 Marketplace seeding complete!")
    } catch (err: any) {
      console.error("Error generating bundles:", err)
      setError(err.message || "Failed to generate bundles")
      addProgress(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Marketplace Seeder</h1>
          <p className="text-muted-foreground">Automatically import content and create bundles for your marketplace</p>
        </div>

        {/* Configuration */}
        <Tabs defaultValue="pexels" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pexels">Pexels (Videos/Images)</TabsTrigger>
            <TabsTrigger value="freesound">Freesound (Audio)</TabsTrigger>
            <TabsTrigger value="existing">Existing Content</TabsTrigger>
          </TabsList>

          <TabsContent value="pexels" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Terms (comma-separated)</label>
                <Input
                  value={pexelsSearchTerms}
                  onChange={(e) => setPexelsSearchTerms(e.target.value)}
                  placeholder="gym, sunset, business, nature"
                />
                <p className="text-xs text-muted-foreground">
                  AI will fetch videos/images for each term and create themed bundles
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Videos per term</label>
                <Input
                  type="number"
                  value={pexelsVideosPerTerm}
                  onChange={(e) => setPexelsVideosPerTerm(Number(e.target.value))}
                  min={5}
                  max={50}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="freesound" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={freesoundTags}
                  onChange={(e) => setFreesoundTags(e.target.value)}
                  placeholder="ambient, cinematic, upbeat"
                />
                <p className="text-xs text-muted-foreground">
                  AI will fetch audio files for each tag and create themed bundles
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sounds per tag</label>
                <Input
                  type="number"
                  value={freesoundPerTag}
                  onChange={(e) => setFreesoundPerTag(Number(e.target.value))}
                  min={5}
                  max={50}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useExisting"
                  checked={useExistingContent}
                  onChange={(e) => setUseExistingContent(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="useExisting" className="text-sm font-medium">
                  Include existing uploaded content in bundles
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                AI will analyze your existing uploads and include them in themed bundles
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Generate Button */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Generate Marketplace Bundles</h3>
                <p className="text-sm text-muted-foreground">
                  This will import content, analyze it with AI, and create ~50 themed bundles
                </p>
              </div>
              <Button onClick={handleGenerateBundles} disabled={loading} size="lg" className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Bundles
                  </>
                )}
              </Button>
            </div>

            {bundlesCreated > 0 && (
              <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Successfully created {bundlesCreated} bundles!</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Progress Log */}
        {progress.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Progress Log</h3>
            <div className="space-y-1 font-mono text-xs bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
              {progress.map((msg, i) => (
                <div key={i} className="text-muted-foreground">
                  {msg}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
