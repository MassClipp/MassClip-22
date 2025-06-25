"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugCreatorContentPage() {
  const [creatorId, setCreatorId] = useState("jus") // Default to the user we're testing
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const runDiagnostic = async () => {
    if (!creatorId.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/debug/creator-content/${creatorId}`)
      const data = await response.json()
      setResults(data)
      console.log("Diagnostic results:", data)
    } catch (error) {
      console.error("Error running diagnostic:", error)
      setResults({ error: "Failed to run diagnostic" })
    } finally {
      setLoading(false)
    }
  }

  const createSampleContent = async () => {
    setCreating(true)
    try {
      const response = await fetch("/api/test/create-sample-content", {
        method: "POST",
      })
      const data = await response.json()
      console.log("Sample content creation result:", data)

      // Automatically run diagnostic after creating content
      setTimeout(() => {
        runDiagnostic()
      }, 1000)

      alert(data.success ? "Sample content created successfully!" : "Failed to create sample content")
    } catch (error) {
      console.error("Error creating sample content:", error)
      alert("Failed to create sample content")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Creator Content Diagnostic</h1>

        <Card className="bg-zinc-900 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle>Run Diagnostic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                placeholder="Enter creator ID (e.g., jus)"
                className="bg-zinc-800 border-zinc-700"
              />
              <Button onClick={runDiagnostic} disabled={loading}>
                {loading ? "Running..." : "Run Diagnostic"}
              </Button>
            </div>

            <div className="pt-4 border-t border-zinc-700">
              <p className="text-sm text-zinc-400 mb-2">
                If no content is found, you can create sample content for testing:
              </p>
              <Button
                onClick={createSampleContent}
                disabled={creating}
                variant="outline"
                className="border-zinc-600 hover:bg-zinc-800"
              >
                {creating ? "Creating..." : "Create Sample Content"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Diagnostic Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto bg-zinc-800 p-4 rounded max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
