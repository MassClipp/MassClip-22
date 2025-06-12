"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle } from "lucide-react"

export default function TestClassificationPage() {
  const [title, setTitle] = useState("David Goggins on Mental Toughness")
  const [transcript, setTranscript] = useState(
    "You have to be willing to suffer. Most people quit when it gets hard. But that's when you find out who you really are. Mental toughness isn't something you're born with, it's something you develop through suffering and pushing through when you want to quit.",
  )
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testClassification = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 [Test Page] Starting classification test...")

      const response = await fetch("/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          transcript,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Classification failed")
      }

      console.log("✅ [Test Page] Classification result:", data)
      setResult(data)
    } catch (err) {
      console.error("❌ [Test Page] Error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <span role="img" aria-label="robot">
              🤖
            </span>{" "}
            OpenAI Classification Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white mb-2 block">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter content title..."
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="transcript" className="text-white mb-2 block">
                Transcript
              </Label>
              <Textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Enter content transcript..."
                rows={6}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
              />
            </div>

            <Button
              onClick={testClassification}
              disabled={loading || (!title && !transcript)}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            >
              {loading ? "Classifying..." : "Test Classification"}
            </Button>
          </div>

          {error && (
            <Card className="border-red-500/20 bg-red-500/10 text-white">
              <CardContent className="pt-6">
                <p className="text-red-300 flex items-center gap-2">
                  <span role="img" aria-label="error">
                    ❌
                  </span>{" "}
                  Error: {error}
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="border-green-500/20 bg-green-500/10 text-white">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5" />
                  Classification Result
                  {result.fallback && <span className="text-orange-400 text-sm ml-2">(Fallback)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-gray-300">Niche:</strong>{" "}
                    <span className="text-green-400">{result.classification?.niche}</span>
                  </div>
                  <div>
                    <strong className="text-gray-300">Tone:</strong>{" "}
                    <span className="text-green-400">{result.classification?.tone}</span>
                  </div>
                  <div>
                    <strong className="text-gray-300">Speaker:</strong>{" "}
                    <span className="text-green-400">{result.classification?.speaker}</span>
                  </div>
                  <div>
                    <strong className="text-gray-300">Content Type:</strong>{" "}
                    <span className="text-green-400">{result.classification?.content_type}</span>
                  </div>
                </div>

                {result.usage && (
                  <div className="mt-4 text-sm text-gray-400">
                    <strong>Usage:</strong> {result.usage.total_tokens} tokens
                  </div>
                )}

                {result.error && (
                  <div className="mt-4 text-sm text-orange-400">
                    <strong>Note:</strong> {result.error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
